/**
 * Gemini AI Service
 * Handles all Google Gemini API interactions
 * 
 * Responsibilities:
 * - Generate quiz questions
 * - Generate exercises
 * - Correct exercises
 * - Generate feedback
 * - Handle AI retries and fallbacks
 * 
 * Does NOT:
 * - Store data (that's repositories)
 * - Handle HTTP requests (that's controllers)
 * - Extract PDFs (that's pdfService)
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { ExternalAPIError, ServiceError } from '../../utils/errorHandler.js';
import logger from '../../utils/logger.js';

dotenv.config();

export class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.AI_MODEL || 'gemini-2.5-flash';
    this.client = null;
    this.retryAttempts = 3;
    this.retryDelay = 2000; // ms

    if (this.apiKey) {
      this.client = new GoogleGenAI({
        apiKey: this.apiKey
      });
      logger.success('Gemini API initialized with key');
    } else {
      logger.error('Gemini API key not found in .env');
    }
  }

  /**
   * Extract and parse JSON from a model response that may include markdown fences.
   */
  parseJsonFromResponse(responseText) {
    const candidates = [];
    const raw = String(responseText || '').trim();

    if (raw) candidates.push(raw);

    const jsonFence = raw.match(/```json\s*([\s\S]*?)```/i);
    if (jsonFence?.[1]) candidates.push(jsonFence[1].trim());

    const anyFence = raw.match(/```\s*([\s\S]*?)```/);
    if (anyFence?.[1]) candidates.push(anyFence[1].trim());

    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidates.push(raw.slice(firstBrace, lastBrace + 1));
    }

    let lastError = null;
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (err) {
        lastError = err;
      }
    }

    throw new ServiceError(`Invalid JSON format from Gemini: ${lastError?.message || 'parse failed'}`);
  }

  /**
   * Fallback correction when Gemini is unavailable or returns invalid output.
   */
  generateFallbackCorrection(studentAnswer = '', language = 'fr') {
    const answer = String(studentAnswer || '').trim();
    const wordCount = answer ? answer.split(/\s+/).length : 0;

    const note = wordCount >= 30 ? 12 : wordCount >= 15 ? 9 : wordCount > 0 ? 6 : 0;

    const appreciation = language === 'fr'
      ? (wordCount > 0
        ? 'Correction automatique de secours: réponse reçue, continuez à détailler les idées clés.'
        : 'Aucune réponse détectée. Merci de rédiger une réponse pour obtenir une évaluation complète.')
      : (wordCount > 0
        ? 'Fallback auto-correction: answer received, try to add more key ideas.'
        : 'No answer detected. Please provide an answer for full evaluation.');

    const correction = language === 'fr'
      ? 'Le moteur IA principal est indisponible temporairement. Une note provisoire a été attribuée selon la complétude de la réponse.'
      : 'Primary AI engine is temporarily unavailable. A provisional score was assigned based on response completeness.';

    return {
      note,
      appreciation,
      correction,
      points_forts: wordCount > 0
        ? [language === 'fr' ? 'Réponse fournie' : 'Answer provided']
        : [],
      points_amelioration: [
        language === 'fr' ? 'Structurer la réponse en idées clés' : 'Structure the answer around key ideas',
        language === 'fr' ? 'Ajouter des termes du cours' : 'Include more course concepts'
      ],
      generatedAt: new Date(),
      isFallback: true
    };
  }

  /**
   * Check if API is available
   */
  isAvailable() {
    return !!this.client && !!this.apiKey;
  }

  /**
   * Call Gemini API with retry logic
   */
  async callGemini(prompt, systemPrompt = null, maxRetries = this.retryAttempts) {
    if (!this.isAvailable()) {
      throw new ExternalAPIError('Gemini', 'API not configured');
    }

    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Gemini API call (attempt ${attempt}/${maxRetries})`);

        const contents = systemPrompt 
          ? `${systemPrompt}\n\n${prompt}` 
          : prompt;

        const response = await this.client.models.generateContent({
          model: this.model,
          contents
        });

        logger.debug('Gemini API response received');
        return response.text;
      } catch (error) {
        lastError = error;
        const errorMsg = error?.message || '';

        // Check error type
        const isRateLimited = errorMsg.includes('429') || errorMsg.includes('quota');
        const isOverloaded = errorMsg.includes('503') || errorMsg.includes('overloaded');
        const isServerError = errorMsg.includes('500');

        logger.warn(`Gemini API error (attempt ${attempt}): ${errorMsg.substring(0, 100)}`);

        // For rate limiting, always retry with exponential backoff
        if (isRateLimited || isOverloaded || isServerError) {
          if (attempt < maxRetries) {
            const delayMs = this.retryDelay * Math.pow(2, attempt - 1);
            logger.info(`Waiting ${delayMs}ms before retry...`);
            await this.sleep(delayMs);
            continue;
          }
        }

        throw error;
      }
    }

    throw new ExternalAPIError(
      'Gemini',
      `All ${maxRetries} attempts failed: ${lastError?.message}`,
      503
    );
  }

  /**
   * Sleep utility for retries
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate quiz questions from PDF text
   */
  async generateQuizQuestions(pdfText, language = 'fr') {
    try {
      logger.info('Generating quiz questions from PDF text');

      const prompt = this.createQuizPrompt(pdfText, language);
      const responseText = await this.callGemini(prompt);

      logger.debug('Gemini quiz response raw text (first 500 chars):', responseText.substring(0, 500));

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('No JSON found in Gemini response', { 
          responseText: responseText.substring(0, 200),
          fullLength: responseText.length 
        });
        throw new ServiceError('Invalid response format from Gemini - no JSON found');
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        logger.error('JSON parse failed', { 
          jsonString: jsonMatch[0].substring(0, 200),
          error: parseErr.message 
        });
        throw new ServiceError('Invalid JSON format from Gemini: ' + parseErr.message);
      }
      
      // Ensure questions array exists
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      
      logger.success(`Quiz generated: ${questions.length} questions`);

      return {
        questions: questions,
        metadata: {
          language,
          generatedAt: new Date(),
          model: this.model
        }
      };
    } catch (error) {
      logger.warn('Quiz generation failed, using fallback mock quiz', { error: error.message });
      // Fallback: generate mock quiz for testing/development when API quota exceeded
      return this.generateMockQuiz(language);
    }
  }

  /**
   * Generate mock quiz for development/testing when API unavailable
   */
  generateMockQuiz(language = 'fr') {
    logger.info('Generating mock quiz (development fallback)');
    const questions = [
      {
        // Q1: Paris is at index 1 → correct answer is "B"
        question: language === 'fr' ? 'Quelle est la capitale de la France ?' : 'What is the capital of France?',
        options: language === 'fr' ? ['Lyon', 'Paris', 'Marseille', 'Toulouse'] : ['Lyon', 'Paris', 'Marseille', 'Toulouse'],
        correctAnswer: 'B', // Index 1 = Paris ✓
        explanation: language === 'fr' ? 'Paris est la capitale de la France' : 'Paris is the capital of France'
      },
      {
        // Q2: 7 is at index 2 → correct answer is "C"
        question: language === 'fr' ? 'Combien de continents existe-t-il ?' : 'How many continents are there?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 'C', // Index 2 = 7 ✓
        explanation: language === 'fr' ? 'Il y a 7 continents' : 'There are 7 continents'
      },
      {
        // Q3: 1969 is at index 2 → correct answer is "C"
        question: language === 'fr' ? 'En quelle année l\'homme a-t-il marché sur la lune ?' : 'In what year did humans walk on the moon?',
        options: ['1965', '1967', '1969', '1971'],
        correctAnswer: 'C', // Index 2 = 1969 ✓
        explanation: language === 'fr' ? 'Neil Armstrong a marché sur la lune en 1969' : 'Neil Armstrong walked on the moon in 1969'
      }
    ];

    logger.info('Mock quiz created with verified answers', {
      q1: { answer: 'B', option: questions[0].options[1], correct: true },
      q2: { answer: 'C', option: questions[1].options[2], correct: true },
      q3: { answer: 'C', option: questions[2].options[2], correct: true }
    });

    return {
      questions,
      metadata: {
        language,
        generatedAt: new Date(),
        isMock: true,
        reason: 'Gemini API quota exceeded - using fallback'
      }
    };
  }

  /**
   * Generate exercises from PDF text
   */
  async generateExercises(pdfText, language = 'fr') {
    try {
      logger.info('Generating exercises from PDF text');

      const prompt = this.createExercisePrompt(pdfText, language);
      const responseText = await this.callGemini(prompt);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new ServiceError('Invalid response format from Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure exercises array exists
      const exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];
      
      logger.success(`Exercises generated: ${exercises.length} exercises`);

      return {
        exercises: exercises,
        metadata: {
          language,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      logger.warn('Exercise generation failed, using fallback mock exercises', { error: error.message });
      // Fallback: generate context-aware exercises from course text
      return this.generateFallbackExercisesFromText(pdfText, language);
    }
  }

  /**
   * Generate context-aware fallback exercises when API is unavailable.
   */
  generateFallbackExercisesFromText(pdfText = '', language = 'fr') {
    logger.info('Generating context-aware fallback exercises (development fallback)');

    const text = String(pdfText || '');
    const lower = text.toLowerCase();

    const detectTopic = () => {
      if (lower.includes('jdbc') || lower.includes('sql') || lower.includes('drivermanager')) return 'jdbc';
      if (lower.includes('kubernetes') || lower.includes('k8s') || lower.includes('pod')) return 'kubernetes';
      if (lower.includes('authentification') || lower.includes('jwt') || lower.includes('oauth')) return 'auth';
      return 'generic';
    };

    const topic = detectTopic();
    let exercises;

    if (topic === 'jdbc') {
      exercises = [
        {
          enonce: language === 'fr'
            ? 'Expliquez le role de JDBC et la difference entre API JDBC et pilote JDBC en 4-5 phrases.'
            : 'Explain JDBC purpose and the difference between JDBC API and JDBC driver in 4-5 sentences.',
          type: 'open',
          difficulty: 'medium'
        },
        {
          enonce: language === 'fr'
            ? 'Donnez les etapes pour etablir une connexion JDBC (DriverManager, Connection, Statement) puis executer une requete SQL simple.'
            : 'Provide the steps to create a JDBC connection (DriverManager, Connection, Statement) and execute a simple SQL query.',
          type: 'practical',
          difficulty: 'medium'
        }
      ];
    } else if (topic === 'kubernetes') {
      exercises = [
        {
          enonce: language === 'fr'
            ? 'Comparez Pod, Deployment et Service en precisant le role de chacun dans un cluster Kubernetes.'
            : 'Compare Pod, Deployment and Service and explain each role in a Kubernetes cluster.',
          type: 'open',
          difficulty: 'medium'
        },
        {
          enonce: language === 'fr'
            ? 'Proposez un mini plan de deploiement d\'une application web sur Kubernetes avec scalabilite et exposition reseau.'
            : 'Propose a small deployment plan for a web app on Kubernetes including scaling and network exposure.',
          type: 'practical',
          difficulty: 'medium'
        }
      ];
    } else if (topic === 'auth') {
      exercises = [
        {
          enonce: language === 'fr'
            ? 'Expliquez la difference entre authentification et autorisation, avec un exemple d\'utilisation de JWT.'
            : 'Explain the difference between authentication and authorization, with a JWT usage example.',
          type: 'open',
          difficulty: 'medium'
        },
        {
          enonce: language === 'fr'
            ? 'Decrivez un flux de connexion securise (login, emission du token, verification, expiration).' 
            : 'Describe a secure login flow (login, token issuance, verification, expiration).',
          type: 'practical',
          difficulty: 'medium'
        }
      ];
    } else {
      exercises = [
        {
          enonce: language === 'fr'
            ? 'Resumez les concepts cles du cours et expliquez leur utilite pratique en 5-6 phrases.'
            : 'Summarize key concepts from the course and explain their practical value in 5-6 sentences.',
          type: 'open',
          difficulty: 'medium'
        },
        {
          enonce: language === 'fr'
            ? 'Proposez un cas d\'application concret base sur le contenu du cours et decrivez la solution.'
            : 'Propose a concrete use case based on the course content and describe a solution approach.',
          type: 'practical',
          difficulty: 'medium'
        }
      ];
    }

    return {
      exercises,
      metadata: {
        language,
        generatedAt: new Date(),
        isMock: true,
        reason: 'Gemini API unavailable - using context-aware fallback'
      }
    };
  }

  /**
   * Correct an exercise
   */
  async correctExercise(enonce, studentAnswer, pdfText = '', language = 'fr') {
    try {
      logger.info('Correcting exercise submission');

      const prompt = this.createCorrectionPrompt(enonce, studentAnswer, pdfText, language);
      const systemPrompt = this.createCorrectionSystemPrompt();

      const responseText = await this.callGemini(prompt, systemPrompt);

      const correction = this.parseJsonFromResponse(responseText);
      logger.success(`Exercise corrected: score ${correction.note}/20`);

      return {
        note: correction.note || 0,
        appreciation: correction.appreciation || '',
        correction: correction.correction || '',
        points_forts: correction.points_forts || [],
        points_amelioration: correction.points_amelioration || [],
        generatedAt: new Date()
      };
    } catch (error) {
      logger.warn('Exercise correction failed, using fallback correction', {
        message: error.message,
      });
      return this.generateFallbackCorrection(studentAnswer, language);
    }
  }

  /**
   * Generate global feedback for professor
   */
  async generateGlobalFeedback(results, language = 'fr') {
    try {
      logger.info('Generating global feedback from results');

      const prompt = this.createGlobalFeedbackPrompt(results, language);
      const systemPrompt = this.createFeedbackSystemPrompt();

      const responseText = await this.callGemini(prompt, systemPrompt);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new ServiceError('Invalid response format from Gemini');
      }

      const feedback = JSON.parse(jsonMatch[0]);
      logger.success('Global feedback generated');

      return feedback;
    } catch (error) {
      logger.error('Global feedback generation failed', error);
      throw new ServiceError('Failed to generate feedback', error);
    }
  }

  /**
   * Create prompt for quiz generation
   */
  createQuizPrompt(pdfText, language = 'fr') {
    const instructions = language === 'fr' 
      ? `Crée 10 questions à choix multiples basées sur le texte fourni.`
      : `Create 10 multiple-choice questions based on the provided text.`;

    return `${instructions}

Texte du cours:
${pdfText.substring(0, 4000)}

Réponds en JSON STRICT avec la structure exacte:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Courte explication de la bonne réponse"
    }
  ]
}`;
  }

  /**
   * Create prompt for exercise generation
   */
  createExercisePrompt(pdfText, language = 'fr') {
    const instructions = language === 'fr'
      ? `Crée 2 exercices pratiques basés sur le contenu du cours.`
      : `Create 2 practical exercises based on the course content.`;

    return `${instructions}

Contenu du cours:
${pdfText.substring(0, 4000)}

Réponds en JSON STRICT:
{
  "exercises": [
    {
      "enonce": "Exercise statement",
      "type": "practical",
      "difficulty": "medium"
    }
  ]
}`;
  }

  /**
   * Create prompt for exercise correction
   */
  createCorrectionPrompt(enonce, studentAnswer, pdfText = '', language = 'fr') {
    return `Corrige cet exercice.

Énoncé: ${enonce}

Réponse de l'étudiant: ${studentAnswer}

Contexte (extrait du cours): ${pdfText.substring(0, 2000)}

Fournis une correction détaillée en JSON:
{
  "note": 15.5,
  "appreciation": "Appréciation courte",
  "correction": "Explication détaillée",
  "points_forts": ["point 1", "point 2"],
  "points_amelioration": ["point 1", "point 2"]
}`;
  }

  /**
   * Create system prompt for corrections
   */
  createCorrectionSystemPrompt() {
    return `Tu es un correcteur pédagogique expert. 
- Sois encourageant et constructif
- Fournis une note sur 20
- Limite l'appréciation à 2 phrases max
- Pas d'emoji
- Puces synthétiques (max 80 caractères)`;
  }

  /**
   * Create prompt for global feedback
   */
  createGlobalFeedbackPrompt(results, language = 'fr') {
    return `Analyse ces résultats d'étudiants et génère un feedback global:

${JSON.stringify(results, null, 2)}

Identifie les points forts collectifs et les axes d'amélioration.

Réponds en JSON:
{
  "points_forts": ["point 1", "point 2"],
  "axes_amelioration": ["axe 1", "axe 2"],
  "moyenne_classe": 0,
  "recommandations": ["rec 1", "rec 2"]
}`;
  }

  /**
   * Create system prompt for feedback
   */
  createFeedbackSystemPrompt() {
    return `Tu es un pédagogue expert en analyse de données d'apprentissage. 
Fournis des insights concis et actionnables.
Max 3 puces par section.`;
  }
}

export default new GeminiService();
