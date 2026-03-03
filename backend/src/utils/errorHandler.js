/**
 * Custom Error Classes
 */

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ServiceError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500);
    this.name = 'ServiceError';
    this.originalError = originalError;
  }
}

export class ExternalAPIError extends AppError {
  constructor(service = 'External Service', message = 'Service unavailable', statusCode = 503) {
    super(`${service} error: ${message}`, statusCode);
    this.name = 'ExternalAPIError';
    this.service = service;
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Error handler middleware for Express
 */
export const generalErrorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: {
      message: err.message,
      type: err.name,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  if (err.field) {
    response.error.field = err.field;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 handler
 */
export const notFound = (req, res, next) => {
  res.status(404).json({ error: 'Not found' });
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
