/**
 * Enrollments Service
 * Handles business logic for student enrollments
 * 
 * Responsibilities:
 * - Enrollment business logic
 * - Authorization checks
 * - Data orchestration
 * 
 * Does NOT:
 * - Make database calls directly (use repositories)
 * - Handle HTTP requests (that's controllers)
 */

import mongoose from 'mongoose';
import CourseModule from '../models/CourseModule.js';
import User from '../models/User.js';
import enrollmentRepository from '../repositories/enrollment.repository.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

class EnrollmentsService {
  /**
   * Get all students enrolled in a module
   */
  async getModuleStudents(moduleId, professorId) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ValidationError('Invalid module ID');
      }

      const moduleIdObj = new mongoose.Types.ObjectId(moduleId);

      // Check that module belongs to professor
      const module = await CourseModule.findById(moduleIdObj);
      if (!module) {
        throw new NotFoundError('Module not found');
      }

      if (module.professorId.toString() !== professorId) {
        throw new ForbiddenError('You do not have access to this module');
      }

      // Get enrollments
      const { enrollments } = await enrollmentRepository.findByModule(moduleIdObj, {
        limit: 1000, // Get all
        page: 1
      });

      // Format response
      const students = enrollments.map(enrollment => ({
        _id: enrollment.etudiantId._id,
        nom: enrollment.etudiantId.nom,
        email: enrollment.etudiantId.email,
        inscription_date: enrollment.createdAt,
      }));

      logger.debug('Retrieved module students', { moduleId, count: students.length });
      return students;
    } catch (error) {
      logger.error('Error getting module students', error);
      throw error;
    }
  }

  /**
   * Get available (non-enrolled) students for a module
   */
  async getAvailableStudents(moduleId, professorId) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ValidationError('Invalid module ID');
      }

      const moduleIdObj = new mongoose.Types.ObjectId(moduleId);

      // Check that module belongs to professor
      const module = await CourseModule.findById(moduleIdObj);
      if (!module) {
        throw new NotFoundError('Module not found');
      }

      if (module.professorId.toString() !== professorId) {
        throw new ForbiddenError('You do not have access to this module');
      }

      // Get all students
      const allStudents = await User.find({ role: 'etudiant' }, 'nom email').sort({ nom: 1 });

      // Filter out already enrolled students
      const { enrollments } = await enrollmentRepository.findByModule(moduleIdObj, {
        limit: 1000,
        page: 1,
      });
      const enrolledIds = (enrollments || [])
        .map((enrollment) => enrollment?.etudiantId?._id?.toString())
        .filter(Boolean);
      const availableStudents = allStudents.filter(
        student => !enrolledIds.includes(student._id.toString())
      );

      logger.debug('Retrieved available students', { 
        moduleId, 
        total: allStudents.length,
        available: availableStudents.length 
      });

      return availableStudents;
    } catch (error) {
      logger.error('Error getting available students', error);
      throw error;
    }
  }

  /**
   * Enroll a student in a module
   */
  async enrollStudent(moduleId, studentId, professorId) {
    try {
      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(moduleId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ValidationError('Invalid module or student ID');
      }

      const moduleIdObj = new mongoose.Types.ObjectId(moduleId);
      const studentIdObj = new mongoose.Types.ObjectId(studentId);

      // Check that module belongs to professor
      const module = await CourseModule.findById(moduleIdObj);
      if (!module) {
        throw new NotFoundError('Module not found');
      }

      if (module.professorId.toString() !== professorId) {
        throw new ForbiddenError('You do not have access to this module');
      }

      // Check that student exists
      const student = await User.findById(studentIdObj);
      if (!student || student.role !== 'etudiant') {
        throw new NotFoundError('Student not found');
      }

      // Check if already enrolled
      const existing = await enrollmentRepository.findByModule(moduleId);
      if (existing.enrollments.some(e => e.etudiantId._id.toString() === studentIdObj.toString())) {
        throw new ValidationError('Student is already enrolled in this module');
      }

      // Create enrollment
      const enrollment = await enrollmentRepository.create({
        moduleId: moduleIdObj,
        etudiantId: studentIdObj,
      });

      logger.info('Student enrolled', { moduleId, studentId });

      return {
        _id: enrollment._id,
        moduleId: enrollment.moduleId,
        etudiantId: enrollment.etudiantId,
        createdAt: enrollment.createdAt,
      };
    } catch (error) {
      logger.error('Error enrolling student', error);
      throw error;
    }
  }

  /**
   * Unenroll a student from a module
   */
  async unenrollStudent(moduleId, studentId, professorId) {
    try {
      // Validate ObjectIds
      if (!mongoose.Types.ObjectId.isValid(moduleId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ValidationError('Invalid module or student ID');
      }

      const moduleIdObj = new mongoose.Types.ObjectId(moduleId);
      const studentIdObj = new mongoose.Types.ObjectId(studentId);

      // Check that module belongs to professor
      const module = await CourseModule.findById(moduleIdObj);
      if (!module) {
        throw new NotFoundError('Module not found');
      }

      if (module.professorId.toString() !== professorId) {
        throw new ForbiddenError('You do not have access to this module');
      }

      // Find and delete enrollment
      const enrollments = await enrollmentRepository.findByModule(moduleId);
      const enrollment = enrollments.enrollments.find(
        e => e.etudiantId._id.toString() === studentIdObj.toString()
      );

      if (!enrollment) {
        throw new NotFoundError('Enrollment not found');
      }

      await enrollmentRepository.delete(enrollment._id);

      logger.info('Student unenrolled', { moduleId, studentId });

      return { message: 'Student unenrolled successfully' };
    } catch (error) {
      logger.error('Error unenrolling student', error);
      throw error;
    }
  }
}

export default new EnrollmentsService();
