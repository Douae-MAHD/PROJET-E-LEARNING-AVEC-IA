/**
 * Quiz Repository
 * Handles all database operations for Quiz model
 * 
 * Responsibilities:
 * - CRUD operations
 * - Database queries
 * - Data persistence
 * 
 * Does NOT:
 * - Business logic
 * - Validation
 * - HTTP handling
 */

import Quiz from '../models/Quiz.js';
import mongoose from 'mongoose';
import { DatabaseError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export class QuizRepository {
  /**
   * Find quiz by ID
   */
  async findById(quizId) {
    try {
      const quiz = await Quiz.findById(quizId)
        .populate('seanceId', 'titre ordre')
        .populate('moduleId', 'titre')
        .populate('etudiantId', 'nom prenom email');
      
      return quiz;
    } catch (error) {
      logger.error('Error finding quiz by ID', error, { quizId });
      throw new DatabaseError('Failed to retrieve quiz');
    }
  }

  async findBySeance(seanceId) {
    try {
      return await Quiz.find({ seanceId }).lean();
    } catch (error) {
      logger.error('Error finding quiz by seance', error, { seanceId });
      throw new DatabaseError('Failed to retrieve quiz');
    }
  }

  async findGlobalByModule(moduleId) {
    try {
      return await Quiz.find({ moduleId, typeQuiz: 'global' }).lean();
    } catch (error) {
      logger.error('Error finding global quizzes by module', error, { moduleId });
      throw new DatabaseError('Failed to retrieve quiz');
    }
  }

  /**
   * Find all quizzes for a student
   */
  async findByStudent(etudiantId, options = {}) {
    try {
      const { limit = 10, page = 1, moduleId = null } = options;
      const skip = (page - 1) * limit;

      let query = { etudiantId };
      if (moduleId) {
        query.moduleId = moduleId;
      }

      const quizzes = await Quiz.find(query)
        .populate('seanceId', 'titre ordre')
        .populate('moduleId', 'titre')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Quiz.countDocuments(query);

      return { quizzes, total };
    } catch (error) {
      logger.error('Error finding quizzes by student', error, { etudiantId });
      throw new DatabaseError('Failed to retrieve quizzes');
    }
  }

  /**
   * Find all quizzes for a module (professor view)
   */
  async findByModule(moduleId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;
      const skip = (page - 1) * limit;

      const quizzes = await Quiz.find({ moduleId })
        .populate('etudiantId', 'nom prenom email')
        .populate('seanceId', 'titre ordre')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Quiz.countDocuments({ moduleId });

      return { quizzes, total };
    } catch (error) {
      logger.error('Error finding quizzes by module', error, { moduleId });
      throw new DatabaseError('Failed to retrieve quizzes');
    }
  }

  /**
   * Create new quiz
   */
  async create(quizData) {
    try {
      const quiz = new Quiz(quizData);
      const savedQuiz = await quiz.save();
      logger.info('Quiz created successfully', { quizId: savedQuiz._id });
      return savedQuiz;
    } catch (error) {
      logger.error('Error creating quiz', error, { quizData });
      throw new DatabaseError('Failed to create quiz');
    }
  }

  /**
   * Update quiz responses and scores
   */
  async updateWithResponses(quizId, reponsesEtudiant, note, details = {}) {
    try {
      const quiz = await Quiz.findByIdAndUpdate(
        quizId,
        {
          reponsesEtudiant,
          note,
          dateCompletion: new Date(),
          ...details
        },
        { new: true, runValidators: true }
      );
      logger.info('Quiz responses updated', { quizId, note });
      return quiz;
    } catch (error) {
      logger.error('Error updating quiz responses', error, { quizId });
      throw new DatabaseError('Failed to update quiz');
    }
  }

  async exists(seanceId, etudiantId) {
    try {
      const count = await Quiz.countDocuments({ seanceId, etudiantId });
      return count > 0;
    } catch (error) {
      logger.error('Error checking quiz existence', error, { seanceId, etudiantId });
      throw new DatabaseError('Failed to check quiz existence');
    }
  }

  /**
   * Get statistics for a module
   */
  async getModuleStats(moduleId) {
    try {
      const stats = await Quiz.aggregate([
        { $match: { moduleId: new mongoose.Types.ObjectId(moduleId) } },
        {
          $group: {
            _id: '$moduleId',
            totalQuizzes: { $sum: 1 },
            averageScore: { $avg: '$note' },
            maxScore: { $max: '$note' },
            minScore: { $min: '$note' },
            completedCount: {
              $sum: { $cond: [{ $ne: ['$note', null] }, 1, 0] }
            }
          }
        }
      ]);

      return stats.length > 0 ? stats[0] : {
        totalQuizzes: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        completedCount: 0
      };
    } catch (error) {
      logger.error('Error getting module statistics', error, { moduleId });
      throw new DatabaseError('Failed to get statistics');
    }
  }

  /**
   * Delete quiz
   */
  async delete(quizId) {
    try {
      const result = await Quiz.findByIdAndDelete(quizId);
      logger.info('Quiz deleted', { quizId });
      return result;
    } catch (error) {
      logger.error('Error deleting quiz', error, { quizId });
      throw new DatabaseError('Failed to delete quiz');
    }
  }
}

export default new QuizRepository();
