/**
 * Quiz Service
 * Core business logic for quiz operations
 * 
 * MODIF : submitQuiz → après sauvegarde, appelle validerSeance
 *         pour lier le score quiz à la progression linéaire (règle Salma)
 */

import Quiz from '../../models/Quiz.js';
import CourseModule from '../../models/CourseModule.js';
import SubModule from '../../models/SubModule.js';
import PDF from '../../models/PDF.js';
import Seance from '../../models/Seance.js';
import geminiService from '../ai/geminiService.js';
import pdfService from '../pdf/pdfService.js';
import { ForbiddenError, NotFoundError, ServiceError, ValidationError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

// ── Import progression service ──────────────────────────────────────────────
import * as progressionService from '../seanceProgression.service.js';

export class QuizService {
  async createQuiz(data) {
    const {
      seanceId = null,
      moduleId = null,
      etudiantId,
      questions = [],
      reponsesEtudiant = [],
      typeQuiz = 'seance',
    } = data;

    if (typeQuiz === 'seance') {
      if (!seanceId) throw new ValidationError('seanceId est requis pour un quiz de séance');
      const seance = await Seance.findById(seanceId).select('_id');
      if (!seance) throw new NotFoundError('Séance');
    }

    if (typeQuiz === 'global') {
      if (!moduleId) throw new ValidationError('moduleId est requis pour un quiz global');
    }

    const quiz = new Quiz({
      seanceId: typeQuiz === 'global' ? null : seanceId,
      moduleId: typeQuiz === 'global' ? moduleId : moduleId || null,
      typeQuiz,
      etudiantId,
      questions,
      reponsesEtudiant,
    });

    return quiz.save();
  }

  async checkModuleExisting(moduleId, etudiantId) {
    try {
      const module = await CourseModule.findById(moduleId).select('_id');
      if (!module) throw new NotFoundError('Module');

      const existingQuiz = await Quiz.findOne({ moduleId, etudiantId })
        .sort({ createdAt: -1 })
        .select('_id isSubmitted');

      if (!existingQuiz) return { exists: false };

      return {
        exists: true,
        quizId: existingQuiz._id,
        isSubmitted: existingQuiz.isSubmitted === true
      };
    } catch (error) {
      logger.error('Error checking module quiz existence', error, { moduleId, etudiantId });
      throw error;
    }
  }

  async generateQuizFromPDF(pdfId, etudiantId) {
    try {
      logger.info('Generating quiz from PDF', { pdfId, etudiantId });

      const existingQuiz = await Quiz.findOne({ pdfId, etudiantId });
      if (existingQuiz) {
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      let pdfText = 'Sample PDF content';
      try {
        const pdf = await PDF.findById(pdfId).select('titre cheminFichier');
        if (pdf && pdf.cheminFichier) {
          pdfText = await pdfService.extractText(pdf.cheminFichier);
        }
      } catch (err) {
        logger.warn('Could not extract PDF text', { pdfId, err: err.message });
        pdfText = 'PDF content unavailable';
      }

      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(pdfText);
      } catch (err) {
        logger.error('AI generation failed', err);
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      const newQuiz = new Quiz({
        pdfId,
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      return {
        _id: newQuiz._id,
        questions: newQuiz.questions,
        isExisting: false,
        isSubmitted: false,
      };
    } catch (error) {
      logger.error('Quiz generation failed', error, { pdfId, etudiantId });
      throw error;
    }
  }

  async generateQuizFromModule(moduleId, etudiantId) {
    try {
      const module = await CourseModule.findById(moduleId);
      if (!module) throw new NotFoundError('CourseModule');

      const existingQuiz = await Quiz.findOne({ moduleId, etudiantId });
      if (existingQuiz) {
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      const subModules = await SubModule.find({ parentModuleId: moduleId });
      if (subModules.length === 0) throw new ServiceError('Module has no content');

      const subModuleIds = subModules.map(sm => sm?._id).filter(Boolean);
      const seances = await Seance.find({ subModuleId: { $in: subModuleIds } }).select('_id');
      const seanceIds = seances.map(s => s._id);
      const pdfs = await PDF.find({ seanceId: { $in: seanceIds } });
      if (pdfs.length === 0) throw new ServiceError('Module has no PDF documents');

      let combinedText = '';
      for (const pdf of pdfs) {
        try {
          if (!pdf?.cheminFichier) continue;
          const text = await pdfService.extractText(pdf.cheminFichier);
          combinedText += `\n--- Document: ${pdf.nomFichier || 'Unknown Document'} ---\n${text}`;
        } catch (err) {
          logger.warn('Could not extract text from PDF', { pdfId: pdf?._id, err: err.message });
        }
      }

      if (!combinedText.trim()) throw new ServiceError('Could not extract content from module documents');

      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(combinedText);
      } catch (err) {
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      const newQuiz = new Quiz({
        moduleId,
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      return {
        _id: newQuiz._id,
        questions: newQuiz.questions,
        isExisting: false,
        isSubmitted: false,
      };
    } catch (error) {
      logger.error('Module quiz generation failed', error, { moduleId, etudiantId });
      throw error;
    }
  }

  async generateQuizFromSeance(seanceId, etudiantId) {
    try {
      logger.info('Generating quiz from seance', { seanceId, etudiantId });

      const seance = await Seance.findById(seanceId);
      if (!seance) throw new NotFoundError('Séance');

      const existingQuiz = await Quiz.findOne({ seanceId, etudiantId });
      if (existingQuiz) {
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      const pdfs = await PDF.find({ seanceId });
      if (pdfs.length === 0) throw new ServiceError('Séance has no PDF documents');

      let combinedText = '';
      for (const pdf of pdfs) {
        try {
          if (!pdf?.cheminFichier) continue;
          const text = await pdfService.extractText(pdf.cheminFichier);
          combinedText += `\n--- Document: ${pdf.nomFichier || 'Document'} ---\n${text}`;
        } catch (err) {
          logger.warn('Could not extract PDF text', { pdfId: pdf?._id, err: err.message });
        }
      }

      if (!combinedText.trim()) throw new ServiceError('Could not extract content from séance documents');

      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(combinedText);
      } catch (err) {
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      const newQuiz = new Quiz({
        seanceId,
        moduleId: seance.moduleId || null,
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      return {
        _id: newQuiz._id,
        questions: newQuiz.questions,
        isExisting: false,
        isSubmitted: false,
      };
    } catch (error) {
      logger.error('Seance quiz generation failed', error, { seanceId, etudiantId });
      throw error;
    }
  }

  async generateQuizFromSubModule(subModuleId, etudiantId) {
    // inchangé — pas de soumission ici
    try {
      logger.info('Generating quiz from submodule', { subModuleId, etudiantId });
      const subModule = await SubModule.findById(subModuleId);
      if (!subModule) throw new NotFoundError('SubModule');

      const existingQuiz = await Quiz.findOne({ subModuleId, etudiantId });
      if (existingQuiz) {
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      const seances = await Seance.find({ subModuleId }).select('_id');
      const seanceIds = seances.map(s => s._id);
      const pdfs = await PDF.find({ seanceId: { $in: seanceIds } });
      if (pdfs.length === 0) throw new ServiceError('SubModule has no PDF documents');

      let combinedText = '';
      for (const pdf of pdfs) {
        try {
          if (!pdf?.cheminFichier) continue;
          const text = await pdfService.extractText(pdf.cheminFichier);
          combinedText += `\n--- Document: ${pdf.nomFichier || 'Document'} ---\n${text}`;
        } catch (err) {
          logger.warn('Could not extract PDF text', { pdfId: pdf?._id, err: err.message });
        }
      }

      if (!combinedText.trim()) throw new ServiceError('Could not extract content from submodule');

      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(combinedText);
      } catch (err) {
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      const newQuiz = new Quiz({
        subModuleId,
        moduleId: subModule.parentModuleId || null,
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      return {
        _id: newQuiz._id,
        questions: newQuiz.questions,
        isExisting: false,
        isSubmitted: false,
      };
    } catch (error) {
      logger.error('SubModule quiz generation failed', error, { subModuleId, etudiantId });
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // submitQuiz — MODIFIÉ
  // Après sauvegarde du score, appelle validerSeance si quiz de type 'seance'
  // Règle Salma : on valide TOUJOURS, le score sert à mesurer le CT uniquement
  // ══════════════════════════════════════════════════════════════════════════
  async submitQuiz(quizId, etudiantId, reponsesEtudiant) {
    try {
      logger.info('Submitting quiz', { quizId, etudiantId });

      const quiz = await Quiz.findById(quizId);
      if (!quiz) throw new NotFoundError('Quiz');
      if (quiz.etudiantId?.toString() !== etudiantId.toString()) {
        throw new ForbiddenError('Accès refusé à cette ressource');
      }
      if (quiz.isSubmitted) {
        throw new ServiceError('Quiz already submitted');
      }

      // ── Calcul du score ──────────────────────────────────────────────────
      const details = [];
      let correct = 0;

      for (const response of reponsesEtudiant) {
        const question = quiz.questions.find(q => q._id?.toString() === response.questionId?.toString());
        if (!question) continue;

        const studentAnswer = response.answer ?? response.reponse;

        const isCorrect = this.compareAnswers(
          studentAnswer,
          question.correctAnswer,
          question.options
        );

        if (isCorrect) correct++;
        details.push({
          questionId: response.questionId,
          correct: isCorrect,
          studentAnswer,
          correctAnswer: question.correctAnswer,
          feedback: isCorrect ? 'Bonne réponse ✓' : `Bonne réponse: ${question.correctAnswer}`
        });
      }

      const note = Math.round((correct / (quiz.questions.length || 1)) * 20 * 10) / 10;

      // ── Feedback Gemini ──────────────────────────────────────────────────
      let feedbackData = {
        strengths: ['Participation au quiz'],
        weaknesses: [],
        recommendations: ['Réviser les concepts mal compris']
      };

      try {
        const feedbackPrompt = `
You are an educational assistant. Analyze this quiz performance:
- Student Score: ${note}/20 (${correct}/${quiz.questions.length} correct)
- Subject: ${quiz.moduleId ? 'Module content' : 'PDF content'}

Provide feedback in JSON format:
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"]
}
Be encouraging and constructive.`;

        const raw = await geminiService.callGemini(feedbackPrompt, '');
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          feedbackData = {
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
            recommendations: parsed.recommendations || []
          };
        }
      } catch (err) {
        logger.warn('Could not generate Gemini feedback', { error: err.message });
      }

      // ── Sauvegarde du quiz ───────────────────────────────────────────────
      quiz.reponsesEtudiant = reponsesEtudiant;
      quiz.note             = note;
      quiz.dateCompletion   = new Date();
      quiz.submittedAt      = new Date();
      quiz.isSubmitted      = true;
      quiz.scoringDetails   = details;
      quiz.feedback         = feedbackData;
      await quiz.save();

      logger.success('Quiz submitted', { quizId, note, correct, total: quiz.questions.length });

      // ── Liaison SeanceProgression ────────────────────────────────────────
      // On appelle validerSeance uniquement si le quiz est lié à une séance
      // Règle Salma : scoreQuiz en % (0-100), pas de blocage quelle que soit la note
      const seanceId = quiz.seanceId;
      if (seanceId) {
        try {
          const scoreQuizPct = Math.round((note / 20) * 100); // convertit /20 → %
          await progressionService.validerSeance(etudiantId, seanceId, scoreQuizPct, null);
          logger.success('SeanceProgression mise à jour après quiz', { seanceId, scoreQuizPct });
        } catch (progressionErr) {
          // On ne fait PAS échouer la soumission du quiz si la progression plante
          // (ex: progression non initialisée, séance déjà validée)
          logger.warn('Progression update failed (non-blocking)', { error: progressionErr.message });
        }
      }

      return {
        note,
        correct,
        total: quiz.questions.length,
        scoringDetails: details,
        feedback: feedbackData
      };
    } catch (error) {
      logger.error('Quiz submission failed', error, { quizId, etudiantId });
      throw error;
    }
  }

  compareAnswers(studentAnswer, correctAnswer, options = []) {
    if (studentAnswer === null || studentAnswer === undefined || correctAnswer === null || correctAnswer === undefined) {
      return false;
    }

    const normalize = (str) => String(str).toUpperCase().trim();
    const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };
    const indexToLetter = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

    const getOptionTextByKey = (rawKey) => {
      if (!options) return null;
      if (Array.isArray(options)) {
        const keyNorm = normalize(rawKey);
        const index = /^\d+$/.test(keyNorm) ? Number(keyNorm) : letterToIndex[keyNorm];
        if (Number.isInteger(index) && index >= 0 && index < options.length) return options[index];
        return null;
      }
      if (typeof options === 'object') {
        const direct = options[rawKey];
        if (direct !== undefined) return direct;
        const keyNorm = normalize(rawKey);
        const index = /^\d+$/.test(keyNorm) ? Number(keyNorm) : letterToIndex[keyNorm];
        if (Number.isInteger(index)) {
          const letter = indexToLetter[index];
          return options[letter] ?? options[String(index)] ?? null;
        }
      }
      return null;
    };

    const buildVariants = (raw) => {
      const variants = new Set();
      const rawNorm = normalize(raw);
      variants.add(rawNorm);
      if (/^\d+$/.test(rawNorm)) {
        const numeric = Number(rawNorm);
        if (indexToLetter[numeric]) variants.add(indexToLetter[numeric]);
      }
      if (letterToIndex[rawNorm] !== undefined) variants.add(String(letterToIndex[rawNorm]));
      const optionText = getOptionTextByKey(raw);
      if (optionText !== null && optionText !== undefined) variants.add(normalize(optionText));
      return variants;
    };

    const studentVariants = buildVariants(studentAnswer);
    const correctList = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

    for (const answer of correctList) {
      const correctVariants = buildVariants(answer);
      for (const value of correctVariants) {
        if (studentVariants.has(value)) return true;
      }
    }
    return false;
  }

  async getQuiz(quizId, etudiantId = null) {
    try {
      const quiz = await Quiz.findById(quizId)
        .populate('seanceId', 'titre ordre')
        .populate('moduleId', 'titre')
        .populate('etudiantId', 'nom email');

      if (!quiz) throw new NotFoundError('Quiz');
      if (etudiantId && quiz.etudiantId?._id?.toString() !== etudiantId.toString()) {
        throw new ForbiddenError('Accès refusé à cette ressource');
      }

      const scoringDetails = Array.isArray(quiz.scoringDetails) ? quiz.scoringDetails : [];
      const totalQuestions = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
      const correctCount = scoringDetails.filter(d => d.correct).length;
      const hasStudentAnswers = Array.isArray(quiz.reponsesEtudiant) && quiz.reponsesEtudiant.length > 0;
      const isSubmitted = quiz.isSubmitted === true || quiz.note !== null || hasStudentAnswers;

      return {
        _id: quiz._id,
        questions: quiz.questions,
        note: quiz.note,
        isSubmitted,
        reponses_etudiant: isSubmitted ? quiz.reponsesEtudiant : null,
        result: isSubmitted ? {
          note: quiz.note,
          correct: correctCount,
          total: totalQuestions,
          scoringDetails,
          feedback: quiz.feedback || { strengths: [], weaknesses: [], recommendations: [] }
        } : null,
        feedback: isSubmitted ? quiz.feedback : null,
        dateCompletion: quiz.dateCompletion
      };
    } catch (error) {
      logger.error('Error fetching quiz', error, { quizId });
      throw error;
    }
  }

  async getStudentQuizzes(etudiantId, moduleId = null, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = { etudiantId };
      if (moduleId) query.moduleId = moduleId;

      const quizzes = await Quiz.find(query)
        .populate('seanceId', 'titre ordre')
        .populate('moduleId', 'titre')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Quiz.countDocuments(query);

      return {
        quizzes: quizzes.map(q => ({
          _id: q._id,
          title: q.seanceId?.titre || q.moduleId?.titre || 'Quiz',
          note: q.note,
          dateCompletion: q.dateCompletion,
          isSubmitted: q.isSubmitted === true
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      logger.error('Error fetching student quizzes', error, { etudiantId });
      throw error;
    }
  }
}

export default new QuizService();