/**
 * Enrollments Controller
 * Handles HTTP request/response for enrollment endpoints
 * 
 * Responsibilities:
 * - Extract parameters from requests
 * - Validate input
 * - Call appropriate services
 * - Format HTTP responses
 * - Handle errors and status codes
 */

import enrollmentService from '../services/enrollments.service.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import logger from '../utils/logger.js';

export class EnrollmentsController {
  /**
   * GET /enrollments/module/:moduleId/students
   * Get all students enrolled in a module (Professor only)
   */
  getModuleStudents = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const professorId = req.user.id;

    logger.logRequest('GET', `/enrollments/module/${moduleId}/students`, professorId);

    const students = await enrollmentService.getModuleStudents(moduleId, professorId);
    sendSuccess(res, students, 'Students retrieved successfully');
  });

  /**
   * GET /enrollments/module/:moduleId/available-students
   * Get available (non-enrolled) students for a module
   */
  getAvailableStudents = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const professorId = req.user.id;

    logger.logRequest('GET', `/enrollments/module/${moduleId}/available-students`, professorId);

    const students = await enrollmentService.getAvailableStudents(moduleId, professorId);
    sendSuccess(res, students, 'Available students retrieved successfully');
  });

  /**
   * POST /enrollments/module/:moduleId/student/:studentId
   * Enroll a student in a module
   */
  enrollStudent = asyncHandler(async (req, res) => {
    const { moduleId, studentId } = req.params;
    const professorId = req.user.id;

    logger.logRequest('POST', `/enrollments/module/${moduleId}/student/${studentId}`, professorId);

    const enrollment = await enrollmentService.enrollStudent(moduleId, studentId, professorId);
    sendSuccess(res, enrollment, 'Student enrolled successfully', 201);
  });

  /**
   * DELETE /enrollments/module/:moduleId/student/:studentId
   * Unenroll a student from a module
   */
  unenrollStudent = asyncHandler(async (req, res) => {
    const { moduleId, studentId } = req.params;
    const professorId = req.user.id;

    logger.logRequest('DELETE', `/enrollments/module/${moduleId}/student/${studentId}`, professorId);

    const result = await enrollmentService.unenrollStudent(moduleId, studentId, professorId);
    sendSuccess(res, result, 'Student unenrolled successfully');
  });
}

export default new EnrollmentsController();
