/**
 * Feedback Routes
 * Phase 3 — Routes feedback enrichies
 */

import express from 'express';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// ── Enseignant ──────────────────────────────────────────────
router.get(
  '/teacher/results',
  authenticateToken,
  requireRole(['professeur']),
  feedbackController.getTeacherResults
);

router.get(
  '/teacher/global',
  authenticateToken,
  requireRole(['professeur']),
  feedbackController.getGlobalFeedback
);

router.post(
  '/teacher/global',
  authenticateToken,
  requireRole(['professeur']),
  feedbackController.generateGlobalFeedback
);

// ── Étudiant ────────────────────────────────────────────────
// GET /api/feedback/module/:moduleId/student
// Retourne : quizzes[], exercises[], statistics, globalSummary
/**
 * @swagger
 * /api/feedback/module/{moduleId}/student:
 *   get:
 *     summary: Récupère les feedbacks d'un étudiant pour un module
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedbacks récupérés
 *       403:
 *         description: Accès refusé
 */
router.get(
  '/module/:moduleId/student',
  authenticateToken,
  requireRole(['etudiant']),
  feedbackController.getStudentFeedback
);

export default router;