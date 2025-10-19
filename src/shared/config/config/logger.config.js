const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const config = require('./env.config');
/**
 * Winston Logger Configuration
 * Production-ready logging with daily rotation and multiple transports
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = '';

    if (Object.keys(meta).length > 0) {
      // Don't log sensitive data
      const sanitized = { ...meta };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.authorization;

      metaStr = `\n${JSON.stringify(sanitized, null, 2)}`;
    }

    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport (development only or low verbosity in production)
if (!config.isProduction || process.env.LOG_CONSOLE === 'true') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
}

// File transport for all logs
transports.push(
  new DailyRotateFile({
    filename: path.join(config.logging.directory, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: fileFormat,
    level: 'info',
  })
);

// File transport for errors only
transports.push(
  new DailyRotateFile({
    filename: path.join(config.logging.directory, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    format: fileFormat,
    level: 'error',
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  transports,
  exitOnError: false,
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(config.logging.directory, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(config.logging.directory, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      format: fileFormat,
    }),
  ],
});

// Create Morgan stream for HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logRequest = (req, message = 'Incoming request') => {
  logger.http(message, {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?._id,
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  if (req) {
    errorLog.request = {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?._id,
    };
  }

  logger.error('Application error', errorLog);
};

logger.logAudit = (action, userId, details = {}) => {
  logger.info('Audit log', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

module.exports = logger;
