/**
 * Enhanced Health Check System
 * Comprehensive health monitoring for production deployment
 */

const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const { promisify } = require('util');

class HealthCheckSystem {
  constructor(config, monitoring) {
    this.config = config;
    this.monitoring = monitoring;
    this.router = express.Router();
    this.redisClient = null;
    
    this.setupRoutes();
    this.registerHealthChecks();
  }

  /**
   * Set up health check routes
   */
  setupRoutes() {
    // Basic health check
    this.router.get('/health', async (req, res) => {
      try {
        const health = await this.monitoring.runHealthChecks();
        const statusCode = health.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Detailed health check
    this.router.get('/health/detailed', async (req, res) => {
      try {
        const health = await this.monitoring.runHealthChecks();
        const metrics = this.monitoring.getMetrics();
        
        const detailedHealth = {
          ...health,
          metrics,
          environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            environment: this.config.env,
          },
        };

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(detailedHealth);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Database-specific health check
    this.router.get('/health/db', async (req, res) => {
      try {
        const dbHealth = await this.checkDatabaseHealth();
        const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json(dbHealth);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Cache health check
    this.router.get('/health/cache', async (req, res) => {
      try {
        const cacheHealth = await this.checkCacheHealth();
        const statusCode = cacheHealth.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json(cacheHealth);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Metrics endpoint
    this.router.get('/metrics', (req, res) => {
      try {
        const metrics = this.monitoring.getMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Readiness probe (Kubernetes)
    this.router.get('/ready', async (req, res) => {
      try {
        const isReady = await this.checkReadiness();
        
        if (isReady) {
          res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(503).json({
            status: 'not-ready',
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'not-ready',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Liveness probe (Kubernetes)
    this.router.get('/live', (req, res) => {
      res.status(200).json({
        status: 'alive',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Register health checks with monitoring system
   */
  registerHealthChecks() {
    // Database health check
    this.monitoring.registerHealthCheck('database', async () => {
      return await this.checkDatabaseHealth();
    });

    // Cache health check
    this.monitoring.registerHealthCheck('cache', async () => {
      return await this.checkCacheHealth();
    });

    // External services health check
    this.monitoring.registerHealthCheck('external-services', async () => {
      return await this.checkExternalServices();
    });

    // System resources health check
    this.monitoring.registerHealthCheck('system', () => {
      return this.checkSystemHealth();
    });

    // API health check
    this.monitoring.registerHealthCheck('api', () => {
      return this.checkApiHealth();
    });
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          reason: 'MongoDB not connected',
          readyState: mongoose.connection.readyState,
        };
      }

      // Test database operation
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - start;

      // Get database stats
      const stats = await mongoose.connection.db.stats();
      
      return {
        status: 'healthy',
        connection: 'active',
        readyState: mongoose.connection.readyState,
        pingTime,
        database: mongoose.connection.db.databaseName,
        collections: stats.collections,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check cache health (Redis)
   */
  async checkCacheHealth() {
    if (!this.config.cache.enabled || !this.config.cache.redisUrl) {
      return {
        status: 'disabled',
        reason: 'Cache not configured',
      };
    }

    try {
      if (!this.redisClient) {
        this.redisClient = redis.createClient({
          url: this.config.cache.redisUrl,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true,
          },
        });
      }

      // Test Redis connection
      const start = Date.now();
      await this.redisClient.ping();
      const pingTime = Date.now() - start;

      // Get Redis info
      const info = await this.redisClient.info();
      const memory = await this.redisClient.info('memory');

      return {
        status: 'healthy',
        pingTime,
        connected: true,
        version: info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown',
        memory: memory.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  /**
   * Check external services health
   */
  async checkExternalServices() {
    const services = {};
    let allHealthy = true;

    // Check Twilio
    if (this.config.services.twilio.accountSid && 
        !this.config.services.twilio.accountSid.includes('placeholder')) {
      try {
        // Simple API key validation (not actual API call)
        services.twilio = {
          status: 'configured',
          configured: true,
        };
      } catch (error) {
        services.twilio = {
          status: 'error',
          error: error.message,
        };
        allHealthy = false;
      }
    } else {
      services.twilio = {
        status: 'not-configured',
        configured: false,
      };
    }

    // Check SendGrid
    if (this.config.services.sendgrid.apiKey && 
        !this.config.services.sendgrid.apiKey.includes('placeholder')) {
      services.sendgrid = {
        status: 'configured',
        configured: true,
      };
    } else {
      services.sendgrid = {
        status: 'not-configured',
        configured: false,
      };
    }

    // Check Stripe
    if (this.config.services.stripe.secretKey && 
        !this.config.services.stripe.secretKey.includes('placeholder')) {
      services.stripe = {
        status: 'configured',
        configured: true,
        environment: this.config.services.stripe.secretKey.includes('test') ? 'test' : 'live',
      };
    } else {
      services.stripe = {
        status: 'not-configured',
        configured: false,
      };
    }

    return {
      status: allHealthy ? 'healthy' : 'partial',
      services,
    };
  }

  /**
   * Check system health
   */
  checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // Check memory usage
    const memoryUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
    const isMemoryHealthy = memoryUsageRatio < 0.85; // 85% threshold

    // Check uptime
    const isUptimeHealthy = uptime > 10; // At least 10 seconds uptime

    const overallHealthy = isMemoryHealthy && isUptimeHealthy;

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      uptime,
      memory: {
        usage: memoryUsageRatio,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        healthy: isMemoryHealthy,
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  /**
   * Check API health
   */
  checkApiHealth() {
    const metrics = this.monitoring.getMetrics();
    
    // Check error rate
    const errorRate = metrics.requests.errorRate || 0;
    const isErrorRateHealthy = errorRate < 0.05; // 5% threshold

    // Check if receiving requests
    const isReceivingRequests = metrics.requests.total > 0;

    return {
      status: isErrorRateHealthy ? 'healthy' : 'unhealthy',
      requests: {
        total: metrics.requests.total,
        errors: metrics.requests.errors,
        errorRate: errorRate,
        healthy: isErrorRateHealthy,
      },
      receivingRequests: isReceivingRequests,
    };
  }

  /**
   * Check overall readiness for serving traffic
   */
  async checkReadiness() {
    try {
      // Must have healthy database connection
      const dbHealth = await this.checkDatabaseHealth();
      if (dbHealth.status !== 'healthy') {
        return false;
      }

      // System must be healthy
      const systemHealth = this.checkSystemHealth();
      if (systemHealth.status !== 'healthy') {
        return false;
      }

      // Must be running for at least 30 seconds
      if (process.uptime() < 30) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get router for Express app
   */
  getRouter() {
    return this.router;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error) {
        console.warn('Error closing Redis client:', error.message);
      }
    }
  }
}

module.exports = HealthCheckSystem;