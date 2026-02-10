// Script de test pour vérifier les modèles Gemini disponibles
// Exécutez: node TEST_GEMINI_MODELS.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY non trouvée dans .env');
  process.exit(1);
}

const gemini = new GoogleGenerativeAI(GEMINI_API_KEY);

// Liste des modèles à tester
const modelsToTest = [
  'gemini-pro',
  'models/gemini-pro',
  'gemini-1.5-flash',
  'models/gemini-1.5-flash',
  'gemini-1.5-pro',
  'models/gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'models/gemini-2.0-flash-exp'
];

console.log('🔍 Test des modèles Gemini disponibles...\n');

async function testModels() {
  const workingModels = [];
  
  for (const modelName of modelsToTest) {
    try {
      console.log(`Test de: ${modelName}...`);
      const model = gemini.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Test');
      const response = await result.response;
      console.log(`✅ ${modelName} fonctionne !\n`);
      workingModels.push(modelName);
    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`❌ ${modelName} - Non disponible (404)\n`);
      } else {
        console.log(`⚠️  ${modelName} - Erreur: ${error.message.substring(0, 100)}\n`);
      }
    }
  }
  
  console.log('\n📊 Résumé:');
  if (workingModels.length > 0) {
    console.log('✅ Modèles fonctionnels:');
    workingModels.forEach(model => console.log(`   - ${model}`));
    console.log(`\n💡 Utilisez ce modèle dans votre .env: AI_MODEL=${workingModels[0]}`);
  } else {
    console.log('❌ Aucun modèle ne fonctionne. Vérifiez:');
    console.log('   1. Votre clé API est correcte');
    console.log('   2. Vous avez des quotas disponibles sur https://aistudio.google.com/');
    console.log('   3. Votre région supporte Gemini');
  }
}

testModels().catch(console.error);



