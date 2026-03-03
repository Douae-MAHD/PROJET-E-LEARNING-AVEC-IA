import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.post('/quiz', authenticateToken, requireRole(['professeur', 'etudiant']), aiController.generateQuizFromText);
router.post('/exercises', authenticateToken, requireRole(['professeur', 'etudiant']), aiController.generateExercisesFromText);
router.post('/correct/exercise', authenticateToken, requireRole(['professeur', 'etudiant']), aiController.correctExercise);

export default router;
