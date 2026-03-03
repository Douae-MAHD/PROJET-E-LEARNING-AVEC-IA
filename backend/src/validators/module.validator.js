/**
 * Module Validation Middleware
 */

import Joi from 'joi';
import { ValidationError } from '../utils/errorHandler.js';

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);
  next();
};

const createModuleSchema = Joi.object({
  titre: Joi.string().trim().min(3).max(200).required()
    .messages({
      'any.required': 'Le titre du module est requis',
      'string.min': 'Le titre doit avoir au moins 3 caractères'
    }),
  description: Joi.string().trim().max(1000)
    .optional().allow('').allow(null)
});

const createSubModuleSchema = Joi.object({
  titre: Joi.string().trim().min(3).max(200).required()
    .messages({
      'any.required': 'Le titre du sous-module est requis',
      'string.min': 'Le titre doit avoir au moins 3 caractères'
    }),
  description: Joi.string().trim().max(1000)
    .optional().allow('').allow(null),
  parentSubModuleId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional().allow(null)
    .messages({ 'string.pattern.base': 'ID parent invalide' })
});

export const validateCreateModule = validate(createModuleSchema);
export const validateCreateSubModule = validate(createSubModuleSchema);
