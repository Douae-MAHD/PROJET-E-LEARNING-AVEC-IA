import * as repo from '../repositories/modules.repository.js';
import mongoose from 'mongoose';
import CourseModule from '../models/CourseModule.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errorHandler.js';

export const createModule = async ({ titre, description, professorId }) => {
  if (!titre) throw new ValidationError('Titre requis', 'titre');
  const data = { titre, description: description || null, professorId: new mongoose.Types.ObjectId(professorId), studentEnrollments: [] };
  return repo.createModule(data);
};

export const listForUser = async (user) => {
  if (user.role === 'professeur') return repo.findByProfessor(user.id);
  return repo.findByStudentEnrollment(user.id);
};

export const getModule = async (id, userId = null, userRole = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Identifiant module invalide', 'moduleId');
  }

  const module = await repo.findById(id);
  if (!module) throw new NotFoundError('Module');

  if (userRole === 'etudiant') {
    if (!userId) throw new ValidationError('Identifiant étudiant requis', 'userId');
    const isEnrolled = (module.studentEnrollments || []).some(
      (studentId) => studentId?.toString() === userId.toString()
    );
    if (!isEnrolled) throw new ForbiddenError('Accès interdit');
  }

  if (userRole === 'professeur') {
    if (!userId) throw new ValidationError('Identifiant professeur requis', 'userId');
    const moduleProfessorId = module.professorId?._id || module.professorId;
    if (moduleProfessorId?.toString() !== userId.toString()) {
      throw new ForbiddenError('Accès interdit');
    }
  }

  return module;
};

export const createSubModule = async ({ moduleId, titre, description, parentSubModuleId, professorId }) => {
  if (!mongoose.Types.ObjectId.isValid(moduleId)) {
    throw new ValidationError('Identifiant module invalide', 'moduleId');
  }
  if (!mongoose.Types.ObjectId.isValid(professorId)) {
    throw new ValidationError('Identifiant professeur invalide', 'professorId');
  }

  const module = await CourseModule.findById(moduleId).select('professorId');
  if (!module) throw new NotFoundError('Module');

  if (module.professorId?.toString() !== professorId.toString()) {
    throw new ForbiddenError('Accès interdit');
  }

  const data = {
    titre,
    description: description || null,
    parentModuleId: new mongoose.Types.ObjectId(moduleId),
    parentSubModuleId: parentSubModuleId ? new mongoose.Types.ObjectId(parentSubModuleId) : null
  };
  return repo.createSubModule(data);
};

export const getSubModules = async (moduleId) => repo.findSubModules(moduleId);

export const getSubModule = async (id) => repo.findSubModuleById(id);
