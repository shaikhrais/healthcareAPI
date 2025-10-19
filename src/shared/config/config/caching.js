/**
 * Production Caching System
 * Multi-tier caching with Redis and in-memory fallbacks
 */

const Redis = require('redis');
const NodeCache = require('node-cache');
const config = require('./env.config');
const logger = require('./logger.config');

class ProductionCaching {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new NodeCache({
      stdTTL: 300, // 5 minutes default TTL
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false, // Better performance, but be careful with object mutations
      maxKeys: 1000, // Limit memory usage
    });

    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };

    this.cacheConfig = {
      // Cache TTL settings (in seconds)
      ttl: {
        user: 1800, // 30 minutes
        appointment: 600, // 10 minutes
        schedule: 300, // 5 minutes
        staff: 3600, // 1 hour
        patient: 1800, // 30 minutes
        treatment: 7200, // 2 hours
        waitlist: 60, // 1 minute
        public: 300, // 5 minutes
        session: 900, // 15 minutes
        auth: 300, // 5 minutes
      },
      
      // Cache key prefixes
      prefixes: {
        user: 'user:',
        appointment: 'appointment:',
        schedule: 'schedule:',
        staff: 'staff:',
        patient: 'patient:',
        treatment: 'treatment:',
        waitlist: 'waitlist:',
        session: 'session:',
        auth: 'auth:',
        query: 'query:',
        page: 'page:',
      },
    };

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    if (!config.cache.redisUrl && !config.isProduction) {
      logger.info('Redis not configured, using memory cache only');
      return;
    }

    try {
      const redisOptions = {
        url: config.cache.redisUrl,
        retry_unfulfilled_commands: true,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          // Exponential backoff: 2^attempt * 100ms
          return Math.min(options.attempt * 100, 3000);
        },
        connect_timeout: 60000,
        lazyConnect: true,
      };

      this.redisClient = Redis.createClient(redisOptions);

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.redisClient.on('ready', () => {
        logger.info('Redis ready for operations');
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis error:', err);
        this.cacheStats.errors++;
      });

      this.redisClient.on('end', () => {
        logger.warn('Redis connection ended');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.warn('Failed to connect to Redis, using memory cache only:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(type, identifier, suffix = '') {
    const prefix = this.cacheConfig.prefixes[type] || 'misc:';
    const key = `${prefix}${identifier}${suffix ? ':' + suffix : ''}`;
    return key;
  }

  /**
   * Get value from cache (tries Redis first, then memory cache)
   */
  async get(key) {
    try {
      // Try Redis first
      if (this.redisClient && this.redisClient.isReady) {
        const value = await this.redisClient.get(key);
        if (value) {
          this.cacheStats.hits++;
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      const memValue = this.memoryCache.get(key);
      if (memValue !== undefined) {
        this.cacheStats.hits++;
        return memValue;
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and memory if available)
   */
  async set(key, value, ttl = 300) {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      }

      // Set in memory cache
      this.memoryCache.set(key, value, ttl);
      
      this.cacheStats.sets++;
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete from cache
   */
  async del(key) {
    try {
      // Delete from Redis
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.del(key);
      }

      // Delete from memory cache
      this.memoryCache.del(key);
      
      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern) {
    try {
      let deletedCount = 0;

      // Clear from Redis
      if (this.redisClient && this.redisClient.isReady) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          deletedCount += keys.length;
        }
      }

      // Clear from memory cache (get all keys and filter)
      const memKeys = this.memoryCache.keys();
      memKeys.forEach(key => {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.del(key);
          deletedCount++;
        }
      });

      logger.info(`Cleared ${deletedCount} cache entries matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      logger.error('Cache clear pattern error:', { pattern, error: error.message });
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Simple pattern matching (supports * wildcard)
   */
  matchPattern(str, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(str);
  }

  /**
   * Cache middleware for Express routes
   */
  middleware(type, ttlOverride = null) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key based on route and query parameters
      const keyBase = `${req.originalUrl || req.url}`;
      const queryString = Object.keys(req.query).length > 0 ? 
        ':' + JSON.stringify(req.query) : '';
      const cacheKey = this.generateKey(type, keyBase, queryString);

      try {
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          logger.debug('Cache hit', { key: cacheKey });
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
          return res.json(cachedData);
        }

        // Store original res.json function
        const originalJson = res.json.bind(res);
        
        // Override res.json to cache the response
        res.json = (data) => {
          const ttl = ttlOverride || this.cacheConfig.ttl[type] || 300;
          
          // Cache successful responses only
          if (res.statusCode >= 200 && res.statusCode < 300) {
            this.set(cacheKey, data, ttl).catch(err => 
              logger.error('Failed to cache response:', err)
            );
          }
          
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);
          return originalJson(data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Cache invalidation for specific entities
   */
  async invalidateEntity(type, id) {
    const patterns = [
      `${this.cacheConfig.prefixes[type]}${id}*`,
      `${this.cacheConfig.prefixes.query}*${type}*`,
      `${this.cacheConfig.prefixes.page}*${type}*`,
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await this.clearPattern(pattern);
      totalDeleted += deleted;
    }

    logger.info(`Invalidated ${totalDeleted} cache entries for ${type}:${id}`);
    return totalDeleted;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache() {
    logger.info('Starting cache warm-up...');
    
    try {
      // This would be implemented based on your specific data access patterns
      // For now, we'll just log the intention
      
      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memStats = this.memoryCache.getStats();
    
    return {
      redis: {
        connected: this.redisClient?.isReady || false,
        url: config.cache.redisUrl || 'not configured',
      },
      memory: {
        keys: memStats.keys,
        hits: memStats.hits,
        misses: memStats.misses,
        ksize: memStats.ksize,
        vsize: memStats.vsize,
      },
      operations: this.cacheStats,
      hitRate: this.cacheStats.hits > 0 ? 
        (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2) + '%' : 
        '0%',
    };
  }

  /**
   * Health check for caching system
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      redis: {
        status: 'disconnected',
        latency: null,
      },
      memory: {
        status: 'healthy',
        usage: this.memoryCache.getStats(),
      },
    };

    // Check Redis health
    if (this.redisClient && this.redisClient.isReady) {
      try {
        const start = Date.now();
        await this.redisClient.ping();
        health.redis.status = 'healthy';
        health.redis.latency = Date.now() - start;
      } catch (error) {
        health.redis.status = 'unhealthy';
        health.redis.error = error.message;
        health.status = 'degraded'; // Still functional with memory cache
      }
    }

    return health;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    logger.info('Shutting down caching system...');
    
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
    }

    this.memoryCache.flushAll();
    logger.info('Memory cache cleared');
  }
}

module.exports = ProductionCaching;