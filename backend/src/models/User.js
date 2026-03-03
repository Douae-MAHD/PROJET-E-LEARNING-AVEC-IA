import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'L\'email est requis'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide'],
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      minlength: 6,
      select: false, // Don't return by default
    },
    role: {
      type: String,
      enum: {
        values: ['professeur', 'etudiant'],
        message: 'Le rôle doit être soit professeur soit etudiant',
      },
      required: [true, 'Le rôle est requis'],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes (email already has unique constraint via schema)
userSchema.index({ role: 1 });

export default mongoose.model('User', userSchema);
