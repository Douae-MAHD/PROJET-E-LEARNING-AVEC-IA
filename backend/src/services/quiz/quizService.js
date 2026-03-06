/**
 * Quiz Service
 * Core business logic for quiz operations
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
      if (!seanceId) {
        throw new ValidationError('seanceId est requis pour un quiz de séance');
      }
      const seance = await Seance.findById(seanceId).select('_id');
      if (!seance) {
        throw new NotFoundError('Séance');
      }
    }

    if (typeQuiz === 'global') {
      if (!moduleId) {
        throw new ValidationError('moduleId est requis pour un quiz global');
      }
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

      if (!existingQuiz) {
        return { exists: false };
      }

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

  async generateFromPDF(pdfId, etudiantId) {
    try {
      logger.info('Generating quiz from PDF', { pdfId, etudiantId });

      // Check if quiz already exists
      const existingQuiz = await Quiz.findOne({ pdfId, etudiantId });
      if (existingQuiz) {
        logger.info('Quiz already exists');
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      // Extract PDF text (assuming PDF is already in DB)
      let pdfText = 'Sample PDF content';
      try {
        const pdf = await PDF.findById(pdfId).select('titre cheminFichier');
        if (pdf && pdf.cheminFichier) {
          pdfText = await pdfService.extractText(pdf.cheminFichier);
          logger.debug('PDF text extracted', { pdfId, length: pdfText.length });
        }
      } catch (err) {
        logger.warn('Could not extract PDF text', { pdfId, err: err.message });
        pdfText = 'PDF content unavailable';
      }

      // Generate via AI
      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(pdfText);
      } catch (err) {
        logger.error('AI generation failed', err);
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      // Save quiz
      const newQuiz = new Quiz({
        pdfId,
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      logger.success('Quiz generated', { quizId: newQuiz._id });
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
      logger.info('Generating quiz from module', { moduleId, etudiantId });

      // Check if module exists
      const module = await CourseModule.findById(moduleId);
      if (!module) {
        throw new NotFoundError('CourseModule');
      }

      // Check if quiz already exists for this module
      const existingQuiz = await Quiz.findOne({ moduleId, etudiantId });
      if (existingQuiz) {
        logger.info('Quiz for module already exists');
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      // Get all submodules for this module
      const subModules = await SubModule.find({ parentModuleId: moduleId });
      logger.info('Submodules found', { count: subModules.length, moduleId });
      if (subModules.length === 0) {
        logger.warn('No submodules found for module', { moduleId });
        throw new ServiceError('Module has no content');
      }

      // Get all PDFs for these submodules
      const subModuleIds = subModules.map(sm => {
        if (!sm || !sm._id) {
          logger.warn('Invalid submodule', { sm });
          return null;
        }
        return sm._id;
      }).filter(id => id !== null);
      
      logger.info('SubModule IDs extracted', { count: subModuleIds.length });
      const seances = await Seance.find({ subModuleId: { $in: subModuleIds } }).select('_id');
      const seanceIds = seances.map((seance) => seance._id);
      const pdfs = await PDF.find({ seanceId: { $in: seanceIds } });
      logger.info('PDFs found', { count: pdfs.length });
      
      if (pdfs.length === 0) {
        logger.warn('No PDFs found for module submodules', { moduleId });
        throw new ServiceError('Module has no PDF documents');
      }

      // Extract text from all PDFs
      let combinedText = '';
      for (const pdf of pdfs) {
        try {
          if (!pdf || !pdf.cheminFichier) {
            logger.warn('Invalid PDF object', { pdf });
            continue;
          }
          const text = await pdfService.extractText(pdf.cheminFichier);
          const filename = pdf.nomFichier || 'Unknown Document';
          combinedText += `\n--- Document: ${filename} ---\n${text}`;
        } catch (err) {
          logger.warn('Could not extract text from PDF', { pdfId: pdf?._id, err: err.message });
        }
      }

      if (!combinedText.trim()) {
        throw new ServiceError('Could not extract content from module documents');
      }

      // Generate quiz via AI
      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(combinedText);
      } catch (err) {
        logger.error('AI generation failed', err);
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      // Save quiz
      const newQuiz = new Quiz({
        moduleId,
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      logger.success('Module quiz generated', { quizId: newQuiz._id });
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

  async generateQuizFromSubModule(subModuleId, etudiantId) {
    try {
      logger.info('Generating quiz from submodule', { subModuleId, etudiantId });

      // Check if submodule exists
      const subModule = await SubModule.findById(subModuleId);
      if (!subModule) {
        throw new NotFoundError('SubModule');
      }

      // Check if quiz already exists for this submodule
      const seances = await Seance.find({ subModuleId }).select('_id');
      const seanceIds = seances.map((seance) => seance._id);

      const existingQuiz = await Quiz.findOne({ seanceId: { $in: seanceIds }, etudiantId, typeQuiz: 'seance' });
      if (existingQuiz) {
        logger.info('Quiz for submodule already exists');
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      // Get all PDFs for this submodule
      const pdfs = await PDF.find({ seanceId: { $in: seanceIds } });
      
      if (pdfs.length === 0) {
        logger.warn('No PDFs found for submodule', { subModuleId });
        throw new ServiceError('SubModule has no PDF documents');
      }

      // Extract text from all PDFs
      let combinedText = '';
      for (const pdf of pdfs) {
        try {
          if (!pdf || !pdf.cheminFichier) {
            logger.warn('Invalid PDF object', { pdf });
            continue;
          }
          const text = await pdfService.extractText(pdf.cheminFichier);
          const filename = pdf.nomFichier || 'Unknown Document';
          combinedText += `\n--- Document: ${filename} ---\n${text}`;
        } catch (err) {
          logger.warn('Could not extract text from PDF', { pdfId: pdf?._id, err: err.message });
        }
      }

      if (!combinedText.trim()) {
        throw new ServiceError('Could not extract content from submodule documents');
      }

      // Generate quiz via AI
      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(combinedText);
      } catch (err) {
        logger.error('AI generation failed', err);
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      // Save quiz
      const newQuiz = new Quiz({
        seanceId: seanceIds[0] || null,
        moduleId: subModule.parentModuleId || null,
        typeQuiz: 'seance',
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: []
      });
      await newQuiz.save();

      logger.success('SubModule quiz generated', { quizId: newQuiz._id });
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

  async generateQuizFromSeance(seanceId, etudiantId) {
    try {
      logger.info('Generating quiz from seance', { seanceId, etudiantId });

      const seance = await Seance.findById(seanceId).select('_id subModuleId');
      if (!seance) {
        throw new NotFoundError('Séance');
      }

      const existingQuiz = await Quiz.findOne({
        seanceId,
        etudiantId,
        typeQuiz: 'seance',
      }).sort({ createdAt: -1 });

      if (existingQuiz) {
        logger.info('Quiz for seance already exists');
        return {
          _id: existingQuiz._id,
          questions: existingQuiz.questions,
          isExisting: true,
          isSubmitted: existingQuiz.isSubmitted === true,
        };
      }

      const pdfs = await PDF.find({ seanceId }).select('nomFichier cheminFichier');
      if (pdfs.length === 0) {
        logger.warn('No PDFs found for seance', { seanceId });
        throw new ServiceError('Seance has no PDF documents');
      }

      let combinedText = '';
      for (const pdf of pdfs) {
        try {
          if (!pdf?.cheminFichier) {
            logger.warn('Invalid PDF object for seance', { pdf });
            continue;
          }
          const text = await pdfService.extractText(pdf.cheminFichier);
          const filename = pdf.nomFichier || 'Unknown Document';
          combinedText += `\n--- Document: ${filename} ---\n${text}`;
        } catch (err) {
          logger.warn('Could not extract text from seance PDF', { pdfId: pdf?._id, err: err.message });
        }
      }

      if (!combinedText.trim()) {
        throw new ServiceError('Could not extract content from seance documents');
      }

      let quizData = { questions: [] };
      try {
        quizData = await geminiService.generateQuizQuestions(combinedText);
      } catch (err) {
        logger.error('AI generation failed', err);
        throw new ServiceError('Failed to generate quiz questions', err);
      }

      let moduleId = null;
      if (seance.subModuleId) {
        const subModule = await SubModule.findById(seance.subModuleId).select('parentModuleId');
        moduleId = subModule?.parentModuleId || null;
      }

      const newQuiz = new Quiz({
        seanceId,
        moduleId,
        typeQuiz: 'seance',
        etudiantId,
        questions: quizData.questions || [],
        reponsesEtudiant: [],
      });
      await newQuiz.save();

      logger.success('Seance quiz generated', { quizId: newQuiz._id, seanceId });
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

  async submitQuiz(quizId, etudiantId, reponsesEtudiant) {
    try {
      logger.info('Submitting quiz', { quizId, etudiantId });

      const quiz = await Quiz.findById(quizId);
      if (!quiz) throw new NotFoundError('Quiz');

      if (!quiz.etudiantId || quiz.etudiantId.toString() !== etudiantId.toString()) {
        throw new ForbiddenError('Accès refusé à cette ressource');
      }

      // TASK 3: Prevent duplicate submission
      if (quiz.isSubmitted && quiz.submittedAt) {
        logger.warn('Attempt to resubmit quiz', { quizId, etudiantId, submittedAt: quiz.submittedAt });
        throw new ValidationError('Quiz already submitted. Resubmission not allowed');
      }

      // TASK 4: Improve answer matching with compareAnswers helper
      let correct = 0;
      const details = [];
      
      logger.info('=== QUIZ SUBMISSION DEBUG ===', { 
        quizId,
        totalQuestions: quiz.questions.length, 
        submittedResponses: reponsesEtudiant.length,
        questionIds: quiz.questions.map((q, idx) => ({ 
          idx,
          id: q.id?.toString(),
          _id: q._id?.toString(),
          question: q.question?.substring(0, 50)
        }))
      });
      
      for (const [responseIndex, response] of reponsesEtudiant.entries()) {
        // Questions may have either 'id' or '_id', check both
        const question = quiz.questions.find(q => {
          const qId = q.id?.toString() || q._id?.toString();
          const respId = response.questionId?.toString();
          return qId === respId;
        }) || quiz.questions[responseIndex];
        
        if (!question) {
          logger.error('❌ QUESTION NOT FOUND', { 
            responseId: response.questionId?.toString(),
            quizQuestionIds: quiz.questions.map(q => ({
              id: q.id?.toString(),
              _id: q._id?.toString()
            }))
          });
          continue;
        }

        const isCorrect = this.compareAnswers(response.reponse, question.correctAnswer, question.options);
        if (isCorrect) correct++;
        
        logger.info('✓ ANSWER CHECK', {
          studentAnswer: response.reponse,
          correctAnswer: question.correctAnswer,
          isCorrect
        });

        details.push({
          questionId: response.questionId,
          question: question.question,
          studentAnswer: response.reponse,
          correctAnswer: question.correctAnswer,
          correct: isCorrect,
          explanation: isCorrect 
            ? 'Réponse correcte' 
            : `Bonne réponse: ${question.correctAnswer}`
        });
      }

      const note = (correct / (quiz.questions.length || 1)) * 20;
      logger.info('=== FINAL SCORE ===', {
        correct,
        total: quiz.questions.length,
        rawNote: note,
        roundedNote: Math.round(note * 10) / 10
      });

      quiz.reponsesEtudiant = reponsesEtudiant;
      quiz.note = Math.round(note * 10) / 10;
      quiz.dateCompletion = new Date();
      quiz.submittedAt = new Date();
      quiz.isSubmitted = true;
      quiz.scoringDetails = details;

      logger.info('Generating quiz feedback with Gemini', { quizId, score: quiz.note, correct, total: quiz.questions.length });

      // Generate global feedback from Gemini
      try {
        const feedbackPrompt = `
You are an educational assistant. Analyze this quiz performance:
- Student Score: ${quiz.note}/20 (${correct}/${quiz.questions.length} correct)
- Subject: ${quiz.moduleId ? 'Module content' : 'PDF content'}

Provide feedback in JSON format:
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Be encouraging and constructive.
`;

        const globalFeedback = await geminiService.callGemini(feedbackPrompt, '');
        const jsonMatch = globalFeedback.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          quiz.feedback = {
            strengths: parsed.strengths || [],
            weaknesses: parsed.weaknesses || [],
            recommendations: parsed.recommendations || []
          };
          logger.success('Quiz feedback generated', { quizId });
        } else {
          quiz.feedback = {
            strengths: ['Participation au quiz'],
            weaknesses: [],
            recommendations: ['Réviser les concepts mal compris']
          };
        }
      } catch (err) {
        logger.warn('Could not generate Gemini feedback', { error: err.message });
        // Use default feedback if AI fails
        quiz.feedback = {
          strengths: ['Participation au quiz'],
          weaknesses: [],
          recommendations: ['Continuer vos révisions']
        };
      }

      await quiz.save();

      logger.success('Quiz submitted', { quizId, note: quiz.note, correct, total: quiz.questions.length });
      
      return { 
        note: quiz.note,
        correct,
        total: quiz.questions.length,
        scoringDetails: details,
        feedback: quiz.feedback
      };
    } catch (error) {
      logger.error('Quiz submission failed', error, { quizId, etudiantId });
      throw error;
    }
  }

  /**
   * TASK 4: Improved answer comparison
   * - Handles case insensitivity
   * - Trims whitespace
   * - Supports multiple correct answers
   * - Converts index (0,1,2,3) to letter (A,B,C,D)
   */
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
        const index = /^\d+$/.test(keyNorm)
          ? Number(keyNorm)
          : letterToIndex[keyNorm];
        if (Number.isInteger(index) && index >= 0 && index < options.length) {
          return options[index];
        }
        return null;
      }

      if (typeof options === 'object') {
        const direct = options[rawKey];
        if (direct !== undefined) return direct;

        const keyNorm = normalize(rawKey);
        const index = /^\d+$/.test(keyNorm)
          ? Number(keyNorm)
          : letterToIndex[keyNorm];
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

      if (letterToIndex[rawNorm] !== undefined) {
        variants.add(String(letterToIndex[rawNorm]));
      }

      const optionText = getOptionTextByKey(raw);
      if (optionText !== null && optionText !== undefined) {
        variants.add(normalize(optionText));
      }

      return variants;
    };

    const studentVariants = buildVariants(studentAnswer);
    const correctList = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

    for (const answer of correctList) {
      const correctVariants = buildVariants(answer);
      for (const value of correctVariants) {
        if (studentVariants.has(value)) {
          return true;
        }
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
      const correctCount = scoringDetails.filter((detail) => detail.correct).length;
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
      if (moduleId) {
        query.moduleId = moduleId;
      }

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
