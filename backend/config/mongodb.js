import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/e_learning_db';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'e_learning_db';

/**
 * Connect to MongoDB using Mongoose
 * Returns the mongoose connection promise
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: MONGO_DB_NAME,
      retryWrites: true,
      w: 'majority',
    });

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${MONGO_DB_NAME}`);
    
    return conn;
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ Déconnexion de MongoDB réussie');
  } catch (error) {
    console.error('❌ Erreur de déconnexion MongoDB:', error.message);
  }
};

/**
 * Get Mongoose connection instance
 */
export const getDBConnection = () => {
  return mongoose.connection;
};

export default mongoose;
