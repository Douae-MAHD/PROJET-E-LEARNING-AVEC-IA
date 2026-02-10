import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateQuizQuestions, correctQuiz } from '../services/aiService.js';
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

// Générer un quiz global pour un module (tous les PDFs du module)
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

    // Vérifier si un quiz global existe déjà pour cet étudiant et ce module
    const [existingQuiz] = await pool.execute(
      'SELECT * FROM quiz WHERE module_id = ? AND etudiant_id = ? AND pdf_id IS NULL',
      [moduleId, etudiant_id]
    );

    if (existingQuiz.length > 0) {
      const questions = safeParse(existingQuiz[0].questions, []);
      return res.json({
        message: 'Quiz global déjà généré',
        quiz: {
          id: existingQuiz[0].id,
          questions: questions
        }
      });
    }

    // Extraire le texte de tous les PDFs
    const pdfPaths = pdfs.map(pdf => pdf.chemin_fichier);
    let combinedText = '';
    try {
      combinedText = await extractTextFromMultiplePDFs(pdfPaths);
      if (!combinedText || combinedText.trim().length === 0) {
        console.warn('Aucun texte extrait des PDFs, utilisation du mode simple avec texte vide');
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction des PDFs:', error);
      combinedText = ''; // Continuer avec texte vide, le mode simple gérera
    }

    // Générer les questions (mode simple ou IA)
    const quizData = await generateQuizQuestions(combinedText || 'Contenu du cours');

    // Enregistrer le quiz global dans la base de données
    const [result] = await pool.execute(
      'INSERT INTO quiz (pdf_id, module_id, etudiant_id, questions) VALUES (?, ?, ?, ?)',
      [null, moduleId, etudiant_id, JSON.stringify(quizData.questions)]
    );

    res.status(201).json({
      message: 'Quiz global généré avec succès',
      quiz: {
        id: result.insertId,
        questions: quizData.questions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du quiz global:', error);
    
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
    
    res.status(500).json({ error: 'Erreur lors de la génération du quiz global: ' + error.message });
  }
});

// Générer un quiz pour un cours (tous les PDFs du cours)
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

    // Vérifier si un quiz existe déjà pour cet étudiant et ce cours
    const [existingQuiz] = await pool.execute(
      'SELECT * FROM quiz WHERE pdf_id IN (SELECT id FROM pdfs WHERE sub_module_id = ?) AND etudiant_id = ? AND module_id IS NULL LIMIT 1',
      [subModuleId, etudiant_id]
    );

    if (existingQuiz.length > 0) {
      const questions = safeParse(existingQuiz[0].questions, []);
      
      return res.json({
        message: 'Quiz déjà généré pour ce cours',
        quiz: {
          id: existingQuiz[0].id,
          questions: questions
        }
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

    // Générer les questions avec Gemini
    const quizData = await generateQuizQuestions(combinedText);

    // Enregistrer le quiz (on utilise le premier PDF comme référence, mais le quiz couvre tous les PDFs)
    const [result] = await pool.execute(
      'INSERT INTO quiz (pdf_id, etudiant_id, questions) VALUES (?, ?, ?)',
      [pdfs[0].id, etudiant_id, JSON.stringify(quizData.questions)]
    );

    res.status(201).json({
      message: 'Quiz généré avec succès pour ce cours',
      quiz: {
        id: result.insertId,
        questions: quizData.questions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du quiz pour le cours:', error);
    
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
    
    res.status(500).json({ error: 'Erreur lors de la génération du quiz: ' + error.message });
  }
});

// Générer un quiz à partir d'un PDF
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

    // Vérifier si un quiz existe déjà pour cet étudiant et ce PDF
    const [existingQuiz] = await pool.execute(
      'SELECT * FROM quiz WHERE pdf_id = ? AND etudiant_id = ?',
      [pdfId, etudiant_id]
    );

    if (existingQuiz.length > 0) {
      const questions = safeParse(existingQuiz[0].questions, []);
      
      return res.json({
        message: 'Quiz déjà généré',
        quiz: {
          id: existingQuiz[0].id,
          questions: questions
        }
      });
    }

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

    // Générer les questions avec Gemini
    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ error: 'Le PDF est vide ou ne peut pas être lu. Veuillez vérifier le fichier.' });
    }
    const quizData = await generateQuizQuestions(pdfText);

    // Enregistrer le quiz dans la base de données
    const [result] = await pool.execute(
      'INSERT INTO quiz (pdf_id, etudiant_id, questions) VALUES (?, ?, ?)',
      [pdfId, etudiant_id, JSON.stringify(quizData.questions)]
    );

    res.status(201).json({
      message: 'Quiz généré avec succès',
      quiz: {
        id: result.insertId,
        questions: quizData.questions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du quiz:', error);
    
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
    
    res.status(500).json({ error: 'Erreur lors de la génération du quiz: ' + error.message });
  }
});

// Soumettre les réponses du quiz
router.post('/:quizId/submit', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const { quizId } = req.params;
    const { reponses } = req.body;
    const etudiant_id = req.user.id;

    if (!reponses || !Array.isArray(reponses)) {
      return res.status(400).json({ error: 'Les réponses sont requises' });
    }

    // Récupérer le quiz (peut être lié à un PDF ou à un module)
    const [quizzes] = await pool.execute(
      'SELECT * FROM quiz WHERE id = ? AND etudiant_id = ?',
      [quizId, etudiant_id]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({ error: 'Quiz non trouvé' });
    }

    const quiz = quizzes[0];
    const questions = safeParse(quiz.questions, []);
    if (!questions || questions.length === 0) {
      return res.status(500).json({ error: 'Erreur lors de la lecture du quiz' });
    }

    // Corriger le quiz avec l'IA
    const correction = await correctQuiz(questions, reponses);

    // Mettre à jour le quiz avec les réponses et la note
    await pool.execute(
      'UPDATE quiz SET reponses_etudiant = ?, note = ?, date_completion = NOW() WHERE id = ?',
      [JSON.stringify(reponses), correction.note, quizId]
    );

    // Créer un feedback individuel
    const feedbackPayload = {
      feedback: correction.feedback,
      points_forts: correction.points_forts || [],
      points_faibles: correction.points_faibles || [],
      corrections: correction.corrections || []
    };
    await pool.execute(
      'INSERT INTO feedback (etudiant_id, quiz_id, feedback_texte, type_feedback) VALUES (?, ?, ?, ?)',
      [etudiant_id, quizId, JSON.stringify(feedbackPayload), 'individuel']
    );

    res.json({
      message: 'Quiz soumis avec succès',
      note: correction.note,
      feedback: correction.feedback,
      points_forts: correction.points_forts || [],
      points_faibles: correction.points_faibles || [],
      corrections: correction.corrections
    });
  } catch (error) {
    console.error('Erreur lors de la soumission du quiz:', error);
    
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

// Obtenir un quiz par ID
router.get('/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const etudiant_id = req.user.id;

    const [quizzes] = await pool.execute(
      'SELECT * FROM quiz WHERE id = ? AND etudiant_id = ?',
      [quizId, etudiant_id]
    );

    if (quizzes.length === 0) {
      return res.status(404).json({ error: 'Quiz non trouvé' });
    }

    const quiz = quizzes[0];
    // Vérifier si questions est déjà un objet ou une chaîne JSON
    const questions = safeParse(quiz.questions, []);
    
    const reponses_etudiant = safeParse(quiz.reponses_etudiant, null);

    // Récupérer le feedback pour obtenir les corrections
    let corrections = null;
    let feedbackData = null;
    if (quiz.reponses_etudiant) {
      const [feedbacks] = await pool.execute(
        'SELECT * FROM feedback WHERE quiz_id = ? AND etudiant_id = ? AND type_feedback = ? ORDER BY created_at DESC LIMIT 1',
        [quizId, etudiant_id, 'individuel']
      );

      if (feedbacks.length > 0) {
        try {
          feedbackData = typeof feedbacks[0].feedback_texte === 'string' 
            ? JSON.parse(feedbacks[0].feedback_texte) 
            : feedbacks[0].feedback_texte;
          
          // Reconstruire les corrections à partir des questions et réponses
          if (questions && reponses_etudiant && Array.isArray(reponses_etudiant)) {
            corrections = questions.map((q, index) => {
              const studentAnswer = reponses_etudiant[index];
              const isCorrect = q.correctAnswer === studentAnswer;
              
              // Chercher un commentaire spécifique dans les corrections de l'IA si disponible
              let commentaire;
              if (feedbackData && Array.isArray(feedbackData.corrections)) {
                const correctionItem = feedbackData.corrections.find(c => c.questionIndex === index);
                if (correctionItem && correctionItem.commentaire) {
                  commentaire = correctionItem.commentaire;
                } else {
                  // Commentaire par défaut amélioré si pas de correction IA
                  commentaire = isCorrect 
                    ? `Très bien, vous avez correctement identifié la bonne réponse.`
                    : `Réponse attendue: ${q.correctAnswer || 'N/A'}. Il ne faut pas confondre les différents concepts abordés dans cette question.`;
                }
              } else {
                // Commentaire par défaut amélioré
                commentaire = isCorrect 
                  ? `Très bien, vous avez correctement identifié la bonne réponse.`
                  : `Réponse attendue: ${q.correctAnswer || 'N/A'}. Il ne faut pas confondre les différents concepts abordés dans cette question.`;
              }
              
              return {
                questionIndex: index,
                correct: isCorrect,
                commentaire: commentaire,
                correctAnswer: q.correctAnswer,
                studentAnswer: studentAnswer
              };
            });
          }
        } catch (e) {
          console.error('Erreur parsing feedback:', e);
        }
      } else {
        // Si pas de feedback mais quiz complété, reconstruire les corrections basiques
        if (questions && reponses_etudiant && Array.isArray(reponses_etudiant)) {
          corrections = questions.map((q, index) => {
            const studentAnswer = reponses_etudiant[index];
            const isCorrect = q.correctAnswer === studentAnswer;
            return {
              questionIndex: index,
              correct: isCorrect,
              commentaire: isCorrect 
                ? `Très bien, vous avez correctement identifié la bonne réponse.`
                : `Réponse attendue: ${q.correctAnswer || 'N/A'}. Il ne faut pas confondre les différents concepts abordés dans cette question.`,
              correctAnswer: q.correctAnswer,
              studentAnswer: studentAnswer
            };
          });
        }
      }
    }
    
    const response = {
      ...quiz,
      questions: questions,
      reponses_etudiant: reponses_etudiant
    };

    // Ajouter les données de résultat si le quiz est complété
    if (quiz.reponses_etudiant && quiz.note !== null) {
      response.result = {
        note: quiz.note,
        feedback: feedbackData?.feedback || 'Quiz complété',
        points_forts: feedbackData?.points_forts || [],
        points_faibles: feedbackData?.points_faibles || [],
        corrections: corrections
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération du quiz:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les quiz d'un étudiant
router.get('/student/all', authenticateToken, requireRole(['etudiant']), async (req, res) => {
  try {
    const etudiant_id = req.user.id;

    const [quizzes] = await pool.execute(`
      SELECT q.*, 
             p.nom_fichier, 
             sm.titre as sub_module_titre,
             cm.titre as module_titre
      FROM quiz q
      LEFT JOIN pdfs p ON q.pdf_id = p.id
      LEFT JOIN sub_modules sm ON p.sub_module_id = sm.id
      LEFT JOIN course_modules cm ON q.module_id = cm.id
      WHERE q.etudiant_id = ?
      ORDER BY q.created_at DESC
    `, [etudiant_id]);

    const formattedQuizzes = quizzes.map(quiz => {
      const questions = safeParse(quiz.questions, []);
      
      const reponses_etudiant = safeParse(quiz.reponses_etudiant, null);
      
      return {
        ...quiz,
        questions: questions,
        reponses_etudiant: reponses_etudiant
      };
    });

    res.json(formattedQuizzes);
  } catch (error) {
    console.error('Erreur lors de la récupération des quiz:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Générer un quiz global pour un module (tous les PDFs du module)
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

    // Récupérer tous les cours du module
    const [subModules] = await pool.execute(`
      SELECT sm.* FROM sub_modules sm
      WHERE sm.parent_module_id = ? OR sm.parent_sub_module_id IN (
        SELECT id FROM sub_modules WHERE parent_module_id = ?
      )
    `, [moduleId, moduleId]);

    if (subModules.length === 0) {
      return res.status(400).json({ error: 'Aucun cours trouvé dans ce module' });
    }

    const subModuleIds = subModules.map(sm => sm.id);

    // Récupérer tous les PDFs de tous les cours
    const [pdfs] = await pool.execute(
      `SELECT * FROM pdfs WHERE sub_module_id IN (${subModuleIds.map(() => '?').join(',')})`,
      subModuleIds
    );

    if (pdfs.length === 0) {
      return res.status(400).json({ error: 'Aucun PDF trouvé dans ce module' });
    }

    // Vérifier si un quiz global existe déjà pour cet étudiant et ce module
    const [existingQuiz] = await pool.execute(
      'SELECT * FROM quiz WHERE pdf_id IS NULL AND etudiant_id = ?',
      [etudiant_id]
    );

    // Extraire le texte de tous les PDFs
    const pdfPaths = pdfs.map(pdf => pdf.chemin_fichier);
    let combinedText = '';
    try {
      combinedText = await extractTextFromMultiplePDFs(pdfPaths);
      if (!combinedText || combinedText.trim().length === 0) {
        console.warn('Aucun texte extrait des PDFs, utilisation du mode simple avec texte vide');
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction des PDFs:', error);
      combinedText = ''; // Continuer avec texte vide, le mode simple gérera
    }

    // Générer les questions (mode simple ou IA)
    const quizData = await generateQuizQuestions(combinedText || 'Contenu du cours');

    // Enregistrer le quiz dans la base de données (sans pdf_id pour les quiz globaux)
    const [result] = await pool.execute(
      'INSERT INTO quiz (pdf_id, etudiant_id, questions, module_id) VALUES (?, ?, ?, ?)',
      [null, etudiant_id, JSON.stringify(quizData.questions), moduleId]
    );

    res.status(201).json({
      message: 'Quiz global généré avec succès',
      quiz: {
        id: result.insertId,
        questions: quizData.questions
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du quiz global:', error);
    
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
    
    res.status(500).json({ error: 'Erreur lors de la génération du quiz global: ' + error.message });
  }
});

export default router;

