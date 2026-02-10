// Service IA utilisant uniquement Google Gemini API (nouveau SDK @google/genai)
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';

// Obtenir le répertoire du fichier actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configuration Gemini uniquement
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.error('⚠️  GEMINI_API_KEY non définie dans .env');
}

// Le client récupère automatiquement la clé API depuis la variable d'environnement GEMINI_API_KEY
let ai = null;

if (GEMINI_API_KEY) {
  // La clé API est automatiquement récupérée depuis GEMINI_API_KEY
  ai = new GoogleGenAI({});
} else {
  console.error('❌ Gemini API non configurée. Veuillez définir GEMINI_API_KEY dans .env');
}

// Fonction helper pour appeler Gemini
const callGemini = async (prompt, systemPrompt = null) => {
  if (!ai) {
    throw new Error('Gemini API non configurée. Vérifiez GEMINI_API_KEY dans .env');
  }

  // Liste des modèles à essayer dans l'ordre (nouveaux modèles Gemini 2.5)
  // Restreindre aux modèles stables v1 pour éviter les 404 et limiter les appels
  const modelsToTry = [
    AI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-pro'
  ];
  
  let lastError = null;
  let triedModels = [];
  
  for (const modelName of modelsToTry) {
    if (triedModels.includes(modelName)) continue;
    triedModels.push(modelName);
    
    try {
      console.log(`🔄 Tentative avec le modèle Gemini: ${modelName}`);
      
      // Construire le contenu avec le prompt système si fourni
      const contents = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents
      });
      
      console.log(`✅ Modèle ${modelName} fonctionne !`);
      return response.text;
    } catch (error) {
      lastError = error;
      const msg = error?.message || '';
      const isOverload = msg.includes('overloaded') || msg.includes('503');
      const isQuota = msg.includes('quota') || msg.includes('429');
      const isNotFound = msg.includes('404');
      if (!isNotFound) {
        console.log(`⚠️  Modèle ${modelName} non disponible: ${msg.substring(0, 120)}`);
      }
      // Si surcharge ou quota, on ne spamme pas les autres modèles
      if (isOverload || isQuota) {
        throw error;
      }
      continue;
    }
  }
  
  // Si aucun modèle ne fonctionne
  const errorMessage = `❌ Aucun modèle Gemini disponible. 
    
Modèles essayés: ${triedModels.join(', ')}
Dernière erreur: ${lastError?.message || 'Inconnue'}

Solutions possibles:
1. Vérifiez vos quotas sur https://aistudio.google.com/
2. Vérifiez que l'API Generative Language est activée dans Google Cloud Console
3. Attendez quelques minutes si vous avez atteint les limites de taux
4. Vérifiez que GEMINI_API_KEY est correcte dans .env`;
  
  throw new Error(errorMessage);
};

// Extraire le texte d'un PDF
export const extractTextFromPDF = async (pdfPath) => {
  try {
    // Normaliser le chemin (relatif ou absolu)
    let normalizedPath = pdfPath;
    
    // Si le chemin est relatif, le résoudre depuis le répertoire backend
    if (!path.isAbsolute(pdfPath)) {
      // Si le chemin commence par ./ ou ne commence pas par /, c'est relatif
      normalizedPath = path.resolve(__dirname, '..', pdfPath);
    }
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Le fichier PDF n'existe pas: ${pdfPath} (résolu: ${normalizedPath})`);
    }
    
    const dataBuffer = fs.readFileSync(normalizedPath);
    const data = await pdfParse(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error(`Le PDF est vide ou ne peut pas être lu: ${pdfPath}`);
    }
    
    return data.text;
  } catch (error) {
    console.error(`Erreur lors de l'extraction du PDF ${pdfPath}:`, error.message);
    throw error;
  }
};

// Extraire le texte de plusieurs PDFs
export const extractTextFromMultiplePDFs = async (pdfPaths) => {
  try {
    const texts = [];
    const errors = [];
    
    for (const pdfPath of pdfPaths) {
      try {
        const text = await extractTextFromPDF(pdfPath);
        if (text && text.trim().length > 0) {
          texts.push(text);
        }
      } catch (error) {
        const fileName = pdfPath.split(/[/\\]/).pop();
        errors.push(`Fichier "${fileName}": ${error.message}`);
        console.error(`⚠️  PDF ignoré: ${pdfPath} - ${error.message}`);
        // Continue avec les autres PDFs même si un échoue
      }
    }
    
    if (texts.length === 0) {
      throw new Error(`Aucun PDF valide trouvé. Erreurs: ${errors.join('; ')}`);
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} PDF(s) ignoré(s) sur ${pdfPaths.length}:`, errors);
    }
    
    return texts.join('\n\n---\n\n');
  } catch (error) {
    console.error('Erreur lors de l\'extraction des PDFs:', error);
    throw error;
  }
};

// Générer des questions de quiz
export const generateQuizQuestions = async (pdfText) => {
  try {
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('Le texte du PDF est vide. Impossible de générer un quiz.');
    }

    const prompt = `Basé sur le contenu suivant d'un PDF de cours, génère exactement 10 questions de quiz avec 4 options de réponse chacune (A, B, C, D) et indique la bonne réponse. Format JSON strict:
{
  "questions": [
    {
      "question": "Question ici",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correctAnswer": "A"
    }
  ]
}

Contenu du PDF:
${pdfText.substring(0, 8000)}`;

    const systemPrompt = "Tu es un expert en création de questions de quiz éducatif. Génère toujours un JSON valide avec exactement 10 questions.";
    const responseText = await callGemini(prompt, systemPrompt);
    
    // Extraire le JSON de la réponse
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Vérifier qu'on a bien 10 questions
      if (parsed.questions && parsed.questions.length === 10) {
        return parsed;
      } else {
        console.warn(`⚠️  Nombre de questions incorrect: ${parsed.questions?.length || 0}. Ajustement...`);
        // Ajuster à 10 questions
        if (parsed.questions && parsed.questions.length > 10) {
          parsed.questions = parsed.questions.slice(0, 10);
        } else if (parsed.questions && parsed.questions.length < 10) {
          // Compléter avec des questions génériques
          while (parsed.questions.length < 10) {
            parsed.questions.push({
              question: `Question ${parsed.questions.length + 1} sur le contenu du cours`,
              options: {
                A: 'Réponse A',
                B: 'Réponse B',
                C: 'Réponse C',
                D: 'Réponse D'
              },
              correctAnswer: 'A'
            });
          }
        }
        return parsed;
      }
    }
    throw new Error('Format de réponse invalide de Gemini');
  } catch (error) {
    console.error('Erreur lors de la génération du quiz:', error);
    throw error;
  }
};

// Générer des exercices
export const generateExercises = async (pdfText) => {
  try {
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('Le texte du PDF est vide. Impossible de générer des exercices.');
    }

    const prompt = `Basé sur le contenu suivant d'un PDF de cours, génère exactement 2 exercices pratiques avec des énoncés détaillés. Format JSON strict:
{
  "exercises": [
    {
      "enonce": "Énoncé de l'exercice 1 avec instructions claires",
      "difficulte": "moyenne"
    },
    {
      "enonce": "Énoncé de l'exercice 2 avec instructions claires",
      "difficulte": "moyenne"
    }
  ]
}

Contenu du PDF:
${pdfText.substring(0, 8000)}`;

    const systemPrompt = "Tu es un expert en création d'exercices pratiques éducatifs. Génère toujours un JSON valide avec exactement 2 exercices.";
    const responseText = await callGemini(prompt, systemPrompt);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Format de réponse invalide de Gemini');
  } catch (error) {
    console.error('Erreur lors de la génération des exercices:', error);
    throw error;
  }
};

// Corriger un quiz
export const correctQuiz = async (questions, studentAnswers) => {
  try {
    const prompt = `Corrige ce quiz. Questions et réponses attendues:
${JSON.stringify(questions, null, 2)}

Réponses de l'étudiant:
${JSON.stringify(studentAnswers, null, 2)}

Calcule la note sur 20 et fournis un feedback. Format JSON STRICT, avec des puces très courtes (max 80 caractères), 3 maximum :
{
  "note": 15.5,
  "feedback": "Feedback global court (3 phrases max, sans emoji)",
  "points_forts": ["puce courte 1", "puce courte 2", "puce courte 3"],
  "points_faibles": ["puce courte 1", "puce courte 2", "puce courte 3"],
  "corrections": [
    {
      "questionIndex": 0,
      "correct": true,
      "commentaire": "Très bien, [concept] sert bel et bien à [fonction]. [Explication courte]"
    },
    {
      "questionIndex": 1,
      "correct": false,
      "commentaire": "Réponse attendue: B. Il ne faut pas confondre [concept A] et [concept B]. [Explication courte]"
    }
  ]
}

IMPORTANT pour les commentaires :
- Si la réponse est CORRECTE : commence par "Très bien" ou "Excellent", puis explique brièvement pourquoi c'est correct (ex: "Très bien, [concept] sert bel et bien à [fonction]")
- Si la réponse est INCORRECTE : Tu peux commencer par exemple par "Réponse attendue: [lettre]. Il ne faut pas confondre [X] et [Y]" puis donne une explication courte sur la question pour corriger l'erreur (ne parle pas de comment tu a generer la question mais bel et bien de l'erreur faite par l'eleve)
- Maximum 100 caractères par commentaire
- Pas d'emoji, pas de markdown`;

    const systemPrompt = "Tu es un correcteur de quiz éducatif. Réponds en texte brut, sans markdown, sans emoji. Utilise des mots/phrases courtes (<=80 caractères), max 3 par liste, centrées sur les notions clés du cours, pas sur les numéros de questions. Pour les commentaires de corrections, sois pédagogique et explicatif.";
    const responseText = await callGemini(prompt, systemPrompt);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Format de réponse invalide de Gemini');
  } catch (error) {
    console.error('Erreur lors de la correction du quiz:', error);
    throw error;
  }
};

// Corriger un exercice
export const correctExercise = async (enonce, studentAnswer, pdfText) => {
  try {
    const prompt = `Corrige cet exercice. Énoncé:
${enonce}

Réponse de l'étudiant:
${studentAnswer}

Contexte du cours (extrait du PDF):
${pdfText ? pdfText.substring(0, 3000) : 'Non disponible'}

Fournis une correction détaillée avec note sur 20 et feedback constructif. Ajoute une appréciation globale courte. Format JSON STRICT, puces courtes (<=80 caractères), max 3, sans emoji :
{
  "note": 16.5,
  "appreciation": "Appréciation courte (2 phrases max, ton encourageant, sans emoji)",
  "correction": "Correction détaillée avec explications",
  "points_forts": ["puce courte 1", "puce courte 2", "puce courte 3"],
  "points_amelioration": ["puce courte 1", "puce courte 2", "puce courte 3"]
}`;

    const systemPrompt = "Tu es un correcteur d'exercices éducatif. Réponds en texte brut, sans markdown, sans emoji. Appréciation: 1 à 2 phrases maximum, ton encourageant, sans reprendre tout le détail de la correction. Puces: synthétiques (<=80 caractères), max 3 par liste, centrées notions clés. Interdiction d'emoji dans toute la réponse, y compris appréciation, points forts/faibles.";
    const responseText = await callGemini(prompt, systemPrompt);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Format de réponse invalide de Gemini');
  } catch (error) {
    console.error('Erreur lors de la correction de l\'exercice:', error);
    throw error;
  }
};

// Générer feedback global pour professeur (puces concises)
export const generateGlobalFeedback = async (allResults) => {
  try {
    const prompt = `Analyse ces résultats d'étudiants et génère un feedback global concis.
${JSON.stringify(allResults, null, 2)}

Format JSON STRICT, puces courtes (<=80 caractères), maximum 3 par liste :
{
  "points_faibles_globaux": ["faiblesse 1", "faiblesse 2", "faiblesse 3"],
  "erreurs_recurrentes": ["erreur 1", "erreur 2", "erreur 3"],
  "points_assimiles": ["point fort 1", "point fort 2", "point fort 3"],
  "statistiques": {
    "moyenne_generale": 14.5,
    "taux_reussite": 75
  },
  "eleves": [
    {
      "nom": "Prénom Nom",
      "quizz": {
        "note": 15.5,
        "points_forts": ["pf1", "pf2", "pf3"],
        "points_faibles": ["pfb1", "pfb2", "pfb3"]
      },
      "exercices": {
        "note": 14.0,
        "points_forts": ["pf1", "pf2", "pf3"],
        "points_faibles": ["pfb1", "pfb2", "pfb3"]
      }
    }
  ]
}`;

    const systemPrompt = "Tu es un expert en analyse pédagogique. Donne des listes de 3 puces max, chacune <=80 caractères, centrées sur les notions clés. Pas de longs paragraphes. Sépare bien quiz et exercices dans la section 'eleves'.";
    const responseText = await callGemini(prompt, systemPrompt);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Format de réponse invalide de Gemini');
  } catch (error) {
    console.error('Erreur lors de la génération du feedback global:', error);
    throw error;
  }
};
