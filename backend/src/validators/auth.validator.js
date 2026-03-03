import Joi from 'joi';
import { ValidationError } from '../utils/errorHandler.js';

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);
  next();
};

const registerSchema = Joi.object({
  nom: Joi.string().trim().min(2).max(100).required()
    .messages({
      'any.required': 'Le nom est requis',
      'string.min': 'Le nom doit avoir au moins 2 caractères',
      'string.max': 'Le nom ne peut pas dépasser 100 caractères'
    }),
  email: Joi.string().email().required()
    .messages({
      'any.required': 'L\'email est requis',
      'string.email': 'L\'email n\'est pas valide'
    }),
  password: Joi.string().min(6).required()
    .messages({
      'any.required': 'Le mot de passe est requis',
      'string.min': 'Le mot de passe doit avoir au moins 6 caractères'
    }),
  role: Joi.string().valid('professeur', 'etudiant').required()
    .messages({
      'any.required': 'Le rôle est requis',
      'any.only': 'Le rôle doit être professeur ou etudiant'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'any.required': 'L\'email est requis',
      'string.email': 'L\'email n\'est pas valide'
    }),
  password: Joi.string().min(6).required()
    .messages({
      'any.required': 'Le mot de passe est requis',
      'string.min': 'Le mot de passe doit avoir au moins 6 caractères'
    })
});

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
