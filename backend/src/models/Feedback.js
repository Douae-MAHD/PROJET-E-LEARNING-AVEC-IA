import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    etudiantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'étudiant est requis'],
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      default: null,
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      default: null,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      default: null,
    },
    feedbackTexte: {
      type: String,
      required: [true, 'Le texte du feedback est requis'],
    },
    typeFeedback: {
      type: String,
      enum: {
        values: ['individuel', 'global'],
        message: 'Le type de feedback doit être soit individuel soit global',
      },
      required: [true, 'Le type de feedback est requis'],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
feedbackSchema.index({ etudiantId: 1 });
feedbackSchema.index({ quizId: 1 });
feedbackSchema.index({ exerciseId: 1 });
feedbackSchema.index({ moduleId: 1 });
feedbackSchema.index({ etudiantId: 1, moduleId: 1 });

export default mongoose.model('Feedback', feedbackSchema, 'feedback');
