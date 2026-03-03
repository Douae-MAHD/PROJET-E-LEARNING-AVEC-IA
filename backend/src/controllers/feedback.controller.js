/**
 * Feedback Controller
 * Phase 3 — Feedback enrichi par module étudiant
 * Note style: `quizController` utilise un style classe par choix.
 * Ce controller conserve le style `export const` pour cohérence locale.
 */

import { asyncHandler } from '../utils/errorHandler.js';
import * as feedbackService from '../services/feedback.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';

// ── Enseignant : résultats de sa classe ──
export const getTeacherResults = asyncHandler(async (req, res) => {
  const professorId = req.user.id;
  const results = await feedbackService.getTeacherResults(professorId);
  sendSuccess(res, results, 'Résultats récupérés');
});

// ── Enseignant : feedback global existant ──
export const getGlobalFeedback = asyncHandler(async (req, res) => {
  const professorId = req.user.id;
  const feedback = await feedbackService.getGlobalFeedback(professorId);
  sendSuccess(res, { feedback }, 'Feedback global');
});

// ── Enseignant : génération feedback global IA ──
export const generateGlobalFeedback = asyncHandler(async (req, res) => {
  const professorId = req.user.id;
  const feedback = await feedbackService.generateGlobalFeedback(professorId);
  sendSuccess(res, { feedback }, 'Feedback généré');
});

// ── Étudiant : feedback complet pour un module ──
// GET /api/feedback/module/:moduleId/student
export const getStudentFeedback = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const { moduleId } = req.params;

  // Validation basique du moduleId
  if (!moduleId || moduleId === 'undefined') {
    return res.status(400).json({
      success: false,
      error: { message: 'moduleId est requis et doit être valide.' }
    });
  }

  const feedback = await feedbackService.getStudentFeedback(studentId, moduleId);

  // ✅ Réponse structurée avec succès explicite
  res.json({
    success: true,
    data: feedback,
    // Rétrocompatibilité : exposer quizzes/exercises à la racine aussi
    quizzes: feedback.quizzes,
    exercises: feedback.exercises,
    statistics: feedback.statistics,
    globalSummary: feedback.globalSummary
  });
});