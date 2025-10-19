const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const config = require('../config/env.config');
const logger = require('../config/logger.config');
/**
 * Security Middleware
 * Comprehensive security layer for production deployment
 */

// eslint-disable-next-line no-unused-vars
/**
 * Helmet Configuration - Security headers
 */
const helmetConfig = () =>
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: `${Math.ceil(config.security.rateLimitWindow / 60000)} minutes`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: `${Math.ceil(config.security.rateLimitWindow / 60000)} minutes`,
    });
  },
  skip: (req) =>
    // Skip rate limiting for health checks
    req.path === '/health',
});

/**
 * Strict Rate Limiter for Authentication Routes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      email: req.body.email,
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Account temporarily locked. Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    });
  },
});

/**
 * Moderate Rate Limiter for Public Booking Routes
 */
const publicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 requests
  message: {
    error: 'Too many booking requests, please try again later.',
    retryAfter: '10 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * MongoDB Query Sanitization
 * Prevents NoSQL injection attacks
 */
const sanitizeMongoQueries = () =>
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn('Sanitized malicious MongoDB query', {
        ip: req.ip,
        key,
        url: req.url,
      });
    },
  });

/**
 * HTTP Parameter Pollution Protection
 */
const preventHPP = () =>
  hpp({
    whitelist: [
      'date',
      'practitioner',
      'patient',
      'status',
      'treatment',
      'sort',
      'fields',
      'page',
      'limit',
    ],
  });

/**
 * CORS Configuration with security
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins =
      config.security.corsOrigin === '*'
        ? [origin]
        : config.security.corsOrigin.split(',').map((o) => o.trim());

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, ip: origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.security.corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Request Size Limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const maxSize = config.app.maxUploadSize;

  req.on('data', (chunk) => {
    if (req.socket.bytesRead > maxSize) {
      req.connection.destroy();
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        url: req.url,
        size: req.socket.bytesRead,
      });
    }
  });

  next();
};

/**
 * Suspicious Activity Detection
 */
const detectSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi, // XSS
    /(\.\.(\/|\\))|(\.\.(\/|\\))/i, // Path traversal
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some((pattern) => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const suspicious = checkValue(req.query) || checkValue(req.body) || checkValue(req.params);

  if (suspicious) {
    logger.error('Suspicious activity detected', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      query: req.query,
      body: req.body,
      params: req.params,
    });

    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid input detected',
    });
  }

  next();
};

module.exports = {
  helmetConfig,
  apiLimiter,
  authLimiter,
  publicLimiter,
  sanitizeMongoQueries,
  preventHPP,
  corsOptions,
  securityHeaders,
  requestSizeLimiter,
  detectSuspiciousActivity,
};
