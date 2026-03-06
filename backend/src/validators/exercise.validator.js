import Joi from 'joi';
import { ValidationError } from '../utils/errorHandler.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);
  next();
};

const validateParams = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.params);
  if (error) throw new ValidationError(error.details[0].message);
  next();
};

const exerciseIdParamSchema = Joi.object({
  exerciseId: Joi.string().pattern(objectIdRegex).required()
});

const moduleIdParamSchema = Joi.object({
  moduleId: Joi.string().pattern(objectIdRegex).required()
});

const subModuleIdParamSchema = Joi.object({
  subModuleId: Joi.string().pattern(objectIdRegex).required()
});

const seanceIdParamSchema = Joi.object({
  seanceId: Joi.string().pattern(objectIdRegex).required()
});

const pdfIdParamSchema = Joi.object({
  pdfId: Joi.string().pattern(objectIdRegex).required()
});

const exerciseSubmitSchema = Joi.object({
  reponse: Joi.string().trim().min(10).max(5000).required()
});

const exerciseCreateSchema = Joi.object({
  seanceId: Joi.string().pattern(objectIdRegex).optional().messages({
    'string.pattern.base': 'seanceId doit être un identifiant valide',
  }),
  moduleId: Joi.string().pattern(objectIdRegex).optional().messages({
    'string.pattern.base': 'moduleId doit être un identifiant valide',
  }),
  etudiantId: Joi.string().pattern(objectIdRegex).required().messages({
    'any.required': 'L\'identifiant étudiant est requis',
    'string.pattern.base': 'etudiantId doit être un identifiant valide',
  }),
  enonce: Joi.string().trim().required().messages({
    'any.required': 'L\'énoncé est requis',
  }),
  typeExercice: Joi.string().valid('seance', 'global', 'prelab').default('seance').messages({
    'any.only': 'typeExercice doit être seance, global ou prelab',
  }),
});

export const validateExerciseSubmit = validate(exerciseSubmitSchema);
export const validateExerciseCreate = validate(exerciseCreateSchema);
export const validateExerciseIdParam = validateParams(exerciseIdParamSchema);
export const validateModuleIdParam = validateParams(moduleIdParamSchema);
export const validateSubModuleIdParam = validateParams(subModuleIdParamSchema);
export const validateSeanceIdParam = validateParams(seanceIdParamSchema);
export const validatePdfIdParam = validateParams(pdfIdParamSchema);
