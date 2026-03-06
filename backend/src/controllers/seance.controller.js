import * as seanceService from '../services/seance.service.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const createSeance = asyncHandler(async (req, res) => {
  const result = await seanceService.createSeance(req.body);
  sendSuccess(res, result, 'Séance créée', 201);
});

export const getSeancesBySubModule = asyncHandler(async (req, res) => {
  const result = await seanceService.getSeancesBySubModule(req.params.subModuleId);
  sendSuccess(res, result, 'Séances récupérées');
});

export const getSeanceById = asyncHandler(async (req, res) => {
  const result = await seanceService.getSeanceById(req.params.id);
  sendSuccess(res, result, 'Séance récupérée');
});

export const updateSeance = asyncHandler(async (req, res) => {
  const result = await seanceService.updateSeance(req.params.id, req.body);
  sendSuccess(res, result, 'Séance mise à jour');
});

export const deleteSeance = asyncHandler(async (req, res) => {
  await seanceService.deleteSeance(req.params.id);
  sendSuccess(res, null, 'Séance supprimée');
});

export const getSeancesByModule = asyncHandler(async (req, res) => {
  const result = await seanceService.getSeancesByModule(req.params.moduleId);
  sendSuccess(res, result, 'Séances récupérées');
});
