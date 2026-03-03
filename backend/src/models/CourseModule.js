import mongoose from 'mongoose';

const courseModuleSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le professeur est requis'],
    },
    studentEnrollments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes
courseModuleSchema.index({ professorId: 1 });
courseModuleSchema.index({ createdAt: -1 });

export default mongoose.model('CourseModule', courseModuleSchema, 'coursemodules');
