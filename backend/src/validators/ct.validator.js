import Joi from 'joi';
import { ValidationError } from '../utils/errorHandler.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: true,
    stripUnknown: true,
  });

  if (error) throw new ValidationError(error.details[0].message);
  req.body = value;
  next();
};

const sequenceEventSchema = Joi.object({
  step: Joi.number().integer().min(0).required(),
  event_type: Joi.string()
    .valid('start_session', 'answer_question', 'hint_usage', 'retry_wrong_answer', 'submit')
    .required(),
  question_id: Joi.string().allow(null, '').optional(),
  correctness: Joi.number().min(0).max(1).allow(null).optional(),
  client_ts: Joi.date().iso().required(),
});

const scoreStudentSchema = Joi.object({
  student_id: Joi.string().pattern(objectIdRegex).required(),
  seanceId: Joi.string().pattern(objectIdRegex).required(),
  assessment_type: Joi.string().valid('quiz', 'exercise').default('quiz'),
  sequence: Joi.array().items(sequenceEventSchema).min(1).required(),
  time_taken: Joi.number().min(0).required(),
  attempts: Joi.number().integer().min(1).required(),
  hints_used: Joi.number().integer().min(0).required(),
  correctness: Joi.number().min(0).max(1).required(),
});

export const validateScoreStudent = validate(scoreStudentSchema);
