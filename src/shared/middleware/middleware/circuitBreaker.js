const EventEmitter = require('events');

const { logger } = require('../utils/logger');
/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: 'CLOSED', // Normal operation
  OPEN: 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN: 'HALF_OPEN', // Testing if service has recovered
};

/**
 * Circuit Breaker Implementation
 */
class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.name = options.name || 'unnamed';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringWindow = options.monitoringWindow || 60000; // 1 minute
    this.volumeThreshold = options.volumeThreshold || 10; // Minimum requests before opening

    // State
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.requests = [];

    // Statistics
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      totalRejected: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateChanges: [],
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.stats.totalRejected += 1;
        this.emit('rejected', {
          name: this.name,
          state: this.state,
          nextAttempt: this.nextAttempt,
        });

        if (fallback) {
          return fallback();
        }

        throw new CircuitBreakerError('Circuit breaker is OPEN', this.name, this.state);
      } else {
        // Try half-open
        this.changeState(CircuitState.HALF_OPEN);
      }
    }

    const startTime = Date.now();
    this.stats.totalRequests += 1;

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn, this.timeout);

      // Record success
      this.onSuccess(Date.now() - startTime);

      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error, Date.now() - startTime);

      // Try fallback
      if (fallback) {
        return fallback(error);
      }

      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => {
          const error = new Error('Operation timeout');
          error.code = 'TIMEOUT';
          reject(error);
        }, timeout)
      ),
    ]);
  }

  /**
   * Handle successful execution
   */
  onSuccess(duration) {
    this.failures = 0;
    this.stats.totalSuccesses += 1;
    this.stats.lastSuccessTime = new Date();

    // Record request
    this.recordRequest(true, duration);

    this.emit('success', {
      name: this.name,
      state: this.state,
      duration,
    });

    // Transition from HALF_OPEN to CLOSED
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes += 1;

      if (this.successes >= this.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.successes = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error, duration) {
    this.failures += 1;
    this.stats.totalFailures += 1;
    this.stats.lastFailureTime = new Date();

    if (error.code === 'TIMEOUT') {
      this.stats.totalTimeouts += 1;
    }

    // Record request
    this.recordRequest(false, duration);

    this.emit('failure', {
      name: this.name,
      state: this.state,
      error: error.message,
      failures: this.failures,
    });

    // Check if we should open the circuit
    if (this.state === CircuitState.HALF_OPEN) {
      // Immediately open on failure in half-open state
      this.changeState(CircuitState.OPEN);
      this.successes = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open
      if (this.shouldOpen()) {
        this.changeState(CircuitState.OPEN);
      }
    }
  }

  /**
   * Check if circuit should open
   */
  shouldOpen() {
    // Need minimum volume of requests
    const recentRequests = this.getRecentRequests();
    if (recentRequests.length < this.volumeThreshold) {
      return false;
    }

    // Calculate failure rate
    const failures = recentRequests.filter((r) => !r.success).length;
    const failureRate = failures / recentRequests.length;

    // Open if failure rate exceeds threshold
    return failureRate >= this.failureThreshold / 100;
  }

  /**
   * Change circuit state
   */
  changeState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.failures = 0;

    // Record state change
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
    });

    // Set next attempt time for OPEN state
    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.resetTimeout;
    }

    this.emit('stateChange', {
      name: this.name,
      from: oldState,
      to: newState,
      nextAttempt: this.nextAttempt,
    });

    logger.warn('Circuit breaker state changed', {
      circuitBreaker: this.name,
      from: oldState,
      to: newState,
      nextAttempt: newState === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null,
    });
  }

  /**
   * Record request
   */
  recordRequest(success, duration) {
    const now = Date.now();
    this.requests.push({
      timestamp: now,
      success,
      duration,
    });

    // Cleanup old requests
    const cutoff = now - this.monitoringWindow;
    this.requests = this.requests.filter((r) => r.timestamp > cutoff);
  }

  /**
   * Get recent requests
   */
  getRecentRequests() {
    const now = Date.now();
    const cutoff = now - this.monitoringWindow;
    return this.requests.filter((r) => r.timestamp > cutoff);
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    const recentRequests = this.getRecentRequests();
    const recentFailures = recentRequests.filter((r) => !r.success).length;
    const failureRate =
      recentRequests.length > 0 ? (recentFailures / recentRequests.length) * 100 : 0;

    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt) : null,
      recentRequests: recentRequests.length,
      recentFailures,
      failureRate: parseFloat(failureRate.toFixed(2)),
      stats: {
        ...this.stats,
        stateChanges: this.stats.stateChanges.slice(-10), // Last 10 changes
      },
    };
  }

  /**
   * Force open the circuit
   */
  forceOpen() {
    this.changeState(CircuitState.OPEN);
  }

  /**
   * Force close the circuit
   */
  forceClose() {
    this.changeState(CircuitState.CLOSED);
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.requests = [];
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      totalRejected: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateChanges: [],
    };
  }
}

/**
 * Circuit Breaker Error
 */
class CircuitBreakerError extends Error {
  constructor(message, circuitName, state) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.circuitName = circuitName;
    this.state = state;
    this.code = 'CIRCUIT_OPEN';
  }
}

/**
 * Circuit Breaker Manager
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ ...options, name });
      this.breakers.set(name, breaker);

      // Log state changes
      breaker.on('stateChange', (event) => {
        logger.warn('Circuit breaker state change', event);
      });

      breaker.on('rejected', (event) => {
        logger.warn('Request rejected by circuit breaker', event);
      });
    }

    return this.breakers.get(name);
  }

  /**
   * Execute with circuit breaker
   */
  async execute(name, fn, options = {}) {
    const breaker = this.getBreaker(name, options);
    return breaker.execute(fn, options.fallback);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Get specific circuit breaker status
   */
  getStatus(name) {
    const breaker = this.breakers.get(name);
    return breaker ? breaker.getStatus() : null;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Reset specific circuit breaker
   */
  reset(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Create circuit breaker decorator
 */
function CircuitProtected(options = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const circuitName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args) {
      const breaker = circuitBreakerManager.getBreaker(circuitName, options);
      return breaker.execute(() => originalMethod.apply(this, args), options.fallback);
    };

    return descriptor;
  };
}

/**
 * Predefined circuit breakers for common operations
 */
const CircuitBreakers = {
  /**
   * Database operations
   */
  database: {
    failureThreshold: 50, // 50% failure rate
    successThreshold: 3,
    timeout: 5000,
    resetTimeout: 30000,
    volumeThreshold: 10,
  },

  /**
   * External API calls
   */
  externalAPI: {
    failureThreshold: 50,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 60000,
    volumeThreshold: 5,
  },

  /**
   * Email service
   */
  email: {
    failureThreshold: 60,
    successThreshold: 3,
    timeout: 15000,
    resetTimeout: 120000,
    volumeThreshold: 5,
  },

  /**
   * Payment gateway
   */
  payment: {
    failureThreshold: 30,
    successThreshold: 5,
    timeout: 30000,
    resetTimeout: 300000,
    volumeThreshold: 3,
  },

  /**
   * File storage
   */
  fileStorage: {
    failureThreshold: 50,
    successThreshold: 2,
    timeout: 20000,
    resetTimeout: 60000,
    volumeThreshold: 5,
  },

  /**
   * Search service
   */
  search: {
    failureThreshold: 60,
    successThreshold: 2,
    timeout: 5000,
    resetTimeout: 30000,
    volumeThreshold: 10,
  },
};

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerManager,
  circuitBreakerManager,
  CircuitProtected,
  CircuitState,
  CircuitBreakers,
};
