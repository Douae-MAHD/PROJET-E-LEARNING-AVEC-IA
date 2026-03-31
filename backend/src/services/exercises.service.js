/**
 * Exercises Service
 * 
 * MODIF : submitExercise → après correction IA, appelle validerSeance
 *         avec scoreExercice si l'exercice est lié à une séance
 *         Règle Salma : on valide TOUJOURS, le score sert à mesurer le CT
 */

import Exercise from '../models/Exercise.js';
import CourseModule from '../models/CourseModule.js';
import SubModule from '../models/SubModule.js';
import PDF from '../models/PDF.js';
import Seance from '../models/Seance.js';
import geminiService from './ai/geminiService.js';
import pdfService from './pdf/pdfService.js';
import { ForbiddenError, NotFoundError, ServiceError, ValidationError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

// ── Import progression service ──────────────────────────────────────────────
import * as progressionService from './seanceProgression.service.js';

export const createExercise = async (data) => {
  const { moduleId = null, seanceId = null, etudiantId = null, enonce, typeExercice = 'seance' } = data;

  if (typeExercice === 'seance' && !seanceId) throw new ValidationError('seanceId est requis pour un exercice de séance');
  if (typeExercice === 'global' && !moduleId)  throw new ValidationError('moduleId est requis pour un exercice global');
  if (typeExercice === 'prelab' && !seanceId)  throw new ValidationError('seanceId est requis pour un exercice prelab');

  if (seanceId) {
    const seance = await Seance.findById(seanceId).select('_id');
    if (!seance) throw new NotFoundError('Séance');
  }

  return Exercise.create({
    moduleId: typeExercice === 'global' ? moduleId : moduleId || null,
    seanceId: typeExercice === 'global' ? null : seanceId,
    etudiantId,
    enonce,
    typeExercice,
  });
};

const resolveModuleId = async (subModuleId) => {
  try {
    const sub = await SubModule.findById(subModuleId).select('parentModuleId').lean();
    return sub?.parentModuleId || null;
  } catch { return null; }
};

const resolveIdsFromSeance = async (seanceId) => {
  try {
    const seance = await Seance.findById(seanceId).select('subModuleId').lean();
    if (!seance?.subModuleId) return { moduleId: null };
    const moduleId = await resolveModuleId(seance.subModuleId);
    return { moduleId };
  } catch { return { moduleId: null }; }
};

export const generateFromPDF = async (resourceId, etudiantId) => {
  try {
    logger.info('Generating exercises from seance or pdf resource', { resourceId, etudiantId });

    let seanceId = null;
    let pdfs = [];

    const seance = await Seance.findById(resourceId).select('_id subModuleId').lean();
    if (seance?._id) {
      seanceId = seance._id;
      pdfs = await PDF.find({ seanceId }).select('nomFichier cheminFichier seanceId');
    } else {
      const pdf = await PDF.findById(resourceId).select('nomFichier cheminFichier seanceId');
      if (!pdf) throw new NotFoundError('Séance ou PDF');
      seanceId = pdf.seanceId;
      pdfs = [pdf];
    }

    if (!seanceId) throw new ValidationError('Aucune séance liée à cette ressource');
    if (pdfs.length === 0) throw new ServiceError('Séance sans PDF');

    const { moduleId } = await resolveIdsFromSeance(seanceId);

    let combinedText = '';
    for (const pdf of pdfs) {
      try {
        if (!pdf?.cheminFichier) continue;
        const text = await pdfService.extractText(pdf.cheminFichier);
        combinedText += `\n--- Document: ${pdf.nomFichier || 'Document'} ---\n${text}`;
      } catch (err) {
        logger.warn('Could not extract PDF text', { pdfId: pdf?._id, err: err.message });
      }
    }

    if (!combinedText.trim()) throw new ServiceError('Could not extract text from PDF.');

    let exercisesData = { exercises: [] };
    try {
      exercisesData = await geminiService.generateExercises(combinedText);
    } catch (err) {
      throw new ServiceError('Failed to generate exercises.', err);
    }

    const exercisesToSave = Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : [];
    if (exercisesToSave.length === 0) throw new ServiceError('No exercises were generated.');

    const savedExercises = [];
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        etudiantId: etudiantId || null,
        moduleId: moduleId || null,
        seanceId,
        typeExercice: 'seance',
        enonce: ex.enonce || ''
      });
      savedExercises.push(await newExercise.save());
    }

    logger.success('Exercises generated', { count: savedExercises.length, seanceId });
    return savedExercises;
  } catch (error) {
    logger.error('Exercise generation failed', error, { resourceId, etudiantId });
    throw error;
  }
};

export const generateFromSubModule = async (subModuleId, etudiantId) => {
  try {
    const subModule = await SubModule.findById(subModuleId);
    if (!subModule) throw new NotFoundError('SubModule');

    const moduleId = subModule.parentModuleId || await resolveModuleId(subModuleId);
    const seances = await Seance.find({ subModuleId }).select('_id').lean();
    const seanceIds = seances.map(s => s._id);
    const pdfs = await PDF.find({ seanceId: { $in: seanceIds } });
    if (pdfs.length === 0) throw new ServiceError('SubModule has no PDF documents');

    let combinedText = '';
    for (const pdf of pdfs) {
      try {
        if (!pdf?.cheminFichier) continue;
        const text = await pdfService.extractText(pdf.cheminFichier);
        combinedText += `\n--- Document: ${pdf.nomFichier || 'Document'} ---\n${text}`;
      } catch (err) {
        logger.warn('Could not extract text from PDF', { pdfId: pdf?._id, err: err.message });
      }
    }

    if (!combinedText.trim()) throw new ServiceError('Could not extract content from submodule');

    let exercisesData = { exercises: [] };
    try {
      exercisesData = await geminiService.generateExercises(combinedText);
    } catch (err) {
      throw new ServiceError('Failed to generate exercises.', err);
    }

    const exercisesToSave = Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : [];
    if (exercisesToSave.length === 0) throw new ServiceError('No exercises generated.');

    const savedExercises = [];
    const defaultSeanceId = seanceIds[0] || null;
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        etudiantId: etudiantId || null,
        moduleId: moduleId || null,
        seanceId: defaultSeanceId,
        typeExercice: 'seance',
        enonce: ex.enonce || ''
      });
      savedExercises.push(await newExercise.save());
    }

    return savedExercises;
  } catch (error) {
    logger.error('SubModule exercises generation failed', error, { subModuleId, etudiantId });
    throw error;
  }
};

export const generateFromModule = async (moduleId, etudiantId) => {
  try {
    const courseModule = await CourseModule.findById(moduleId);
    if (!courseModule) throw new NotFoundError('CourseModule');

    const subModules = await SubModule.find({ parentModuleId: moduleId });
    if (subModules.length === 0) throw new ServiceError('Module has no content');

    const subModuleIds = subModules.map(s => s._id);
    const seances = await Seance.find({ subModuleId: { $in: subModuleIds } }).select('_id').lean();
    const seanceIds = seances.map(s => s._id);
    const pdfs = await PDF.find({ seanceId: { $in: seanceIds } });
    if (pdfs.length === 0) throw new ServiceError('Module has no PDF documents');

    let combinedText = `Module: ${courseModule.titre}\n`;
    for (const pdf of pdfs) {
      try {
        if (!pdf?.cheminFichier) continue;
        const text = await pdfService.extractText(pdf.cheminFichier);
        combinedText += `\n--- ${pdf.nomFichier || 'Document'} ---\n${text}`;
      } catch (err) {
        logger.warn('Could not extract PDF', { pdfId: pdf?._id, err: err.message });
      }
    }

    if (!combinedText.trim()) throw new ServiceError('Could not extract content from module documents');

    let exercisesData = { exercises: [] };
    try {
      exercisesData = await geminiService.generateExercises(combinedText);
    } catch (err) {
      throw new ServiceError('Failed to generate exercises for module.', err);
    }

    const exercisesToSave = Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : [];
    if (exercisesToSave.length === 0) throw new ServiceError('No exercises generated for module.');

    const savedExercises = [];
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        moduleId,
        etudiantId: etudiantId || null,
        seanceId: null,
        typeExercice: 'global',
        enonce: ex.enonce || ''
      });
      savedExercises.push(await newExercise.save());
    }

    return savedExercises;
  } catch (error) {
    logger.error('Module exercises generation failed', error, { moduleId, etudiantId });
    throw error;
  }
};

export const checkModuleExisting = async (moduleId, etudiantId) => {
  try {
    const module = await CourseModule.findById(moduleId).select('_id');
    if (!module) throw new NotFoundError('Module');

    const existingExercise = await Exercise.findOne({ moduleId, etudiantId })
      .sort({ createdAt: -1 }).select('_id isSubmitted');

    if (!existingExercise) return { exists: false };
    return { exists: true, exerciseId: existingExercise._id, isSubmitted: existingExercise.isSubmitted === true };
  } catch (error) {
    logger.error('Error checking module exercises existence', error, { moduleId, etudiantId });
    throw error;
  }
};

export const getExercise = async (exerciseId, etudiantId) => {
  try {
    const exercise = await Exercise.findById(exerciseId)
      .populate('seanceId', 'titre ordre')
      .populate('moduleId', 'titre');
    if (!exercise) throw new NotFoundError('Exercise');
    if (!exercise.etudiantId || exercise.etudiantId.toString() !== etudiantId.toString()) {
      throw new ForbiddenError('Accès refusé à cette ressource');
    }
    return exercise;
  } catch (error) {
    logger.error('Error fetching exercise', error, { exerciseId });
    throw error;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// submitExercise — MODIFIÉ
// Après correction IA + sauvegarde, appelle validerSeance avec scoreExercice
// Règle Salma : validation toujours, score enregistré pour mesure CT
// ══════════════════════════════════════════════════════════════════════════════
export const submitExercise = async (exerciseId, studentId, reponse) => {
  try {
    logger.info('Submitting exercise', { exerciseId, studentId });

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) throw new NotFoundError('Exercise');
    if (!exercise.etudiantId || exercise.etudiantId.toString() !== studentId.toString()) {
      throw new ForbiddenError('Accès refusé à cette ressource');
    }
    if (exercise.isSubmitted && exercise.submittedAt) {
      throw new ServiceError('Exercise already submitted. Resubmission not allowed');
    }

    exercise.reponseEtudiante = reponse;
    exercise.submittedAt = new Date();

    // ── Correction IA ────────────────────────────────────────────────────────
    let correction = { note: 0, appreciation: '', correction: '', points_forts: [], points_amelioration: [] };
    try {
      correction = await geminiService.correctExercise(exercise.enonce, reponse, exercise.pdfText || '');
      logger.success('Gemini correction received', { exerciseId, note: correction.note });
    } catch (err) {
      logger.error('Gemini correction failed', err, { exerciseId });
      correction.correction = 'Unable to process feedback at this time';
    }

    exercise.note                = correction.note;
    exercise.correction          = correction.correction;
    exercise.feedback            = correction.appreciation;
    exercise.appreciation        = correction.appreciation;
    exercise.points_forts        = correction.points_forts        || [];
    exercise.points_amelioration = correction.points_amelioration || [];
    exercise.isSubmitted         = true;
    exercise.dateCompletion      = new Date();
    await exercise.save();

    logger.success('Exercise submitted', { exerciseId, note: exercise.note });

    // ── Liaison SeanceProgression ────────────────────────────────────────────
    // On appelle validerSeance uniquement si l'exercice est lié à une séance
    // Règle Salma : scoreExercice en % (0-100), validation toujours
    const seanceId = exercise.seanceId;
    if (seanceId) {
      try {
        const scoreExercicePct = Math.round(((exercise.note || 0) / 20) * 100); // /20 → %
        await progressionService.validerSeance(studentId, seanceId, null, scoreExercicePct);
        logger.success('SeanceProgression mise à jour après exercice', { seanceId, scoreExercicePct });
      } catch (progressionErr) {
        // Non-bloquant : ne fait pas échouer la soumission de l'exercice
        logger.warn('Progression update failed (non-blocking)', { error: progressionErr.message });
      }
    }

    return {
      exerciseId,
      note:                exercise.note,
      correction:          exercise.correction,
      feedback:            exercise.feedback,
      appreciation:        exercise.appreciation,
      points_forts:        exercise.points_forts,
      points_amelioration: exercise.points_amelioration,
      submittedAt:         exercise.submittedAt,
      message:             'Exercice évalué avec succès'
    };
  } catch (error) {
    logger.error('Exercise submission failed', error, { exerciseId, studentId });
    throw error;
  }
};

export const getStudentExercises = async (studentId) => {
  try {
    const exercises = await Exercise.find({ etudiantId: studentId })
      .populate('seanceId', 'titre ordre')
      .populate('moduleId', 'titre')
      .sort({ createdAt: -1 })
      .lean();

    return exercises.map(ex => ({
      _id:          ex._id,
      titre: ex.seanceId?.titre
        ? `Exercice — Séance "${ex.seanceId.titre}"`
        : ex.moduleId?.titre
          ? `Exercice Global — ${ex.moduleId.titre}`
          : 'Exercice',
      enonce:       ex.enonce,
      type:         ex.typeExercice,
      submitted:    ex.isSubmitted === true,
      note:         ex.note   ?? null,
      appreciation: ex.appreciation || ex.feedback || null,
      points_forts: ex.points_forts || [],
      points_amelioration: ex.points_amelioration || [],
      hasCorrection: !!ex.correction,
      moduleId:     ex.moduleId?._id || ex.moduleId || null,
      seanceId:     ex.seanceId?._id || ex.seanceId || null,
      submittedAt:  ex.submittedAt || null,
      createdAt:    ex.createdAt
    }));
  } catch (error) {
    logger.error('Error fetching student exercises', error, { studentId });
    throw error;
  }
};