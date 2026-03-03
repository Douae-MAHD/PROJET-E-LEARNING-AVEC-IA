import mongoose from 'mongoose';

const pdfSchema = new mongoose.Schema(
  {
    nomFichier: {
      type: String,
      required: [true, 'Le nom du fichier est requis'],
      trim: true,
    },
    cheminFichier: {
      type: String,
      required: [true, 'Le chemin du fichier est requis'],
    },
    tailleFichier: {
      type: Number,
      default: null,
    },
    subModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubModule',
      required: [true, 'Le sous-module est requis'],
    },
    textContent: {
      type: String,
      default: null,
    },
    textExtractedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
pdfSchema.index({ subModuleId: 1 });

export default mongoose.model('PDF', pdfSchema, 'pdfs');
