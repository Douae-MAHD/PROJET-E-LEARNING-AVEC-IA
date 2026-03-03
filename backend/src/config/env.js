/**
 * Centralized Environment Configuration
 * 
 * This module validates and exports all environment variables.
 * Fails fast if required variables are missing.
 */

import dotenv from 'dotenv';

dotenv.config();

// Required environment variables
const requiredEnvVars = ['JWT_SECRET', 'GEMINI_API_KEY', 'MONGODB_URI'];

// Validate required variables
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`❌ Missing required environment variable: ${envVar}`);
  }
});

// Warn about default values in production
if (process.env.NODE_ENV === 'production') {
  if (process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_this_in_production') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET in production!');
  }
}

/**
 * Centralized configuration object
 */
export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256'
  },

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGO_DB_NAME || 'elearning',
    options: {
      retryWrites: true,
      w: 'majority'
    }
  },

  // AI/Gemini configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.AI_MODEL || 'gemini-2.5-flash',
    maxRetries: 3,
    timeout: 30000
  },

  // File upload configuration
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads/pdfs',
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB default
    allowedTypes: ['application/pdf']
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100,
    authMax: 5 // Stricter for auth endpoints
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  }
};

export default config;
