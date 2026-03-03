/**
 * Note style: `quizController` utilise un style classe par choix.
 * Ce controller conserve le style `export const` pour cohérence locale.
 */

import { asyncHandler, ForbiddenError, NotFoundError } from '../utils/errorHandler.js';
import * as usersService from '../services/users.service.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const getProfile = asyncHandler(async (req, res) => {
  if (req.params.id && req.params.id !== req.user.id && req.user.role !== 'professeur') {
    throw new ForbiddenError('Accès refusé');
  }

  const id = req.params.id || req.user.id;
  const user = await usersService.getProfile(id);
  if (!user) throw new NotFoundError('Utilisateur');
  sendSuccess(res, user, 'Profil récupéré');
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const users = await usersService.listUsers(role);
  sendSuccess(res, users, 'Utilisateurs récupérés');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const id = req.user.id;
  const { role, password, ...safeData } = req.body;
  const updated = await usersService.updateProfile(id, safeData);
  sendSuccess(res, updated, 'Profil mis à jour');
});
