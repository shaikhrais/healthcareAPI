/**
 * Enhanced Performance Middleware - Conflict-Free Version
 * Optimized for production deployment with improved monitoring
 */

const compression = require('compression');
const config = require('../config/env.config');
const logger = require('../config/logger.config');

class EnhancedPerformanceOptimizer {
  constructor() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRequests: 0,
      compressionSavings: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryPeaks: []
    };

    this.slowRequestThreshold = 1000; // 1 second (improved from 2s)
    this.compressionThreshold = 512; // 512 bytes (improved from 1KB)
    this.cache = new Map();
    this.cacheSize = 1000; // Maximum cache entries
  }

  /**
   * Enhanced request timing middleware without response interception conflicts
   */
  requestTimer() {
    return (req, res, next) => {
      const startTime = Date.now();
      req.startTime = startTime;
      
      // Set request ID immediately
      req.id = req.id || this.generateRequestId();
      res.setHeader('X-Request-ID', req.id);
      
      // Override res.end to add response time header before sending
      const originalEnd = res.end;
      res.end = function(...args) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Set response time header before ending response
        if (!res.headersSent) {
          res.setHeader('X-Response-Time', `${responseTime}ms`);
        }
        
        // Call original end method
        originalEnd.apply(this, args);
      };
      
      // Use response finish event for metrics collection
      res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Update metrics safely
        this.updateMetrics(req, res, responseTime);
      });

      next();
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update metrics without conflicts
   */
  updateMetrics(req, res, responseTime) {
    this.metrics.requestCount++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;
    
      if (responseTime > this.slowRequestThreshold) {
        this.metrics.slowRequests++;
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          responseTime: `${responseTime}ms`,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }    if (res.statusCode >= 400) {
      this.metrics.errorRequests++;
    }
  }

  /**
   * Request ID and correlation middleware
   */
  requestId() {
    return (req, res, next) => {
      const requestId = this.generateRequestId();
      req.id = requestId;
      req.correlationId = req.headers['x-correlation-id'] || requestId;
      
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Correlation-ID', req.correlationId);
      
      next();
    };
  }

  /**
   * Enhanced compression with better configuration
   */
  smartCompression() {
    return compression({
      threshold: this.compressionThreshold,
      level: config.isProduction ? 6 : 3, // Balanced compression
      memLevel: 8,
      windowBits: 15,
      
      filter: (req, res) => {
        // Skip already compressed content
        const contentEncoding = res.getHeader('content-encoding');
        if (contentEncoding) return false;

        // Don't compress if client doesn't support it
        const acceptEncoding = req.headers['accept-encoding'];
        if (!acceptEncoding) return false;

        // Check content type
        const contentType = res.getHeader('content-type');
        if (contentType) {
          const type = contentType.toLowerCase();
          
          // Skip binary content
          const skipTypes = [
            'image/', 'video/', 'audio/', 'font/',
            'application/zip', 'application/gzip', 'application/rar',
            'application/pdf', 'application/octet-stream',
            'application/x-msdownload'
          ];
          
          if (skipTypes.some(skipType => type.includes(skipType))) {
            return false;
          }

          // Compress text content
          const compressTypes = [
            'text/', 'application/json', 'application/javascript',
            'application/xml', 'application/rss+xml',
            'application/atom+xml', 'application/x-web-app-manifest+json'
          ];
          
          return compressTypes.some(compressType => type.includes(compressType));
        }

        return compression.filter(req, res);
      }
    });
  }

  /**
   * Memory monitoring with periodic cleanup
   */
  memoryMonitor() {
    return (req, res, next) => {
      const memUsage = process.memoryUsage();
      const memUsageGB = memUsage.rss / (1024 * 1024 * 1024);
      
      // Track memory peaks
      if (this.metrics.memoryPeaks.length > 100) {
        this.metrics.memoryPeaks.shift(); // Keep only last 100 measurements
      }
      this.metrics.memoryPeaks.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      });
      
      // Alert on high memory usage
      if (memUsageGB > 0.5) { // 500MB threshold
        logger.warn('High memory usage detected', {
          memoryUsage: {
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
          },
          url: req.url,
          method: req.method
        });

        // Trigger garbage collection in non-production for testing
        if (!config.isProduction && global.gc) {
          global.gc();
          logger.info('Garbage collection triggered');
        }
      }

      // Add memory headers for debugging (non-production only)
      if (!config.isProduction) {
        res.setHeader('X-Memory-RSS', `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
        res.setHeader('X-Memory-Heap', `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }

      next();
    };
  }

  /**
   * Intelligent caching middleware
   */
  intelligentCaching() {
    return (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for authenticated routes
      if (req.headers.authorization || req.headers.cookie) {
        return next();
      }

      // Create cache key
      const cacheKey = `${req.method}:${req.url}:${JSON.stringify(req.query)}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        this.metrics.cacheHits++;
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000));
        return res.json(cached.data);
      }

      // Cache miss
      this.metrics.cacheMisses++;
      res.setHeader('X-Cache', 'MISS');

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Cache successful responses only
        if (res.statusCode === 200 && data) {
          // Determine TTL based on route
          let ttl = 60000; // 1 minute default
          if (req.url.includes('/static/') || req.url.includes('/public/')) {
            ttl = 300000; // 5 minutes for static content
          } else if (req.url.includes('/reports/')) {
            ttl = 600000; // 10 minutes for reports
          }

          // Manage cache size
          if (this.cache.size >= this.cacheSize) {
            // Remove oldest entries (simple LRU)
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
          }

          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl
          });
        }

        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Connection optimization
   */
  connectionPooling() {
    return (req, res, next) => {
      // Optimize connection settings
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=30, max=100'); // Improved settings
      
      // Prevent connection leaks
      req.on('close', () => {
        if (req.aborted) {
          logger.warn('Request aborted by client', {
            url: req.url,
            method: req.method,
            ip: req.ip
          });
        }
      });

      next();
    };
  }

  /**
   * Advanced response optimization without conflicts
   */
  responseOptimizer() {
    return (req, res, next) => {
      // Set optimal caching headers
      if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
      } else if (req.url.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      next();
    };
  }

  /**
   * Enhanced complexity limiter
   */
  complexityLimiter() {
    const requestComplexity = new Map();
    const windowMs = 60000; // 1 minute window

    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      // Calculate request complexity
      let complexity = this.calculateComplexity(req);

      // Track complexity per IP
      if (!requestComplexity.has(ip)) {
        requestComplexity.set(ip, []);
      }

      const requests = requestComplexity.get(ip);
      
      // Clean old requests
      const recentRequests = requests.filter(r => now - r.timestamp < windowMs);
      
      // Calculate total complexity
      const totalComplexity = recentRequests.reduce((sum, r) => sum + r.complexity, 0);
      
      // Complexity limit: 150 points per minute (increased from 100)
      const limit = 150;
      if (totalComplexity + complexity > limit) {
        logger.warn('Request complexity limit exceeded', {
          ip,
          complexity,
          totalComplexity,
          url: req.url,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(429).json({
          error: 'Request complexity limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000),
          complexity: {
            current: complexity,
            total: totalComplexity,
            limit
          }
        });
      }

      // Add current request
      recentRequests.push({ timestamp: now, complexity });
      requestComplexity.set(ip, recentRequests);

      // Add performance headers
      res.setHeader('X-Request-Complexity', complexity);
      res.setHeader('X-Complexity-Used', totalComplexity + complexity);
      res.setHeader('X-Complexity-Limit', limit);

      next();
    };
  }

  /**
   * Calculate request complexity score
   */
  calculateComplexity(req) {
    let complexity = 1;
    
    // Method complexity
    if (req.method === 'POST' || req.method === 'PUT') complexity += 2;
    if (req.method === 'PATCH') complexity += 1;
    if (req.method === 'DELETE') complexity += 3;

    // Route complexity
    if (req.url.includes('/search')) complexity += 3;
    if (req.url.includes('/reports')) complexity += 5;
    if (req.url.includes('/export')) complexity += 4;
    if (req.url.includes('/analytics')) complexity += 3;

    // Query parameter complexity
    const queryCount = Object.keys(req.query || {}).length;
    if (queryCount > 5) complexity += Math.min(queryCount - 5, 5);

    // Body size complexity
    if (req.body) {
      const bodySize = JSON.stringify(req.body).length;
      if (bodySize > 10000) complexity += 3;
      if (bodySize > 50000) complexity += 5;
    }

    // File upload complexity
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      complexity += 4;
    }

    return Math.min(complexity, 20); // Cap at 20 points per request
  }

  /**
   * Get enhanced performance metrics
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      requests: {
        total: this.metrics.requestCount,
        averageResponseTime: Math.round(this.metrics.averageResponseTime * 100) / 100,
        slowRequests: this.metrics.slowRequests,
        errorRequests: this.metrics.errorRequests,
        slowRequestRate: this.metrics.requestCount > 0 ? 
          ((this.metrics.slowRequests / this.metrics.requestCount) * 100).toFixed(2) + '%' : '0%',
        errorRate: this.metrics.requestCount > 0 ? 
          ((this.metrics.errorRequests / this.metrics.requestCount) * 100).toFixed(2) + '%' : '0%'
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ?
          ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2) + '%' : '0%',
        size: this.cache.size,
        maxSize: this.cacheSize
      },
      compression: {
        totalSavings: `${(this.metrics.compressionSavings / 1024 / 1024).toFixed(2)}MB`,
        enabled: true
      },
      memory: {
        current: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
        },
        peak: this.getMemoryPeak()
      },
      process: {
        uptime: `${Math.floor(process.uptime())}s`,
        cpuUsage: {
          user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
          system: `${(cpuUsage.system / 1000000).toFixed(2)}s`
        },
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Get memory usage peak
   */
  getMemoryPeak() {
    if (this.metrics.memoryPeaks.length === 0) {
      return { rss: '0MB', heapUsed: '0MB' };
    }

    const peak = this.metrics.memoryPeaks.reduce((max, current) => {
      return current.rss > max.rss ? current : max;
    });

    return {
      rss: `${(peak.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(peak.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      timestamp: new Date(peak.timestamp).toISOString()
    };
  }

  /**
   * Performance health check
   */
  healthCheck() {
    const metrics = this.getMetrics();
    const memUsageBytes = process.memoryUsage().rss;
    const memUsageGB = memUsageBytes / (1024 * 1024 * 1024);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics,
      checks: {
        memory: {
          status: memUsageGB < 1.0 ? 'healthy' : memUsageGB < 1.5 ? 'warning' : 'critical',
          value: `${memUsageGB.toFixed(2)}GB`,
          threshold: '1.0GB'
        },
        responseTime: {
          status: this.metrics.averageResponseTime < 500 ? 'healthy' : 
                  this.metrics.averageResponseTime < 1000 ? 'warning' : 'critical',
          value: `${this.metrics.averageResponseTime.toFixed(2)}ms`,
          threshold: '500ms'
        },
        errorRate: {
          status: (this.metrics.errorRequests / Math.max(this.metrics.requestCount, 1)) < 0.01 ? 'healthy' :
                  (this.metrics.errorRequests / Math.max(this.metrics.requestCount, 1)) < 0.05 ? 'warning' : 'critical',
          value: metrics.requests.errorRate,
          threshold: '1%'
        },
        cacheHitRate: {
          status: parseFloat(metrics.cache.hitRate) > 70 ? 'healthy' :
                  parseFloat(metrics.cache.hitRate) > 50 ? 'warning' : 'degraded',
          value: metrics.cache.hitRate,
          threshold: '70%'
        }
      }
    };

    // Determine overall status
    const statuses = Object.values(health.checks).map(check => check.status);
    if (statuses.includes('critical')) {
      health.status = 'critical';
    } else if (statuses.includes('warning')) {
      health.status = 'warning';
    } else if (statuses.includes('degraded')) {
      health.status = 'degraded';
    }

    return health;
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    const oldSize = this.cache.size;
    this.cache.clear();
    logger.info('Performance cache cleared', { 
      entriesRemoved: oldSize,
      newSize: this.cache.size 
    });
    return { cleared: oldSize, remaining: this.cache.size };
  }
}

module.exports = EnhancedPerformanceOptimizer;