import mongoose from 'mongoose';

const subModuleSchema = new mongoose.Schema(
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
    parentModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      default: null,
    },
    parentSubModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubModule',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
subModuleSchema.index({ parentModuleId: 1 });
subModuleSchema.index({ parentSubModuleId: 1 });

export default mongoose.model('SubModule', subModuleSchema, 'submodules');
