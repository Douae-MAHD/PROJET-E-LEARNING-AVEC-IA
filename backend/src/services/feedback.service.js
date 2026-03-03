/**
 * Feedback Service
 * Phase 3 — Feedback enrichi par module étudiant
 */

import Quiz from '../models/Quiz.js';
import Exercise from '../models/Exercise.js';
import CourseModule from '../models/CourseModule.js';
import SubModule from '../models/SubModule.js';
import PDF from '../models/PDF.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────
// HELPER : Construit un titre lisible pour un quiz
// Priorité : subModule.nom > PDF.nomFichier > fallback
// ─────────────────────────────────────────────────────────────
const buildQuizTitle = (quiz) => {
  // Quiz généré depuis un sous-module (cours)
  // ✅ FIX : SubModule.titre (pas .nom — cf. schéma)
  if (quiz.subModuleId?.titre) {
    return `Quiz — Cours "${quiz.subModuleId.titre}"`
  }
  // Quiz généré depuis un PDF
  if (quiz.pdfId?.nomFichier) {
    const name = quiz.pdfId.nomFichier.replace(/\.[^/.]+$/, '')
    return `Quiz — ${name}`
  }
  // Quiz généré depuis le module global
  if (quiz.moduleId?.titre) {
    return `Quiz Global — ${quiz.moduleId.titre}`
  }
  return 'Quiz'
}

// ─────────────────────────────────────────────────────────────
// HELPER : Construit un titre lisible pour un exercice
// ─────────────────────────────────────────────────────────────
const buildExerciseTitle = (exercise) => {
  // ✅ FIX : SubModule.titre (pas .nom — cf. schéma)
  if (exercise.subModuleId?.titre) {
    return `Exercice — Cours "${exercise.subModuleId.titre}"`
  }
  if (exercise.pdfId?.nomFichier) {
    const name = exercise.pdfId.nomFichier.replace(/\.[^/.]+$/, '')
    return `Exercice — ${name}`
  }
  if (exercise.moduleId?.titre) {
    return `Exercice Global — ${exercise.moduleId.titre}`
  }
  return 'Exercice'
}

// ─────────────────────────────────────────────────────────────
// HELPER : Score → couleur / label
// ─────────────────────────────────────────────────────────────
const getScoreLabel = (note) => {
  if (note === null || note === undefined) return null
  if (note >= 16) return 'excellent'
  if (note >= 14) return 'très bien'
  if (note >= 12) return 'bien'
  if (note >= 10) return 'passable'
  return 'insuffisant'
}

// ─────────────────────────────────────────────────────────────
// HELPER : Génère un feedback global textuel à partir des données
// (appelé sans Gemini pour éviter latence — peut être enrichi plus tard)
// ─────────────────────────────────────────────────────────────
const computeGlobalSummary = (quizzes, exercises) => {
  const allItems = [
    ...quizzes.map(q => ({ note: q.note, type: 'quiz' })),
    ...exercises.map(e => ({ note: e.note, type: 'exercice' }))
  ].filter(i => i.note !== null && i.note !== undefined)

  if (allItems.length === 0) return null

  const totalItems = allItems.length
  const moyenneGlobale = Math.round(
    (allItems.reduce((s, i) => s + i.note, 0) / totalItems) * 10
  ) / 10

  const nbReussi = allItems.filter(i => i.note >= 10).length
  const tauxReussite = Math.round((nbReussi / totalItems) * 100)

  // Collecter tous les points forts et faibles
  const allPointsForts = [
    ...quizzes.flatMap(q => q.points_forts || []),
    ...exercises.flatMap(e => e.points_forts || [])
  ]
  const allPointsFaibles = [
    ...quizzes.flatMap(q => q.points_faibles || []),
    ...exercises.flatMap(e => e.points_faibles || [])
  ]

  // Dédupliquer et limiter
  const uniquePointsForts = [...new Set(allPointsForts)].slice(0, 5)
  const uniquePointsFaibles = [...new Set(allPointsFaibles)].slice(0, 5)

  // Message d'encouragement contextuel
  let message = ''
  if (moyenneGlobale >= 16) {
    message = `Excellent travail ! Vous maîtrisez parfaitement les concepts de ce module avec une moyenne de ${moyenneGlobale}/20.`
  } else if (moyenneGlobale >= 14) {
    message = `Très bon niveau ! Votre moyenne de ${moyenneGlobale}/20 reflète une bonne assimilation du cours.`
  } else if (moyenneGlobale >= 12) {
    message = `Bon travail. Une moyenne de ${moyenneGlobale}/20 montre que vous avez bien compris les bases. Continuez à pratiquer !`
  } else if (moyenneGlobale >= 10) {
    message = `Niveau passable avec ${moyenneGlobale}/20. Des efforts supplémentaires sur les points faibles permettront de progresser.`
  } else {
    message = `Votre moyenne de ${moyenneGlobale}/20 indique qu'il faut revoir certains concepts clés. Consultez les cours et réessayez.`
  }

  return {
    moyenneGlobale,
    tauxReussite,
    totalEvaluations: totalItems,
    totalQuiz: quizzes.filter(q => q.note !== null).length,
    totalExercices: exercises.filter(e => e.note !== null).length,
    scoreLabel: getScoreLabel(moyenneGlobale),
    message,
    points_forts: uniquePointsForts,
    points_faibles: uniquePointsFaibles
  }
}

// ═════════════════════════════════════════════════════════════
// getStudentFeedback — VERSION ENRICHIE
// Endpoint : GET /api/feedback/module/:moduleId/student
// ═════════════════════════════════════════════════════════════
export const getStudentFeedback = async (studentId, moduleId) => {
  try {
    logger.info('Fetching student feedback (enriched)', { studentId, moduleId })

    // ── 1. Quiz du module — avec populate complet pour titre ──
    const rawQuizzes = await Quiz.find({
      etudiantId: studentId,
      moduleId,
      note: { $exists: true, $ne: null }
    })
      .populate('pdfId', 'nomFichier')           // pour titre depuis PDF
      .populate('subModuleId', 'titre')           // ✅ FIX : titre (pas nom)
      .populate('moduleId', 'titre')              // pour titre global
      .lean()

    // ── 2. Exercices du module — avec populate complet ──
    const rawExercises = await Exercise.find({
      etudiantId: studentId,
      moduleId,
      note: { $exists: true, $ne: null }
    })
      .populate('pdfId', 'nomFichier')
      .populate('subModuleId', 'titre')           // ✅ FIX : titre (pas nom)
      .populate('moduleId', 'titre')
      .lean()

    // ── 3. Mapper les quiz avec titre + feedback enrichis ──
    const quizzes = rawQuizzes.map(q => ({
      id: q._id,

      // ✅ Titre construit depuis les relations
      titre: buildQuizTitle(q),

      // Note
      note: q.note,
      scoreLabel: getScoreLabel(q.note),

      // ✅ Points forts : quiz.feedback.strengths (schema doc)
      points_forts: q.feedback?.strengths || [],

      // ✅ Points faibles : quiz.feedback.weaknesses
      points_faibles: q.feedback?.weaknesses || [],

      // Recommandations IA
      recommendations: q.feedback?.recommendations || [],

      // Détails par question (scoringDetails du schema)
      corrections: (q.scoringDetails || []).map((d, idx) => ({
        questionIndex: idx,
        question: d.question,
        studentAnswer: d.studentAnswer,
        correctAnswer: d.correctAnswer,
        correct: d.correct,
        commentaire: d.correct
          ? 'Réponse correcte ✓'
          : `Réponse incorrecte. Bonne réponse : ${d.correctAnswer}${d.explanation ? ` — ${d.explanation}` : ''}`
      })),

      // Métadonnées utiles
      subModuleName: q.subModuleId?.nom || null,
      pdfName: q.pdfId?.nomFichier || null,
      submittedAt: q.submittedAt || q.dateCompletion,
      totalQuestions: q.questions?.length || 0,
      correctAnswers: (q.scoringDetails || []).filter(d => d.correct).length
    }))

    // ── 4. Mapper les exercices avec titre + feedback enrichis ──
    const exercises = rawExercises.map(e => ({
      id: e._id,

      // ✅ Titre construit depuis les relations
      titre: buildExerciseTitle(e),

      // Note
      note: e.note,
      scoreLabel: getScoreLabel(e.note),

      // Appréciation de l'IA
      appreciation: e.appreciation || e.feedback || '',

      // ✅ Points forts : exercise.points_forts (schema direct)
      points_forts: Array.isArray(e.points_forts) ? e.points_forts : [],

      // ✅ Points faibles : exercise.points_amelioration (schema direct)
      points_faibles: Array.isArray(e.points_amelioration) ? e.points_amelioration : [],

      // Correction détaillée
      correction_detail: (e.correction || e.appreciation)
        ? {
            appreciation: e.appreciation || e.feedback || '',
            correction: e.correction || e.correctionIA || ''
          }
        : null,

      // Métadonnées
      subModuleName: e.subModuleId?.nom || null,
      pdfName: e.pdfId?.nomFichier || null,
      submittedAt: e.submittedAt || e.dateCompletion,
      type: e.type || 'theoretical',
      difficulty: e.difficulty || 'medium'
    }))

    // ── 5. Résumé global ──
    const globalSummary = computeGlobalSummary(quizzes, exercises)

    // ── 6. Statistiques par évaluation ──
    const statistics = {
      totalQuiz: quizzes.length,
      totalExercices: exercises.length,
      averageQuizScore: quizzes.length > 0
        ? Math.round((quizzes.reduce((s, q) => s + (q.note || 0), 0) / quizzes.length) * 10) / 10
        : null,
      averageExerciseScore: exercises.length > 0
        ? Math.round((exercises.reduce((s, e) => s + (e.note || 0), 0) / exercises.length) * 10) / 10
        : null
    }

    logger.success('Student feedback fetched', {
      studentId,
      moduleId,
      quizCount: quizzes.length,
      exerciseCount: exercises.length
    })

    return {
      quizzes,
      exercises,
      statistics,
      globalSummary   // ✅ Nouveau : résumé global avec message IA
    }
  } catch (error) {
    logger.error('Error fetching student feedback', error, { studentId, moduleId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// getTeacherResults — inchangé
// ═════════════════════════════════════════════════════════════
export const getTeacherResults = async (professorId) => {
  try {
    logger.info('Fetching teacher results', { professorId })

    const moduleIds = await CourseModule.find({ professorId }).distinct('_id')
    const subModuleIds = await SubModule.find({
      parentModuleId: { $in: moduleIds }
    }).distinct('_id')

    const quizzes = await Quiz.find({
      $or: [
        { moduleId: { $in: moduleIds } },
        { subModuleId: { $in: subModuleIds } }
      ],
      note: { $exists: true, $ne: null }
    })
      .populate('etudiantId', 'nom email')
      .populate('moduleId', 'titre')
      .lean()

    const exercises = await Exercise.find({
      $or: [
        { moduleId: { $in: moduleIds } },
        { subModuleId: { $in: subModuleIds } }
      ],
      note: { $exists: true, $ne: null }
    })
      .populate('etudiantId', 'nom email')
      .populate('moduleId', 'titre')
      .lean()

    const totalQuizzes = quizzes.length
    const totalExercises = exercises.length

    const avgQuiz = totalQuizzes > 0
      ? Math.round((quizzes.reduce((s, q) => s + (q.note || 0), 0) / totalQuizzes) * 100) / 100
      : 0

    const avgExercise = totalExercises > 0
      ? Math.round((exercises.reduce((s, e) => s + (e.note || 0), 0) / totalExercises) * 100) / 100
      : 0

    return {
      quiz: quizzes.map(q => ({
        _id: q._id,
        moduleId: q.moduleId?._id,
        moduleName: q.moduleId?.titre,
        etudiant: { nom: q.etudiantId?.nom, email: q.etudiantId?.email },
        note: q.note,
        note_quiz: q.note,
        points_forts: q.feedback?.strengths || [],
        points_faibles: q.feedback?.weaknesses || [],
        createdAt: q.createdAt
      })),
      exercises: exercises.map(e => ({
        _id: e._id,
        moduleId: e.moduleId?._id,
        moduleName: e.moduleId?.titre,
        etudiant: { nom: e.etudiantId?.nom, email: e.etudiantId?.email },
        note: e.note,
        note_exercice: e.note,
        points_forts: e.points_forts || [],
        points_faibles: e.points_amelioration || [],
        createdAt: e.createdAt
      })),
      statistics: { totalQuizzes, totalExercises, averageQuizScore: avgQuiz, averageExerciseScore: avgExercise }
    }
  } catch (error) {
    logger.error('Error fetching teacher results', error, { professorId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// getGlobalFeedback / generateGlobalFeedback — inchangés
// ═════════════════════════════════════════════════════════════
export const getGlobalFeedback = async (professorId) => {
  try {
    logger.info('Fetching global feedback', { professorId })
    const moduleIds = await CourseModule.find({ professorId }).distinct('_id')

    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds }, note: { $exists: true, $ne: null } }).lean()
    const exercises = await Exercise.find({ moduleId: { $in: moduleIds }, note: { $exists: true, $ne: null } }).lean()

    const allScores = [
      ...quizzes.map(q => q.note),
      ...exercises.map(e => e.note)
    ]
    const avgScore = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
      : 0

    return {
      message: 'Feedback global',
      stats: {
        totalEtudiants: new Set([
          ...quizzes.map(q => q.etudiantId?.toString()),
          ...exercises.map(e => e.etudiantId?.toString())
        ]).size,
        quizzes: quizzes.length,
        exercises: exercises.length,
        noteMoyenne: avgScore,
        pointsForts: ['Engagement', 'Participation'],
        pointsFaibles: ['À améliorer']
      }
    }
  } catch (error) {
    logger.error('Error fetching global feedback', error, { professorId })
    throw error
  }
}

export const generateGlobalFeedback = async (professorId) => {
  try {
    logger.info('Generating global feedback', { professorId })
    return await getGlobalFeedback(professorId)
  } catch (error) {
    logger.error('Error generating global feedback', error, { professorId })
    throw error
  }
}