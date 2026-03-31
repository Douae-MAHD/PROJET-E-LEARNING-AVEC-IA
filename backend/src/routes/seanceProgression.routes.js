import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import * as progressionController from '../controllers/seanceProgression.controller.js';

const router = Router();

// All routes require authentication
// etudiantId comes from req.user._id (token)

router.get('/module/:moduleId', authenticateToken, progressionController.getProgressionModule);

router.get('/seance/:seanceId', authenticateToken, progressionController.getProgressionSeance);

router.get('/seance/:seanceId/acces', authenticateToken, progressionController.verifierAcces);

router.post('/seance/:seanceId/valider', authenticateToken, progressionController.validerSeance);

export default router;
