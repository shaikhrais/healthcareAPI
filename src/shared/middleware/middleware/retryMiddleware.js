
const { logger } = require('../utils/logger');
/**
 * Retry Middleware
 *
 * Provides automatic retry logic with exponential backoff for failed requests
 */

/**
 * Retry Configuration
 */
class RetryConfig {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableStatusCodes = options.retryableStatusCodes || [408, 429, 500, 502, 503, 504];
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
    ];
    this.jitter = options.jitter !== undefined ? options.jitter : true;
  }

  /**
   * Calculate delay for retry attempt
   */
  getDelay(attempt) {
    let delay = this.initialDelay * this.backoffMultiplier ** (attempt - 1);
    delay = Math.min(delay, this.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.jitter) {
      delay *= 0.5 + Math.random() * 0.5;
    }

    return Math.floor(delay);
  }

  /**
   * Check if status code is retryable
   */
  isRetryableStatusCode(statusCode) {
    return this.retryableStatusCodes.includes(statusCode);
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;

    // Check error code
    if (error.code && this.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check if it's a network error
    if (error.message) {
      const networkErrors = ['network', 'timeout', 'connection', 'socket'];
      return networkErrors.some((term) => error.message.toLowerCase().includes(term));
    }

    return false;
  }

  /**
   * Check if response should be retried
   */
  shouldRetry(error, response, attempt) {
    if (attempt >= this.maxRetries) {
      return false;
    }

    // Check status code
    if (response && response.statusCode) {
      return this.isRetryableStatusCode(response.statusCode);
    }

    // Check error
    if (error) {
      return this.isRetryableError(error);
    }

    return false;
  }
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, config = new RetryConfig(), context = {}) {
  let lastError;
  let lastResponse;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt += 1) {
    try {
      const result = await fn(attempt);

      // Check if result indicates failure (for HTTP responses)
      if (result && result.statusCode && config.isRetryableStatusCode(result.statusCode)) {
        lastResponse = result;

        if (attempt <= config.maxRetries) {
          const delay = config.getDelay(attempt);
          logger.warn('Retrying request due to status code', {
            attempt,
            maxRetries: config.maxRetries,
            statusCode: result.statusCode,
            delay: `${delay}ms`,
            ...context,
          });

          await sleep(delay);
          continue;
        }
      }

      // Success
      if (attempt > 1) {
        logger.info('Request succeeded after retry', {
          attempt,
          ...context,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (config.shouldRetry(error, null, attempt)) {
        const delay = config.getDelay(attempt);

        logger.warn('Retrying request due to error', {
          attempt,
          maxRetries: config.maxRetries,
          error: error.message,
          errorCode: error.code,
          delay: `${delay}ms`,
          ...context,
        });

        await sleep(delay);
      } else {
        // Not retryable or max retries reached
        throw error;
      }
    }
  }

  // All retries failed
  const error = lastError || new Error('All retries failed');
  error.lastResponse = lastResponse;
  error.attempts = config.maxRetries + 1;

  logger.error('Request failed after all retries', {
    attempts: config.maxRetries + 1,
    lastError: lastError?.message,
    lastStatusCode: lastResponse?.statusCode,
    ...context,
  });

  throw error;
}

/**
 * Retry middleware for external API calls
 */
function createRetryWrapper(config = {}) {
  const retryConfig = new RetryConfig(config);

  return {
    /**
     * Wrap an async function with retry logic
     */
    wrap: (fn, context = {}) => {
      return async (...args) => {
        return retryWithBackoff((attempt) => fn(...args, { attempt }), retryConfig, context);
      };
    },

    /**
     * Execute with retry
     */
    execute: async (fn, context = {}) => {
      return retryWithBackoff(fn, retryConfig, context);
    },
  };
}

/**
 * Axios retry interceptor
 */
function createAxiosRetryInterceptor(axiosInstance, config = {}) {
  const retryConfig = new RetryConfig(config);

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config: requestConfig } = error;

      // Initialize retry count
      requestConfig.__retryCount = requestConfig.__retryCount || 0;

      // Check if we should retry
      if (!retryConfig.shouldRetry(error, error.response, requestConfig.__retryCount)) {
        return Promise.reject(error);
      }

      // Increment retry count
      requestConfig.__retryCount += 1;

      // Calculate delay
      const delay = retryConfig.getDelay(requestConfig.__retryCount);

      logger.warn('Retrying axios request', {
        url: requestConfig.url,
        method: requestConfig.method,
        attempt: requestConfig.__retryCount,
        maxRetries: retryConfig.maxRetries,
        delay: `${delay}ms`,
        statusCode: error.response?.status,
        error: error.message,
      });

      // Wait before retry
      await sleep(delay);

      // Retry request
      return axiosInstance(requestConfig);
    }
  );
}

/**
 * Fetch retry wrapper
 */
async function retryFetch(url, options = {}, retryConfig = new RetryConfig()) {
  const context = {
    url,
    method: options.method || 'GET',
  };

  return retryWithBackoff(
    async (attempt) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Retry-Attempt': attempt.toString(),
        },
      });

      // Check if status code is retryable
      if (retryConfig.isRetryableStatusCode(response.status)) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.statusCode = response.status;
        error.response = response;
        throw error;
      }

      return response;
    },
    retryConfig,
    context
  );
}

/**
 * Retry specific operations
 */
const RetryStrategies = {
  /**
   * Database operations
   */
  database: new RetryConfig({
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'MongoNetworkError', 'MongoServerError'],
  }),

  /**
   * External API calls
   */
  externalAPI: new RetryConfig({
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  }),

  /**
   * Email sending
   */
  email: new RetryConfig({
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  }),

  /**
   * File uploads
   */
  fileUpload: new RetryConfig({
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 500, 502, 503, 504],
  }),

  /**
   * Payment processing
   */
  payment: new RetryConfig({
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    retryableStatusCodes: [408, 500, 502, 503, 504],
  }),

  /**
   * Search operations
   */
  search: new RetryConfig({
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  }),
};

/**
 * Helper function to sleep
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry decorators for class methods
 */
function Retryable(config = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const retryConfig = new RetryConfig(config);

    descriptor.value = async function (...args) {
      return retryWithBackoff(() => originalMethod.apply(this, args), retryConfig, {
        method: propertyKey,
      });
    };

    return descriptor;
  };
}

/**
 * Batch retry for multiple operations
 */
async function retryBatch(operations, config = new RetryConfig(), options = {}) {
  const { concurrency = 5, stopOnFirstError = false } = options;

  const results = [];
  const errors = [];

  // Process in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);

    const batchPromises = batch.map(async (operation, index) => {
      try {
        const result = await retryWithBackoff(operation.fn, config, {
          operationIndex: i + index,
          ...operation.context,
        });
        return { success: true, result, index: i + index };
      } catch (error) {
        return { success: false, error, index: i + index };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success) {
        results.push(result);
      } else {
        errors.push(result);
        if (stopOnFirstError) {
          throw result.error;
        }
      }
    }
  }

  return {
    successful: results,
    failed: errors,
    totalProcessed: operations.length,
    successCount: results.length,
    failureCount: errors.length,
  };
}

module.exports = {
  RetryConfig,
  retryWithBackoff,
  createRetryWrapper,
  createAxiosRetryInterceptor,
  retryFetch,
  RetryStrategies,
  Retryable,
  retryBatch,
  sleep,
};
