import * as usersRepo from '../repositories/users.repository.js';

export const getProfile = async (id) => {
  return usersRepo.findById(id);
};

export const listUsers = async (role) => {
  const filter = role ? { role } : {};
  return usersRepo.list(filter);
};

export const updateProfile = async (id, data) => {
  return usersRepo.updateById(id, data);
};
