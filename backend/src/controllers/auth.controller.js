import { asyncHandler } from '../utils/errorHandler.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ message: 'Utilisateur créé', ...result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ message: 'Connexion réussie', ...result });
});

export const verify = asyncHandler(async (req, res) => {
  // Simple token verification - reuse token payload set by middleware if present
  res.json({ valid: true, user: req.user || null });
});
