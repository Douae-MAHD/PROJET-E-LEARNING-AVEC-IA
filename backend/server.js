import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/auth.js';
import modulesRoutes from './routes/modules.js';
import pdfsRoutes from './routes/pdfs.js';
import quizRoutes from './routes/quiz.js';
import exercisesRoutes from './routes/exercises.js';
import feedbackRoutes from './routes/feedback.js';
import enrollmentsRoutes from './routes/enrollments.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/pdfs', pdfsRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/enrollments', enrollmentsRoutes);

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'API e-learning fonctionnelle!' });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📚 API e-learning disponible sur http://localhost:${PORT}/api`);
});


