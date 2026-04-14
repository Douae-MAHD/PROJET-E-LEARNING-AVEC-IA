import mongoose from 'mongoose';

import config from '../config/env.js';
import logger from '../utils/logger.js';
import { ExternalAPIError, ForbiddenError, NotFoundError, ServiceError } from '../utils/errorHandler.js';
import Seance from '../models/Seance.js';
import * as sessionLogRepository from '../repositories/sessionLog.repository.js';
import * as progressionRepository from '../repositories/seanceProgression.repository.js';

const computeFallbackCtScore = (correctness) => {
  return Math.round((Number(correctness) || 0) * 1000) / 10;
};

const callCtEngine = async (sessionPayload) => {
  const base = String(config.ctEngine.baseUrl || '').replace(/\/$/, '');
  const endpoint = String(config.ctEngine.scoreEndpoint || '/score/student');
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.ctEngine.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExternalAPIError('CT Engine', text || `HTTP ${response.status}`, 502);
    }

    const data = await response.json();
    const ctScore = data?.ct_score ?? data?.score ?? data?.data?.ct_score;

    if (typeof ctScore !== 'number' || Number.isNaN(ctScore)) {
      throw new ExternalAPIError('CT Engine', 'Invalid ct_score in response', 502);
    }

    return {
      ct_score: Math.max(0, Math.min(100, ctScore)),
      source: 'fastapi',
      raw: data,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ExternalAPIError('CT Engine', 'Request timeout', 504);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const updateProgressionFromSession = async (payload) => {
  const { student_id, seanceId, assessment_type, attempts, correctness } = payload;

  const seance = await Seance.findById(seanceId).select('_id moduleId').lean();
  if (!seance) throw new NotFoundError('Séance');

  const progression = await progressionRepository.findByEtudiantAndSeance(student_id, seanceId);
  const normalizedAttempts = Math.max(1, Number(attempts) || 1);
  const derivedScorePct = Math.round((Number(correctness) || 0) * 100);

  const updateData = {
    tentatives: progression ? Math.max(progression.tentatives || 0, normalizedAttempts) : normalizedAttempts,
    statut: 'validee',
    completedAt: new Date(),
  };

  if (assessment_type === 'exercise') {
    updateData.scoreExercice = derivedScorePct;
  } else {
    updateData.scoreQuiz = derivedScorePct;
  }

  if (progression) {
    await progressionRepository.updateProgression(student_id, seanceId, updateData);
    return;
  }

  await progressionRepository.create({
    etudiantId: student_id,
    seanceId,
    moduleId: seance.moduleId,
    ...updateData,
  });
};

export const scoreStudentSession = async (sessionPayload, authenticatedUserId) => {
  const { student_id } = sessionPayload;

  if (String(student_id) !== String(authenticatedUserId)) {
    throw new ForbiddenError('student_id mismatch with authenticated user');
  }

  let ctResult;
  try {
    ctResult = await callCtEngine(sessionPayload);
  } catch (error) {
    logger.warn('CT engine unavailable, fallback score applied', {
      message: error.message,
      student_id,
      seanceId: sessionPayload.seanceId,
    });

    ctResult = {
      ct_score: computeFallbackCtScore(sessionPayload.correctness),
      source: 'fallback',
      raw: null,
    };
  }

  const toPersist = {
    ...sessionPayload,
    student_id: new mongoose.Types.ObjectId(sessionPayload.student_id),
    seanceId: new mongoose.Types.ObjectId(sessionPayload.seanceId),
    ct_score: ctResult.ct_score,
    timestamp: new Date(),
  };

  const [saveResult, progressionResult] = await Promise.allSettled([
    sessionLogRepository.createSessionLog(toPersist),
    updateProgressionFromSession(sessionPayload),
  ]);

  if (saveResult.status === 'rejected') {
    throw new ServiceError('Failed to persist session log', saveResult.reason);
  }

  if (progressionResult.status === 'rejected') {
    logger.warn('SeanceProgression update failed after CT scoring', {
      student_id,
      seanceId: sessionPayload.seanceId,
      error: progressionResult.reason?.message,
    });
  }

  return {
    ct_score: ctResult.ct_score,
    engine_source: ctResult.source,
    sessionLogId: saveResult.value._id,
    progressionUpdated: progressionResult.status === 'fulfilled',
  };
};
