import SessionLog from '../models/SessionLog.js';

export const createSessionLog = (payload) => SessionLog.create(payload);

export const listByStudentAndSeance = (studentId, seanceId, limit = 20) => {
  return SessionLog.find({ student_id: studentId, seanceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};
