import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateExercises, correctExercise } from '../services/aiService.js';
import { extractTextFromPDF, extractTextFromMultiplePDFs } from '../services/aiService.js';

const router = express.Router();

// Helper function for safe JSON parsing
const safeParse = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value; // Already an object
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error('Erreur parsing JSON:', e);
    return fallback;
  }
};

// Générer des exercices pour un cours (tous les PDFs du cours)
router.post('/generate/cours/:subModuleId', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const { subModuleId } = req.params;
    const etudiant_id = req.user.id;

    // Vérifier que le cours existe
    const [subModules] = await pool.execute(
      'SELECT * FROM sub_modules WHERE id = ?',
      [subModuleId]
    );

    if (subModules.length === 0) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Récupérer tous les PDFs de ce cours
    const [pdfs] = await pool.execute(
      'SELECT * FROM pdfs WHERE sub_module_id = ?',
      [subModuleId]
    );

    if (pdfs.length === 0) {
      return res.status(400).json({ error: 'Aucun PDF trouvé dans ce cours. Le professeur doit d\'abord uploader des PDFs.' });
    }

    // Vérifier si des exercices existent déjà pour cet étudiant et ce cours
    const pdfIds = pdfs.map(pdf => pdf.id);
    const placeholders = pdfIds.map(() => '?').join(',');
    const [existingExercises] = await pool.execute(
      `SELECT * FROM exercises WHERE pdf_id IN (${placeholders}) AND etudiant_id = ? ORDER BY created_at ASC`,
      [...pdfIds, etudiant_id]
    );

    if (existingExercises.length > 0) {
      // Retourner les exercices existants avec leurs corrections
      const exercisesWithCorrections = existingExercises.map(ex => {
        return {
          id: ex.id,
          enonce: ex.enonce
        };
      });
      
      return res.json({
        message: 'Exercices déjà générés pour ce cours',
        exercises: exercisesWithCorrections
      });
    }

    // Extraire le texte de tous les PDFs du cours
    const pdfPaths = pdfs.map(pdf => pdf.chemin_fichier);
    let combinedText = '';
    try {
      combinedText = await extractTextFromMultiplePDFs(pdfPaths);
      if (!combinedText || combinedText.trim().length === 0) {
        return res.status(400).json({ error: 'Les PDFs sont vides ou ne peuvent pas être lus.' });
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction des PDFs:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'extraction des PDFs' });
    }

    // Générer les exercices avec Gemini
    const exercisesData = await generateExercises(combinedText);

    // Créer les exercices dans la base de données (on utilise le premier PDF comme référence)
    const createdExercises = [];
    for (const exercise of exercisesData.exercises) {
      const [result] = await pool.execute(
        'INSERT INTO exercises (pdf_id, etudiant_id, enonce) VALUES (?, ?, ?)',
        [pdfs[0].id, etudiant_id, exercise.enonce]
      );
      createdExercises.push({
        id: result.insertId,
        enonce: exercise.enonce
      });
    }

    res.status(201).json({
      message: 'Exercices générés avec succès pour ce cours',
      exercises: createdExercises
    });
  } catch (error) {
    console.error('Erreur lors de la génération des exercices pour le cours:', error);
    
    // Gérer spécifiquement les erreurs de l'API Gemini
    const errorMessage = error?.message || '';
    const statusCode = error?.status || 500;
    
    if (statusCode === 503 || errorMessage.includes('overloaded')) {
      return res.status(503).json({ 
        error: 'Le service de génération est temporairement surchargé. Veuillez réessayer dans quelques minutes.',
        retryAfter: 60
      });
    }
    
    if (statusCode === 429 || errorMessage.includes('quota')) {
      return res.status(429).json({ 
        error: 'Quota API dépassé. Veuillez réessayer plus tard ou contacter l\'administrateur.'
      });
    }
    
    res.status(500).json({ error: 'Erreur lors de la génération des exercices: ' + error.message });
  }
});

// Générer des exercices à partir d'un PDF
router.post('/generate/:pdfId', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const { pdfId } = req.params;
    const etudiant_id = req.user.id;

    // Vérifier que le PDF existe
    const [pdfs] = await pool.execute(
      'SELECT * FROM pdfs WHERE id = ?',
      [pdfId]
    );

    if (pdfs.length === 0) {
      return res.status(404).json({ error: 'PDF non trouvé' });
    }

    const pdf = pdfs[0];

    // Extraire le texte du PDF
    let pdfText = '';
    try {
      pdfText = await extractTextFromPDF(pdf.chemin_fichier);
      if (!pdfText || pdfText.trim().length === 0) {
        console.warn('PDF texte vide');
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction du PDF:', error);
      pdfText = ''; // Continuer avec texte vide
    }

    // Générer les exercices avec Gemini
    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'Le PDF est vide ou ne peut pas être lu. Veuillez vérifier le fichier.' });
    }
    const exercisesData = await generateExercises(pdfText);

    // Créer les exercices dans la base de données
    const createdExercises = [];
    for (const exercise of exercisesData.exercises) {
      const [result] = await pool.execute(
        'INSERT INTO exercises (pdf_id, etudiant_id, enonce) VALUES (?, ?, ?)',
        [pdfId, etudiant_id, exercise.enonce]
      );
      createdExercises.push({
        id: result.insertId,
        enonce: exercise.enonce
      });
    }

    res.status(201).json({
      message: 'Exercices générés avec succès',
      exercises: createdExercises
    });
  } catch (error) {
    console.error('Erreur lors de la génération des exercices:', error);
    
    // Gérer spécifiquement les erreurs de l'API Gemini
    const errorMessage = error?.message || '';
    const statusCode = error?.status || 500;
    
    if (statusCode === 503 || errorMessage.includes('overloaded')) {
      return res.status(503).json({ 
        error: 'Le service de génération est temporairement surchargé. Veuillez réessayer dans quelques minutes.',
        retryAfter: 60
      });
    }
    
    if (statusCode === 429 || errorMessage.includes('quota')) {
      return res.status(429).json({ 
        error: 'Quota API dépassé. Veuillez réessayer plus tard ou contacter l\'administrateur.'
      });
    }
    
    res.status(500).json({ error: 'Erreur lors de la génération des exercices: ' + error.message });
  }
});

// Soumettre une réponse d'exercice
router.post('/:exerciseId/submit', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { reponse } = req.body;
    const etudiant_id = req.user.id;

    if (!reponse) {
      return res.status(400).json({ error: 'La réponse est requise' });
    }

    // Récupérer l'exercice (peut être lié à un PDF ou à un module)
    const [exercises] = await pool.execute(
      'SELECT e.*, p.chemin_fichier FROM exercises e LEFT JOIN pdfs p ON e.pdf_id = p.id WHERE e.id = ? AND e.etudiant_id = ?',
      [exerciseId, etudiant_id]
    );

    if (exercises.length === 0) {
      return res.status(404).json({ error: 'Exercice non trouvé' });
    }

    const exercise = exercises[0];

    // Si l'exercice est lié à un module, récupérer tous les PDFs du module
    let pdfText = '';
    if (exercise.module_id) {
      // Récupérer tous les PDFs du module
      const [allSubModules] = await pool.execute(`
        SELECT id FROM sub_modules 
        WHERE parent_module_id = ? OR parent_sub_module_id IN (
          SELECT id FROM sub_modules WHERE parent_module_id = ?
        )
      `, [exercise.module_id, exercise.module_id]);
      
      const subModuleIds = allSubModules.map(sm => sm.id);
      if (subModuleIds.length > 0) {
        const placeholders = subModuleIds.map(() => '?').join(',');
        const [pdfs] = await pool.execute(
          `SELECT chemin_fichier FROM pdfs WHERE sub_module_id IN (${placeholders})`,
          subModuleIds
        );
        const pdfPaths = pdfs.map(pdf => pdf.chemin_fichier);
        try {
          pdfText = await extractTextFromMultiplePDFs(pdfPaths);
          if (!pdfText || pdfText.trim().length === 0) {
            console.warn('PDF texte vide pour la correction');
          }
        } catch (error) {
          console.error('Erreur lors de l\'extraction des PDFs pour correction:', error);
          pdfText = ''; // Continuer avec texte vide
        }
      }
    } else if (exercise.chemin_fichier) {
      // Extraire le texte du PDF pour le contexte
      try {
        pdfText = await extractTextFromPDF(exercise.chemin_fichier);
        if (!pdfText || pdfText.trim().length === 0) {
          console.warn('PDF texte vide pour la correction');
        }
      } catch (error) {
        console.error('Erreur lors de l\'extraction du PDF pour correction:', error);
        pdfText = ''; // Continuer avec texte vide
      }
    }

    // Corriger l'exercice avec Gemini
    const correction = await correctExercise(exercise.enonce, reponse, pdfText || '');

    if (!correction || typeof correction !== 'object') {
      throw new Error('Correction IA indisponible');
    }

    const noteValue = Number.isFinite(correction.note) ? correction.note : 0;
    const correctionTexte = correction.correction || 'Feedback indisponible';
    const pointsForts = Array.isArray(correction.points_forts) ? correction.points_forts : [];
    const pointsFaibles = Array.isArray(correction.points_amelioration) ? correction.points_amelioration : [];

    // Mettre à jour l'exercice
    await pool.execute(
      'UPDATE exercises SET reponse_etudiante = ?, correction_ia = ?, note = ?, date_completion = NOW() WHERE id = ?',
      [reponse, JSON.stringify({ ...correction, note: noteValue, points_forts: pointsForts, points_amelioration: pointsFaibles, correction: correctionTexte }), noteValue, exerciseId]
    );

    // Créer un feedback individuel (JSON compact avec puces)
    const feedbackPayload = {
      feedback: correctionTexte,
      points_forts: pointsForts,
      points_faibles: pointsFaibles
    };
    await pool.execute(
      'INSERT INTO feedback (etudiant_id, exercise_id, feedback_texte, type_feedback) VALUES (?, ?, ?, ?)',
      [etudiant_id, exerciseId, JSON.stringify(feedbackPayload), 'individuel']
    );

    res.json({
      message: 'Exercice soumis avec succès',
      note: noteValue,
      correction: correctionTexte,
      points_forts: pointsForts,
      points_amelioration: pointsFaibles
    });
  } catch (error) {
    console.error('Erreur lors de la soumission de l\'exercice:', error);
    
    // Gérer spécifiquement les erreurs de l'API Gemini
    const errorMessage = error?.message || '';
    const statusCode = error?.status || 500;
    
    if (statusCode === 503 || errorMessage.includes('overloaded')) {
      return res.status(503).json({ 
        error: 'Le service de correction est temporairement surchargé. Veuillez réessayer dans quelques minutes.',
        retryAfter: 60
      });
    }
    
    if (statusCode === 429 || errorMessage.includes('quota')) {
      return res.status(429).json({ 
        error: 'Quota API dépassé. Veuillez réessayer plus tard ou contacter l\'administrateur.'
      });
    }
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un exercice par ID
router.get('/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const etudiant_id = req.user.id;

    const [exercises] = await pool.execute(
      'SELECT * FROM exercises WHERE id = ? AND etudiant_id = ?',
      [exerciseId, etudiant_id]
    );

    if (exercises.length === 0) {
      return res.status(404).json({ error: 'Exercice non trouvé' });
    }

    const exercise = exercises[0];
    const correction_ia = safeParse(exercise.correction_ia, null);
    
    res.json({
      ...exercise,
      correction_ia: correction_ia
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'exercice:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les exercices d'un étudiant
router.get('/student/all', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const etudiant_id = req.user.id;

    const [exercises] = await pool.execute(`
      SELECT e.*, 
             p.nom_fichier, 
             sm.titre as sub_module_titre,
             cm.titre as module_titre
      FROM exercises e
      LEFT JOIN pdfs p ON e.pdf_id = p.id
      LEFT JOIN sub_modules sm ON p.sub_module_id = sm.id
      LEFT JOIN course_modules cm ON e.module_id = cm.id
      WHERE e.etudiant_id = ?
      ORDER BY e.created_at DESC
    `, [etudiant_id]);

    const formattedExercises = exercises.map(exercise => {
      let correction_ia = exercise.correction_ia;
      if (correction_ia && typeof correction_ia === 'string') {
        try {
          correction_ia = JSON.parse(correction_ia);
        } catch (e) {
          console.error('Erreur parsing correction_ia:', e);
          correction_ia = null;
        }
      }
      
      return {
        ...exercise,
        correction_ia: correction_ia
      };
    });

    res.json(formattedExercises);
  } catch (error) {
    console.error('Erreur lors de la récupération des exercices:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer des exercices globaux pour un module (tous les PDFs du module)
router.post('/generate/module/:moduleId', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const etudiant_id = req.user.id;

    // Vérifier que le module existe
    const [modules] = await pool.execute(
      'SELECT * FROM course_modules WHERE id = ?',
      [moduleId]
    );

    if (modules.length === 0) {
      return res.status(404).json({ error: 'Module non trouvé' });
    }

    // Récupérer tous les cours du module (y compris les sous-cours)
    const [allSubModules] = await pool.execute(`
      SELECT id FROM sub_modules 
      WHERE parent_module_id = ? OR parent_sub_module_id IN (
        SELECT id FROM sub_modules WHERE parent_module_id = ?
      )
    `, [moduleId, moduleId]);

    if (allSubModules.length === 0) {
      return res.status(400).json({ error: 'Aucun cours trouvé dans ce module' });
    }

    const subModuleIds = allSubModules.map(sm => sm.id);

    // Récupérer tous les PDFs de tous les cours
    const placeholders = subModuleIds.map(() => '?').join(',');
    const [pdfs] = await pool.execute(
      `SELECT * FROM pdfs WHERE sub_module_id IN (${placeholders})`,
      subModuleIds
    );

    if (pdfs.length === 0) {
      return res.status(400).json({ error: 'Aucun PDF trouvé dans ce module. Le professeur doit d\'abord uploader des PDFs.' });
    }

    // Extraire le texte de tous les PDFs
    const pdfPaths = pdfs.map(pdf => pdf.chemin_fichier);
    let combinedText = '';
    try {
      combinedText = await extractTextFromMultiplePDFs(pdfPaths);
      if (!combinedText || combinedText.trim().length === 0) {
        console.warn('Aucun texte extrait des PDFs');
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction des PDFs:', error);
      combinedText = ''; // Continuer avec texte vide
    }

    // Générer les exercices avec Gemini
    if (!combinedText || combinedText.trim().length === 0) {
      return res.status(400).json({ error: 'Aucun texte extrait des PDFs. Veuillez vérifier les fichiers.' });
    }
    const exercisesData = await generateExercises(combinedText);

    // Créer les exercices globaux dans la base de données
    const createdExercises = [];
    for (const exercise of exercisesData.exercises) {
      const [result] = await pool.execute(
        'INSERT INTO exercises (pdf_id, module_id, etudiant_id, enonce) VALUES (?, ?, ?, ?)',
        [null, moduleId, etudiant_id, exercise.enonce]
      );
      createdExercises.push({
        id: result.insertId,
        enonce: exercise.enonce
      });
    }

    res.status(201).json({
      message: 'Exercices globaux générés avec succès',
      exercises: createdExercises
    });
  } catch (error) {
    console.error('Erreur lors de la génération des exercices globaux:', error);
    
    // Gérer spécifiquement les erreurs de l'API Gemini
    const errorMessage = error?.message || '';
    const statusCode = error?.status || 500;
    
    if (statusCode === 503 || errorMessage.includes('overloaded')) {
      return res.status(503).json({ 
        error: 'Le service de génération est temporairement surchargé. Veuillez réessayer dans quelques minutes.',
        retryAfter: 60
      });
    }
    
    if (statusCode === 429 || errorMessage.includes('quota')) {
      return res.status(429).json({ 
        error: 'Quota API dépassé. Veuillez réessayer plus tard ou contacter l\'administrateur.'
      });
    }
    
    res.status(500).json({ error: 'Erreur lors de la génération des exercices globaux: ' + error.message });
  }
});

export default router;

