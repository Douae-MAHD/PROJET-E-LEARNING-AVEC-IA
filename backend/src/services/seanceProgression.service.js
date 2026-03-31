import Seance from '../models/Seance.js';
import SeanceProgression from '../models/SeanceProgression.js';
import * as progressionRepository from '../repositories/seanceProgression.repository.js';
import { NotFoundError, ForbiddenError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// initialiserProgression
// Appelé automatiquement à l'inscription d'un étudiant à un module.
// Crée une progression pour chaque séance : séance ordre=1 → 'en_cours', reste → 'non_commencee'
// ─────────────────────────────────────────────────────────────────────────────
export const initialiserProgression = async (etudiantId, moduleId) => {
  const seances = await Seance.find({ moduleId })
    .sort({ ordre: 1 })
    .select('_id ordre moduleId')
    .lean();

  if (!seances.length) return [];

  const progressionsExistantes = await progressionRepository.findByEtudiantAndModule(etudiantId, moduleId);

  const seanceIdsExistants = new Set(
    progressionsExistantes.map((p) => p.seanceId.toString())
  );

  const documents = seances
    .filter((seance) => !seanceIdsExistants.has(seance._id.toString()))
    .map((seance) => ({
      etudiantId,
      seanceId: seance._id,
      moduleId,
      statut: seance.ordre === 1 ? 'en_cours' : 'non_commencee',
    }));

  if (documents.length) {
    try {
      await SeanceProgression.insertMany(documents, { ordered: false });
    } catch (error) {
      const isDuplicateOnly =
        error?.code === 11000 ||
        (Array.isArray(error?.writeErrors) &&
          error.writeErrors.every((e) => e.code === 11000));
      if (!isDuplicateOnly) throw error;
    }
  }

  return progressionRepository.findByEtudiantAndModule(etudiantId, moduleId);
};

// ─────────────────────────────────────────────────────────────────────────────
// verifierAcces
// Vérifie si un étudiant peut accéder à une séance.
// Règle : séance ordre=1 toujours accessible.
//         séance N accessible uniquement si séance N-1 est 'validee'.
// ─────────────────────────────────────────────────────────────────────────────
export const verifierAcces = async (etudiantId, seanceId) => {
  const seance = await Seance.findById(seanceId)
    .select('_id ordre moduleId subModuleId')
    .lean();

  if (!seance) throw new NotFoundError('Séance');

  // Séance 1 — toujours accessible
  if (seance.ordre === 1) return true;

  // Chercher la séance précédente
  const filtre = seance.subModuleId
    ? { subModuleId: seance.subModuleId, ordre: seance.ordre - 1 }
    : { moduleId: seance.moduleId, subModuleId: null, ordre: seance.ordre - 1 };

  const seancePrecedente = await Seance.findOne(filtre).select('_id').lean();
  if (!seancePrecedente) throw new NotFoundError('Séance précédente');

  const estValidee = await progressionRepository.isValidee(etudiantId, seancePrecedente._id);
  if (!estValidee) {
    throw new ForbiddenError('Séance bloquée — validez la séance précédente');
  }

  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// validerSeance
// RÈGLE SALMA : on valide TOUJOURS la séance, peu importe le score.
// Le score est enregistré pour mesurer le CT — il ne bloque PAS la progression.
// ─────────────────────────────────────────────────────────────────────────────
export const validerSeance = async (etudiantId, seanceId, scoreQuiz, scoreExercice) => {
  const progressionActuelle = await progressionRepository.findByEtudiantAndSeance(etudiantId, seanceId);
  if (!progressionActuelle) throw new NotFoundError('Progression de séance');

  const seanceActuelle = await Seance.findById(seanceId)
    .select('_id ordre moduleId subModuleId')
    .lean();
  if (!seanceActuelle) throw new NotFoundError('Séance');

  const tentatives = (progressionActuelle.tentatives || 0) + 1;

  // ✅ Toujours valider — score enregistré pour mesure CT, pas pour blocage
  await progressionRepository.updateProgression(etudiantId, seanceId, {
    tentatives,
    scoreQuiz,
    scoreExercice,
    statut: 'validee',
    completedAt: new Date(),
  });

  // Débloquer la séance suivante
  const filtreSuivante = seanceActuelle.subModuleId
    ? { subModuleId: seanceActuelle.subModuleId, ordre: seanceActuelle.ordre + 1 }
    : { moduleId: seanceActuelle.moduleId, subModuleId: null, ordre: seanceActuelle.ordre + 1 };

  const seanceSuivante = await Seance.findOne(filtreSuivante)
    .select('_id titre ordre type')
    .lean();

  if (seanceSuivante) {
    const progressionSuivante = await progressionRepository.findByEtudiantAndSeance(
      etudiantId,
      seanceSuivante._id
    );

    if (progressionSuivante) {
      if (progressionSuivante.statut === 'non_commencee') {
        await progressionRepository.updateProgression(etudiantId, seanceSuivante._id, {
          statut: 'en_cours',
        });
      }
    } else {
      await progressionRepository.create({
        etudiantId,
        seanceId: seanceSuivante._id,
        moduleId: seanceActuelle.moduleId,
        statut: 'en_cours',
      });
    }
  }

  return {
    validated: true,
    score: scoreQuiz,
    nextSeance: seanceSuivante || null,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// getProgressionModule / getProgressionSeance
// ─────────────────────────────────────────────────────────────────────────────
export const getProgressionModule = async (etudiantId, moduleId) => {
  return SeanceProgression.find({
    etudiantId: new mongoose.Types.ObjectId(etudiantId),
    moduleId:   new mongoose.Types.ObjectId(moduleId),
  })
    .populate({ path: 'seanceId', select: 'titre ordre type' })
    .sort({ createdAt: 1 })
    .lean();
};

export const getProgressionSeance = async (etudiantId, seanceId) => {
  return progressionRepository.findByEtudiantAndSeance(etudiantId, seanceId);
};