/**
 * Quiz Controller
 * Handles HTTP request/response for quiz endpoints
 * 
 * Responsibilities:
 * - Extract parameters from requests
 * - Validate input using validators
 * - Call appropriate services
 * - Format HTTP responses
 * - Handle errors and status codes
 * 
 * Does NOT:
 * - Contain business logic (that's services)
 * - Access database directly (that's repositories)
 * - Make AI calls directly (that's services)
 */

import quizService from '../services/quiz/quizService.js';
import quizValidator from '../services/quiz/quizValidator.js';
import { asyncHandler, ValidationError, NotFoundError } from '../utils/errorHandler.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import logger from '../utils/logger.js';

export class QuizController {
  /**
   * GET /quiz/check/module/:moduleId
   * Check if module quiz already exists for current student
   */
  checkModuleExisting = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const etudiantId = req.user.id;

    logger.logRequest('GET', `/quiz/check/module/${moduleId}`, etudiantId);

    const result = await quizService.checkModuleExisting(moduleId, etudiantId);
    sendSuccess(res, result, 'Module quiz check completed');
  });

  /**
   * POST /quiz/generate/:pdfId
   * Generate quiz from PDF
   */
  generateFromPDF = asyncHandler(async (req, res) => {
    const { pdfId } = req.params;
    const etudiantId = req.user.id;

    logger.logRequest('POST', `/quiz/generate/${pdfId}`, etudiantId);

    // Validate input
    quizValidator.validateGeneratePDFRequest(pdfId);

    // Call service
    const quiz = await quizService.generateQuizFromPDF(pdfId, etudiantId);

    // Send response
    sendSuccess(res, quiz, 'Quiz generated successfully', 201);
  });

  /**
   * POST /quiz/generate/module/:moduleId
   * Generate quiz from entire module (all PDFs)
   */
  generateFromModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const etudiantId = req.user.id;

    logger.logRequest('POST', `/quiz/generate/module/${moduleId}`, etudiantId);

    // Validate input
    quizValidator.validateGenerateModuleRequest(moduleId);

    // Call service
    const quiz = await quizService.generateQuizFromModule(moduleId, etudiantId);

    // Send response
    sendSuccess(res, quiz, 'Module quiz generated successfully', 201);
  });

  /**
   * POST /quiz/generate/cours/:subModuleId
   * Generate quiz from submodule (cours)
   */
  generateFromSubModule = asyncHandler(async (req, res) => {
    const { subModuleId } = req.params;
    const etudiantId = req.user.id;

    logger.logRequest('POST', `/quiz/generate/cours/${subModuleId}`, etudiantId);

    // Validate input
    quizValidator.validateGenerateModuleRequest(subModuleId);

    // Call service
    const quiz = await quizService.generateQuizFromSubModule(subModuleId, etudiantId);

    // Send response
    sendSuccess(res, quiz, 'SubModule quiz generated successfully', 201);
  });

  /**
   * GET /quiz/:quizId
   * Retrieve quiz questions
   */
  getQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const etudiantId = req.user.id;

    logger.logRequest('GET', `/quiz/${quizId}`, etudiantId);

    // Validate input
    quizValidator.validateGetQuizRequest(quizId);

    // Call service
    const quiz = await quizService.getQuiz(quizId, etudiantId);

    // Send response
    sendSuccess(res, quiz, 'Quiz retrieved successfully');
  });

  /**
   * POST /quiz/:quizId/submit
   * Submit quiz answers and get score
   */
  submitQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const { reponsesEtudiant } = req.body;
    const etudiantId = req.user.id;

    logger.logRequest('POST', `/quiz/${quizId}/submit`, etudiantId);

    // Validate input
    quizValidator.validateSubmitRequest(quizId, reponsesEtudiant);

    // Call service
    const result = await quizService.submitQuiz(quizId, etudiantId, reponsesEtudiant);

    // Send response
    sendSuccess(res, result, 'Quiz submitted and scored successfully');
  });

  /**
   * GET /quiz/student/all
   * Get all quizzes for current student
   */
  getStudentQuizzes = asyncHandler(async (req, res) => {
    const etudiantId = req.user.id;
    const { moduleId = null, page = 1, limit = 10 } = req.query;

    logger.logRequest('GET', '/quiz/student/all', etudiantId);

    // Validate pagination
    quizValidator.validatePagination(page, limit);

    // Call service
    const quizzes = await quizService.getStudentQuizzes(
      etudiantId,
      moduleId,
      parseInt(page),
      parseInt(limit)
    );

    // Send response
    sendSuccess(res, quizzes, 'Student quizzes retrieved successfully');
  });

  /**
   * GET /quiz/module/:moduleId/stats
   * Get module quiz statistics (for professor)
   */
  getModuleStats = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    logger.logRequest('GET', `/quiz/module/${moduleId}/stats`);

    // Validate input
    quizValidator.validateModuleId(moduleId);

    // Call service
    const stats = await quizService.getModuleStats(moduleId);

    // Send response
    sendSuccess(res, stats, 'Module statistics retrieved successfully');
  });
}

export default new QuizController();
