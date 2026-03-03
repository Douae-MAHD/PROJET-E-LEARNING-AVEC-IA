import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/user.repository.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../utils/errorHandler.js';
import config from '../config/env.js';

/**
 * Register a new user
 */
export const register = async ({ nom, email, password, role }) => {
  // Check required fields
  if (!nom || !email || !password || !role) {
    throw new ValidationError('All fields are required (nom, email, password, role)');
  }

  // Check if email already exists
  const existing = await userRepo.findUserByEmail(email);
  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  // Create user
  const saved = await userRepo.createUser({
    nom,
    email: email.toLowerCase(),
    password: hashed,
    role
  });

  // Generate JWT token
  const token = jwt.sign(
    { id: saved._id.toString(), email: saved.email, role: saved.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    user: {
      id: saved._id,
      nom: saved.nom,
      email: saved.email,
      role: saved.role
    },
    token
  };
};

/**
 * Login user
 */
export const login = async ({ email, password }) => {
  // Check required fields
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Find user with password field
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    user: {
      id: user._id,
      nom: user.nom,
      email: user.email,
      role: user.role
    },
    token
  };
};
