import Seance from '../models/Seance.js';

export const create = (data) => Seance.create(data);

export const findBySubModule = (subModuleId) => Seance.getBySubModule(subModuleId);

export const findById = (id) => Seance.findById(id).lean();

export const findByIdAndUpdate = (id, data) => Seance.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();

export const findByModule = (moduleId) =>Seance.getByModule(moduleId);

export const deleteById = async (id) => {
  const existing = await Seance.findById(id);
  if (!existing) return null;

  await Seance.deleteOne({ _id: id });
  await Seance.reorderAfterDelete(existing.subModuleId, existing.ordre);
  return existing.toObject();
};

export const findNextSeance = (subModuleId, ordre) => Seance.getNext(subModuleId, ordre);

export const findAll = () => Seance.find().lean();

export const findByModuleIds = (moduleIds) => Seance.find({
  moduleId: { $in: moduleIds },
}).sort({ dateSeance: 1, startTime: 1, ordre: 1 }).lean();
