import User from '../models/User.js';

export const findById = (id) => User.findById(id).select('-password');
export const list = (filter = {}) => User.find(filter).select('-password');
export const updateById = (id, data) => User.findByIdAndUpdate(id, data, { new: true }).select('-password');
