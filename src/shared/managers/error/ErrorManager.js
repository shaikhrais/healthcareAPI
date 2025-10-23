/**
 * ErrorManager
 * Centralized error creation, normalization, logging, and HTTP mapping.
 */
const winston = require('winston');

// Simple logger dedicated for the manager layer (isolated from app logger wiring)
const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', status = 500, details = undefined, cause = undefined } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    if (cause) this.cause = cause;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, { code: 'VALIDATION_ERROR', status: 400, details });
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { code: 'UNAUTHORIZED', status: 401 });
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, { code: 'FORBIDDEN', status: 403 });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, { code: 'NOT_FOUND', status: 404 });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, { code: 'CONFLICT', status: 409 });
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, { code: 'RATE_LIMIT', status: 429 });
  }
}

const ErrorManager = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,

  // Create a normalized error object safe to return in HTTP responses
  toHttp(err, { includeStack = process.env.NODE_ENV !== 'production' } = {}) {
    if (!(err instanceof AppError)) {
      // Wrap unknown errors
      const wrapped = new AppError(err?.message || 'Internal server error', {
        code: err?.code || 'APP_ERROR',
        status: err?.status || 500,
        cause: err,
      });
      return this.toHttp(wrapped, { includeStack });
    }
    const body = {
      error: err.code,
      message: err.message,
    };
    if (err.details) body.details = err.details;
    if (includeStack && err.stack) body.stack = err.stack;
    return { status: err.status, body };
  },

  // Centralized logging for errors
  log(err, context = {}) {
    const { status, body } = this.toHttp(err, { includeStack: true });
    const meta = { status, code: body.error, ...context };
    if (status >= 500) logger.error(body.message, meta);
    else logger.warn(body.message, meta);
  },
};

module.exports = ErrorManager;
