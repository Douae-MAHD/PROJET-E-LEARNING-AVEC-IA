import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import * as ctService from '../services/ctEvaluation.service.js';

export const scoreStudent = asyncHandler(async (req, res) => {
  const result = await ctService.scoreStudentSession(req.body, req.user.id);
  sendSuccess(res, result, 'CT scoring completed');
});
