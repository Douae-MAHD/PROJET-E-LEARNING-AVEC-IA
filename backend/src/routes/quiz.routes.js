/**
 * Quiz Routes
 * Minimal route definitions
 * 
 * Responsibilities:
 * - Map HTTP methods to endpoints
 * - Extract parameters
 * - Call controllers
 * 
 * Does NOT:
 * - Contain business logic
 * - Make database calls
 * - Make API calls
 * - Validate inputs (controller + validator do this)
 */

import express from 'express';
import quizController from '../controllers/quizController.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { aiGenerationLimiter, assessmentSubmitLimiter } from '../middlewares/rateLimiter.js';
import {
  validateQuizSubmit,
  validateQuizIdParam,
  validateModuleIdParam,
  validateSubModuleIdParam,
  validateSeanceIdParam,
  validatePdfIdParam
} from '../validators/quiz.validator.js';

const router = express.Router();

// Generate quiz from PDF
/**
 * @swagger
 * /api/quiz/generate/{pdfId}:
 *   post:
 *     summary: Génère un quiz depuis un PDF
 *     tags: [Quiz]
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
 *         description: Quiz généré
 *       429:
 *         description: Limite de génération atteinte
 */
router.post(
  '/generate/:pdfId',
  aiGenerationLimiter,
  authenticateToken,
  requireRole(['etudiant']),
  validatePdfIdParam,
  quizController.generateFromPDF
);

// Generate quiz from submodule (cours)
router.post(
  '/generate/cours/:subModuleId',
  aiGenerationLimiter,
  authenticateToken,
  requireRole(['etudiant']),
  validateSubModuleIdParam,
  quizController.generateFromSubModule
);

// Generate quiz from seance
router.post(
  '/generate/seance/:seanceId',
  aiGenerationLimiter,
  authenticateToken,
  requireRole(['etudiant']),
  validateSeanceIdParam,
  quizController.generateFromSeance
);

// Generate quiz from entire module
router.post(
  '/generate/module/:moduleId',
  aiGenerationLimiter,
  authenticateToken,
  requireRole(['etudiant']),
  validateModuleIdParam,
  quizController.generateFromModule
);

router.get(
  '/check/module/:moduleId',
  authenticateToken,
  requireRole(['etudiant']),
  validateModuleIdParam,
  quizController.checkModuleExisting
);

// Get quiz with questions
/**
 * @swagger
 * /api/quiz/{quizId}:
 *   get:
 *     summary: Récupère un quiz
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz récupéré
 *       403:
 *         description: Accès refusé
 */
router.get(
  '/:quizId',
  authenticateToken,
  validateQuizIdParam,
  quizController.getQuiz
);

// Submit quiz answers
/**
 * @swagger
 * /api/quiz/{quizId}/submit:
 *   post:
 *     summary: Soumet un quiz et retourne la note
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reponsesEtudiant]
 *             properties:
 *               reponsesEtudiant:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [questionId, reponse]
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     reponse:
 *                       type: string
 *     responses:
 *       200:
 *         description: Quiz soumis
 *       429:
 *         description: Limite de soumissions atteinte
 */
router.post(
  '/:quizId/submit',
  assessmentSubmitLimiter,
  authenticateToken,
  validateQuizIdParam,
  validateQuizSubmit,
  quizController.submitQuiz
);

// Get all student quizzes
router.get(
  '/student/all',
  authenticateToken,
  requireRole(['etudiant']),
  quizController.getStudentQuizzes
);

// Get module statistics (professor)
router.get(
  '/module/:moduleId/stats',
  authenticateToken,
  requireRole(['professeur']),
  validateModuleIdParam,
  quizController.getModuleStats
);

export default router;
