/**
 * Response Formatter
 * Consistent API response formatting
 */

export const formatSuccessResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data
  };
};

export const formatErrorResponse = (error, statusCode = 500) => {
  return {
    success: false,
    statusCode,
    error: {
      message: error.message || 'An error occurred',
      type: error.name || 'Error'
    }
  };
};

export const formatPaginatedResponse = (items, page, limit, total, message = 'Success') => {
  return {
    success: true,
    message,
    data: items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  };
};

/**
 * Response middleware wrapper for cleaner controller code
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json(formatSuccessResponse(data, message, statusCode));
};

export const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json(formatErrorResponse(error, statusCode));
};

export const sendPaginated = (res, items, page, limit, total, message = 'Success') => {
  res.status(200).json(formatPaginatedResponse(items, page, limit, total, message));
};
