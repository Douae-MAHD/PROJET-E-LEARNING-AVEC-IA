/**
 * Note style: `quizController` utilise un style classe par choix.
 * Ce controller conserve le style `export const` pour cohérence locale.
 */

import { asyncHandler, ValidationError } from '../utils/errorHandler.js';
import * as aiService from '../services/aiService.js';
import logger from '../utils/logger.js';
import { sendSuccess } from '../utils/responseFormatter.js';

const validateTextInput = (text) => {
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    throw new ValidationError('Le champ text est requis et doit contenir au moins 10 caractères', 'text');
  }
};

export const generateQuizFromText = asyncHandler(async (req, res) => {
  const { text } = req.body;
  validateTextInput(text);
  logger.info('AI endpoint called: generateQuizFromText', { userId: req.user?.id });
  const result = await aiService.generateQuizQuestions(text);
  sendSuccess(res, result, 'Quiz généré avec succès');
});

export const generateExercisesFromText = asyncHandler(async (req, res) => {
  const { text } = req.body;
  validateTextInput(text);
  logger.info('AI endpoint called: generateExercisesFromText', { userId: req.user?.id });
  const result = await aiService.generateExercises(text);
  sendSuccess(res, result, 'Exercices générés avec succès');
});

export const correctExercise = asyncHandler(async (req, res) => {
  const { enonce, studentAnswer, pdfText } = req.body;
  validateTextInput(pdfText || enonce);
  logger.info('AI endpoint called: correctExercise', { userId: req.user?.id });
  const result = await aiService.correctExercise(enonce, studentAnswer, pdfText);
  sendSuccess(res, result, 'Exercice corrigé avec succès');
});
