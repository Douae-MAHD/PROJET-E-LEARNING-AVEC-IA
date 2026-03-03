/**
 * Enrollment Repository
 * Handles all database operations for ModuleEnrollment model
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

import ModuleEnrollment from '../models/ModuleEnrollment.js';
import User from '../models/User.js';
import CourseModule from '../models/CourseModule.js';
import mongoose from 'mongoose';
import { DatabaseError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export class EnrollmentRepository {
  /**
   * Create enrollment
   */
  async create(enrollmentData) {
    try {
      const enrollment = new ModuleEnrollment(enrollmentData);
      const saved = await enrollment.save();
      logger.debug('Enrollment created', { enrollmentId: saved._id });
      return saved;
    } catch (error) {
      logger.error('Error creating enrollment', error);
      throw new DatabaseError('Failed to create enrollment');
    }
  }

  /**
   * Find enrollment by ID
   */
  async findById(enrollmentId) {
    try {
      const enrollment = await ModuleEnrollment.findById(enrollmentId)
        .populate('etudiantId', 'nom prenom email')
        .populate('moduleId', 'titre');
      
      return enrollment;
    } catch (error) {
      logger.error('Error finding enrollment by ID', error, { enrollmentId });
      throw new DatabaseError('Failed to retrieve enrollment');
    }
  }

  /**
   * Find enrollments for a student
   */
  async findByStudent(etudiantId, options = {}) {
    try {
      const { limit = 20, page = 1 } = options;
      const skip = (page - 1) * limit;

      const enrollments = await ModuleEnrollment.find({ etudiantId })
        .populate('moduleId', 'titre description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ModuleEnrollment.countDocuments({ etudiantId });

      return { enrollments, total };
    } catch (error) {
      logger.error('Error finding enrollments by student', error, { etudiantId });
      throw new DatabaseError('Failed to retrieve enrollments');
    }
  }

  /**
   * Find enrollments for a module
   */
  async findByModule(moduleId, options = {}) {
    try {
      const { limit = 50, page = 1 } = options;
      const skip = (page - 1) * limit;

      const enrollments = await ModuleEnrollment.find({ moduleId })
        .populate('etudiantId', 'nom prenom email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ModuleEnrollment.countDocuments({ moduleId });

      return { enrollments, total };
    } catch (error) {
      logger.error('Error finding enrollments by module', error, { moduleId });
      throw new DatabaseError('Failed to retrieve enrollments');
    }
  }

  /**
   * Check if student is enrolled in module
   */
  async isEnrolled(etudiantId, moduleId) {
    try {
      const enrollment = await ModuleEnrollment.findOne({
        etudiantId,
        moduleId
      });

      return !!enrollment;
    } catch (error) {
      logger.error('Error checking enrollment', error, { etudiantId, moduleId });
      throw new DatabaseError('Failed to check enrollment');
    }
  }

  /**
   * Update enrollment
   */
  async update(enrollmentId, updateData) {
    try {
      const enrollment = await ModuleEnrollment.findByIdAndUpdate(
        enrollmentId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!enrollment) {
        throw new DatabaseError('Enrollment not found');
      }

      logger.debug('Enrollment updated', { enrollmentId });
      return enrollment;
    } catch (error) {
      logger.error('Error updating enrollment', error, { enrollmentId });
      throw new DatabaseError('Failed to update enrollment');
    }
  }

  /**
   * Delete enrollment
   */
  async delete(enrollmentId) {
    try {
      const result = await ModuleEnrollment.findByIdAndDelete(enrollmentId);

      if (!result) {
        throw new DatabaseError('Enrollment not found');
      }

      logger.debug('Enrollment deleted', { enrollmentId });
      return result;
    } catch (error) {
      logger.error('Error deleting enrollment', error, { enrollmentId });
      throw new DatabaseError('Failed to delete enrollment');
    }
  }

  /**
   * Get module statistics
   */
  async getModuleStats(moduleId) {
    try {
      const stats = await ModuleEnrollment.aggregate([
        {
          $match: {
            moduleId: new mongoose.Types.ObjectId(moduleId)
          }
        },
        {
          $group: {
            _id: '$moduleId',
            totalEnrollments: { $sum: 1 },
            lastEnrollment: { $max: '$createdAt' }
          }
        }
      ]);

      return stats[0] || { totalEnrollments: 0, lastEnrollment: null };
    } catch (error) {
      logger.error('Error getting module stats', error, { moduleId });
      throw new DatabaseError('Failed to retrieve statistics');
    }
  }
}

export default new EnrollmentRepository();
