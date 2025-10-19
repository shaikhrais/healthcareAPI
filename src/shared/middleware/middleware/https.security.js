/**
 * HTTPS and Security Headers Enforcement
 * Production-grade HTTPS enforcement and security headers
 */

const config = require('../config/env.config');
const logger = require('../config/logger.config');

/**
 * HTTPS Enforcement Middleware
 * Redirects HTTP traffic to HTTPS in production
 */
const enforceHTTPS = (req, res, next) => {
  // Skip HTTPS enforcement for health checks and development
  if (!config.isProduction || req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  // Check if request is already HTTPS
  const isHTTPS = req.secure || 
                  req.headers['x-forwarded-proto'] === 'https' ||
                  req.headers['x-forwarded-ssl'] === 'on' ||
                  req.connection.encrypted;

  if (!isHTTPS) {
    logger.warn('HTTP request redirected to HTTPS', {
      ip: req.ip,
      url: req.url,
      userAgent: req.headers['user-agent']
    });

    const httpsUrl = `https://${req.headers.host}${req.url}`;
    return res.redirect(301, httpsUrl);
  }

  next();
};

/**
 * Strict Transport Security (HSTS) Headers
 */
const strictTransportSecurity = (req, res, next) => {
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload');
  }
  next();
};

/**
 * Enhanced Security Headers Middleware
 */
const enhancedSecurityHeaders = (req, res, next) => {
  // Remove server fingerprinting headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Content Type Options - Prevents MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Frame Options - Prevents clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy - Controls referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy - Controls browser features
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=()',
    'vibrate=()',
    'fullscreen=(self)',
    'sync-xhr=()'
  ].join(', '));

  // Cache Control for sensitive pages
  if (req.path.includes('admin') || req.path.includes('auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Cross-Origin Headers for API endpoints
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }

  // Feature Policy for older browsers
  res.setHeader('Feature-Policy', [
    'geolocation \'none\'',
    'microphone \'none\'',
    'camera \'none\'',
    'payment \'none\'',
    'usb \'none\'',
    'magnetometer \'none\'',
    'gyroscope \'none\''
  ].join('; '));

  next();
};

/**
 * Content Security Policy (CSP) Headers
 */
const contentSecurityPolicy = (req, res, next) => {
  const nonce = require('crypto').randomBytes(16).toString('base64');
  
  // Store nonce for use in templates
  res.locals.nonce = nonce;

  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      config.isProduction ? '' : "'unsafe-eval'" // Allow eval in development only
    ].filter(Boolean),
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for some CSS frameworks
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:'
    ],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://api.sendgrid.com',
      config.isProduction ? '' : 'ws: wss:' // WebSocket for development
    ].filter(Boolean),
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'block-all-mixed-content': [],
    'upgrade-insecure-requests': config.isProduction ? [] : null
  };

  // Remove null directives
  Object.keys(cspDirectives).forEach(key => {
    if (cspDirectives[key] === null) {
      delete cspDirectives[key];
    }
  });

  // Build CSP header value
  const cspHeader = Object.entries(cspDirectives)
    .map(([directive, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        return `${directive} ${values.join(' ')}`;
      } else if (Array.isArray(values) && values.length === 0) {
        return directive;
      }
      return null;
    })
    .filter(Boolean)
    .join('; ');

  // Set CSP header (report-only in development)
  const headerName = config.isProduction ? 
    'Content-Security-Policy' : 
    'Content-Security-Policy-Report-Only';
    
  res.setHeader(headerName, cspHeader);

  next();
};

/**
 * Security Audit Logging Middleware
 */
const securityAuditLogger = (req, res, next) => {
  // Log security-relevant events
  const securityEvents = [];

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip'
  ];

  suspiciousHeaders.forEach(header => {
    if (req.headers[header]) {
      securityEvents.push(`${header}: ${req.headers[header]}`);
    }
  });

  // Log if multiple IP headers (potential spoofing)
  if (securityEvents.length > 1) {
    logger.warn('Multiple IP headers detected', {
      ip: req.ip,
      headers: securityEvents,
      url: req.url
    });
  }

  // Check for security-sensitive operations
  const sensitiveOperations = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/admin',
    '/api/users',
    '/api/payments'
  ];

  if (sensitiveOperations.some(op => req.path.includes(op))) {
    logger.info('Security-sensitive operation', {
      operation: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?._id
    });
  }

  next();
};

/**
 * DNS Prefetch Control
 */
const dnsPrefetchControl = (req, res, next) => {
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
};

/**
 * Expect-CT Header (Certificate Transparency)
 */
const expectCT = (req, res, next) => {
  if (config.isProduction) {
    res.setHeader('Expect-CT', 
      'max-age=86400, enforce, report-uri="https://your-domain.com/ct-report"');
  }
  next();
};

/**
 * Public Key Pinning (HPKP) - Use with caution
 */
const publicKeyPinning = (req, res, next) => {
  // Only enable if you have proper key pinning setup
  if (config.isProduction && process.env.ENABLE_HPKP === 'true') {
    const pins = process.env.HPKP_PINS?.split(',') || [];
    
    if (pins.length >= 2) {
      const pinHeader = pins.map(pin => `pin-sha256="${pin}"`).join('; ');
      res.setHeader('Public-Key-Pins', 
        `${pinHeader}; max-age=5184000; includeSubDomains`);
    }
  }
  next();
};

/**
 * Security Headers Test Endpoint
 */
const securityHeadersTest = (req, res) => {
  const headers = {};
  
  // Collect all security headers
  ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 
   'x-xss-protection', 'referrer-policy', 'permissions-policy', 
   'content-security-policy', 'expect-ct'].forEach(header => {
    if (res.getHeader(header)) {
      headers[header] = res.getHeader(header);
    }
  });

  res.json({
    message: 'Security headers test',
    timestamp: new Date().toISOString(),
    environment: config.env,
    headers,
    httpsEnforced: config.isProduction,
    securityScore: Object.keys(headers).length
  });
};

module.exports = {
  enforceHTTPS,
  strictTransportSecurity,
  enhancedSecurityHeaders,
  contentSecurityPolicy,
  securityAuditLogger,
  dnsPrefetchControl,
  expectCT,
  publicKeyPinning,
  securityHeadersTest
};