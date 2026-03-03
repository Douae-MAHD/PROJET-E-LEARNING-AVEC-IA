import mongoose from 'mongoose';

const moduleEnrollmentSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      required: [true, 'Le module est requis'],
    },
    etudiantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'étudiant est requis'],
    },
  },
  {
    timestamps: true,
  }
);

// Create unique compound index
moduleEnrollmentSchema.index(
  { moduleId: 1, etudiantId: 1 },
  { unique: true, sparse: true }
);
moduleEnrollmentSchema.index({ moduleId: 1 });
moduleEnrollmentSchema.index({ etudiantId: 1 });

export default mongoose.model('ModuleEnrollment', moduleEnrollmentSchema, 'moduleenrollments');
