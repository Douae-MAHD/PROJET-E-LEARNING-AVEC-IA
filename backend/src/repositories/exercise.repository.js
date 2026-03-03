/**
 * Exercise Repository
 * Handles all database operations for Exercise model
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

import Exercise from '../models/Exercise.js';
import PDF from '../models/PDF.js';
import CourseModule from '../models/CourseModule.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { DatabaseError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export class ExerciseRepository {
  /**
   * Create exercise
   */
  async create(exerciseData) {
    try {
      const exercise = new Exercise(exerciseData);
      const saved = await exercise.save();
      logger.debug('Exercise created', { exerciseId: saved._id });
      return saved;
    } catch (error) {
      logger.error('Error creating exercise', error);
      throw new DatabaseError('Failed to create exercise');
    }
  }

  /**
   * Find exercise by ID
   */
  async findById(exerciseId) {
    try {
      const exercise = await Exercise.findById(exerciseId)
        .populate('pdfId', 'nomFichier cheminFichier')
        .populate('moduleId', 'titre')
        .populate('etudiantId', 'nom prenom email');
      
      return exercise;
    } catch (error) {
      logger.error('Error finding exercise by ID', error, { exerciseId });
      throw new DatabaseError('Failed to retrieve exercise');
    }
  }

  /**
   * Find exercises by PDF and Student
   */
  async findByPdfAndStudent(pdfId, etudiantId) {
    try {
      const exercises = await Exercise.find({
        pdfId,
        etudiantId
      }).populate('pdfId', 'nomFichier');
      
      return exercises;
    } catch (error) {
      logger.error('Error finding exercises by PDF and student', error, { pdfId, etudiantId });
      throw new DatabaseError('Failed to retrieve exercises');
    }
  }

  /**
   * Find all exercises for a student
   */
  async findByStudent(etudiantId, options = {}) {
    try {
      const { limit = 10, page = 1, moduleId = null, completed = null } = options;
      const skip = (page - 1) * limit;

      let query = { etudiantId };
      if (moduleId) {
        query.moduleId = moduleId;
      }
      if (completed !== null) {
        query.dateCompletion = completed ? { $ne: null } : null;
      }

      const exercises = await Exercise.find(query)
        .populate('pdfId', 'nomFichier')
        .populate('moduleId', 'titre')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Exercise.countDocuments(query);

      return { exercises, total };
    } catch (error) {
      logger.error('Error finding exercises by student', error, { etudiantId });
      throw new DatabaseError('Failed to retrieve exercises');
    }
  }

  /**
   * Find all exercises for a module (professor view)
   */
  async findByModule(moduleId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;
      const skip = (page - 1) * limit;

      const exercises = await Exercise.find({ moduleId })
        .populate('etudiantId', 'nom prenom email')
        .populate('pdfId', 'nomFichier')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Exercise.countDocuments({ moduleId });

      return { exercises, total };
    } catch (error) {
      logger.error('Error finding exercises by module', error, { moduleId });
      throw new DatabaseError('Failed to retrieve exercises');
    }
  }

  /**
   * Update exercise
   */
  async update(exerciseId, updateData) {
    try {
      const exercise = await Exercise.findByIdAndUpdate(
        exerciseId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!exercise) {
        throw new DatabaseError('Exercise not found');
      }

      logger.debug('Exercise updated', { exerciseId });
      return exercise;
    } catch (error) {
      logger.error('Error updating exercise', error, { exerciseId });
      throw new DatabaseError('Failed to update exercise');
    }
  }

  /**
   * Delete exercise
   */
  async delete(exerciseId) {
    try {
      const result = await Exercise.findByIdAndDelete(exerciseId);

      if (!result) {
        throw new DatabaseError('Exercise not found');
      }

      logger.debug('Exercise deleted', { exerciseId });
      return result;
    } catch (error) {
      logger.error('Error deleting exercise', error, { exerciseId });
      throw new DatabaseError('Failed to delete exercise');
    }
  }

  /**
   * Get exercise statistics for a module
   */
  async getModuleStats(moduleId) {
    try {
      const stats = await Exercise.aggregate([
        { $match: { moduleId: new mongoose.Types.ObjectId(moduleId) } },
        {
          $group: {
            _id: '$moduleId',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $ne: ['$dateCompletion', null] }, 1, 0] }
            },
            averageScore: { $avg: '$note' },
            maxScore: { $max: '$note' },
            minScore: { $min: '$note' }
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      logger.error('Error getting module stats', error, { moduleId });
      throw new DatabaseError('Failed to retrieve statistics');
    }
  }
}

export default new ExerciseRepository();
