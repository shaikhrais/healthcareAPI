/**
 * Security Headers Middleware
 * Implements security best practices through HTTP headers
 */

const helmet = require('helmet');

/**
 * Configure security headers middleware
 */
const configureSecurityHeaders = (app) => {
  // Basic security headers using helmet
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    
    // Cross-Origin-Embedder-Policy
    crossOriginEmbedderPolicy: false,
    
    // Disable X-Powered-By header
    hidePoweredBy: true,
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },
    
    // X-XSS-Protection
    xssFilter: true,
    
    // Referrer Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin"
    }
  }));

  // Additional custom security headers
  app.use((req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS filtering
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Prevent Adobe Flash and PDF from loading
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Feature Policy / Permissions Policy
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    
    // Content Security Policy for API responses
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    
    next();
  });

  console.log('✅ Security headers middleware configured');
};

/**
 * Simple security headers for development
 */
const basicSecurityHeaders = (req, res, next) => {
  // Basic security headers without helmet dependency
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * API-specific security headers
 */
const apiSecurityHeaders = (req, res, next) => {
  // Set security headers for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Prevent MIME type confusion
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // API-specific CSP
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  
  next();
};

module.exports = {
  configureSecurityHeaders,
  basicSecurityHeaders,
  apiSecurityHeaders
};