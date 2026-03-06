/**
 * Exercises Service
 * Phase 3 — Fix : etudiantId + moduleId sauvegardés sur chaque exercice
 */

import Exercise from '../models/Exercise.js';
import CourseModule from '../models/CourseModule.js';
import SubModule from '../models/SubModule.js';
import PDF from '../models/PDF.js';
import Seance from '../models/Seance.js';
import geminiService from './ai/geminiService.js';
import pdfService from './pdf/pdfService.js';
import { ForbiddenError, NotFoundError, ServiceError, ValidationError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export const createExercise = async (data) => {
  const {
    moduleId = null,
    seanceId = null,
    etudiantId = null,
    enonce,
    typeExercice = 'seance',
  } = data;

  if (typeExercice === 'seance' && !seanceId) {
    throw new ValidationError('seanceId est requis pour un exercice de séance');
  }
  if (typeExercice === 'global' && !moduleId) {
    throw new ValidationError('moduleId est requis pour un exercice global');
  }
  if (typeExercice === 'prelab' && !seanceId) {
    throw new ValidationError('seanceId est requis pour un exercice prelab');
  }

  if (seanceId) {
    const seance = await Seance.findById(seanceId).select('_id');
    if (!seance) throw new NotFoundError('Séance');
  }

  const payload = {
    moduleId: typeExercice === 'global' ? moduleId : moduleId || null,
    seanceId: typeExercice === 'global' ? null : seanceId,
    etudiantId,
    enonce,
    typeExercice,
  };

  return Exercise.create(payload);
};

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
// HELPER : résoudre moduleId depuis une séance
// ─────────────────────────────────────────────────────────────
const resolveIdsFromSeance = async (seanceId) => {
  try {
    const seance = await Seance.findById(seanceId).select('subModuleId').lean()
    if (!seance?.subModuleId) return { moduleId: null }
    const moduleId = await resolveModuleId(seance.subModuleId)
    return { moduleId }
  } catch {
    return { moduleId: null }
  }
}

// ═════════════════════════════════════════════════════════════
// generateFromPDF
// ✅ FIX : sauvegarde etudiantId + subModuleId + moduleId
// ═════════════════════════════════════════════════════════════
export const generateFromPDF = async (resourceId, etudiantId) => {
  try {
    logger.info('Generating exercises from seance or pdf resource', { resourceId, etudiantId })

    let seanceId = null
    let pdfs = []

    const seance = await Seance.findById(resourceId).select('_id subModuleId').lean()
    if (seance?._id) {
      seanceId = seance._id
      pdfs = await PDF.find({ seanceId }).select('nomFichier cheminFichier seanceId')
    } else {
      const pdf = await PDF.findById(resourceId).select('nomFichier cheminFichier seanceId')
      if (!pdf) throw new NotFoundError('Séance ou PDF')
      seanceId = pdf.seanceId
      pdfs = [pdf]
    }

    if (!seanceId) {
      throw new ValidationError('Aucune séance liée à cette ressource')
    }

    if (pdfs.length === 0) {
      throw new ServiceError('Séance sans PDF')
    }

    const { moduleId } = await resolveIdsFromSeance(seanceId)

    let combinedText = ''
    for (const pdf of pdfs) {
      try {
        if (!pdf?.cheminFichier) continue
        const text = await pdfService.extractText(pdf.cheminFichier)
        combinedText += `\n--- Document: ${pdf.nomFichier || 'Document'} ---\n${text}`
      } catch (err) {
        logger.warn('Could not extract PDF text', { pdfId: pdf?._id, err: err.message })
      }
    }

    if (!combinedText.trim()) {
      throw new ServiceError('Could not extract text from PDF. PDF may be empty or corrupted.')
    }

    let exercisesData = { exercises: [] }
    try {
      exercisesData = await geminiService.generateExercises(combinedText)
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
        etudiantId: etudiantId || null,
        moduleId: moduleId || null,
        seanceId,
        typeExercice: 'seance',
        enonce: ex.enonce || ''
      })
      const saved = await newExercise.save()
      savedExercises.push(saved)
    }

    logger.success('Exercises generated from seance resource', {
      count: savedExercises.length, resourceId, etudiantId, moduleId, seanceId
    })
    return savedExercises
  } catch (error) {
    logger.error('Exercise generation failed', error, { resourceId, etudiantId })
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

    const seances = await Seance.find({ subModuleId }).select('_id').lean()
    const seanceIds = seances.map((s) => s._id)

    const pdfs = await PDF.find({ seanceId: { $in: seanceIds } })
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
    const defaultSeanceId = seanceIds[0] || null
    for (const ex of exercisesToSave) {
      const newExercise = new Exercise({
        etudiantId: etudiantId || null,
        moduleId: moduleId || null,
        seanceId: defaultSeanceId,
        typeExercice: 'seance',
        enonce: ex.enonce || ''
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
    const seances = await Seance.find({ subModuleId: { $in: subModuleIds } }).select('_id').lean()
    const seanceIds = seances.map((s) => s._id)

    const pdfs = await PDF.find({ seanceId: { $in: seanceIds } })
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
        etudiantId: etudiantId || null,
        seanceId: null,
        typeExercice: 'global',
        enonce: ex.enonce || ''
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
      .populate('seanceId', 'titre ordre')
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
      .populate('seanceId',    'titre ordre')
      .populate('moduleId',    'titre')
      .sort({ createdAt: -1 })
      .lean()

    return exercises.map(ex => ({
      _id:          ex._id,
      titre: ex.seanceId?.titre
        ? `Exercice — Séance "${ex.seanceId.titre}"`
        : ex.moduleId?.titre
          ? `Exercice Global — ${ex.moduleId.titre}`
          : 'Exercice',
      enonce:      ex.enonce,
      type:        ex.typeExercice,
      submitted:   ex.isSubmitted === true,
      note:        ex.note   ?? null,
      appreciation: ex.appreciation || ex.feedback || null,
      points_forts: ex.points_forts || [],
      points_amelioration: ex.points_amelioration || [],
      hasCorrection: !!ex.correction,
      moduleId:    ex.moduleId?._id || ex.moduleId || null,
      seanceId: ex.seanceId?._id || ex.seanceId || null,
      submittedAt: ex.submittedAt || null,
      createdAt:   ex.createdAt
    }))
  } catch (error) {
    logger.error('Error fetching student exercises', error, { studentId })
    throw error
  }
}