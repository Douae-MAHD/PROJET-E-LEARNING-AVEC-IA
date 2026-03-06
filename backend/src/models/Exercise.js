import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
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
    typeExercice: {
      type: String,
      enum: {
        values: ['seance', 'global', 'prelab'],
        message: 'Le type d\'exercice doit être seance, global ou prelab',
      },
      default: 'seance',
    },
    etudiantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    enonce: {
      type: String,
      required: [true, 'L\'énoncé est requis'],
    },
    reponseEtudiante: {
      type: String,
      default: null,
    },
    correctionIA: {
      type: String,
      default: null,
    },
    note: {
      type: Number,
      default: null,
      min: 0,
      max: 20,
    },
    feedback: {
      type: String,
      default: null,
    },
    correction: {
      type: String,
      default: null,
    },
    appreciation: {
      type: String,
      default: null,
    },
    points_forts: [{
      type: String,
    }],
    points_amelioration: [{
      type: String,
    }],
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
    dateCompletion: {
      type: Date,
      default: null,
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
exerciseSchema.index({ etudiantId: 1 });
exerciseSchema.index({ moduleId: 1 });
exerciseSchema.index({ seanceId: 1 });
exerciseSchema.index({ typeExercice: 1 });
exerciseSchema.index({ dateCompletion: 1 });
exerciseSchema.index({ submittedAt: 1 });
exerciseSchema.index({ isSubmitted: 1 });
exerciseSchema.index({ etudiantId: 1, submittedAt: -1 }); // Composite for student history
exerciseSchema.index({ etudiantId: 1, moduleId: 1 });

export default mongoose.model('Exercise', exerciseSchema, 'exercises');
