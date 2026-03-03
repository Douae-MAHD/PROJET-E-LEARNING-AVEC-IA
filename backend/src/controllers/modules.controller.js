/**
 * Note style: `quizController` utilise un style classe par choix.
 * Ce controller conserve le style `export const` pour cohérence locale.
 */

import mongoose from 'mongoose';
import { asyncHandler, ValidationError } from '../utils/errorHandler.js';
import * as modulesService from '../services/modules.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const createModule = asyncHandler(async (req, res) => {
  const professorId = req.user?.id;
  const result = await modulesService.createModule({ ...req.body, professorId });
  sendSuccess(res, { module: result }, 'Module créé', 201);
});

export const listModules = asyncHandler(async (req, res) => {
  const modules = await modulesService.listForUser(req.user);
  sendSuccess(res, modules, 'Modules récupérés');
});

export const getModule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('ID module invalide', 'id');
  }

  const module = await modulesService.getModule(id, req.user.id, req.user.role);
  const subModules = await modulesService.getSubModules(req.params.id);
  sendSuccess(res, { ...module.toObject(), sub_modules: subModules }, 'Module récupéré');
});

export const createSubModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(moduleId)) {
    throw new ValidationError('ID module invalide', 'moduleId');
  }

  const saved = await modulesService.createSubModule({
    moduleId,
    professorId: req.user.id,
    ...req.body
  });
  sendSuccess(res, { subModule: saved }, 'Sous-module créé', 201);
});

export const getSubModule = asyncHandler(async (req, res) => {
  const subModule = await modulesService.getSubModule(req.params.id);
  sendSuccess(res, subModule, 'Sous-module récupéré');
});
