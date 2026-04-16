import Joi from 'joi';
import { ValidationError } from '../utils/errorHandler.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;  // ← ADD THIS

const schema = Joi.object({
  // moduleId — toujours requis
  moduleId: Joi.string()
    .pattern(objectIdRegex)
    .required()
    .messages({
      'string.pattern.base': 'Le module doit être un identifiant valide',
      'any.required': 'Le module est requis',
    }),

  // subModuleId — optionnel (null si pas de chapitre)
  subModuleId: Joi.string()
    .pattern(objectIdRegex)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Le sous-module doit être un identifiant valide',
    }),

  titre: Joi.string().trim().min(2).max(255).required().messages({
    'string.empty': 'Le titre est requis',
    'string.min': 'Le titre doit contenir au moins 2 caractères',
    'string.max': 'Le titre ne peut pas dépasser 255 caractères',
    'any.required': 'Le titre est requis',
  }),

  type: Joi.string().valid('presentielle', 'distanciel').required().messages({
    'any.only': 'Le type doit être soit presentielle soit distanciel',
    'any.required': 'Le type est requis',
  }),

  phase: Joi.string().optional(),

  // ✅ ADD THIS BLOCK:
  startTime: Joi.string()
    .pattern(timeRegex)
    .required()
    .messages({
      'string.pattern.base': 'startTime doit être au format HH:mm (ex: 14:30)',
      'any.required': 'startTime est obligatoire (format HH:mm, ex: 14:30)',
    }),

  dateSeance: Joi.date().optional().allow(null).messages({
    'date.base': 'La date de séance est invalide',
  }),

  duree: Joi.number().min(1).optional().allow(null).messages({
    'number.base': 'La durée doit être un nombre',
    'number.min': 'La durée doit être supérieure ou égale à 1 minute',
  }),
});

export const validateSeance = (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: false,  // ← CHANGED: don't strip unknown to see what's missing
  });
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  next();
};