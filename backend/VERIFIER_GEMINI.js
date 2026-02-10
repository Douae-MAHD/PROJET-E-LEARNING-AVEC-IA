// Script pour vérifier la clé API Gemini et lister les modèles disponibles
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY non trouvée dans .env');
  process.exit(1);
}

console.log('🔑 Clé API trouvée:', GEMINI_API_KEY.substring(0, 20) + '...');
console.log('🔍 Vérification de la clé et recherche des modèles disponibles...\n');

const gemini = new GoogleGenerativeAI(GEMINI_API_KEY);

async function checkAPI() {
  try {
    // Essayer de lister les modèles disponibles
    console.log('Tentative de lister les modèles disponibles via l\'API...');
    
    // Essayer avec différents endpoints
    const testModels = [
      'gemini-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash-thinking-exp-001',
      'gemini-exp-1206',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest'
    ];
    
    let foundModel = null;
    
    for (const modelName of testModels) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        const response = await result.response;
        console.log(`✅ Modèle fonctionnel trouvé: ${modelName}`);
        foundModel = modelName;
        break;
      } catch (error) {
        // Ignorer les erreurs 404
        if (!error.message.includes('404')) {
          console.log(`⚠️  ${modelName}: ${error.message.substring(0, 80)}`);
        }
      }
    }
    
    if (foundModel) {
      console.log(`\n✅ SUCCÈS ! Utilisez ce modèle dans votre .env:`);
      console.log(`   AI_MODEL=${foundModel}`);
    } else {
      console.log('\n❌ Aucun modèle ne fonctionne avec votre clé API.');
      console.log('\n🔧 Solutions possibles:');
      console.log('1. Vérifiez que votre clé API est correcte sur https://aistudio.google.com/');
      console.log('2. Vérifiez que vous avez activé l\'API Gemini dans Google Cloud Console');
      console.log('3. Vérifiez que votre région supporte Gemini');
      console.log('4. Essayez de créer une nouvelle clé API');
      console.log('5. Utilisez OpenAI ou DeepSeek à la place (changez USE_GEMINI=false dans .env)');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    console.log('\n💡 Suggestions:');
    console.log('- Vérifiez votre clé API sur https://aistudio.google.com/');
    console.log('- Utilisez OpenAI ou DeepSeek à la place');
  }
}

checkAPI().catch(console.error);



