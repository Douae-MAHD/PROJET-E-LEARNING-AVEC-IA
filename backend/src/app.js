import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';

import config from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import apiRoutes from './routes/index.js';
import { generalErrorHandler, notFound } from './utils/errorHandler.js';

const app = express();

// Security middleware
app.use(helmet()); // Set security headers
app.use(mongoSanitize()); // Prevent NoSQL injection

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
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
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// Swagger docs
setupSwagger(app);

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(generalErrorHandler);

export default app;
