import User from '../models/User.js';

/**
 * Find user by email (includes password for authentication)
 */
export const findUserByEmail = (email) => 
  User.findOne({ email: email.toLowerCase() }).select('+password');

/**
 * Create a new user
 */
export const createUser = (userData) => {
  const user = new User(userData);
  return user.save();
};

/**
 * Find user by ID (excludes password by default)
 */
export const findUserById = (id) => User.findById(id);
