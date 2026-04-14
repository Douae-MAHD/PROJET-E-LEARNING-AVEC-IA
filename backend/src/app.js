import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';

import config from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import seanceRoutes from './routes/seance.routes.js';
import seanceProgressionRoutes from './routes/seanceProgression.routes.js';
import { generalErrorHandler, notFound } from './utils/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet()); // Set security headers
app.use(mongoSanitize()); // Prevent NoSQL injection

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server and same-origin requests with no Origin header.
    if (!origin) return callback(null, true);

    const allowedOrigins = Array.isArray(config.cors.origin)
      ? config.cors.origin
      : [config.cors.origin];

    const isLocalhostDevOrigin = /^http:\/\/localhost:\d+$/.test(origin);
    if (config.server.isDevelopment && isLocalhostDevOrigin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: config.cors.credentials
}));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: (req) => {
    // En développement, ne pas bloquer les appels fréquents (HMR, reload, etc.)
    if (config.server.isDevelopment) return true;

    // Éviter le double comptage avec authLimiter
    return req.path.startsWith('/auth/login') || req.path.startsWith('/auth/register');
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many requests from this IP, please try again later.',
        type: 'RATE_LIMIT_ERROR'
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Rate limiting - auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many authentication attempts, please try again later.',
        type: 'AUTH_RATE_LIMIT_ERROR'
      }
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'src', 'uploads')));

// Swagger docs
setupSwagger(app);

// API routes
app.use('/api', apiRoutes);
app.use('/api/seances', seanceRoutes);
app.use('/api/progression', seanceProgressionRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(generalErrorHandler);

export default app;
