/**
 * Health Check Routes
 * Provides endpoints for monitoring server health and readiness
 */

import express from 'express';
import mongoose from 'mongoose';
import config from '../config/env.js';

const router = express.Router();

/**
 * Health check endpoint
 * Returns server uptime, status, and database connection state
 */
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.server.env,
    database: {
      connected: mongoose.connection.readyState === 1,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  const statusCode = health.database.connected ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness check endpoint
 * Simple check for Kubernetes/Docker orchestration
 */
router.get('/ready', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ 
      ready: true,
      message: 'Service is ready to accept requests'
    });
  } else {
    res.status(503).json({ 
      ready: false,
      message: 'Service is not ready - database not connected'
    });
  }
});

/**
 * Liveness check endpoint
 * Simple ping to verify the server is alive
 */
router.get('/ping', (req, res) => {
  res.status(200).json({ 
    pong: true,
    timestamp: new Date().toISOString()
  });
});

export default router;
