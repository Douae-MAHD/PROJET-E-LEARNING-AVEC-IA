import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import * as ctController from '../controllers/ct.controller.js';
import { validateScoreStudent } from '../validators/ct.validator.js';

const router = Router();

router.post(
  '/student',
  authenticateToken,
  requireRole(['etudiant']),
  validateScoreStudent,
  ctController.scoreStudent
);

export default router;
