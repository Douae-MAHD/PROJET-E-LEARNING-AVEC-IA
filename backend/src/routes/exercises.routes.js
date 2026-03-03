/**
 * Exercises Routes
 * Phase 3 — Fix : ordre des routes pour éviter conflit /generate/:pdfId
 *
 * ⚠️  IMPORTANT : Express matche les routes dans l'ordre de déclaration.
 *     "/generate/cours/:subModuleId" et "/generate/module/:moduleId" doivent
 *     être déclarées AVANT "/generate/:pdfId", sinon Express traite
 *     "cours" et "module" comme des pdfIds.
 */

import express from 'express';
import * as exercisesController from '../controllers/exercises.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { aiGenerationLimiter, assessmentSubmitLimiter } from '../middlewares/rateLimiter.js';
import {
  validateExerciseSubmit,
  validateExerciseIdParam,
  validateModuleIdParam,
  validateSubModuleIdParam,
  validatePdfIdParam
} from '../validators/exercise.validator.js';

const router = express.Router();

// ── Génération IA ─────────────────────────────────────────────────────────
// ✅ FIX ORDRE : routes spécifiques avant la route générique /:pdfId
/**
 * @swagger
 * /api/exercises/generate/{pdfId}:
 *   post:
 *     summary: Génère des exercices depuis un PDF
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pdfId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Exercices générés
 *       429:
 *         description: Limite de génération atteinte
 */
router.post(
  '/generate/cours/:subModuleId',
  aiGenerationLimiter,
  authenticateToken,
  validateSubModuleIdParam,
  exercisesController.generateForCourse
);

router.post(
  '/generate/module/:moduleId',
  aiGenerationLimiter,
  authenticateToken,
  validateModuleIdParam,
  exercisesController.generateGlobal
);

// Route générique en DERNIER dans le groupe /generate
router.post(
  '/generate/:pdfId',
  aiGenerationLimiter,
  authenticateToken,
  validatePdfIdParam,
  exercisesController.generateFromPDF
);

// ── Consultation ──────────────────────────────────────────────────────────
// ✅ FIX ORDRE : /student/all avant /:exerciseId
// (sinon Express traite "student" comme un exerciseId)
router.get(
  '/student/all',
  authenticateToken,
  exercisesController.getStudentExercises
);

router.get(
  '/check/module/:moduleId',
  authenticateToken,
  validateModuleIdParam,
  exercisesController.checkModuleExisting
);

router.get(
  '/:exerciseId',
  authenticateToken,
  validateExerciseIdParam,
  exercisesController.getExercise
);

// ── Soumission ────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/exercises/{exerciseId}/submit:
 *   post:
 *     summary: Soumet une réponse d'exercice
 *     tags: [Exercises]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reponse]
 *             properties:
 *               reponse:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: Exercice soumis
 *       429:
 *         description: Limite de soumissions atteinte
 */
router.post(
  '/:exerciseId/submit',
  assessmentSubmitLimiter,
  authenticateToken,
  validateExerciseIdParam,
  validateExerciseSubmit,
  exercisesController.submitExercise
);

export default router;