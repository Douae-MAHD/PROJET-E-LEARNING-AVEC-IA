/**
 * Enrollments Routes
 * Handles student enrollment in modules
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
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import enrollmentController from '../controllers/enrollments.controller.js';

const router = express.Router();

// Get all students enrolled in a module (Professor only)
router.get(
  '/module/:moduleId/students',
  authenticateToken,
  requireRole(['professeur']),
  enrollmentController.getModuleStudents
);

// Get available students (not enrolled) for a module (Professor only)
router.get(
  '/module/:moduleId/available-students',
  authenticateToken,
  requireRole(['professeur']),
  enrollmentController.getAvailableStudents
);

// Enroll a student in a module (Professor only)
router.post(
  '/module/:moduleId/student/:studentId',
  authenticateToken,
  requireRole(['professeur']),
  enrollmentController.enrollStudent
);

// Unenroll a student from a module (Professor only)
router.delete(
  '/module/:moduleId/student/:studentId',
  authenticateToken,
  requireRole(['professeur']),
  enrollmentController.unenrollStudent
);

export default router;
