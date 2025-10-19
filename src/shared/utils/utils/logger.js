const path = require('path');
const winston = require('winston');

/**
 * Centralized Logging Utility
 *
 * Provides structured logging for errors, requests, and application events
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'development' ? consoleFormat : logFormat,
  })
);

// File transports (production only)
if (process.env.NODE_ENV === 'production') {
  // All logs
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Error logs only
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/rejections.log') }),
  ],
});

/**
 * Structured logging methods
 */

/**
 * Log error with context
 */
function logError(error, context = {}) {
  const errorData = {
    message: error.message,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    ...context,
  };

  logger.error('Error occurred', errorData);
}

/**
 * Log HTTP request
 */
function logRequest(req, res, duration) {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  if (req.user) {
    logData.userId = req.user.userId;
  }

  const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, 'HTTP Request', logData);
}

/**
 * Log authentication event
 */
function logAuth(event, user, success = true, context = {}) {
  logger.info('Authentication event', {
    event,
    userId: user?.id || user?._id,
    email: user?.email,
    success,
    ...context,
  });
}

/**
 * Log database operation
 */
function logDatabase(operation, model, success = true, context = {}) {
  const level = success ? 'debug' : 'error';
  logger.log(level, 'Database operation', {
    operation,
    model,
    success,
    ...context,
  });
}

/**
 * Log security event
 */
function logSecurity(event, severity = 'warn', context = {}) {
  logger.log(severity, 'Security event', {
    event,
    ...context,
  });
}

/**
 * Log API call to external service
 */
function logExternalAPI(service, endpoint, success = true, context = {}) {
  const level = success ? 'info' : 'warn';
  logger.log(level, 'External API call', {
    service,
    endpoint,
    success,
    ...context,
  });
}

/**
 * Log performance metric
 */
function logPerformance(operation, duration, context = {}) {
  logger.debug('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...context,
  });
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, res, duration);
  });

  next();
}

/**
 * Stream for Morgan HTTP logger
 */
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = {
  logger,
  logError,
  logRequest,
  logAuth,
  logDatabase,
  logSecurity,
  logExternalAPI,
  logPerformance,
  requestLogger,
  stream,
};
