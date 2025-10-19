
const { logger } = require('../utils/logger');
const { ExternalServiceError } = require('../utils/errors');
/**
 * Timeout Handler Middleware
 *
 * Provides request timeout handling and management
 */

/**
 * Request Timeout Middleware
 */
function requestTimeout(options = {}) {
  const {
    timeout = 30000, // 30 seconds default
    message = 'Request timeout',
    onTimeout = null,
  } = options;

  return (req, res, next) => {
    // Set timeout
    req.setTimeout(timeout);

    // Track if request has timed out
    let timedOut = false;

    // Timeout handler
    const timeoutHandler = () => {
      timedOut = true;

      logger.error('Request timeout', {
        method: req.method,
        url: req.originalUrl,
        timeout: `${timeout}ms`,
        userId: req.user?.userId,
        ip: req.ip,
      });

      // Call custom timeout handler
      if (onTimeout) {
        onTimeout(req, res);
      }

      // Send timeout response
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message,
            timeout: `${timeout}ms`,
            timestamp: new Date().toISOString(),
          },
        });
      }
    };

    // Set timeout
    req.on('timeout', timeoutHandler);

    // Override res.end to clear timeout
    const originalEnd = res.end;
    res.end = function (...args) {
      if (!timedOut) {
        req.setTimeout(0); // Clear timeout
      }
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Route-specific timeout
 */
function routeTimeout(timeout, message) {
  return requestTimeout({ timeout, message });
}

/**
 * Operation timeout wrapper
 */
async function withTimeout(operation, timeout, errorMessage = 'Operation timeout') {
  return Promise.race([
    operation(),
    new Promise((_, reject) =>
      setTimeout(() => {
        const error = new Error(errorMessage);
        error.code = 'TIMEOUT';
        reject(error);
      }, timeout)
    ),
  ]);
}

/**
 * Multiple operations with individual timeouts
 */
async function withTimeouts(operations) {
  const promises = operations.map(({ operation, timeout, name }) => {
    return withTimeout(operation, timeout, `${name || 'Operation'} timeout`)
      .then((result) => ({ success: true, result, name }))
      .catch((error) => ({ success: false, error, name }));
  });

  const results = await Promise.all(promises);

  return {
    results,
    successful: results.filter((r) => r.success),
    failed: results.filter((r) => !r.success),
    allSucceeded: results.every((r) => r.success),
  };
}

/**
 * Timeout with fallback
 */
async function withTimeoutAndFallback(operation, timeout, fallback, context = {}) {
  try {
    return await withTimeout(operation, timeout);
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      logger.warn('Operation timeout, using fallback', {
        timeout: `${timeout}ms`,
        ...context,
      });
      return fallback();
    }
    throw error;
  }
}

/**
 * Adaptive timeout
 * Adjusts timeout based on historical performance
 */
class AdaptiveTimeout {
  constructor(options = {}) {
    this.baseTimeout = options.baseTimeout || 5000;
    this.minTimeout = options.minTimeout || 1000;
    this.maxTimeout = options.maxTimeout || 30000;
    this.percentile = options.percentile || 95; // P95
    this.windowSize = options.windowSize || 100;
    this.adjustmentFactor = options.adjustmentFactor || 1.5;

    this.durations = [];
  }

  /**
   * Record operation duration
   */
  record(duration) {
    this.durations.push(duration);

    // Keep only recent durations
    if (this.durations.length > this.windowSize) {
      this.durations.shift();
    }
  }

  /**
   * Get current timeout
   */
  getTimeout() {
    if (this.durations.length < 10) {
      return this.baseTimeout;
    }

    // Calculate percentile
    const sorted = [...this.durations].sort((a, b) => a - b);
    const index = Math.ceil((this.percentile / 100) * sorted.length) - 1;
    const percentileValue = sorted[index];

    // Apply adjustment factor
    let timeout = percentileValue * this.adjustmentFactor;

    // Clamp to min/max
    timeout = Math.max(this.minTimeout, Math.min(this.maxTimeout, timeout));

    return Math.round(timeout);
  }

  /**
   * Execute with adaptive timeout
   */
  async execute(operation) {
    const timeout = this.getTimeout();
    const startTime = Date.now();

    try {
      const result = await withTimeout(operation, timeout);
      const duration = Date.now() - startTime;
      this.record(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.record(duration);
      throw error;
    }
  }
}

/**
 * Timeout strategies for different operations
 */
const TimeoutStrategies = {
  /**
   * Database operations
   */
  database: {
    timeout: 5000,
    message: 'Database operation timeout',
  },

  /**
   * External API calls
   */
  externalAPI: {
    timeout: 10000,
    message: 'External API timeout',
  },

  /**
   * File uploads
   */
  fileUpload: {
    timeout: 60000,
    message: 'File upload timeout',
  },

  /**
   * Search operations
   */
  search: {
    timeout: 3000,
    message: 'Search operation timeout',
  },

  /**
   * Report generation
   */
  reportGeneration: {
    timeout: 30000,
    message: 'Report generation timeout',
  },

  /**
   * Email sending
   */
  email: {
    timeout: 15000,
    message: 'Email sending timeout',
  },

  /**
   * Payment processing
   */
  payment: {
    timeout: 30000,
    message: 'Payment processing timeout',
  },
};

/**
 * Create timeout decorator
 */
function Timeout(timeout, errorMessage) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      return withTimeout(
        () => originalMethod.apply(this, args),
        timeout,
        errorMessage || `${propertyKey} timeout`
      );
    };

    return descriptor;
  };
}

/**
 * Request tracking for timeout monitoring
 */
class RequestTracker {
  constructor() {
    this.activeRequests = new Map();
  }

  /**
   * Start tracking a request
   */
  start(requestId, metadata = {}) {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      metadata,
    });
  }

  /**
   * Stop tracking a request
   */
  stop(requestId) {
    const request = this.activeRequests.get(requestId);
    if (request) {
      const duration = Date.now() - request.startTime;
      this.activeRequests.delete(requestId);
      return duration;
    }
    return null;
  }

  /**
   * Get active requests
   */
  getActiveRequests() {
    const now = Date.now();
    const requests = [];

    for (const [id, request] of this.activeRequests) {
      requests.push({
        id,
        duration: now - request.startTime,
        ...request.metadata,
      });
    }

    return requests.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Get long-running requests
   */
  getLongRunningRequests(threshold = 5000) {
    const active = this.getActiveRequests();
    return active.filter((r) => r.duration > threshold);
  }

  /**
   * Clear completed requests
   */
  clear() {
    this.activeRequests.clear();
  }
}

// Global request tracker
const requestTracker = new RequestTracker();

/**
 * Request tracking middleware
 */
function trackRequest(req, res, next) {
  const requestId = req.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  // Start tracking
  requestTracker.start(requestId, {
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.userId,
    ip: req.ip,
  });

  // Stop tracking on response
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = requestTracker.stop(requestId);
    if (duration) {
      req.duration = duration;
    }
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Timeout monitoring middleware
 * Logs requests that exceed threshold
 */
function timeoutMonitor(threshold = 5000) {
  return (req, res, next) => {
    const startTime = Date.now();

    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode,
          userId: req.user?.userId,
        });
      }

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Get timeout statistics
 */
function getTimeoutStats() {
  const active = requestTracker.getActiveRequests();
  const longRunning = requestTracker.getLongRunningRequests();

  return {
    activeRequests: active.length,
    longRunningRequests: longRunning.length,
    requests: active,
    longRunning,
  };
}

module.exports = {
  requestTimeout,
  routeTimeout,
  withTimeout,
  withTimeouts,
  withTimeoutAndFallback,
  AdaptiveTimeout,
  TimeoutStrategies,
  Timeout,
  RequestTracker,
  requestTracker,
  trackRequest,
  timeoutMonitor,
  getTimeoutStats,
};
