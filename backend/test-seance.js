import mongoose from 'mongoose';
import Seance from './src/models/Seance.js';

await mongoose.connect('mongodb://admin:admin123@localhost:27017/e_learning_db?authSource=admin');

console.log('✅ Connecté à MongoDB');

try {
  const testSeance = new Seance({
    moduleId: new mongoose.Types.ObjectId(),
    subModuleId: null,
    titre: 'Test Séance',
    type: 'presentielle',
    startTime: '14:30',
    duree: 90
  });
  
  console.log('💾 Tentative de sauvegarde...');
  await testSeance.save();
  console.log('✅ Test séance créée avec ID:', testSeance._id);
  
  const count = await Seance.countDocuments();
  console.log('📊 Total séances dans la collection:', count);
  
  // Vérifier le nom de la collection
  console.log('📁 Nom de la collection:', Seance.collection.name);
  
} catch (err) {
  console.error('❌ Erreur:', err.message);
  console.error(err.stack);
} finally {
  await mongoose.disconnect();
  console.log('🔌 Déconnecté de MongoDB');
}