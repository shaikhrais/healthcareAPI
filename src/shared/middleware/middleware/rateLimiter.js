const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

/**
 * Rate Limiting Middleware
 *
 * Configurable rate limiters for different endpoint types
 */

// Create Redis client for rate limiting
let redisClient;
let useRedis = false;

// Try to connect to Redis
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    redisClient = redis.createClient({
      url:
        process.env.REDIS_URL ||
        `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      socket: {
        connectTimeout: 5000,
      },
    });

    redisClient
      .connect()
      .then(() => {
        console.log('✓ Redis connected for rate limiting');
        useRedis = true;
      })
      .catch((err) => {
        console.warn('⚠ Redis connection failed, using memory store:', err.message);
        useRedis = false;
      });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
  } catch (err) {
    console.warn('⚠ Redis setup failed, using memory store:', err.message);
    useRedis = false;
  }
}

/**
 * Create rate limiter with configuration
 */
function createRateLimiter(options) {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // 100 requests default
    message: options.message || 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Custom key generator to handle proxy headers and satisfy
    // express-rate-limit IPv6 validation (use ipKeyGenerator helper)
    keyGenerator: (req) => {
      // Prefer forwarded headers when present (typical behind proxies)
      const forwarded = req.headers['x-forwarded-for']?.split(',')[0] || req.headers['x-real-ip'];
      const remote = req.connection && req.connection.remoteAddress;

      const candidate = forwarded || remote || req.ip;

      // If candidate looks like an IPv6 address or to ensure compliance
      // with express-rate-limit, use the library helper which normalises
      // IPv4/IPv6 and handles proxy/trust settings correctly.
      try {
        return ipKeyGenerator(req);
      } catch (err) {
        // Fallback to the candidate string if helper fails for any reason
        return candidate || 'unknown';
      }
    },
    // Skip successful requests if configured
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    // Custom handler
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000),
        limit: options.max,
      });
    },
    ...options,
  };

  // Use Redis store if available
  if (useRedis && redisClient) {
    config.store = new RedisStore({
      client: redisClient,
      prefix: options.prefix || 'rl:',
    });
  }

  return rateLimit(config);
}

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  prefix: 'rl:auth:',
});

/**
 * Password reset limiter
 * Prevents abuse of password reset functionality
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts, please try again after 1 hour.',
  skipSuccessfulRequests: true, // Don't count successful resets
  prefix: 'rl:reset:',
});

/**
 * Email verification limiter
 * Prevents spam of verification emails
 */
const emailVerificationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many verification requests, please try again after 1 hour.',
  skipSuccessfulRequests: true,
  prefix: 'rl:verify:',
});

/**
 * API limiter for general endpoints
 * Prevents API abuse
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many API requests, please try again later.',
  skipSuccessfulRequests: false,
  prefix: 'rl:api:',
});

/**
 * Strict limiter for sensitive operations
 */
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many requests for this operation, please try again later.',
  skipSuccessfulRequests: false,
  prefix: 'rl:strict:',
});

/**
 * File upload limiter
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Too many upload requests, please try again later.',
  skipSuccessfulRequests: false,
  prefix: 'rl:upload:',
});

/**
 * Search/query limiter
 */
const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down.',
  skipSuccessfulRequests: false,
  prefix: 'rl:search:',
});

/**
 * Create custom rate limiter with specific config
 */
const customLimiter = (config) => createRateLimiter(config);

/**
 * Get Redis client for IP blocking
 */
const getRedisClient = () => redisClient;

/**
 * Check if Redis is being used
 */
const isUsingRedis = () => useRedis;

module.exports = {
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  apiLimiter,
  strictLimiter,
  uploadLimiter,
  searchLimiter,
  customLimiter,
  getRedisClient,
  isUsingRedis,
};
