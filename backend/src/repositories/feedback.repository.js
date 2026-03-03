/**
 * Feedback Repository
 * Handles all database operations for Feedback model
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

import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Exercise from '../models/Exercise.js';
import { DatabaseError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export class FeedbackRepository {
  /**
   * Create feedback
   */
  async create(feedbackData) {
    try {
      const feedback = new Feedback(feedbackData);
      const saved = await feedback.save();
      logger.debug('Feedback created', { feedbackId: saved._id });
      return saved;
    } catch (error) {
      logger.error('Error creating feedback', error);
      throw new DatabaseError('Failed to create feedback');
    }
  }

  /**
   * Find feedback by ID
   */
  async findById(feedbackId) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('etudiantId', 'nom prenom email')
        .populate('quizId', 'note moduleId pdfId isSubmitted')
        .populate('exerciseId', 'enonce');
      
      return feedback;
    } catch (error) {
      logger.error('Error finding feedback by ID', error, { feedbackId });
      throw new DatabaseError('Failed to retrieve feedback');
    }
  }

  /**
   * Find all feedback for a student
   */
  async findByStudent(etudiantId, options = {}) {
    try {
      const { limit = 20, page = 1, type = null } = options;
      const skip = (page - 1) * limit;

      let query = { etudiantId };
      if (type) {
        query.typeFeedback = type;
      }

      const feedbacks = await Feedback.find(query)
        .populate('quizId', 'note moduleId isSubmitted')
        .populate('exerciseId', 'enonce')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Feedback.countDocuments(query);

      return { feedbacks, total };
    } catch (error) {
      logger.error('Error finding feedback by student', error, { etudiantId });
      throw new DatabaseError('Failed to retrieve feedback');
    }
  }

  /**
   * Find feedback for a specific quiz
   */
  async findByQuiz(quizId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;
      const skip = (page - 1) * limit;

      const feedbacks = await Feedback.find({ quizId })
        .populate('etudiantId', 'nom prenom email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Feedback.countDocuments({ quizId });

      return { feedbacks, total };
    } catch (error) {
      logger.error('Error finding feedback by quiz', error, { quizId });
      throw new DatabaseError('Failed to retrieve feedback');
    }
  }

  /**
   * Find feedback for a specific exercise
   */
  async findByExercise(exerciseId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;
      const skip = (page - 1) * limit;

      const feedbacks = await Feedback.find({ exerciseId })
        .populate('etudiantId', 'nom prenom email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Feedback.countDocuments({ exerciseId });

      return { feedbacks, total };
    } catch (error) {
      logger.error('Error finding feedback by exercise', error, { exerciseId });
      throw new DatabaseError('Failed to retrieve feedback');
    }
  }

  /**
   * Find all feedback for a module (professor dashboard)
   */
  async findByModule(moduleId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;
      const skip = (page - 1) * limit;

      const feedbacks = await Feedback.find({ moduleId })
        .populate('etudiantId', 'nom email')
        .populate('quizId', 'note isSubmitted')
        .populate('exerciseId', 'note isSubmitted')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Feedback.countDocuments({ moduleId });

      return { feedbacks, total };
    } catch (error) {
      logger.error('Error finding feedback by module', error, { moduleId });
      throw new DatabaseError('Failed to retrieve feedback');
    }
  }

  /**
   * Update feedback
   */
  async update(feedbackId, updateData) {
    try {
      const feedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!feedback) {
        throw new DatabaseError('Feedback not found');
      }

      logger.debug('Feedback updated', { feedbackId });
      return feedback;
    } catch (error) {
      logger.error('Error updating feedback', error, { feedbackId });
      throw new DatabaseError('Failed to update feedback');
    }
  }

  /**
   * Delete feedback
   */
  async delete(feedbackId) {
    try {
      const result = await Feedback.findByIdAndDelete(feedbackId);

      if (!result) {
        throw new DatabaseError('Feedback not found');
      }

      logger.debug('Feedback deleted', { feedbackId });
      return result;
    } catch (error) {
      logger.error('Error deleting feedback', error, { feedbackId });
      throw new DatabaseError('Failed to delete feedback');
    }
  }

  /**
   * Count feedback by type
   */
  async countByType() {
    try {
      return await Feedback.aggregate([
        {
          $group: {
            _id: '$typeFeedback',
            count: { $sum: 1 }
          }
        }
      ]);
    } catch (error) {
      logger.error('Error counting feedback by type', error);
      throw new DatabaseError('Failed to count feedback');
    }
  }
}

export default new FeedbackRepository();
