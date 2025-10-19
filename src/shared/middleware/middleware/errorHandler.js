
const { ApiError, ValidationError, isOperationalError } = require('../utils/errors');
/**
 * Centralized Error Handler Middleware
 *
 * Catches all errors and formats consistent API responses
 */

/**
 * Format error response
 */
function formatErrorResponse(error, includeStack = false) {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || 500,
    },
  };

  // Add additional fields if present
  if (error.errors) {
    response.error.errors = error.errors;
  }

  if (error.field) {
    response.error.field = error.field;
  }

  if (error.resource) {
    response.error.resource = error.resource;
  }

  if (error.resourceId) {
    response.error.resourceId = error.resourceId;
  }

  if (error.retryAfter) {
    response.error.retryAfter = error.retryAfter;
  }

  if (error.reason) {
    response.error.reason = error.reason;
  }

  if (error.service) {
    response.error.service = error.service;
  }

  // Include stack trace in development
  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  // Add request ID if available
  if (error.requestId) {
    response.error.requestId = error.requestId;
  }

  // Add timestamp
  response.error.timestamp = new Date().toISOString();

  return response;
}

/**
 * Handle Mongoose Validation Errors
 */
function handleMongooseValidationError(error) {
  return ValidationError.fromMongoose(error);
}

/**
 * Handle Mongoose Duplicate Key Error
 */
function handleMongooseDuplicateKeyError(error) {
  const field = Object.keys(error.keyPattern)[0];
  const value = error.keyValue[field];

  const apiError = new ApiError(`${field} '${value}' already exists`, 409, 'DUPLICATE_KEY');
  apiError.field = field;
  apiError.value = value;

  return apiError;
}

/**
 * Handle Mongoose Cast Error
 */
function handleMongooseCastError(error) {
  return new ApiError(`Invalid ${error.path}: ${error.value}`, 400, 'INVALID_ID');
}

/**
 * Handle JWT Errors
 */
function handleJWTError(error) {
  if (error.name === 'TokenExpiredError') {
    return new ApiError('Token has expired', 401, 'TOKEN_EXPIRED');
  }
  if (error.name === 'JsonWebTokenError') {
    return new ApiError('Invalid token', 401, 'TOKEN_INVALID');
  }
  return new ApiError('Authentication failed', 401, 'AUTH_ERROR');
}

/**
 * Convert known errors to ApiError
 */
function normalizeError(error) {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError' && error.errors) {
    return handleMongooseValidationError(error);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    return handleMongooseDuplicateKeyError(error);
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    return handleMongooseCastError(error);
  }

  // JWT errors
  if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    return handleJWTError(error);
  }

  // Multer errors (file upload)
  if (error.name === 'MulterError') {
    let message = 'File upload error';
    let code = 'FILE_UPLOAD_ERROR';

    if (error.code === 'LIMIT_FILE_SIZE') {
      let message; message = 'File size exceeds maximum allowed size';
      code = 'FILE_TOO_LARGE';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      let message; message = 'Too many files uploaded';
      code = 'TOO_MANY_FILES';
    }

    return new ApiError(message, 400, code);
  }

  // Default to internal server error
  return new ApiError(
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
    500,
    'INTERNAL_ERROR'
  );
}

/**
 * Log error
 */
function logError(error, req) {
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
  };

  if (req.user) {
    logData.user = {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };
  }

  // Log based on severity
  if (error.statusCode >= 500) {
    console.error('ERROR:', JSON.stringify(logData, null, 2));
  } else if (error.statusCode >= 400) {
    console.warn('WARNING:', JSON.stringify(logData, null, 2));
  } else {
    console.log('INFO:', JSON.stringify(logData, null, 2));
  }

  // In production, send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production' && !isOperationalError(error)) {
    // Example: Sentry.captureException(error);
  }
}

/**
 * Main error handler middleware
 */
function errorHandler(error, req, res, next) {
  // Normalize error to ApiError
  const apiError = normalizeError(error);

  // Attach request ID if available
  if (req.id) {
    apiError.requestId = req.id;
  }

  // Log error
  logError(apiError, req);

  // Format response
  const includeStack = process.env.NODE_ENV === 'development';
  const response = formatErrorResponse(apiError, includeStack);

  // Send response
  res.status(apiError.statusCode).json(response);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new ApiError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate request with express-validator
 */
function validateRequest(validations) {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(ValidationError.fromExpressValidator(errors.array()));
    }

    next();
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequest,
  formatErrorResponse,
  logError,
};
