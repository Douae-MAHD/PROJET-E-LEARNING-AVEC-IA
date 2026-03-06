import CourseModule from '../models/CourseModule.js';
import SubModule from '../models/SubModule.js';
import PDF from '../models/PDF.js';
import Seance from '../models/Seance.js';
import ModuleEnrollment from '../models/ModuleEnrollment.js';
import { DatabaseError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const createModule = async (data) => {
  try {
    const m = new CourseModule(data);
    const saved = await m.save();
    logger.debug('Module created', { moduleId: saved._id });
    return saved;
  } catch (error) {
    logger.error('Error creating module', error);
    throw new DatabaseError('Failed to create module');
  }
};

export const findByProfessor = async (profId) => {
  try {
    return await CourseModule.find({ professorId: profId }).populate('professorId', 'nom email');
  } catch (error) {
    logger.error('Error finding modules by professor', error, { profId });
    throw new DatabaseError('Failed to retrieve modules');
  }
};

export const findByStudentEnrollment = async (studentId) => {
  try {
    const moduleIds = await ModuleEnrollment.find({ etudiantId: studentId }).distinct('moduleId');
    return await CourseModule.find({ _id: { $in: moduleIds } }).populate('professorId', 'nom email');
  } catch (error) {
    logger.error('Error finding modules by student enrollment', error, { studentId });
    throw new DatabaseError('Failed to retrieve modules');
  }
};

export const findById = async (id) => {
  try {
    return await CourseModule.findById(id).populate('professorId', 'nom email');
  } catch (error) {
    logger.error('Error finding module by ID', error, { id });
    throw new DatabaseError('Failed to retrieve module');
  }
};

export const createSubModule = async (data) => {
  try {
    const s = new SubModule(data);
    const saved = await s.save();
    logger.debug('SubModule created', { subModuleId: saved._id });
    return saved;
  } catch (error) {
    logger.error('Error creating submodule', error);
    throw new DatabaseError('Failed to create submodule');
  }
};

export const findSubModules = async (parentModuleId) => {
  try {
    return await SubModule.find({ parentModuleId }).sort({ ordre: 1, createdAt: 1 });
  } catch (error) {
    logger.error('Error finding submodules', error, { parentModuleId });
    throw new DatabaseError('Failed to retrieve submodules');
  }
};

export const findSubModuleById = async (id) => {
  try {
    const subModule = await SubModule.findById(id).populate('parentModuleId');

    if (subModule) {
      const seances = await Seance.find({ subModuleId: id }).sort({ ordre: 1 }).lean();
      const seanceIds = seances.map((seance) => seance._id);
      const pdfs = await PDF.find({ seanceId: { $in: seanceIds } }).sort({ createdAt: -1 }).lean();

      // Convert to plain object and add pdfs array
      const subModuleObj = subModule.toObject ? subModule.toObject() : subModule;
      subModuleObj.seances = seances;
      subModuleObj.pdfs = pdfs;
      return subModuleObj;
    }

    return subModule;
  } catch (error) {
    logger.error('Error finding submodule by ID', error, { id });
    throw new DatabaseError('Failed to retrieve submodule');
  }
};
