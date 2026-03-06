import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      default: null,
    },
    seanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seance',
      default: null,
    },
    etudiantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'étudiant est requis'],
    },
    typeQuiz: {
      type: String,
      enum: {
        values: ['seance', 'global'],
        message: 'Le type de quiz doit être soit seance soit global',
      },
      default: 'seance',
    },
    questions: [
      {
        id: mongoose.Schema.Types.ObjectId,
        question: String,
        options: [String],
        correctAnswer: String,
        explanation: String,
      },
    ],
    reponsesEtudiant: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        reponse: String,
      },
    ],
    note: {
      type: Number,
      default: null,
      min: 0,
      max: 20,
    },
    dateCompletion: {
      type: Date,
      default: null,
    },
    scoringDetails: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        question: String,
        studentAnswer: String,
        correctAnswer: String,
        correct: Boolean,
        explanation: String,
      },
    ],
    feedback: {
      strengths: [String],
      weaknesses: [String],
      recommendations: [String],
    },
    scoreParPilier: {
      // TODO: CT
      decomposition: {
        type: Number,
        default: null,
      },
      pattern: {
        type: Number,
        default: null,
      },
      abstraction: {
        type: Number,
        default: null,
      },
      algorithme: {
        type: Number,
        default: null,
      },
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
quizSchema.index({ etudiantId: 1 });
quizSchema.index({ moduleId: 1 });
quizSchema.index({ seanceId: 1 });
quizSchema.index({ typeQuiz: 1 });
quizSchema.index({ dateCompletion: 1 });
quizSchema.index({ submittedAt: 1 });
quizSchema.index({ isSubmitted: 1 });
quizSchema.index({ etudiantId: 1, submittedAt: -1 }); // Composite for student history

export default mongoose.model('Quiz', quizSchema, 'quiz');
