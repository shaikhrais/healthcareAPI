/**
 * Custom Error Classes
 *
 * Standardized error types for consistent API responses
 */

/**
 * Base API Error
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', errors = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        ...(this.errors && { errors: this.errors }),
      },
    };
  }
}

/**
 * 400 Bad Request
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', errors = null) {
    super(message, 400, 'BAD_REQUEST', errors);
  }
}

/**
 * 401 Unauthorized
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * 403 Forbidden
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource already exists', field = null) {
    super(message, 409, 'CONFLICT');
    this.field = field;
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422, 'VALIDATION_ERROR', errors);
  }

  static fromExpressValidator(validationErrors) {
    const errors = validationErrors.map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return new ValidationError('Validation failed', errors);
  }

  static fromMongoose(mongooseError) {
    const errors = Object.keys(mongooseError.errors || {}).map((field) => ({
      field,
      message: mongooseError.errors[field].message,
      kind: mongooseError.errors[field].kind,
    }));

    return new ValidationError('Validation failed', errors);
  }
}

/**
 * 429 Too Many Requests
 */
class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', originalError = null) {
    super(message, 500, 'INTERNAL_ERROR');
    this.originalError = originalError;
  }
}

/**
 * 503 Service Unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(service = 'Service', message = null) {
    const errorMessage = message || `${service} is currently unavailable`;
    super(errorMessage, 503, 'SERVICE_UNAVAILABLE');
    this.service = service;
  }
}

/**
 * Database Error
 */
class DatabaseError extends ApiError {
  constructor(message = 'Database error', operation = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.operation = operation;
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends UnauthorizedError {
  constructor(message = 'Authentication failed', reason = null) {
    super(message, 'AUTHENTICATION_FAILED');
    this.reason = reason;
  }
}

/**
 * Token Error
 */
class TokenError extends UnauthorizedError {
  constructor(message = 'Invalid or expired token', type = 'INVALID_TOKEN') {
    super(message, type);
  }
}

/**
 * Payment Error
 */
class PaymentError extends ApiError {
  constructor(message = 'Payment processing failed', code = 'PAYMENT_FAILED') {
    super(message, 402, code);
  }
}

/**
 * External Service Error
 */
class ExternalServiceError extends ApiError {
  constructor(service, message = 'External service error', statusCode = 502) {
    super(message, statusCode, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * File Upload Error
 */
class FileUploadError extends ApiError {
  constructor(message = 'File upload failed', reason = null) {
    super(message, 400, 'FILE_UPLOAD_ERROR');
    this.reason = reason;
  }
}

/**
 * Check if error is operational (known error vs. programmer error)
 */
function isOperationalError(error) {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Error factory for common scenarios
 */
const ErrorFactory = {
  invalidCredentials: () =>
    new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS'),

  tokenExpired: () => new TokenError('Token has expired', 'TOKEN_EXPIRED'),

  tokenInvalid: () => new TokenError('Invalid token', 'TOKEN_INVALID'),

  insufficientPermissions: (requiredRole = null) =>
    new ForbiddenError(
      requiredRole
        ? `Insufficient permissions. Required role: ${requiredRole}`
        : 'Insufficient permissions'
    ),

  resourceNotFound: (resource, id = null) => new NotFoundError(resource, id),

  duplicateEntry: (field) => new ConflictError(`${field} already exists`, field),

  validationFailed: (errors) => new ValidationError('Validation failed', errors),

  databaseConnection: () => new DatabaseError('Database connection failed', 'connect'),

  emailDelivery: () => new ExternalServiceError('Email', 'Failed to send email', 503),

  fileTooBig: (maxSize) =>
    new FileUploadError(`File size exceeds maximum allowed size of ${maxSize}`, 'FILE_TOO_LARGE'),

  unsupportedFileType: (allowedTypes) =>
    new FileUploadError(
      `Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`,
      'UNSUPPORTED_FILE_TYPE'
    ),

  sessionExpired: () => new UnauthorizedError('Session has expired', 'SESSION_EXPIRED'),

  ipBlocked: (reason, expiresAt = null) => {
    const error = new ForbiddenError('Your IP address has been blocked', 'IP_BLOCKED');
    error.reason = reason;
    error.expiresAt = expiresAt;
    return error;
  },

  maintenanceMode: () => new ServiceUnavailableError('System', 'System is under maintenance'),

  quotaExceeded: (resource) => new ForbiddenError(`${resource} quota exceeded`, 'QUOTA_EXCEEDED'),
};

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  DatabaseError,
  AuthenticationError,
  TokenError,
  PaymentError,
  ExternalServiceError,
  FileUploadError,
  isOperationalError,
  ErrorFactory,
};
