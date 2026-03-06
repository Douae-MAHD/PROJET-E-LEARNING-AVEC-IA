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
    seanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seance',
      required: [true, 'La séance est requise'],
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
pdfSchema.index({ seanceId: 1 });

export default mongoose.model('PDF', pdfSchema, 'pdfs');
