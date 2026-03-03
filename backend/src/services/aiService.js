/**
 * AI Service Facade
 * 
 * This file provides backward compatibility by importing from the new
 * modularized services structure. It acts as an adapter layer.
 * 
 * Old structure: services/aiService.js (monolithic)
 * New structure: services/ai/, services/pdf/, etc. (modular)
 * 
 * Migration: This adapter ensures old code continues to work
 * while new code uses modular imports directly.
 */

import geminiService from './ai/geminiService.js';
import { extractTextFromPDF, extractTextFromMultiplePDFs } from './pdf/pdfService.js';

/**
 * Generate quiz questions from PDF text
 * @deprecated Use GeminiService.generateQuizQuestions directly
 */
export const generateQuizQuestions = async (pdfText) => {
  return geminiService.generateQuizQuestions(pdfText);
};

/**
 * Generate exercises from PDF text
 * @deprecated Use GeminiService.generateExercises directly
 */
export const generateExercises = async (pdfText) => {
  return geminiService.generateExercises(pdfText);
};

/**
 * Correct quiz answers
 * @deprecated Use GeminiService.correctQuiz directly
 */
export const correctQuiz = async (questions, studentAnswers) => {
  return geminiService.correctQuiz(questions, studentAnswers);
};

/**
 * Correct exercise
 * @deprecated Use GeminiService.correctExercise directly
 */
export const correctExercise = async (enonce, studentAnswer, pdfText) => {
  return geminiService.correctExercise(enonce, studentAnswer, pdfText);
};

/**
 * Generate global feedback
 * @deprecated Use GeminiService.generateGlobalFeedback directly
 */
export const generateGlobalFeedback = async (allResults) => {
  return geminiService.generateGlobalFeedback(allResults);
};

/**
 * Extract text from PDF - re-exported from pdfService
 */
export { extractTextFromPDF, extractTextFromMultiplePDFs };

export default {
  generateQuizQuestions,
  generateExercises,
  correctQuiz,
  correctExercise,
  generateGlobalFeedback,
  extractTextFromPDF,
  extractTextFromMultiplePDFs,
  // Also export the Gemini service for direct usage
  geminiService
};
