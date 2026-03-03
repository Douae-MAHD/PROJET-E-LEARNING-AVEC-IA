/**
 * Quiz Validator
 * Validates quiz-related requests
 * 
 * Responsibilities:
 * - Validate input parameters
 * - Validate request body
 * - Check constraints
 * - Throw appropriate errors
 * 
 * Does NOT:
 * - Access database
 * - Contain business logic
 * - Make external API calls
 */

import mongoose from 'mongoose';
import { ValidationError } from '../../utils/errorHandler.js';

export class QuizValidator {
  /**
   * Validate PDF ID for quiz generation
   */
  validateGeneratePDFRequest(pdfId) {
    if (!pdfId) {
      throw new ValidationError('PDF ID is required', 'pdfId');
    }

    if (!mongoose.Types.ObjectId.isValid(pdfId)) {
      throw new ValidationError('Invalid PDF ID format', 'pdfId');
    }
  }

  /**
   * Validate module ID for quiz generation
   */
  validateGenerateModuleRequest(moduleId) {
    if (!moduleId) {
      throw new ValidationError('Module ID is required', 'moduleId');
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw new ValidationError('Invalid module ID format', 'moduleId');
    }
  }

  /**
   * Validate quiz ID
   */
  validateGetQuizRequest(quizId) {
    if (!quizId) {
      throw new ValidationError('Quiz ID is required', 'quizId');
    }

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw new ValidationError('Invalid quiz ID format', 'quizId');
    }
  }

  /**
   * Validate quiz submission
   */
  validateSubmitRequest(quizId, reponsesEtudiant) {
    // Validate quiz ID
    if (!quizId) {
      throw new ValidationError('Quiz ID is required', 'quizId');
    }

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw new ValidationError('Invalid quiz ID format', 'quizId');
    }

    // Validate responses
    if (!reponsesEtudiant) {
      throw new ValidationError('Student responses are required', 'reponsesEtudiant');
    }

    if (!Array.isArray(reponsesEtudiant)) {
      throw new ValidationError('Responses must be an array', 'reponsesEtudiant');
    }

    if (reponsesEtudiant.length === 0) {
      throw new ValidationError('At least one response is required', 'reponsesEtudiant');
    }

    // Validate each response
    reponsesEtudiant.forEach((response, index) => {
      if (!response.questionId) {
        throw new ValidationError(`Response ${index} missing questionId`, 'reponsesEtudiant');
      }

      if (!mongoose.Types.ObjectId.isValid(response.questionId)) {
        throw new ValidationError(`Response ${index} has invalid questionId`, 'reponsesEtudiant');
      }

      if (!response.reponse && response.reponse !== 0) {
        throw new ValidationError(`Response ${index} missing answer`, 'reponsesEtudiant');
      }
    });
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page, limit) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Page must be a positive number', 'page');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new ValidationError('Limit must be between 1 and 100', 'limit');
    }
  }

  /**
   * Validate module ID
   */
  validateModuleId(moduleId) {
    if (!moduleId) {
      throw new ValidationError('Module ID is required', 'moduleId');
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw new ValidationError('Invalid module ID format', 'moduleId');
    }
  }

  /**
   * Validate ObjectId
   */
  validateObjectId(id, fieldName = 'ID') {
    if (!id) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
    }
  }
}

export default new QuizValidator();
