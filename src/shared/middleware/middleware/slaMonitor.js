
const { logPerformance, logger } = require('../utils/logger');
/**
 * SLA Monitoring Middleware
 *
 * Tracks request/response times, success rates, and SLA compliance
 */

/**
 * SLA Metrics Storage
 * In production, use Redis or a time-series database
 */
class SLAMetrics {
  constructor() {
    this.metrics = new Map();
    this.windows = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
  }

  /**
   * Record a request metric
   */
  record(endpoint, duration, statusCode, success) {
    const now = Date.now();
    const key = this.normalizeEndpoint(endpoint);

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        requests: [],
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        statusCodes: new Map(),
      });
    }

    const metric = this.metrics.get(key);

    // Record request
    metric.requests.push({
      timestamp: now,
      duration,
      statusCode,
      success,
    });

    // Update aggregates
    metric.totalRequests += 1;
    if (success) {
      metric.successfulRequests += 1;
    } else {
      metric.failedRequests += 1;
    }

    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);

    // Track status codes
    const count = metric.statusCodes.get(statusCode) || 0;
    metric.statusCodes.set(statusCode, count + 1);

    // Cleanup old requests (keep last 24h)
    const cutoff = now - this.windows['24h'];
    metric.requests = metric.requests.filter((r) => r.timestamp > cutoff);
  }

  /**
   * Get metrics for an endpoint
   */
  getMetrics(endpoint, window = '15m') {
    const key = this.normalizeEndpoint(endpoint);
    const metric = this.metrics.get(key);

    if (!metric) {
      return null;
    }

    const now = Date.now();
    const windowMs = this.windows[window] || this.windows['15m'];
    const cutoff = now - windowMs;

    // Filter requests in window
    const windowRequests = metric.requests.filter((r) => r.timestamp > cutoff);

    if (windowRequests.length === 0) {
      return {
        endpoint: key,
        window,
        requests: 0,
        successRate: 100,
        avgDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }

    // Calculate metrics
    const successfulRequests = windowRequests.filter((r) => r.success).length;
    const successRate = (successfulRequests / windowRequests.length) * 100;

    const durations = windowRequests.map((r) => r.duration).sort((a, b) => a - b);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    return {
      endpoint: key,
      window,
      requests: windowRequests.length,
      successRate: parseFloat(successRate.toFixed(2)),
      avgDuration: parseFloat(avgDuration.toFixed(2)),
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      statusCodes: this.getStatusCodeDistribution(windowRequests),
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(window = '15m') {
    const results = [];
    for (const endpoint of this.metrics.keys()) {
      const metrics = this.getMetrics(endpoint, window);
      if (metrics && metrics.requests > 0) {
        results.push(metrics);
      }
    }
    return results.sort((a, b) => b.requests - a.requests);
  }

  /**
   * Check if endpoint is meeting SLA
   */
  checkSLA(endpoint, slaConfig) {
    const metrics = this.getMetrics(endpoint, slaConfig.window || '15m');

    if (!metrics) {
      return {
        compliant: true,
        violations: [],
      };
    }

    const violations = [];

    // Check success rate
    if (slaConfig.minSuccessRate && metrics.successRate < slaConfig.minSuccessRate) {
      violations.push({
        type: 'success_rate',
        expected: slaConfig.minSuccessRate,
        actual: metrics.successRate,
        message: `Success rate ${metrics.successRate}% is below minimum ${slaConfig.minSuccessRate}%`,
      });
    }

    // Check average duration
    if (slaConfig.maxAvgDuration && metrics.avgDuration > slaConfig.maxAvgDuration) {
      violations.push({
        type: 'avg_duration',
        expected: slaConfig.maxAvgDuration,
        actual: metrics.avgDuration,
        message: `Average duration ${metrics.avgDuration}ms exceeds maximum ${slaConfig.maxAvgDuration}ms`,
      });
    }

    // Check p95 duration
    if (slaConfig.maxP95Duration && metrics.p95 > slaConfig.maxP95Duration) {
      violations.push({
        type: 'p95_duration',
        expected: slaConfig.maxP95Duration,
        actual: metrics.p95,
        message: `P95 duration ${metrics.p95}ms exceeds maximum ${slaConfig.maxP95Duration}ms`,
      });
    }

    // Check p99 duration
    if (slaConfig.maxP99Duration && metrics.p99 > slaConfig.maxP99Duration) {
      violations.push({
        type: 'p99_duration',
        expected: slaConfig.maxP99Duration,
        actual: metrics.p99,
        message: `P99 duration ${metrics.p99}ms exceeds maximum ${slaConfig.maxP99Duration}ms`,
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
      metrics,
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get status code distribution
   */
  getStatusCodeDistribution(requests) {
    const distribution = {};
    for (const req of requests) {
      distribution[req.statusCode] = (distribution[req.statusCode] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Normalize endpoint for grouping
   */
  normalizeEndpoint(endpoint) {
    // Remove query parameters
    const url = endpoint.split('?')[0];

    // Replace IDs with placeholders
    return url
      .replace(/\/[0-9a-f]{24}\b/gi, '/:id') // MongoDB ObjectId
      .replace(/\/[0-9]+\b/g, '/:id') // Numeric IDs
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '/:uuid'); // UUIDs
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }
}

// Singleton instance
const slaMetrics = new SLAMetrics();

/**
 * SLA Monitoring Middleware
 */
function slaMonitor(options = {}) {
  const {
    trackAll = true,
    logSlowRequests = true,
    slowRequestThreshold = 1000, // 1 second
    logViolations = true,
  } = options;

  return (req, res, next) => {
    const startTime = Date.now();

    // Capture original end function
    const originalEnd = res.end;

    // Override end to capture metrics
    res.end = function (...args) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      const endpoint = req.originalUrl || req.url;

      // Record metrics
      if (trackAll) {
        slaMetrics.record(endpoint, duration, res.statusCode, success);
      }

      // Log slow requests
      if (logSlowRequests && duration > slowRequestThreshold) {
        logger.warn('Slow request detected', {
          method: req.method,
          endpoint,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          userId: req.user?.userId,
        });
      }

      // Log performance
      logPerformance(`${req.method} ${endpoint}`, duration, {
        statusCode: res.statusCode,
        success,
      });

      // Call original end
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Check SLA compliance for specific endpoints
 */
function checkEndpointSLA(endpoint, slaConfig) {
  return slaMetrics.checkSLA(endpoint, slaConfig);
}

/**
 * Get metrics for endpoint
 */
function getEndpointMetrics(endpoint, window = '15m') {
  return slaMetrics.getMetrics(endpoint, window);
}

/**
 * Get all metrics
 */
function getAllMetrics(window = '15m') {
  return slaMetrics.getAllMetrics(window);
}

/**
 * Clear all metrics
 */
function clearMetrics() {
  slaMetrics.clear();
}

/**
 * SLA Alert Checker
 * Run periodically to check SLA compliance
 */
async function checkSLACompliance(slaConfigs) {
  const alerts = [];

  for (const config of slaConfigs) {
    const result = slaMetrics.checkSLA(config.endpoint, config);

    if (!result.compliant) {
      alerts.push({
        endpoint: config.endpoint,
        severity: config.severity || 'warning',
        violations: result.violations,
        metrics: result.metrics,
        timestamp: new Date().toISOString(),
      });

      // Log violation
      logger.error('SLA violation detected', {
        endpoint: config.endpoint,
        violations: result.violations,
        metrics: result.metrics,
      });

      // Trigger alert (implement based on your alerting system)
      if (config.alertCallback) {
        await config.alertCallback(result);
      }
    }
  }

  return alerts;
}

/**
 * Example SLA configurations
 */
const defaultSLAConfigs = [
  {
    endpoint: '/api/auth/login',
    minSuccessRate: 95,
    maxAvgDuration: 500,
    maxP95Duration: 1000,
    maxP99Duration: 2000,
    window: '15m',
    severity: 'critical',
  },
  {
    endpoint: '/api/users/:id',
    minSuccessRate: 99,
    maxAvgDuration: 200,
    maxP95Duration: 500,
    maxP99Duration: 1000,
    window: '15m',
    severity: 'warning',
  },
  {
    endpoint: '/api/appointments',
    minSuccessRate: 98,
    maxAvgDuration: 300,
    maxP95Duration: 800,
    maxP99Duration: 1500,
    window: '15m',
    severity: 'warning',
  },
];

module.exports = {
  slaMonitor,
  checkEndpointSLA,
  getEndpointMetrics,
  getAllMetrics,
  clearMetrics,
  checkSLACompliance,
  defaultSLAConfigs,
  SLAMetrics,
};
