import SubModule from '../models/SubModule.js';
import CourseModule from '../models/CourseModule.js';
import * as seanceRepository from '../repositories/seance.repository.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errorHandler.js';

// ── Validation Helpers ──────────────────────────────────────
/**
 * Valide que startTime est au format HH:mm (00:00 à 23:59)
 * @param {string} startTime - La valeur à valider
 * @returns {boolean} true si valide
 */
const isValidStartTime = (startTime) => {
  if (!startTime || typeof startTime !== 'string') return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(startTime);
};

/**
 * Valide et extrait startTime des données
 * @param {object} data - Les données de la séance
 * @throws {ValidationError} si startTime est invalide ou manquante
 */
const validateStartTime = (data) => {
  if (!data.startTime) {
    throw new ValidationError('startTime est obligatoire (format HH:mm, ex: 14:30)');
  }

  if (!isValidStartTime(data.startTime)) {
    throw new ValidationError(
      `startTime invalide. Format attendu: HH:mm (ex: 14:30), reçu: ${data.startTime}`
    );
  }

  // Normaliser: trimmer et formater correctement
  return data.startTime.trim();
};

// ── Créer une séance ────────────────────────────────────────
export const createSeance = async (data) => {
  // Valider startTime (obligatoire)
  const validatedStartTime = validateStartTime(data);
  
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

  // Passer les données validées au repository
  const seanceData = {
    ...data,
    startTime: validatedStartTime,
  };

  return seanceRepository.create(seanceData);
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

  // Valider startTime si fourni
  if (Object.prototype.hasOwnProperty.call(data, 'startTime')) {
    const validatedStartTime = validateStartTime(data);
    data.startTime = validatedStartTime;
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

// ── Récupérer toutes les séances ────────────────────────────
export const getAllSeances = async () => {
  return seanceRepository.findAll();
};

// ── Récupérer séances des modules du professeur connecté ──
export const getSeancesByProfessorModules = async (user) => {
  if (!user?.id) {
    throw new ValidationError('Utilisateur non authentifié');
  }

  if (user.role !== 'professeur') {
    throw new ForbiddenError('Accès réservé aux professeurs');
  }

  const modules = await CourseModule.find({ professorId: user.id })
    .select('_id')
    .lean();

  const moduleIds = modules.map((module) => module._id);
  if (moduleIds.length === 0) {
    return [];
  }

  return seanceRepository.findByModuleIds(moduleIds);
};
