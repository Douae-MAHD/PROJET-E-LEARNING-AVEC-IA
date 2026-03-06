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

const quizIdParamSchema = Joi.object({
  quizId: Joi.string().pattern(objectIdRegex).required()
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

const quizSubmitSchema = Joi.object({
  reponsesEtudiant: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().pattern(objectIdRegex).required(),
        reponse: Joi.string().trim().required()
      })
    )
    .min(1)
    .required()
});

const quizCreateSchema = Joi.object({
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
  typeQuiz: Joi.string().valid('seance', 'global').default('seance').messages({
    'any.only': 'typeQuiz doit être seance ou global',
  }),
  questions: Joi.array().optional(),
  reponsesEtudiant: Joi.array().optional(),
});

export const validateQuizSubmit = validate(quizSubmitSchema);
export const validateQuizCreate = validate(quizCreateSchema);
export const validateQuizIdParam = validateParams(quizIdParamSchema);
export const validateModuleIdParam = validateParams(moduleIdParamSchema);
export const validateSubModuleIdParam = validateParams(subModuleIdParamSchema);
export const validateSeanceIdParam = validateParams(seanceIdParamSchema);
export const validatePdfIdParam = validateParams(pdfIdParamSchema);
