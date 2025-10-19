const Redis = require('ioredis');

const config = require('./env.config');
const logger = require('./logger.config');
/**
 * Redis Cache Configuration
 */

// eslint-disable-next-line no-unused-vars
let redisClient = null;

/**
 * Initialize Redis client
 */
function initializeRedis() {
  if (!config.cache.enabled) {
    logger.info('Redis caching is disabled');
    return null;
  }

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };

  try {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    return null;
  }
}

/**
 * Get cached data
 */
async function get(key) {
  if (!redisClient) return null;

  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis GET error', { key, error: error.message });
    return null;
  }
}

/**
 * Set cache data
 */
async function set(key, value, ttl = config.cache.ttl) {
  if (!redisClient) return false;

  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redisClient.setex(key, ttl, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (error) {
    logger.error('Redis SET error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete cache
 */
async function del(key) {
  if (!redisClient) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis DEL error', { key, error: error.message });
    return false;
  }
}

/**
 * Clear all cache
 */
async function flush() {
  if (!redisClient) return false;

  try {
    await redisClient.flushdb();
    logger.info('Redis cache flushed');
    return true;
  } catch (error) {
    logger.error('Redis FLUSH error', { error: error.message });
    return false;
  }
}

/**
 * Cache middleware for Express routes
 */
function cacheMiddleware(ttl = config.cache.ttl) {
  return async (req, res, next) => {
    if (!redisClient || req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await get(key);

      if (cached) {
        logger.debug('Cache HIT', { key });
        return res.json(cached);
      }

      logger.debug('Cache MISS', { key });

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        set(key, data, ttl).catch((err) =>
          logger.error('Failed to cache response', { error: err.message })
        );
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
}

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  flush,
  cacheMiddleware,
  getClient: () => redisClient,
};
