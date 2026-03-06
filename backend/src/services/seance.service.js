import SubModule from '../models/SubModule.js';
import CourseModule from '../models/CourseModule.js';
import * as seanceRepository from '../repositories/seance.repository.js';
import { NotFoundError, ValidationError } from '../utils/errorHandler.js';

// ── Créer une séance ────────────────────────────────────────
export const createSeance = async (data) => {
  // moduleId toujours requis
  const module = await CourseModule.findById(data.moduleId)
    .select('_id').lean();
  if (!module) throw new NotFoundError('Module');

  // subModuleId optionnel — vérifié seulement s'il est fourni
  if (data.subModuleId) {
    const subModule = await SubModule.findById(data.subModuleId)
      .select('_id').lean();
    if (!subModule) throw new NotFoundError('Sous-module');
  }

  return seanceRepository.create(data);
};

// ── Récupérer séances d'un SubModule ────────────────────────
export const getSeancesBySubModule = async (subModuleId) => {
  const subModule = await SubModule.findById(subModuleId)
    .select('_id').lean();
  if (!subModule) throw new NotFoundError('Sous-module');

  return seanceRepository.findBySubModule(subModuleId);
};

// ── Récupérer séances d'un Module (sans chapitres) ──────────
export const getSeancesByModule = async (moduleId) => {
  const module = await CourseModule.findById(moduleId)
    .select('_id').lean();
  if (!module) throw new NotFoundError('Module');

  return seanceRepository.findByModule(moduleId);
};

// ── Récupérer une séance par ID ─────────────────────────────
export const getSeanceById = async (id) => {
  const seance = await seanceRepository.findById(id);
  if (!seance) throw new NotFoundError('Séance');
  return seance;
};

// ── Modifier une séance ─────────────────────────────────────
export const updateSeance = async (id, data) => {
  // ordre interdit à modifier manuellement
  if (Object.prototype.hasOwnProperty.call(data, 'ordre')) {
    throw new ValidationError('Le champ ordre ne peut pas être modifié');
  }
  // moduleId interdit à modifier (changerait la hiérarchie)
  if (Object.prototype.hasOwnProperty.call(data, 'moduleId')) {
    throw new ValidationError('Le module ne peut pas être modifié');
  }

  const existing = await seanceRepository.findById(id);
  if (!existing) throw new NotFoundError('Séance');

  return seanceRepository.findByIdAndUpdate(id, data);
};

// ── Supprimer une séance ────────────────────────────────────
export const deleteSeance = async (id) => {
  const deleted = await seanceRepository.deleteById(id);
  if (!deleted) throw new NotFoundError('Séance');
  return deleted;
};
