import mongoose from 'mongoose';

const sequenceEventSchema = new mongoose.Schema(
  {
    step: {
      type: Number,
      required: true,
      min: 0,
    },
    event_type: {
      type: String,
      enum: {
        values: ['start_session', 'answer_question', 'hint_usage', 'retry_wrong_answer', 'submit'],
        message: 'event_type invalide',
      },
      required: true,
    },
    question_id: {
      type: String,
      default: null,
    },
    correctness: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },
    client_ts: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const sessionLogSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'student_id est requis'],
      index: true,
    },
    seanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seance',
      required: [true, 'seanceId est requis'],
      index: true,
    },
    assessment_type: {
      type: String,
      enum: {
        values: ['quiz', 'exercise'],
        message: 'assessment_type doit etre quiz ou exercise',
      },
      default: 'quiz',
    },
    sequence: {
      type: [sequenceEventSchema],
      default: [],
    },
    time_taken: {
      type: Number,
      required: [true, 'time_taken est requis'],
      min: [0, 'time_taken ne peut pas etre negatif'],
    },
    attempts: {
      type: Number,
      required: [true, 'attempts est requis'],
      min: [1, 'attempts doit etre >= 1'],
    },
    hints_used: {
      type: Number,
      required: [true, 'hints_used est requis'],
      min: [0, 'hints_used ne peut pas etre negatif'],
    },
    correctness: {
      type: Number,
      required: [true, 'correctness est requis'],
      min: [0, 'correctness doit etre >= 0'],
      max: [1, 'correctness doit etre <= 1'],
    },
    ct_score: {
      type: Number,
      default: null,
      min: [0, 'ct_score doit etre >= 0'],
      max: [100, 'ct_score doit etre <= 100'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionLogSchema.index({ student_id: 1, seanceId: 1, timestamp: -1 });
sessionLogSchema.index({ seanceId: 1, timestamp: -1 });
sessionLogSchema.index({ student_id: 1, assessment_type: 1, timestamp: -1 });

export default mongoose.model('SessionLog', sessionLogSchema, 'sessionlogs');
