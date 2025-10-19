/**
 * Rate Limiter Middleware
 * Provides rate limiting functionality for API endpoints
 */

const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

// In-memory store for development/testing
const memoryStore = new Map();

/**
 * Simple in-memory rate limiter
 */
class SimpleRateLimiter {
  constructor(windowMs, max) {
    this.windowMs = windowMs;
    this.max = max;
    this.store = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    
    const requests = this.store.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.max) {
      return false;
    }
    
    validRequests.push(now);
    this.store.set(key, validRequests);
    
    return true;
  }
}

/**
 * Create rate limiter middleware
 */
const createRateLimiter = (type, maxRequests, windowMinutes = 60) => {
  const windowMs = windowMinutes * 60 * 1000; // Convert to milliseconds
  
  // Use simple in-memory limiter for now
  const limiter = new SimpleRateLimiter(windowMs, maxRequests);
  
  return (req, res, next) => {
    try {
      const key = `${type}:${req.ip}:${req.user?.id || 'anonymous'}`;
      
      if (limiter.isAllowed(key)) {
        next();
      } else {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded for ${type}. Maximum ${maxRequests} requests per ${windowMinutes} minutes.`,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
};

/**
 * Pre-configured rate limiters
 */
const rateLimiters = {
  // Authentication endpoints
  auth_login: createRateLimiter('auth_login', 5, 15), // 5 login attempts per 15 minutes
  auth_register: createRateLimiter('auth_register', 3, 60), // 3 registrations per hour
  phone_verify: createRateLimiter('phone_verify', 5, 60), // 5 verifications per hour
  
  // Biometric authentication
  biometric_register: createRateLimiter('biometric_register', 10, 60), // 10 registrations per hour
  biometric_auth: createRateLimiter('biometric_auth', 50, 60), // 50 auth attempts per hour
  
  // Sync operations
  sync_data: createRateLimiter('sync_data', 100, 60), // 100 sync operations per hour
  sync_upload: createRateLimiter('sync_upload', 50, 60), // 50 uploads per hour
  
  // Health integrations
  health_sync: createRateLimiter('health_sync', 100, 60), // 100 syncs per hour
  health_create: createRateLimiter('health_create', 200, 60), // 200 creates per hour
  health_update: createRateLimiter('health_update', 100, 60), // 100 updates per hour
  health_delete: createRateLimiter('health_delete', 50, 60), // 50 deletes per hour
  health_batch: createRateLimiter('health_batch', 10, 60), // 10 batch imports per hour
  health_export: createRateLimiter('health_export', 5, 60), // 5 exports per hour
  health_resolve: createRateLimiter('health_resolve', 50, 60), // 50 flag resolutions per hour
  
  // Push notifications
  device_register: createRateLimiter('device_register', 10, 60), // 10 device registrations per hour
  device_update: createRateLimiter('device_update', 50, 60), // 50 device updates per hour
  device_deactivate: createRateLimiter('device_deactivate', 20, 60), // 20 deactivations per hour
  notification_send: createRateLimiter('notification_send', 100, 60), // 100 sends per hour
  notification_bulk: createRateLimiter('notification_bulk', 5, 60), // 5 bulk sends per hour
  notification_schedule: createRateLimiter('notification_schedule', 50, 60), // 50 schedules per hour
  notification_action: createRateLimiter('notification_action', 200, 60), // 200 actions per hour
  notification_test: createRateLimiter('notification_test', 10, 60), // 10 tests per hour
  webhook: createRateLimiter('webhook', 1000, 60), // 1000 webhooks per hour
  
  // General API endpoints
  general: createRateLimiter('general', 1000, 60), // 1000 general requests per hour
  upload: createRateLimiter('upload', 50, 60), // 50 uploads per hour
  export: createRateLimiter('export', 10, 60), // 10 exports per hour
};

/**
 * Get rate limiter by type
 */
const rateLimiterMiddleware = (type, customLimit = null, customWindow = null) => {
  if (customLimit && customWindow) {
    return createRateLimiter(type, customLimit, customWindow);
  }
  
  return rateLimiters[type] || rateLimiters.general;
};

/**
 * Global rate limiter for all requests
 */
const globalRateLimiter = createRateLimiter('global', 2000, 60); // 2000 requests per hour per IP

module.exports = rateLimiterMiddleware;
module.exports.global = globalRateLimiter;
module.exports.create = createRateLimiter;