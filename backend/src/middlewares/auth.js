import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errorHandler.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Authentication token required'));
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return next(new ForbiddenError('Invalid or expired token'));
    }
    req.user = user;
    return next();
  });
};

/**
 * Middleware to require specific role(s)
 */
export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  if (!rolesArray.includes(req.user.role)) {
    return next(new ForbiddenError(`Access restricted to: ${rolesArray.join(', ')}`));
  }
  
  return next();
};
