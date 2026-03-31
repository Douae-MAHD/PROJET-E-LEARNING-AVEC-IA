import * as progressionService from '../services/seanceProgression.service.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const getProgressionModule = asyncHandler(async (req, res) => {
  console.log('req.user:', req.user)
  const etudiantId = req.user.id;
  const moduleId = req.params.moduleId;

  const result = await progressionService.getProgressionModule(etudiantId, moduleId);
  sendSuccess(res, result, 'Progression récupérée');
});

export const getProgressionSeance = asyncHandler(async (req, res) => {
  const etudiantId = req.user.id;
  const seanceId = req.params.seanceId;

  const result = await progressionService.getProgressionSeance(etudiantId, seanceId);
  sendSuccess(res, result, 'Progression récupérée');
});

export const validerSeance = asyncHandler(async (req, res) => {
  const etudiantId = req.user.id;
  const seanceId = req.params.seanceId;
  const scoreQuiz = req.body.scoreQuiz;
  const scoreExercice = req.body.scoreExercice;

  const result = await progressionService.validerSeance(etudiantId, seanceId, scoreQuiz, scoreExercice);
  sendSuccess(res, result, 'Séance validée');
});

export const verifierAcces = asyncHandler(async (req, res) => {
  const etudiantId = req.user.id;
  const seanceId = req.params.seanceId;

  await progressionService.verifierAcces(etudiantId, seanceId);
  sendSuccess(res, { accessible: true }, 'Accès autorisé');
});
