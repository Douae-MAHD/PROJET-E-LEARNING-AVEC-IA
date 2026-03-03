/**
 * Exercises Service
 * Phase 3 — Fix : etudiantId + moduleId sauvegardés sur chaque exercice
 */

import Exercise from '../models/Exercise.js';
import CourseModule from '../models/CourseModule.js';
import SubModule from '../models/SubModule.js';
import PDF from '../models/PDF.js';
import geminiService from './ai/geminiService.js';
import pdfService from './pdf/pdfService.js';
import { ForbiddenError, NotFoundError, ServiceError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────
// HELPER : résoudre le moduleId depuis un subModuleId
// ─────────────────────────────────────────────────────────────
const resolveModuleId = async (subModuleId) => {
  try {
    // ✅ FIX : le champ s'appelle parentModuleId dans le schéma SubModule
    const sub = await SubModule.findById(subModuleId).select('parentModuleId').lean()
    return sub?.parentModuleId || null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// HELPER : résoudre subModuleId + moduleId depuis un pdfId
// ─────────────────────────────────────────────────────────────
const resolveIdsFromPdf = async (pdfId) => {
  try {
    const pdf = await PDF.findById(pdfId).select('subModuleId').lean()
    if (!pdf?.subModuleId) return { subModuleId: null, moduleId: null }
    const moduleId = await resolveModuleId(pdf.subModuleId)
    return { subModuleId: pdf.subModuleId, moduleId }
  } catch {
    return { subModuleId: null, moduleId: null }
  }
}

// ═════════════════════════════════════════════════════════════
// generateFromPDF
// ✅ FIX : sauvegarde etudiantId + subModuleId + moduleId
// ═════════════════════════════════════════════════════════════
export const generateFromPDF = async (pdfId, etudiantId) => {
  try {
    logger.info('Generating exercises from PDF', { pdfId, etudiantId })

    const pdf = await PDF.findById(pdfId)
    if (!pdf) throw new NotFoundError('PDF')

    // Résoudre les IDs parents pour le feedback
    const { subModuleId, moduleId } = await resolveIdsFromPdf(pdfId)

    let pdfText = ''
    try {
      pdfText = await pdfService.extractText(pdf.cheminFichier)
      logger.debug('PDF text extracted', { pdfId, length: pdfText.length })
    } catch (err) {
      logger.warn('Could not extract PDF text', { pdfId, err: err.message })
    }

    if (!pdfText?.trim()) {
      throw new ServiceError('Could not extract text from PDF. PDF may be empty or corrupted.')
    }

    let exercisesData = { exercises: [] }
    try {
      exercisesData = await geminiService.generateExercises(pdfText)
      logger.debug('Exercises received from Gemini', { count: exercisesData?.exercises?.length || 0 })
    } catch (err) {
      logger.error('AI generation failed', err)
      throw new ServiceError('Failed to generate exercises. Please check the PDF content and try again.', err)
    }

    const exercisesToSave = Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : []
    if (exercisesToSave.length === 0) {
      throw new ServiceError('No exercises were generated from the PDF. Please try again.')
    }

    const savedExercises = []
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        pdfId,
        // ✅ FIX : lier l'exercice à l'étudiant et au module
        etudiantId:  etudiantId  || null,
        subModuleId: subModuleId || null,
        moduleId:    moduleId    || null,
        enonce:      ex.enonce   || '',
        type:        ex.type     || 'practical',
        difficulty:  ex.difficulty || 'medium'
      })
      const saved = await newExercise.save()
      savedExercises.push(saved)
    }

    logger.success('Exercises generated from PDF', {
      count: savedExercises.length, pdfId, etudiantId, moduleId
    })
    return savedExercises
  } catch (error) {
    logger.error('Exercise generation failed', error, { pdfId, etudiantId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// generateFromSubModule
// ✅ FIX : sauvegarde etudiantId + moduleId résolu
// ═════════════════════════════════════════════════════════════
export const generateFromSubModule = async (subModuleId, etudiantId) => {
  try {
    logger.info('Generating exercises from submodule', { subModuleId, etudiantId })

    const subModule = await SubModule.findById(subModuleId)
    if (!subModule) throw new NotFoundError('SubModule')

    // ✅ FIX : le champ s'appelle parentModuleId dans le schéma SubModule
    const moduleId = subModule.parentModuleId || await resolveModuleId(subModuleId)

    const pdfs = await PDF.find({ subModuleId })
    if (pdfs.length === 0) {
      throw new ServiceError('SubModule has no PDF documents')
    }

    let combinedText = ''
    for (const pdf of pdfs) {
      try {
        if (!pdf?.cheminFichier) continue
        const text = await pdfService.extractText(pdf.cheminFichier)
        combinedText += `\n--- Document: ${pdf.nomFichier || 'Document'} ---\n${text}`
      } catch (err) {
        logger.warn('Could not extract text from PDF', { pdfId: pdf?._id, err: err.message })
      }
    }

    if (!combinedText.trim()) {
      throw new ServiceError('Could not extract content from submodule documents')
    }

    let exercisesData = { exercises: [] }
    try {
      exercisesData = await geminiService.generateExercises(combinedText)
      logger.debug('Exercises received from Gemini', { count: exercisesData?.exercises?.length || 0 })
    } catch (err) {
      logger.error('AI generation failed', err)
      throw new ServiceError('Failed to generate exercises. Please try again later.', err)
    }

    const exercisesToSave = Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : []
    if (exercisesToSave.length === 0) {
      throw new ServiceError('No exercises were generated from the submodule. Please try again.')
    }

    const savedExercises = []
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        subModuleId,
        // ✅ FIX : lier à l'étudiant et au module parent
        etudiantId: etudiantId || null,
        moduleId:   moduleId   || null,
        pdfId:      null,
        enonce:     ex.enonce  || '',
        type:       ex.type    || 'practical',
        difficulty: ex.difficulty || 'medium'
      })
      const saved = await newExercise.save()
      savedExercises.push(saved)
    }

    logger.success('SubModule exercises generated', {
      count: savedExercises.length, subModuleId, etudiantId, moduleId
    })
    return savedExercises
  } catch (error) {
    logger.error('SubModule exercises generation failed', error, { subModuleId, etudiantId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// generateFromModule
// ✅ FIX : implémentation réelle (avant retournait [])
// ═════════════════════════════════════════════════════════════
export const generateFromModule = async (moduleId, etudiantId) => {
  try {
    logger.info('Generating exercises from module', { moduleId, etudiantId })

    const courseModule = await CourseModule.findById(moduleId)
    if (!courseModule) throw new NotFoundError('Module')

    // ✅ FIX : le champ s'appelle parentModuleId dans le schéma SubModule (pas moduleId)
    const subModules = await SubModule.find({ parentModuleId: moduleId })
    if (subModules.length === 0) {
      throw new ServiceError('Module has no submodules with content')
    }

    // Récupérer tous les PDFs de ces sous-modules
    const subModuleIds = subModules.map(s => s._id)
    const pdfs = await PDF.find({ subModuleId: { $in: subModuleIds } })
    if (pdfs.length === 0) {
      throw new ServiceError('Module has no PDF documents')
    }

    // Combiner le texte de tous les PDFs
    let combinedText = `Module: ${courseModule.titre}\n`
    for (const pdf of pdfs) {
      try {
        if (!pdf?.cheminFichier) continue
        const text = await pdfService.extractText(pdf.cheminFichier)
        combinedText += `\n--- ${pdf.nomFichier || 'Document'} ---\n${text}`
      } catch (err) {
        logger.warn('Could not extract PDF', { pdfId: pdf?._id, err: err.message })
      }
    }

    if (!combinedText.trim()) {
      throw new ServiceError('Could not extract content from module documents')
    }

    let exercisesData = { exercises: [] }
    try {
      exercisesData = await geminiService.generateExercises(combinedText)
    } catch (err) {
      logger.error('AI generation failed for module', err)
      throw new ServiceError('Failed to generate exercises for module.', err)
    }

    const exercisesToSave = Array.isArray(exercisesData?.exercises) ? exercisesData.exercises : []
    if (exercisesToSave.length === 0) {
      throw new ServiceError('No exercises generated for module. Please try again.')
    }

    const savedExercises = []
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        moduleId,
        // ✅ FIX : lier à l'étudiant
        etudiantId: etudiantId || null,
        subModuleId: null,
        pdfId:       null,
        enonce:      ex.enonce || '',
        type:        ex.type   || 'practical',
        difficulty:  ex.difficulty || 'medium'
      })
      const saved = await newExercise.save()
      savedExercises.push(saved)
    }

    logger.success('Module exercises generated', {
      count: savedExercises.length, moduleId, etudiantId
    })
    return savedExercises
  } catch (error) {
    logger.error('Module exercises generation failed', error, { moduleId, etudiantId })
    throw error
  }
}

export const checkModuleExisting = async (moduleId, etudiantId) => {
  try {
    const module = await CourseModule.findById(moduleId).select('_id')
    if (!module) throw new NotFoundError('Module')

    const existingExercise = await Exercise.findOne({ moduleId, etudiantId })
      .sort({ createdAt: -1 })
      .select('_id isSubmitted')

    if (!existingExercise) {
      return { exists: false }
    }

    return {
      exists: true,
      exerciseId: existingExercise._id,
      isSubmitted: existingExercise.isSubmitted === true
    }
  } catch (error) {
    logger.error('Error checking module exercises existence', error, { moduleId, etudiantId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// getExercise
// ═════════════════════════════════════════════════════════════
export const getExercise = async (exerciseId, etudiantId) => {
  try {
    const exercise = await Exercise.findById(exerciseId)
      .populate('pdfId', 'nomFichier')
      .populate('subModuleId', 'nom')
      .populate('moduleId', 'titre')
    if (!exercise) throw new NotFoundError('Exercise')
    if (!exercise.etudiantId || exercise.etudiantId.toString() !== etudiantId.toString()) {
      throw new ForbiddenError('Accès refusé à cette ressource')
    }
    return exercise
  } catch (error) {
    logger.error('Error fetching exercise', error, { exerciseId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// submitExercise — inchangé fonctionnellement
// ═════════════════════════════════════════════════════════════
export const submitExercise = async (exerciseId, studentId, reponse) => {
  try {
    logger.info('Submitting exercise', { exerciseId, studentId })

    const exercise = await Exercise.findById(exerciseId)
    if (!exercise) throw new NotFoundError('Exercise')

    if (!exercise.etudiantId || exercise.etudiantId.toString() !== studentId.toString()) {
      throw new ForbiddenError('Accès refusé à cette ressource')
    }

    if (exercise.isSubmitted && exercise.submittedAt) {
      logger.warn('Attempt to resubmit exercise', { exerciseId, studentId })
      throw new ServiceError('Exercise already submitted. Resubmission not allowed')
    }

    exercise.reponseEtudiante = reponse
    exercise.submittedAt = new Date()

    logger.debug('Calling Gemini for exercise correction', { exerciseId })

    let correction = {
      note: 0,
      appreciation: '',
      correction: '',
      points_forts: [],
      points_amelioration: []
    }

    try {
      correction = await geminiService.correctExercise(
        exercise.enonce,
        reponse,
        exercise.pdfText || ''
      )
      logger.success('Gemini correction received', { exerciseId, note: correction.note })
    } catch (err) {
      logger.error('Gemini correction failed', err, { exerciseId })
      correction.note = 0
      correction.correction = 'Unable to process feedback at this time'
    }

    exercise.note              = correction.note
    exercise.correction        = correction.correction
    exercise.feedback          = correction.appreciation
    exercise.appreciation      = correction.appreciation
    exercise.points_forts      = correction.points_forts      || []
    exercise.points_amelioration = correction.points_amelioration || []
    exercise.isSubmitted       = true
    exercise.dateCompletion    = new Date()

    await exercise.save()

    logger.success('Exercise submitted', { exerciseId, note: exercise.note })

    return {
      exerciseId,
      note:               exercise.note,
      correction:         exercise.correction,
      feedback:           exercise.feedback,
      appreciation:       exercise.appreciation,
      points_forts:       exercise.points_forts,
      points_amelioration: exercise.points_amelioration,
      submittedAt:        exercise.submittedAt,
      message:            'Exercice évalué avec succès'
    }
  } catch (error) {
    logger.error('Exercise submission failed', error, { exerciseId, studentId })
    throw error
  }
}

// ═════════════════════════════════════════════════════════════
// getStudentExercises
// ✅ FIX CRITIQUE : filtrer par etudiantId (avant : Exercise.find({}))
// ═════════════════════════════════════════════════════════════
export const getStudentExercises = async (studentId) => {
  try {
    logger.info('Fetching student exercises', { studentId })

    // ✅ FIX : { etudiantId: studentId } au lieu de {}
    const exercises = await Exercise.find({ etudiantId: studentId })
      .populate('pdfId',       'nomFichier')
      .populate('subModuleId', 'titre')          // ✅ FIX : titre (pas nom)
      .populate('moduleId',    'titre')
      .sort({ createdAt: -1 })
      .lean()

    return exercises.map(ex => ({
      _id:          ex._id,
      // ✅ FIX : subModuleId.titre (pas .nom — cf. schéma SubModule)
      titre: ex.subModuleId?.titre
        ? `Exercice — Cours "${ex.subModuleId.titre}"`
        : ex.pdfId?.nomFichier
          ? `Exercice — ${ex.pdfId.nomFichier.replace(/\.[^/.]+$/, '')}`
          : ex.moduleId?.titre
            ? `Exercice Global — ${ex.moduleId.titre}`
            : 'Exercice',
      enonce:      ex.enonce,
      type:        ex.type,
      difficulty:  ex.difficulty,
      submitted:   ex.isSubmitted === true,
      note:        ex.note   ?? null,
      appreciation: ex.appreciation || ex.feedback || null,
      points_forts: ex.points_forts || [],
      points_amelioration: ex.points_amelioration || [],
      hasCorrection: !!ex.correction,
      moduleId:    ex.moduleId?._id || ex.moduleId || null,
      subModuleId: ex.subModuleId?._id || ex.subModuleId || null,
      submittedAt: ex.submittedAt || null,
      createdAt:   ex.createdAt
    }))
  } catch (error) {
    logger.error('Error fetching student exercises', error, { studentId })
    throw error
  }
}