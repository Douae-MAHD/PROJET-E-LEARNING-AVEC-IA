import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema(
  {
    pdfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PDF',
      default: null,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      default: null,
    },
    subModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubModule',
      default: null,
    },
    etudiantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'étudiant est requis'],
    },
    type: {
      type: String,
      enum: {
        values: ['pdf', 'submodule', 'module'],
        message: 'Le type doit être pdf, submodule ou module',
      },
      default: 'pdf',
    },
    difficulty: {
      type: String,
      enum: {
        values: ['easy', 'medium', 'hard'],
        message: 'La difficulté doit être easy, medium ou hard',
      },
      default: 'medium',
    },
    totalQuestions: {
      type: Number,
      default: 0,
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
quizSchema.index({ subModuleId: 1 });
quizSchema.index({ pdfId: 1 });
quizSchema.index({ dateCompletion: 1 });
quizSchema.index({ submittedAt: 1 });
quizSchema.index({ isSubmitted: 1 });
quizSchema.index({ etudiantId: 1, submittedAt: -1 }); // Composite for student history

export default mongoose.model('Quiz', quizSchema, 'quiz');
