/**
 * Performance Optimization Middleware
 * Comprehensive performance enhancements for production
 */

const compression = require('compression');
const config = require('../config/env.config');
const logger = require('../config/logger.config');

class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      requestCount: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorRequests: 0,
      compressionSavings: 0,
    };

    this.slowRequestThreshold = 2000; // 2 seconds
    this.compressionThreshold = 1024; // 1KB
  }

  /**
   * Request timing middleware
   */
  requestTimer() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Store start time
      req.startTime = startTime;
      
      // Override res.end to capture timing
      const originalEnd = res.end.bind(res);
      res.end = (...args) => {
        const responseTime = Date.now() - startTime;
        
        // Update metrics
        this.metrics.requestCount++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;
        
        if (responseTime > this.slowRequestThreshold) {
          this.metrics.slowRequests++;
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            responseTime,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
        }

        if (res.statusCode >= 400) {
          this.metrics.errorRequests++;
        }

        // Add performance headers
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        res.setHeader('X-Request-ID', req.id || 'unknown');
        
        // Call original end
        originalEnd(...args);
      };

      next();
    };
  }

  /**
   * Smart compression middleware
   */
  smartCompression() {
    return compression({
      // Only compress responses larger than threshold
      threshold: this.compressionThreshold,
      
      // Compression level (1-9, higher = better compression but slower)
      level: config.isProduction ? 6 : 1,
      
      // Memory level (1-9, higher = more memory usage)
      memLevel: 8,
      
      // Custom filter function
      filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (!req.headers['accept-encoding']) {
          return false;
        }

        // Don't compress images, videos, or already compressed files
        const contentType = res.getHeader('content-type');
        if (contentType) {
          const type = contentType.split(';')[0].toLowerCase();
          const skipTypes = [
            'image/', 'video/', 'audio/',
            'application/zip', 'application/gzip',
            'application/pdf', 'application/octet-stream'
          ];
          
          if (skipTypes.some(skipType => type.startsWith(skipType))) {
            return false;
          }
        }

        // Compress text-based content
        return compression.filter(req, res);
      },
      
      // Track compression savings
      onCompressed: (req, res, original, compressed) => {
        const savings = original - compressed;
        this.metrics.compressionSavings += savings;
        
        res.setHeader('X-Compression-Ratio', 
          `${(compressed / original * 100).toFixed(2)}%`);
      }
    });
  }

  /**
   * Request ID middleware for tracing
   */
  requestId() {
    return (req, res, next) => {
      // Generate unique request ID
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      req.id = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    };
  }

  /**
   * Memory usage monitoring
   */
  memoryMonitor() {
    return (req, res, next) => {
      const memUsage = process.memoryUsage();
      const memUsagePercent = memUsage.rss / (1024 * 1024 * 1024); // Convert to GB
      
      // Warn if memory usage is high
      if (memUsagePercent > 0.8) { // 800MB threshold
        logger.warn('High memory usage detected', {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
          url: req.url
        });
      }

      // Add memory headers for debugging
      if (!config.isProduction) {
        res.setHeader('X-Memory-RSS', `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
        res.setHeader('X-Memory-Heap', `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }

      next();
    };
  }

  /**
   * Database query optimization middleware
   */
  queryOptimizer() {
    return (req, res, next) => {
      // Track database queries per request
      req.dbQueries = [];
      req.dbQueryCount = 0;
      
      // Override Mongoose query methods to track performance
      const originalQuery = require('mongoose').Query.prototype.exec;
      require('mongoose').Query.prototype.exec = function(callback) {
        const startTime = Date.now();
        const queryString = this.getQuery();
        const collection = this.mongooseCollection.name;
        
        return originalQuery.call(this, (err, result) => {
          const queryTime = Date.now() - startTime;
          
          if (req.dbQueries) {
            req.dbQueries.push({
              collection,
              query: queryString,
              time: queryTime,
              resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0)
            });
            req.dbQueryCount++;
          }

          // Log slow queries
          if (queryTime > 1000) { // 1 second threshold
            logger.warn('Slow database query', {
              collection,
              query: queryString,
              queryTime,
              url: req.url
            });
          }

          if (callback) {
            callback(err, result);
          }
        }).then(result => {
          const queryTime = Date.now() - startTime;
          
          if (req.dbQueries) {
            req.dbQueries.push({
              collection,
              query: queryString,
              time: queryTime,
              resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0)
            });
            req.dbQueryCount++;
          }

          // Log slow queries
          if (queryTime > 1000) {
            logger.warn('Slow database query', {
              collection,
              query: queryString,
              queryTime,
              url: req.url
            });
          }

          return result;
        });
      };

      next();
    };
  }

  /**
   * Response optimization
   */
  responseOptimizer() {
    return (req, res, next) => {
      // Set efficient caching headers for static content
      if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
      }

      // Set no-cache for API responses
      if (req.url.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Optimize JSON responses
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Remove null/undefined values to reduce payload size
        if (typeof data === 'object' && data !== null) {
          data = this.cleanObject(data);
        }

        // Add performance headers
        if (req.dbQueryCount > 0) {
          res.setHeader('X-DB-Queries', req.dbQueryCount);
        }

        const responseTime = Date.now() - req.startTime;
        if (responseTime > 500) { // 500ms threshold
          res.setHeader('X-Performance-Warning', 'slow-response');
        }

        // Handle monitoring logging if monitoring middleware is active
        if (req.monitoring) {
          req.monitoring.logger.info('HTTP Response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime,
            contentLength: res.get('Content-Length'),
            type: 'response',
          });

          // Track slow requests
          if (responseTime > req.monitoring.alertThresholds.responseTime) {
            req.monitoring.logger.warn('Slow Request Detected', {
              method: req.method,
              url: req.url,
              responseTime,
              threshold: req.monitoring.alertThresholds.responseTime,
            });
          }

          // Track errors
          if (res.statusCode >= 500) {
            req.monitoring.metrics.errorCount++;
          }
        }

        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Clean object by removing null/undefined values
   */
  cleanObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObject(item));
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== null && obj[key] !== undefined) {
          cleaned[key] = this.cleanObject(obj[key]);
        }
      });
      return cleaned;
    }
    return obj;
  }

  /**
   * Connection pooling optimization
   */
  connectionPooling() {
    return (req, res, next) => {
      // Set keep-alive headers to maintain connections
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=5, max=1000');
      next();
    };
  }

  /**
   * Request rate limiting based on complexity
   */
  complexityLimiter() {
    const requestComplexity = new Map();

    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      const windowMs = 60000; // 1 minute window

      // Calculate request complexity score
      let complexity = 1;
      
      if (req.method === 'POST' || req.method === 'PUT') complexity += 2;
      if (req.url.includes('search')) complexity += 3;
      if (req.url.includes('report')) complexity += 5;
      if (Object.keys(req.query).length > 5) complexity += 2;
      if (req.body && JSON.stringify(req.body).length > 10000) complexity += 3;

      // Track complexity per IP
      if (!requestComplexity.has(ip)) {
        requestComplexity.set(ip, []);
      }

      const requests = requestComplexity.get(ip);
      
      // Remove old requests outside window
      const recentRequests = requests.filter(req => now - req.timestamp < windowMs);
      
      // Calculate total complexity in window
      const totalComplexity = recentRequests.reduce((sum, req) => sum + req.complexity, 0);
      
      // Limit: 100 complexity points per minute
      if (totalComplexity + complexity > 100) {
        logger.warn('Request complexity limit exceeded', {
          ip,
          complexity,
          totalComplexity,
          url: req.url
        });
        
        return res.status(429).json({
          error: 'Request complexity limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000),
          complexity: {
            current: complexity,
            total: totalComplexity,
            limit: 100
          }
        });
      }

      // Add current request
      recentRequests.push({ timestamp: now, complexity });
      requestComplexity.set(ip, recentRequests);

      // Add complexity header
      res.setHeader('X-Request-Complexity', complexity);
      res.setHeader('X-Complexity-Used', totalComplexity + complexity);
      res.setHeader('X-Complexity-Limit', 100);

      next();
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      requests: {
        total: this.metrics.requestCount,
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        slowRequests: this.metrics.slowRequests,
        errorRequests: this.metrics.errorRequests,
        slowRequestRate: this.metrics.requestCount > 0 ? 
          (this.metrics.slowRequests / this.metrics.requestCount * 100).toFixed(2) + '%' : '0%',
        errorRate: this.metrics.requestCount > 0 ? 
          (this.metrics.errorRequests / this.metrics.requestCount * 100).toFixed(2) + '%' : '0%'
      },
      compression: {
        totalSavings: `${(this.metrics.compressionSavings / 1024 / 1024).toFixed(2)}MB`,
        enabled: true
      },
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      process: {
        uptime: `${Math.floor(process.uptime())}s`,
        cpuUsage: process.cpuUsage(),
        pid: process.pid,
        nodeVersion: process.version
      }
    };
  }

  /**
   * Performance health check
   */
  healthCheck() {
    const metrics = this.getMetrics();
    const memUsagePercent = process.memoryUsage().rss / (1024 * 1024 * 1024);
    
    const health = {
      status: 'healthy',
      metrics,
      checks: {
        memory: memUsagePercent < 1.0 ? 'healthy' : 'warning', // < 1GB
        responseTime: this.metrics.averageResponseTime < 1000 ? 'healthy' : 'warning',
        errorRate: (this.metrics.errorRequests / Math.max(this.metrics.requestCount, 1)) < 0.05 ? 'healthy' : 'warning'
      }
    };

    // Overall health status
    const hasWarnings = Object.values(health.checks).includes('warning');
    health.status = hasWarnings ? 'degraded' : 'healthy';

    return health;
  }
}

module.exports = PerformanceOptimizer;