/**
 * Production Monitoring & Observability System
 * Comprehensive monitoring, logging, and error tracking for ExpoJane
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const winston = require('winston');
const path = require('path');
const os = require('os');

class ProductionMonitoring {
  constructor(config) {
    this.config = config;
    this.logger = null;
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      dbQueries: 0,
      slowQueries: 0,
    };
    
    this.healthChecks = new Map();
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.85, // 85% memory usage
      cpuUsage: 0.90, // 90% CPU usage
    };

    this.initializeLogger();
    this.initializeSentry();
    this.startMetricsCollection();
  }

  /**
   * Initialize Winston logger with production configuration
   */
  initializeLogger() {
    const logDir = path.join(__dirname, '../logs');
    const { createLogger, format, transports } = winston;

    // Ensure logs directory exists
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logger = createLogger({
      level: this.config.logging.level,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            environment: this.config.env,
            service: 'expojane-api',
            version: require('../package.json').version,
          });
        })
      ),
      defaultMeta: {
        service: 'expojane-api',
        environment: this.config.env,
      },
      transports: [
        // Console logging
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple()
          ),
        }),

        // File logging - All logs
        new transports.File({
          filename: path.join(logDir, 'app.log'),
          maxsize: 20 * 1024 * 1024, // 20MB
          maxFiles: 5,
          tailable: true,
        }),

        // File logging - Error logs only
        new transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 20 * 1024 * 1024, // 20MB
          maxFiles: 5,
          tailable: true,
        }),

        // File logging - Performance logs
        new transports.File({
          filename: path.join(logDir, 'performance.log'),
          level: 'info',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3,
          tailable: true,
          format: format.combine(
            format.timestamp(),
            format.json(),
            format.printf((info) => {
              // Only log performance-related entries
              if (info.type === 'performance' || info.responseTime || info.dbQueryTime) {
                return JSON.stringify(info);
              }
              return '';
            })
          ),
        }),
      ],

      // Handle logging errors
      exceptionHandlers: [
        new transports.File({
          filename: path.join(logDir, 'exceptions.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 2,
        }),
      ],

      rejectionHandlers: [
        new transports.File({
          filename: path.join(logDir, 'rejections.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 2,
        }),
      ],
    });

    // Add Sentry transport for error logs in production
    if (this.config.isProduction && this.config.monitoring.sentryDsn) {
      const SentryTransport = require('winston-sentry-log');
      this.logger.add(
        new SentryTransport({
          level: 'error',
          dsn: this.config.monitoring.sentryDsn,
        })
      );
    }

    this.logger.info('📊 Production monitoring logger initialized');
  }

  /**
   * Initialize Sentry with enhanced configuration
   */
  initializeSentry() {
    if (!this.config.monitoring.sentryDsn) {
      this.logger.warn('⚠️  Sentry DSN not configured - error tracking disabled');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.monitoring.sentryDsn,
        environment: this.config.env,
        release: `expojane-api@${require('../package.json').version}`,

        // Performance monitoring
        tracesSampleRate: this.config.isProduction ? 0.1 : 1.0,
        
        // Profiling
        profilesSampleRate: this.config.isProduction ? 0.05 : 0.5,
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: true }),
          new Sentry.Integrations.Mongo({ useMongoose: true }),
        ],

        // Enhanced error filtering
        beforeSend: (event, hint) => {
          // Don't send certain errors
          const error = hint.originalException;
          
          if (error) {
            // Skip 4xx errors (client errors)
            if (error.status && error.status < 500) {
              return null;
            }

            // Skip validation errors
            if (error.name === 'ValidationError' || 
                error.name === 'CastError' ||
                error.name === 'MongooseError') {
              return null;
            }

            // Skip rate limit errors
            if (error.message && error.message.includes('Too many requests')) {
              return null;
            }
          }

          // Add additional context
          if (event.extra) {
            event.extra.systemInfo = {
              nodeVersion: process.version,
              platform: os.platform(),
              arch: os.arch(),
              uptime: process.uptime(),
              memoryUsage: process.memoryUsage(),
            };
          }

          return event;
        },

        // Set user context
        initialScope: {
          tags: {
            service: 'expojane-api',
            version: require('../package.json').version,
          },
        },
      });

      this.logger.info('✅ Sentry error monitoring initialized');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Sentry:', error);
    }
  }

  /**
   * Get Express middleware for monitoring
   */
  getMiddleware() {
    return {
      // Request logging middleware
      requestLogger: (req, res, next) => {
        const start = Date.now();
        
        // Log request
        this.logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          type: 'request',
        });

        // Increment request counter
        this.metrics.requestCount++;

        // Store timing data for performance middleware to use
        req.monitoringStart = start;
        req.monitoring = this;

        // Let performance middleware handle response tracking to avoid conflicts

        next();
      },

      // Sentry request handler
      sentryRequest: () => {
        return this.config.monitoring.sentryDsn ? 
          Sentry.Handlers.requestHandler() : 
          (req, res, next) => next();
      },

      // Sentry tracing handler
      sentryTracing: () => {
        return this.config.monitoring.sentryDsn ? 
          Sentry.Handlers.tracingHandler() : 
          (req, res, next) => next();
      },

      // Error handling middleware
      errorHandler: () => {
        return (error, req, res, next) => {
          // Log error
          this.logger.error('Unhandled Error', {
            error: error.message,
            stack: error.stack,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });

          // Send to Sentry
          if (this.config.monitoring.sentryDsn) {
            Sentry.captureException(error, {
              extra: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
              },
            });
          }

          // Send response
          res.status(error.status || 500).json({
            error: this.config.isProduction ? 'Internal Server Error' : error.message,
            requestId: req.id,
          });
        };
      },
    };
  }

  /**
   * Register health check
   */
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
    this.logger.info(`Health check registered: ${name}`);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [name, checkFn] of this.healthChecks) {
      try {
        const start = Date.now();
        const result = await checkFn();
        const duration = Date.now() - start;

        results[name] = {
          status: result ? 'healthy' : 'unhealthy',
          duration,
          timestamp: new Date().toISOString(),
          details: result,
        };

        if (!result) {
          overallStatus = 'unhealthy';
        }

      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: require('../package.json').version,
      checks: results,
    };
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      startTime: this.metrics.startTime,
      
      // Request metrics
      requests: {
        total: this.metrics.requestCount,
        errors: this.metrics.errorCount,
        errorRate: this.metrics.requestCount > 0 ? 
          (this.metrics.errorCount / this.metrics.requestCount) : 0,
      },

      // Database metrics
      database: {
        queries: this.metrics.dbQueries,
        slowQueries: this.metrics.slowQueries,
      },

      // System metrics
      system: {
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          usage: memUsage.heapUsed / memUsage.heapTotal,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        os: {
          platform: os.platform(),
          arch: os.arch(),
          cpuCount: os.cpus().length,
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          loadAverage: os.loadavg(),
        },
      },
    };
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect metrics every 60 seconds
    setInterval(() => {
      const metrics = this.getMetrics();
      
      // Log performance metrics
      this.logger.info('System Metrics', {
        type: 'performance',
        ...metrics,
      });

      // Check for alerts
      this.checkAlerts(metrics);
      
    }, 60000); // 60 seconds

    this.logger.info('📊 Metrics collection started');
  }

  /**
   * Check for alert conditions
   */
  checkAlerts(metrics) {
    // Memory usage alert
    if (metrics.system.memory.usage > this.alertThresholds.memoryUsage) {
      this.logger.warn('High Memory Usage Alert', {
        usage: metrics.system.memory.usage,
        threshold: this.alertThresholds.memoryUsage,
        type: 'alert',
      });

      if (this.config.monitoring.sentryDsn) {
        Sentry.captureMessage('High Memory Usage', 'warning', {
          extra: { metrics: metrics.system.memory },
        });
      }
    }

    // Error rate alert
    if (metrics.requests.errorRate > this.alertThresholds.errorRate) {
      this.logger.warn('High Error Rate Alert', {
        errorRate: metrics.requests.errorRate,
        threshold: this.alertThresholds.errorRate,
        type: 'alert',
      });

      if (this.config.monitoring.sentryDsn) {
        Sentry.captureMessage('High Error Rate', 'warning', {
          extra: { metrics: metrics.requests },
        });
      }
    }
  }

  /**
   * Track database query performance
   */
  trackDbQuery(operation, duration) {
    this.metrics.dbQueries++;
    
    if (duration > 1000) { // Slow query threshold: 1 second
      this.metrics.slowQueries++;
      
      this.logger.warn('Slow Database Query', {
        operation,
        duration,
        type: 'performance',
      });
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    this.logger.info('🔄 Shutting down monitoring system...');
    
    // Close Sentry
    if (this.config.monitoring.sentryDsn) {
      Sentry.close(2000);
    }
    
    // Close logger
    this.logger.end();
    
    console.log('✅ Monitoring system shutdown complete');
  }
}

module.exports = ProductionMonitoring;