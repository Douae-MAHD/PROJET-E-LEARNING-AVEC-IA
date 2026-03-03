/**
 * MongoDB Query Helpers and Utilities
 * Provides utility functions for complex MongoDB operations
 */

import mongoose from 'mongoose';

/**
 * Convert MySQL-style ID to MongoDB ObjectId
 */
export const convertToObjectId = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
};

export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Safe population with error handling
 */
export const populateIfExists = async (query, populatePath, selectFields = null) => {
  try {
    if (selectFields) {
      return query.populate(populatePath, selectFields);
    }
    return query.populate(populatePath);
  } catch (error) {
    console.error(`Erreur lors de la population de ${populatePath}:`, error);
    return query;
  }
};

/**
 * Pagination helper
 */
export const getPaginationOptions = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, limit };
};

/**
 * Aggregation pipeline for teacher results
 * @usage Dans feedback.service.js getTeacherResults
 * Remplace les multiples Quiz.find() + Exercise.find()
 * par une seule agrégation MongoDB plus performante
 */
export const buildTeacherResultsAggregation = (professorId) => {
  return [
    {
      $lookup: {
        from: 'users',
        localField: 'etudiantId',
        foreignField: '_id',
        as: 'student',
      },
    },
    {
      $unwind: {
        path: '$student',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'pdfs',
        localField: 'pdfId',
        foreignField: '_id',
        as: 'pdf',
      },
    },
    {
      $unwind: {
        path: '$pdf',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'submodules',
        localField: 'pdf.subModuleId',
        foreignField: '_id',
        as: 'submodule',
      },
    },
    {
      $unwind: {
        path: '$submodule',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'coursemodules',
        localField: 'submodule.parentModuleId',
        foreignField: '_id',
        as: 'module',
      },
    },
    {
      $unwind: {
        path: '$module',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        'module.professorId': new mongoose.Types.ObjectId(professorId),
      },
    },
    {
      $sort: { dateCompletion: -1 },
    },
  ];
};

/**
 * Sanitize user object (remove password)
 */
export const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  return userObj;
};

/**
 * Batch insert with error handling
 */
export const batchInsert = async (Model, data, batchSize = 100) => {
  const results = [];
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    try {
      const inserted = await Model.insertMany(batch, { ordered: false });
      results.push(...inserted);
    } catch (error) {
      if (error.writeErrors) {
        // Some documents failed, but some succeeded
        console.warn(`Insertion partielle du lot ${Math.floor(i / batchSize) + 1}`);
        results.push(...error.insertedDocs);
      } else {
        console.error(`Erreur lors de l'insertion du lot:`, error);
      }
    }
  }
  return results;
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Champs manquants: ${missing.join(', ')}`);
  }
};

export const buildModuleFilter = (moduleIds, subModuleIds) => ({
  $or: [
    { moduleId: { $in: moduleIds } },
    { subModuleId: { $in: subModuleIds } }
  ]
});

export default {
  convertToObjectId,
  isValidObjectId,
  populateIfExists,
  getPaginationOptions,
  buildTeacherResultsAggregation,
  sanitizeUser,
  batchInsert,
  validateRequiredFields,
  buildModuleFilter,
};
