import SeanceProgression from '../models/SeanceProgression.js';

export const create = (data) => SeanceProgression.create(data);

export const findByEtudiantAndSeance = (etudiantId, seanceId) => SeanceProgression.findOne({ etudiantId, seanceId }).lean();

export const findByEtudiantAndModule = (etudiantId, moduleId) => SeanceProgression.getByEtudiantAndModule(etudiantId, moduleId);

export const isValidee = (etudiantId, seanceId) => SeanceProgression.isValidee(etudiantId, seanceId);

export const getStatut = (etudiantId, seanceId) => SeanceProgression.getStatut(etudiantId, seanceId);

export const updateProgression = (etudiantId, seanceId, updateData) => SeanceProgression.findOneAndUpdate(
  { etudiantId, seanceId },
  updateData,
  { new: true, runValidators: true }
).lean();
