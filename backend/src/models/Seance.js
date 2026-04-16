import mongoose from 'mongoose';

const seanceSchema = new mongoose.Schema(
  {
    // ── Relations ─────────────────────────────────────────
    // moduleId toujours requis — parent direct
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseModule',
      required: [true, 'Le module est requis'],
    },
    // subModuleId optionnel — si le prof veut des chapitres
    subModuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubModule',
      default: null, // null = pas de chapitre
    },

    // ── Description ───────────────────────────────────────
    titre: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
    },

    // ── Ordre automatique ─────────────────────────────────
    // Calculé par pre-save hook — ne jamais envoyer manuellement
    ordre: {
      type: Number,
      default: null,
    },

    type: {
      type: String,
      enum: {
        values: ['presentielle', 'distanciel'],
        message: 'Le type doit être soit presentielle soit distanciel',
      },
      required: [true, 'Le type est requis'],
    },
    phase: {
      type: String,
      enum: ['prelab', 'inlab', 'postlab'],
      required: true,
      default: 'prelab',
    },
    dateSeance: {
      type: Date,
      default: null,
    },
    startTime: {
      type: String,
      required: [true, 'L\'heure de début (startTime) est requise'],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'startTime doit être au format HH:mm (ex: 14:30)',
      ],
      trim: true,
    },
    duree: {
      type: Number,
      default: null,
    },
    sections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      // TODO: RAG
    },
  },
  {
    timestamps: true,
  }
);

// ════════════════════════════════════════════════════════
// PRE-SAVE HOOK — Ordre automatique
// Scope : par subModule si existe, sinon par module
// ════════════════════════════════════════════════════════
seanceSchema.pre('save', async function preSave(next) {
  if (!this.isNew) return next();

  try {
    const Seance = this.constructor;

    // Si subModule → ordre dans le subModule
    // Si pas subModule → ordre dans le module
    const filter = this.subModuleId
      ? { subModuleId: this.subModuleId }
      : { moduleId: this.moduleId, subModuleId: null };

    const count = await Seance.countDocuments(filter);
    this.ordre = count + 1;
    next();
  } catch (error) {
    next(error);
  }
});

// ════════════════════════════════════════════════════════
// MÉTHODES STATIQUES
// ════════════════════════════════════════════════════════

// Séances d'un SubModule (avec chapitres)
seanceSchema.statics.getBySubModule = function (subModuleId) {
  return this.find({ subModuleId })
    .sort({ ordre: 1 })
    .lean();
};

// Séances d'un Module directement (sans chapitres)
seanceSchema.statics.getByModule = function (moduleId) {
  return this.find({ moduleId, subModuleId: null })
    .sort({ ordre: 1 })
    .lean();
};

// Séance suivante — fonctionne dans les 2 cas
seanceSchema.statics.getNext = function (filter, currentOrdre) {
  // filter = { subModuleId } ou { moduleId, subModuleId: null }
  return this.findOne({ ...filter, ordre: currentOrdre + 1 }).lean();
};

// Réordonnement après suppression — fonctionne dans les 2 cas
seanceSchema.statics.reorderAfterDelete = function (filter, deletedOrdre) {
  return this.updateMany(
    { ...filter, ordre: { $gt: deletedOrdre } },
    { $inc: { ordre: -1 } }
  );
};

// ════════════════════════════════════════════════════════
// INDEX
// ════════════════════════════════════════════════════════

// Avec chapitres — ordre unique par subModule
seanceSchema.index(
  { subModuleId: 1, ordre: 1 },
  {
    unique: true,
    partialFilterExpression: { subModuleId: { $ne: null } },
    // partialFilter : uniquement quand subModuleId existe
    // évite les conflits quand subModuleId = null
  }
);

// Sans chapitres — ordre unique par module (subModuleId null)
seanceSchema.index(
  { moduleId: 1, ordre: 1 },
  {
    unique: true,
    partialFilterExpression: { subModuleId: null },
  }
);

seanceSchema.index({ moduleId: 1 });
seanceSchema.index({ subModuleId: 1 });
seanceSchema.index({ type: 1 });

export default mongoose.model('Seance', seanceSchema, 'seances');