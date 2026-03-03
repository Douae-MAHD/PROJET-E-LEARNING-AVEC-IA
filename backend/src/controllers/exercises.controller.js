/**
 * Exercises Controller
 * Phase 3 — Fix : passage de etudiantId à tous les services de génération
 */

import { asyncHandler } from '../utils/errorHandler.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import * as exercisesService from '../services/exercises.service.js';

// ✅ FIX : passer req.user.id à generateFromPDF
export const generateFromPDF = asyncHandler(async (req, res) => {
  const { pdfId } = req.params;
  const etudiantId = req.user.id;                          // ← était absent
  const result = await exercisesService.generateFromPDF(pdfId, etudiantId);
  sendSuccess(res, result, 'Exercices générés', 201);
});

// ✅ FIX : passer req.user.id à generateFromSubModule
export const generateForCourse = asyncHandler(async (req, res) => {
  const { subModuleId } = req.params;
  const etudiantId = req.user.id;                          // ← était absent
  const result = await exercisesService.generateFromSubModule(subModuleId, etudiantId);
  sendSuccess(res, result, 'Exercices générés', 201);
});

// ✅ FIX : passer req.user.id à generateFromModule
export const generateGlobal = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const etudiantId = req.user.id;                          // ← était absent
  const result = await exercisesService.generateFromModule(moduleId, etudiantId);
  sendSuccess(res, result, 'Exercices générés', 201);
});

export const checkModuleExisting = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const etudiantId = req.user.id;
  const result = await exercisesService.checkModuleExisting(moduleId, etudiantId);
  sendSuccess(res, result, 'Vérification des exercices du module effectuée');
});

// Inchangé
export const getExercise = asyncHandler(async (req, res) => {
  const { exerciseId } = req.params;
  const studentId = req.user.id;
  const exercise = await exercisesService.getExercise(exerciseId, studentId);
  sendSuccess(res, exercise, 'Exercice récupéré');
});

// Inchangé
export const submitExercise = asyncHandler(async (req, res) => {
  const { exerciseId } = req.params;
  const { reponse } = req.body;
  const studentId = req.user.id;
  const result = await exercisesService.submitExercise(exerciseId, studentId, reponse);
  sendSuccess(res, result, 'Exercice soumis');
});

// ✅ FIX : filtre maintenant par etudiantId dans le service
export const getStudentExercises = asyncHandler(async (req, res) => {
  const studentId = req.user.id;
  const exercises = await exercisesService.getStudentExercises(studentId);
  sendSuccess(res, exercises, "Exercices de l'étudiant récupérés");
});