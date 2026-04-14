import express from 'express';

import healthRoutes from './health.routes.js';
import quizRoutes from './quiz.routes.js';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import modulesRoutes from './modules.routes.js';
import pdfRoutes from './pdf.routes.js';
import aiRoutes from './ai.routes.js';
import feedbackRoutes from './feedback.routes.js';
import exercisesRoutes from './exercises.routes.js';
import enrollmentsRoutes from './enrollments.routes.js';
import ctRoutes from './ct.routes.js';

const router = express.Router();

// Health check routes (no /api prefix needed)
router.use('/', healthRoutes);

// API routes
router.use('/quiz', quizRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/modules', modulesRoutes);
router.use('/pdfs', pdfRoutes);
router.use('/ai', aiRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/exercises', exercisesRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/score', ctRoutes);

export default router;
