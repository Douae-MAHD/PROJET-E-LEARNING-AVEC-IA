import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateGlobalFeedback } from '../services/aiService.js';

const router = express.Router();

// Helper JSON safe parse
const safeParse = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
};

// Obtenir les feedbacks d'un étudiant
router.get('/student', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const etudiant_id = req.user.id;

    const [feedbacks] = await pool.execute(`
      SELECT * FROM feedback 
      WHERE etudiant_id = ? AND type_feedback = 'individuel'
      ORDER BY created_at DESC
    `, [etudiant_id]);

    res.json(feedbacks);
  } catch (error) {
    console.error('Erreur lors de la récupération des feedbacks:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les résultats des étudiants (Professeur uniquement)
router.get('/teacher/results', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const professeur_id = req.user.id;

    // Récupérer tous les quiz des étudiants pour les modules du professeur (incluant quiz globaux et quiz de cours)
    const [quizResults] = await pool.execute(`
      SELECT q.*, u.nom as etudiant_nom, u.email as etudiant_email, 
             p.nom_fichier, sm.titre as sub_module_titre, cm.titre as module_titre
      FROM quiz q
      JOIN users u ON q.etudiant_id = u.id
      JOIN pdfs p ON q.pdf_id = p.id
      JOIN sub_modules sm ON p.sub_module_id = sm.id
      JOIN course_modules cm ON sm.parent_module_id = cm.id
      WHERE cm.professeur_id = ? AND q.date_completion IS NOT NULL
      UNION
      SELECT q.*, u.nom as etudiant_nom, u.email as etudiant_email,
             NULL as nom_fichier, NULL as sub_module_titre, cm.titre as module_titre
      FROM quiz q
      JOIN users u ON q.etudiant_id = u.id
      JOIN course_modules cm ON q.module_id = cm.id
      WHERE cm.professeur_id = ? AND q.date_completion IS NOT NULL AND q.pdf_id IS NULL
      ORDER BY date_completion DESC
    `, [professeur_id, professeur_id]);

    // Récupérer tous les exercices des étudiants pour les modules du professeur (incluant exercices globaux et exercices de cours)
    const [exerciseResults] = await pool.execute(`
      SELECT e.*, u.nom as etudiant_nom, u.email as etudiant_email,
             p.nom_fichier, sm.titre as sub_module_titre, cm.titre as module_titre
      FROM exercises e
      JOIN users u ON e.etudiant_id = u.id
      JOIN pdfs p ON e.pdf_id = p.id
      JOIN sub_modules sm ON p.sub_module_id = sm.id
      JOIN course_modules cm ON sm.parent_module_id = cm.id
      WHERE cm.professeur_id = ? AND e.date_completion IS NOT NULL
      UNION
      SELECT e.*, u.nom as etudiant_nom, u.email as etudiant_email,
             NULL as nom_fichier, NULL as sub_module_titre, cm.titre as module_titre
      FROM exercises e
      JOIN users u ON e.etudiant_id = u.id
      JOIN course_modules cm ON e.module_id = cm.id
      WHERE cm.professeur_id = ? AND e.date_completion IS NOT NULL AND e.pdf_id IS NULL
      ORDER BY date_completion DESC
    `, [professeur_id, professeur_id]);

    const safeParse = (value, fallback = null) => {
      if (!value) return fallback;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    };

    // Formater les résultats
    const formattedQuizResults = quizResults.map(quiz => ({
      ...quiz,
      questions: safeParse(quiz.questions, []),
      reponses_etudiant: safeParse(quiz.reponses_etudiant, null)
    }));

    const formattedExerciseResults = exerciseResults.map(exercise => ({
      ...exercise,
      correction_ia: safeParse(exercise.correction_ia, null)
    }));

    res.json({
      quiz: formattedQuizResults,
      exercises: formattedExerciseResults
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des résultats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Feedback détaillé d'un étudiant pour un module (quiz + exercices)
router.get('/module/:moduleId/student', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const etudiant_id = req.user.id;

    // Récupérer les quiz (cours ou global) du module pour cet étudiant
    const [quizRows] = await pool.execute(`
      SELECT q.*, 
             q.pdf_id AS quiz_pdf_id,
             q.module_id AS quiz_module_id,
             f.id AS feedback_id,
             sm.titre AS sub_module_titre,
             sm.id AS sub_module_id,
             cm.titre AS module_titre,
             cm.id AS module_id,
             f.feedback_texte AS feedback_texte
      FROM quiz q
      LEFT JOIN pdfs p ON q.pdf_id = p.id
      LEFT JOIN sub_modules sm ON p.sub_module_id = sm.id
      LEFT JOIN course_modules cm ON COALESCE(q.module_id, sm.parent_module_id) = cm.id
      LEFT JOIN feedback f ON f.quiz_id = q.id AND f.etudiant_id = q.etudiant_id AND f.type_feedback = 'individuel'
      WHERE q.etudiant_id = ? 
        AND COALESCE(q.module_id, sm.parent_module_id) = ?
      ORDER BY q.date_completion DESC
    `, [etudiant_id, moduleId]);

    // Récupérer les exercices (cours ou global) du module pour cet étudiant
    const [exerciseRows] = await pool.execute(`
      SELECT e.*,
             e.pdf_id AS exercise_pdf_id,
             e.module_id AS exercise_module_id,
             f.id AS feedback_id,
             sm.titre AS sub_module_titre,
             sm.id AS sub_module_id,
             cm.titre AS module_titre,
             cm.id AS module_id,
             f.feedback_texte AS feedback_texte
      FROM exercises e
      LEFT JOIN pdfs p ON e.pdf_id = p.id
      LEFT JOIN sub_modules sm ON p.sub_module_id = sm.id
      LEFT JOIN course_modules cm ON COALESCE(e.module_id, sm.parent_module_id) = cm.id
      LEFT JOIN feedback f ON f.exercise_id = e.id AND f.etudiant_id = e.etudiant_id AND f.type_feedback = 'individuel'
      WHERE e.etudiant_id = ?
        AND COALESCE(e.module_id, sm.parent_module_id) = ?
      ORDER BY e.date_completion DESC
    `, [etudiant_id, moduleId]);

    const safeParse = (value, fallback = null) => {
      if (!value) return fallback;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    };

    const snippet = (text) => {
      if (!text) return 'Point clé du cours';
      const clean = text.replace(/\s+/g, ' ').trim();
      // Ne plus tronquer, retourner le texte complet
      return clean;
    };

    const buildPointsFromText = (text = '', prefix = '') => {
      if (!text) return [`${prefix}Focus acquis`, `${prefix}Notion comprise`, `${prefix}Bonne progression`];
      const sentences = text
        .split(/[\.\n\r]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
      if (sentences.length === 0) return [`${prefix}Focus acquis`, `${prefix}Notion comprise`, `${prefix}Bonne progression`];
      return sentences.slice(0, 3).map((s) => `${prefix}${snippet(s)}`);
    };

    // Fonction pour nettoyer les préfixes ✔ et ⚠ des points forts/faibles
    const cleanPoints = (points) => {
      if (!Array.isArray(points)) return points;
      return points.map((p) => {
        if (typeof p !== 'string') return p;
        // Retirer les préfixes ✔, ✓, ⚠ et les espaces qui suivent
        return p.replace(/^[✔✓⚠]\s*/g, '').trim();
      });
    };

    const quizzes = quizRows
      .map((q) => {
      const parsedFeedback = safeParse(q.feedback_texte, null);
      const questions = safeParse(q.questions, []);
      const reponses = safeParse(q.reponses_etudiant, []);
      // Récupérer les corrections de l'IA si disponibles
      const iaCorrections = parsedFeedback?.corrections || [];
      
      const corrections = questions.map((question, idx) => {
        const studentAnswer = reponses && reponses[idx] !== undefined ? reponses[idx] : null;
        const correctAnswer = question?.correctAnswer || null;
        const correct = studentAnswer === correctAnswer;
        
        // Chercher une correction de l'IA pour cette question
        const iaCorrection = iaCorrections.find(c => c.questionIndex === idx);
        
        let commentaire;
        if (iaCorrection && iaCorrection.commentaire) {
          // Utiliser le commentaire de l'IA
          commentaire = iaCorrection.commentaire;
        } else {
          // Générer un commentaire basique si pas de correction IA
          if (correct) {
            commentaire = `Très bien, vous avez correctement identifié la bonne réponse.`;
          } else if (correctAnswer) {
            commentaire = `Réponse attendue: ${correctAnswer}. Il ne faut pas confondre les différents concepts abordés dans cette question.`;
          } else {
            commentaire = 'Réponse non disponible';
          }
        }
        
        return {
          questionIndex: idx,
          correct,
          commentaire: commentaire,
          correctAnswer: correctAnswer,
          studentAnswer: studentAnswer,
          questionText: question?.question || `Question ${idx + 1}`
        };
      });

      const points_forts = buildPointsFromText(q.feedback_texte, '✔ ');
      const points_faibles = buildPointsFromText(q.feedback_texte, '⚠ ');

      const pf = parsedFeedback?.points_forts || points_forts;
      const pfa = parsedFeedback?.points_faibles || points_faibles;

      return {
        id: q.id,
        feedback_id: q.feedback_id,
        module_id: q.module_id,
        sub_module_id: q.sub_module_id,
        type: (q.quiz_module_id && !q.quiz_pdf_id) ? 'global' : 'cours',
        titre: (q.quiz_module_id && !q.quiz_pdf_id) ? 'Quiz global' : (q.sub_module_titre || q.module_titre || 'Quiz du cours'),
        note: q.note,
        appreciation: parsedFeedback?.feedback || q.feedback_texte || 'Consulte les détails pour plus d’informations.',
        points_forts: pf.slice(0, 3),
        points_faibles: pfa.slice(0, 3),
        corrections
      };
      })
      .filter((q) => q.note !== null && q.note !== undefined);

    const exercises = exerciseRows
      .map((e) => {
      const correction = safeParse(e.correction_ia, null);
      const parsedFeedback = safeParse(e.feedback_texte, null);
      const points_forts_raw = parsedFeedback?.points_forts || correction?.points_forts || buildPointsFromText(e.feedback_texte, '');
      const points_faibles_raw = parsedFeedback?.points_faibles || correction?.points_amelioration || buildPointsFromText(e.feedback_texte, '');
      // Nettoyer les préfixes ✔ et ⚠ s'ils existent déjà
      const points_forts = cleanPoints(points_forts_raw.slice(0, 3)).map((p) => snippet(p));
      const points_faibles = cleanPoints(points_faibles_raw.slice(0, 3)).map((p) => snippet(p));

      return {
        id: e.id,
        feedback_id: e.feedback_id,
        module_id: e.module_id,
        sub_module_id: e.sub_module_id,
        type: (e.exercise_module_id && !e.exercise_pdf_id) ? 'global' : 'cours',
        titre: (e.exercise_module_id && !e.exercise_pdf_id) ? 'Exercices globaux' : (e.sub_module_titre || e.module_titre || 'Exercice du cours'),
        note: e.note,
        appreciation: parsedFeedback?.feedback || correction?.appreciation || e.feedback_texte || correction?.correction || 'Consulte les détails pour plus d\'informations.',
        points_forts: points_forts,
        points_faibles: points_faibles,
        correction_detail: correction
      };
      })
      .filter((e) => e.note !== null && e.note !== undefined);

    res.json({ quizzes, exercises });
  } catch (error) {
    console.error('Erreur lors de la récupération des feedbacks du module:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Feedback détaillé pour un professeur par module (quiz/exercices, avec cours)
router.get('/teacher/module/:moduleId', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const { moduleId } = req.params;
    const professeur_id = req.user.id;

    // Vérifier que le module appartient bien au professeur
    const [modules] = await pool.execute(
      'SELECT id FROM course_modules WHERE id = ? AND professeur_id = ?',
      [moduleId, professeur_id]
    );
    if (modules.length === 0) {
      return res.status(403).json({ error: 'Accès refusé à ce module' });
    }

    const [quizRows] = await pool.execute(`
      SELECT q.*, 
             q.pdf_id AS quiz_pdf_id,
             q.module_id AS quiz_module_id,
             f.id AS feedback_id,
             sm.id AS sub_module_id, sm.titre AS sub_module_titre,
             cm.id AS module_id, cm.titre AS module_titre,
             f.feedback_texte AS feedback_texte
      FROM quiz q
      LEFT JOIN pdfs p ON q.pdf_id = p.id
      LEFT JOIN sub_modules sm ON p.sub_module_id = sm.id
      LEFT JOIN course_modules cm ON COALESCE(q.module_id, sm.parent_module_id) = cm.id
      LEFT JOIN feedback f ON f.quiz_id = q.id AND f.etudiant_id = q.etudiant_id AND f.type_feedback = 'individuel'
      WHERE cm.id = ? AND cm.professeur_id = ? AND q.date_completion IS NOT NULL
      ORDER BY q.date_completion DESC
    `, [moduleId, professeur_id]);

    const [exerciseRows] = await pool.execute(`
      SELECT e.*,
             e.pdf_id AS exercise_pdf_id,
             e.module_id AS exercise_module_id,
             f.id AS feedback_id,
             sm.id AS sub_module_id, sm.titre AS sub_module_titre,
             cm.id AS module_id, cm.titre AS module_titre,
             f.feedback_texte AS feedback_texte
      FROM exercises e
      LEFT JOIN pdfs p ON e.pdf_id = p.id
      LEFT JOIN sub_modules sm ON p.sub_module_id = sm.id
      LEFT JOIN course_modules cm ON COALESCE(e.module_id, sm.parent_module_id) = cm.id
      LEFT JOIN feedback f ON f.exercise_id = e.id AND f.etudiant_id = e.etudiant_id AND f.type_feedback = 'individuel'
      WHERE cm.id = ? AND cm.professeur_id = ? AND e.date_completion IS NOT NULL
      ORDER BY e.date_completion DESC
    `, [moduleId, professeur_id]);

    const safeParse = (value, fallback = null) => {
      if (!value) return fallback;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    };

    const snippet = (text) => {
      if (!text) return 'Point clé du cours';
      const clean = text.replace(/\s+/g, ' ').trim();
      // Ne plus tronquer, retourner le texte complet
      return clean;
    };

    const buildPointsFromText = (text = '', prefix = '') => {
      const sentences = text
        .split(/[\.\n\r]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
      if (sentences.length === 0) return [`${prefix}Focus acquis`, `${prefix}Notion comprise`, `${prefix}Bonne progression`];
      return sentences.slice(0, 3).map((s) => `${prefix}${snippet(s)}`);
    };

    const quizzes = quizRows.map((q) => {
      const parsedFeedback = safeParse(q.feedback_texte, null);
      const points_forts = parsedFeedback?.points_forts || buildPointsFromText(q.feedback_texte, '✔ ');
      const points_faibles = parsedFeedback?.points_faibles || buildPointsFromText(q.feedback_texte, '⚠ ');

      return {
        id: q.id,
        feedback_id: q.feedback_id,
        etudiant_id: q.etudiant_id,
        module_id: q.module_id,
        sub_module_id: q.sub_module_id,
        type: (q.quiz_module_id && !q.quiz_pdf_id) ? 'global' : 'cours',
        titre: (q.quiz_module_id && !q.quiz_pdf_id) ? 'Quiz global' : (q.sub_module_titre || 'Quiz du cours'),
        note: q.note,
        appreciation: parsedFeedback?.feedback || q.feedback_texte || 'Consulte les détails pour plus d’informations.',
        points_forts: points_forts.slice(0, 3),
        points_faibles: points_faibles.slice(0, 3),
        date_completion: q.date_completion
      };
    });

    const exercises = exerciseRows.map((e) => {
      const parsedFeedback = safeParse(e.feedback_texte, null);
      const correction = safeParse(e.correction_ia, null);
      const points_forts_raw = parsedFeedback?.points_forts || correction?.points_forts || buildPointsFromText(e.feedback_texte, '');
      const points_faibles_raw = parsedFeedback?.points_faibles || correction?.points_amelioration || buildPointsFromText(e.feedback_texte, '');
      // Nettoyer les préfixes ✔ et ⚠ s'ils existent déjà
      const points_forts = cleanPoints(points_forts_raw.slice(0, 3)).map((p) => snippet(p));
      const points_faibles = cleanPoints(points_faibles_raw.slice(0, 3)).map((p) => snippet(p));

      return {
        id: e.id,
        feedback_id: e.feedback_id,
        etudiant_id: e.etudiant_id,
        module_id: e.module_id,
        sub_module_id: e.sub_module_id,
        type: (e.exercise_module_id && !e.exercise_pdf_id) ? 'global' : 'cours',
        titre: (e.exercise_module_id && !e.exercise_pdf_id) ? 'Exercices globaux' : (e.sub_module_titre || 'Exercice du cours'),
        note: e.note,
        appreciation: parsedFeedback?.feedback || correction?.appreciation || e.feedback_texte || correction?.correction || 'Consulte les détails pour plus d\'informations.',
        points_forts: points_forts,
        points_faibles: points_faibles,
        date_completion: e.date_completion
      };
    });

    res.json({ quizzes, exercises });
  } catch (error) {
    console.error('Erreur lors de la récupération des feedbacks module (prof):', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer un feedback global pour le professeur
router.post('/teacher/global', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const professeur_id = req.user.id;

    // Récupérer tous les résultats (incluant quiz/exercices globaux et de cours) avec leurs feedbacks
    // Union des quiz de cours (avec pdf_id) et quiz globaux (avec module_id, pdf_id NULL)
    const [quizResults] = await pool.execute(`
      SELECT q.*, u.nom as etudiant_nom, f.feedback_texte as feedback_texte
      FROM quiz q
      JOIN users u ON q.etudiant_id = u.id
      JOIN pdfs p ON q.pdf_id = p.id
      JOIN sub_modules sm ON p.sub_module_id = sm.id
      JOIN course_modules cm ON sm.parent_module_id = cm.id
      LEFT JOIN feedback f ON f.quiz_id = q.id AND f.type_feedback = 'individuel'
      WHERE cm.professeur_id = ? AND q.date_completion IS NOT NULL
      UNION
      SELECT q.*, u.nom as etudiant_nom, f.feedback_texte as feedback_texte
      FROM quiz q
      JOIN users u ON q.etudiant_id = u.id
      JOIN course_modules cm ON q.module_id = cm.id
      LEFT JOIN feedback f ON f.quiz_id = q.id AND f.type_feedback = 'individuel'
      WHERE cm.professeur_id = ? AND q.date_completion IS NOT NULL AND q.pdf_id IS NULL
    `, [professeur_id, professeur_id]);

    // Union des exercices de cours (avec pdf_id) et exercices globaux (avec module_id, pdf_id NULL)
    const [exerciseResults] = await pool.execute(`
      SELECT e.*, u.nom as etudiant_nom, f.feedback_texte as feedback_texte
      FROM exercises e
      JOIN users u ON e.etudiant_id = u.id
      JOIN pdfs p ON e.pdf_id = p.id
      JOIN sub_modules sm ON p.sub_module_id = sm.id
      JOIN course_modules cm ON sm.parent_module_id = cm.id
      LEFT JOIN feedback f ON f.exercise_id = e.id AND f.type_feedback = 'individuel'
      WHERE cm.professeur_id = ? AND e.date_completion IS NOT NULL
      UNION
      SELECT e.*, u.nom as etudiant_nom, f.feedback_texte as feedback_texte
      FROM exercises e
      JOIN users u ON e.etudiant_id = u.id
      JOIN course_modules cm ON e.module_id = cm.id
      LEFT JOIN feedback f ON f.exercise_id = e.id AND f.type_feedback = 'individuel'
      WHERE cm.professeur_id = ? AND e.date_completion IS NOT NULL AND e.pdf_id IS NULL
    `, [professeur_id, professeur_id]);

    const allResults = {
      quiz: quizResults.map(q => {
        const feedback = safeParse(q.feedback_texte, null);
        return {
          etudiant: q.etudiant_nom,
          note: q.note,
          questions: safeParse(q.questions, []),
          points_forts: feedback?.points_forts || [],
          points_faibles: feedback?.points_faibles || []
        };
      }),
      exercises: exerciseResults.map(e => {
        const feedback = safeParse(e.feedback_texte, null);
        const correction = safeParse(e.correction_ia, null);
        return {
          etudiant: e.etudiant_nom,
          note: e.note,
          enonce: e.enonce,
          points_forts: feedback?.points_forts || correction?.points_forts || [],
          points_faibles: feedback?.points_faibles || correction?.points_amelioration || []
        };
      })
    };

    // Générer le feedback global avec l'IA
    const globalFeedback = await generateGlobalFeedback(allResults);

    // Enregistrer le feedback global
    await pool.execute(
      'INSERT INTO feedback (etudiant_id, feedback_texte, type_feedback) VALUES (?, ?, ?)',
      [professeur_id, JSON.stringify(globalFeedback), 'global']
    );

    res.json({
      message: 'Feedback global généré avec succès',
      feedback: globalFeedback
    });
  } catch (error) {
    console.error('Erreur lors de la génération du feedback global:', error);
    
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
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le feedback global (Professeur)
router.get('/teacher/global', authenticateToken, requireRole(['professeur']), async (req, res) => {
  try {
    const professeur_id = req.user.id;

    const [feedbacks] = await pool.execute(`
      SELECT * FROM feedback 
      WHERE type_feedback = 'global'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (feedbacks.length === 0) {
      return res.json({ message: 'Aucun feedback global disponible' });
    }

    res.json({
      ...feedbacks[0],
      feedback_texte: JSON.parse(feedbacks[0].feedback_texte)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du feedback global:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;




