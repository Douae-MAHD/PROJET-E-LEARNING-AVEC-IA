import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import * as seanceController from '../controllers/seance.controller.js';
import { validateSeance } from '../validators/seance.validator.js';

const router = Router();

// ── Création ────────────────────────────────────────────────
router.post(
  '/',
  authenticateToken,
  validateSeance,
  seanceController.createSeance
);

// ── Lecture ─────────────────────────────────────────────────

// Route pour récupérer TOUTES les séances
router.get(
  '/',
  authenticateToken,
  seanceController.getAllSeances
);

// Séances de tous les modules du professeur connecté
router.get(
  '/modules',
  authenticateToken,
  seanceController.getSeancesByModules
);

// IMPORTANT : routes spécifiques AVANT routes génériques /:id
// Sinon Express interprète 'submodule' et 'module' comme un :id

// Cas AVEC chapitres → séances d'un SubModule
router.get(
  '/submodule/:subModuleId',
  authenticateToken,
  seanceController.getSeancesBySubModule
);

// Cas SANS chapitres → séances d'un Module directement
router.get(
  '/module/:moduleId',
  authenticateToken,
  seanceController.getSeancesByModule  // nouveau
);

// Récupérer une séance par ID — doit être EN DERNIER
router.get(
  '/:id',
  authenticateToken,
  seanceController.getSeanceById
);


// ── Modification ────────────────────────────────────────────
router.put(
  '/:id',
  authenticateToken,
  validateSeance,
  seanceController.updateSeance
);

// ── Suppression ─────────────────────────────────────────────
router.delete(
  '/:id',
  authenticateToken,
  seanceController.deleteSeance
);

export default router;