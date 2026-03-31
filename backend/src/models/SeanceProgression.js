import mongoose from 'mongoose';

const seanceProgressionSchema = new mongoose.Schema(
  {
    etudiantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'étudiant est requis'],
    },
    seanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seance',
      required: [true, 'La séance est requise'],
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      required: [true, 'Le module est requis'],
    },
    statut: {
      type: String,
      enum: {
        values: ['non_commencee', 'en_cours', 'validee'],
        message: 'Le statut doit être non_commencee, en_cours ou validee',
      },
      default: 'non_commencee',
    },
    scoreQuiz: {
      // TODO: seuil de validation à définir avec Salma (recherche doctorale)
      type: Number,
      default: null,
      min: [0, 'Le score du quiz ne peut pas être inférieur à 0'],
      max: [100, 'Le score du quiz ne peut pas dépasser 100'],
    },
    scoreExercice: {
      type: Number,
      default: null,
      min: [0, 'Le score de l\'exercice ne peut pas être inférieur à 0'],
      max: [100, 'Le score de l\'exercice ne peut pas dépasser 100'],
    },
    tentatives: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre de tentatives ne peut pas être négatif'],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

seanceProgressionSchema.index(
  { etudiantId: 1, seanceId: 1 },
  { unique: true }
);
seanceProgressionSchema.index({ etudiantId: 1, moduleId: 1 });
seanceProgressionSchema.index({ seanceId: 1 });
seanceProgressionSchema.index({ statut: 1 });

seanceProgressionSchema.statics.getByEtudiantAndModule = function (etudiantId, moduleId) {
  return this.find({ etudiantId, moduleId })
    .sort({ createdAt: 1 })
    .lean();
};

seanceProgressionSchema.statics.isValidee = async function (etudiantId, seanceId) {
  const result = await this.findOne({ etudiantId, seanceId, statut: 'validee' });
  return !!result;
};

seanceProgressionSchema.statics.getStatut = function (etudiantId, seanceId) {
  return this.findOne({ etudiantId, seanceId })
    .select('statut scoreQuiz tentatives')
    .lean();
};

export default mongoose.model(
  'SeanceProgression',
  seanceProgressionSchema,
  'seanceprogressions'
);