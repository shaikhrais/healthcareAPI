/**
 * Production Security Hardening
 * Comprehensive security enhancements for production deployment
 */

const crypto = require('crypto');
const config = require('./env.config');
const logger = require('./logger.config');

class ProductionSecurity {
  constructor() {
    this.securityConfig = {
      // Password security
      password: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90, // days
        historyCount: 12, // previous passwords to remember
      },
      
      // Session security
      session: {
        timeout: 30 * 60 * 1000, // 30 minutes
        absoluteTimeout: 8 * 60 * 60 * 1000, // 8 hours
        maxConcurrentSessions: 3,
        secureOnly: config.isProduction,
        sameSite: 'strict',
      },
      
      // JWT security
      jwt: {
        algorithm: 'HS256',
        issuer: 'expojane-api',
        audience: 'expojane-client',
        notBefore: 0,
        clockTolerance: 30, // seconds
        maxAge: config.jwt.expiresIn,
      },
      
      // Rate limiting enhancements
      rateLimiting: {
        global: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // requests per window per IP
        },
        auth: {
          windowMs: 15 * 60 * 1000,
          max: 5, // login attempts
          blockDuration: 30 * 60 * 1000, // 30 minutes
        },
        api: {
          windowMs: 1 * 60 * 1000, // 1 minute
          max: 60, // requests per minute per IP
        },
        upload: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 10, // upload requests per hour
        },
      },
      
      // Content Security Policy
      csp: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https://api.stripe.com', 'https://api.sendgrid.com'],
        'media-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': [],
      },
      
      // Input validation rules
      validation: {
        email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
        phone: /^\+?[1-9]\d{1,14}$/,
        name: /^[a-zA-Z\s\-'\.]{2,50}$/,
        password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
        alphanumeric: /^[a-zA-Z0-9]+$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      },
      
      // File upload security
      fileUpload: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
        scanForMalware: true,
        virusCheckTimeout: 10000, // 10 seconds
      },
      
      // API versioning and deprecation
      api: {
        currentVersion: '1.0',
        supportedVersions: ['1.0'],
        deprecationWarningDays: 90,
        sunsetPeriodDays: 180,
      },
    };
  }

  /**
   * Enhanced CORS configuration with security checks
   */
  getSecureCorsOptions() {
    return {
      origin: (origin, callback) => {
        // Production: strict origin checking
        if (config.isProduction) {
          const allowedOrigins = config.security.corsOrigin.split(',').map(o => o.trim());
          
          if (!origin) {
            return callback(new Error('Origin header is required in production'));
          }
          
          if (!allowedOrigins.includes(origin)) {
            logger.warn('CORS: Blocked unauthorized origin', { origin });
            return callback(new Error('Not allowed by CORS policy'));
          }
        }
        
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Version',
        'X-Client-Version'
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset'
      ],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  /**
   * Enhanced Helmet configuration for production
   */
  getSecureHelmetConfig() {
    return {
      contentSecurityPolicy: {
        directives: this.securityConfig.csp,
        reportOnly: !config.isProduction,
      },
      crossOriginEmbedderPolicy: config.isProduction,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    };
  }

  /**
   * JWT security enhancements
   */
  createSecureJWT(payload) {
    const jwtPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: this.securityConfig.jwt.issuer,
      aud: this.securityConfig.jwt.audience,
    };

    return require('jsonwebtoken').sign(jwtPayload, config.jwt.secret, {
      algorithm: this.securityConfig.jwt.algorithm,
      expiresIn: config.jwt.expiresIn,
    });
  }

  /**
   * Enhanced password validation
   */
  validatePassword(password) {
    const errors = [];
    
    if (password.length < this.securityConfig.password.minLength) {
      errors.push(`Password must be at least ${this.securityConfig.password.minLength} characters long`);
    }
    
    if (this.securityConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.securityConfig.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.securityConfig.password.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.securityConfig.password.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
      'welcome', 'monkey', '1234567890', 'football', 'iloveyou'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Input sanitization and validation
   */
  sanitizeInput(input, type = 'default') {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potential XSS vectors
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');

    // Type-specific validation
    switch (type) {
      case 'email':
        if (!this.securityConfig.validation.email.test(sanitized)) {
          throw new Error('Invalid email format');
        }
        break;
      case 'phone':
        sanitized = sanitized.replace(/[^\d+\-\s()]/g, '');
        if (!this.securityConfig.validation.phone.test(sanitized.replace(/[\s\-()]/g, ''))) {
          throw new Error('Invalid phone number format');
        }
        break;
      case 'name':
        if (!this.securityConfig.validation.name.test(sanitized)) {
          throw new Error('Invalid name format');
        }
        break;
      case 'uuid':
        if (!this.securityConfig.validation.uuid.test(sanitized)) {
          throw new Error('Invalid UUID format');
        }
        break;
    }

    return sanitized.trim();
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  hashSensitiveData(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Encrypt sensitive data
   */
  encryptSensitiveData(data, key) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Security audit middleware
   */
  securityAuditMiddleware() {
    return (req, res, next) => {
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      };

      // Apply security headers
      Object.entries(securityHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });

      // Log security events
      if (req.headers['user-agent']) {
        const suspiciousAgents = ['sqlmap', 'nmap', 'nikto', 'dirb', 'gobuster'];
        const userAgent = req.headers['user-agent'].toLowerCase();
        
        if (suspiciousAgents.some(agent => userAgent.includes(agent))) {
          logger.warn('Suspicious User-Agent detected', {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            url: req.url
          });
        }
      }

      next();
    };
  }

  /**
   * API version validation middleware
   */
  apiVersionMiddleware() {
    return (req, res, next) => {
      const apiVersion = req.headers['x-api-version'] || this.securityConfig.api.currentVersion;
      
      if (!this.securityConfig.api.supportedVersions.includes(apiVersion)) {
        return res.status(400).json({
          error: 'Unsupported API version',
          supportedVersions: this.securityConfig.api.supportedVersions,
          currentVersion: this.securityConfig.api.currentVersion
        });
      }
      
      req.apiVersion = apiVersion;
      next();
    };
  }

  /**
   * Request integrity check
   */
  requestIntegrityMiddleware() {
    return (req, res, next) => {
      // Check for required headers in production
      if (config.isProduction) {
        const requiredHeaders = ['user-agent', 'accept'];
        
        for (const header of requiredHeaders) {
          if (!req.headers[header]) {
            return res.status(400).json({
              error: 'Missing required headers',
              required: requiredHeaders
            });
          }
        }
      }

      // Validate content-length for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxSize = this.securityConfig.fileUpload.maxSize;
        
        if (contentLength > maxSize) {
          return res.status(413).json({
            error: 'Request entity too large',
            maxSize: `${maxSize / (1024 * 1024)}MB`
          });
        }
      }

      next();
    };
  }

  /**
   * Comprehensive security audit
   */
  runSecurityAudit() {
    const audit = {
      timestamp: new Date().toISOString(),
      environment: config.env,
      passed: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Check environment variables
    if (!config.jwt.secret || config.jwt.secret === 'secret') {
      audit.errors.push('JWT_SECRET not properly configured');
      audit.passed = false;
    }

    if (config.isProduction) {
      // Production-specific checks
      if (!process.env.HTTPS) {
        audit.warnings.push('HTTPS not enforced in production');
      }

      if (config.security.corsOrigin === '*') {
        audit.errors.push('CORS origin set to wildcard in production');
        audit.passed = false;
      }

      if (!process.env.SENTRY_DSN) {
        audit.warnings.push('Sentry DSN not configured for error tracking');
      }
    }

    // Log audit results
    logger.info('Security audit completed', audit);
    
    return audit;
  }
}

module.exports = ProductionSecurity;