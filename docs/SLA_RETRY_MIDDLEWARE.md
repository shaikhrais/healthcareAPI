# SLA/Retry Middleware - Complete Guide

## Overview

Complete implementation of SLA monitoring, automatic retry logic with exponential backoff, circuit breaker patterns, and timeout handling for robust, fault-tolerant API operations.

---

## Components

### 1. SLA Monitor (`middleware/slaMonitor.js`)

Tracks request/response times, success rates, and SLA compliance in real-time.

**Features:**
- Request duration tracking (min, max, avg, p50, p95, p99)
- Success rate monitoring
- Configurable time windows (1m, 5m, 15m, 1h, 24h)
- SLA violation detection
- Endpoint normalization (groups by pattern)
- Status code distribution

**Key Methods:**

```javascript
const { slaMonitor, getEndpointMetrics, checkSLACompliance } = require('./middleware/slaMonitor');

// Add middleware to track all requests
app.use(slaMonitor({
  trackAll: true,
  logSlowRequests: true,
  slowRequestThreshold: 1000 // 1 second
}));

// Get metrics for an endpoint
const metrics = getEndpointMetrics('/api/users/:id', '15m');
// Returns: { requests, successRate, avgDuration, p50, p95, p99, statusCodes }

// Check SLA compliance
const result = checkEndpointSLA('/api/auth/login', {
  minSuccessRate: 95,
  maxAvgDuration: 500,
  maxP95Duration: 1000,
  window: '15m'
});
// Returns: { compliant: true/false, violations: [...], metrics }
```

### 2. Retry Middleware (`middleware/retryMiddleware.js`)

Automatic retry logic with exponential backoff for transient failures.

**Features:**
- Exponential backoff with jitter
- Configurable retry strategies per operation type
- Retryable status codes (408, 429, 500, 502, 503, 504)
- Retryable errors (ECONNRESET, ETIMEDOUT, etc.)
- Axios interceptor support
- Fetch wrapper
- Batch retry operations

**Key Classes and Methods:**

```javascript
const {
  retryWithBackoff,
  createRetryWrapper,
  RetryStrategies,
  retryFetch
} = require('./middleware/retryMiddleware');

// Retry with exponential backoff
await retryWithBackoff(
  async () => {
    // Your operation
    return await externalAPI.call();
  },
  RetryStrategies.externalAPI,
  { context: 'user-service' }
);

// Create retry wrapper
const retry = createRetryWrapper({
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2
});

const result = await retry.execute(
  async () => await apiCall(),
  { operation: 'fetch-user' }
);

// Retry with fetch
const response = await retryFetch(
  'https://api.example.com/users',
  { method: 'GET' },
  RetryStrategies.externalAPI
);
```

**Predefined Strategies:**

- `RetryStrategies.database` - 3 retries, 500ms initial delay
- `RetryStrategies.externalAPI` - 3 retries, 1s initial delay
- `RetryStrategies.email` - 5 retries, 2s initial delay
- `RetryStrategies.fileUpload` - 3 retries, 1s initial delay
- `RetryStrategies.payment` - 2 retries, 2s initial delay
- `RetryStrategies.search` - 2 retries, 500ms initial delay

### 3. Circuit Breaker (`middleware/circuitBreaker.js`)

Prevents cascading failures by temporarily blocking requests to failing services.

**Features:**
- Three states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold
- Automatic recovery testing
- Volume threshold (minimum requests before opening)
- Fallback support
- Event emission for monitoring
- Comprehensive statistics

**States:**

1. **CLOSED** - Normal operation, requests pass through
2. **OPEN** - Circuit open, requests fail fast (return error or fallback)
3. **HALF_OPEN** - Testing if service recovered, limited requests allowed

**Key Usage:**

```javascript
const {
  circuitBreakerManager,
  CircuitBreakers
} = require('./middleware/circuitBreaker');

// Execute with circuit breaker protection
const result = await circuitBreakerManager.execute(
  'external-api',
  async () => {
    return await externalAPI.call();
  },
  {
    ...CircuitBreakers.externalAPI,
    fallback: () => {
      return { data: [], cached: true };
    }
  }
);

// Get circuit breaker status
const status = circuitBreakerManager.getStatus('external-api');
// Returns: { state, failures, successes, stats, failureRate }

// Manual control
const breaker = circuitBreakerManager.getBreaker('external-api');
breaker.forceOpen();  // Open circuit manually
breaker.forceClose(); // Close circuit manually
breaker.reset();      // Reset statistics
```

**Predefined Configurations:**

- `CircuitBreakers.database` - 50% failure threshold, 30s reset
- `CircuitBreakers.externalAPI` - 50% failure threshold, 60s reset
- `CircuitBreakers.email` - 60% failure threshold, 120s reset
- `CircuitBreakers.payment` - 30% failure threshold, 300s reset
- `CircuitBreakers.fileStorage` - 50% failure threshold, 60s reset
- `CircuitBreakers.search` - 60% failure threshold, 30s reset

### 4. Timeout Handler (`middleware/timeoutHandler.js`)

Request and operation timeout management.

**Features:**
- Request-level timeouts
- Route-specific timeouts
- Operation timeout wrappers
- Adaptive timeout (adjusts based on historical performance)
- Timeout with fallback
- Request tracking
- Long-running request detection

**Key Methods:**

```javascript
const {
  requestTimeout,
  routeTimeout,
  withTimeout,
  AdaptiveTimeout,
  trackRequest,
  timeoutMonitor
} = require('./middleware/timeoutHandler');

// Request timeout middleware
app.use(requestTimeout({
  timeout: 30000, // 30 seconds
  message: 'Request timeout',
  onTimeout: (req, res) => {
    // Custom timeout handler
  }
}));

// Route-specific timeout
router.get('/users', routeTimeout(5000), handler);

// Operation timeout
await withTimeout(
  async () => await longOperation(),
  10000,
  'Long operation timeout'
);

// Adaptive timeout
const adaptive = new AdaptiveTimeout({
  baseTimeout: 5000,
  percentile: 95
});

const result = await adaptive.execute(async () => {
  return await operation();
});

// Track requests
app.use(trackRequest);

// Monitor slow requests
app.use(timeoutMonitor(5000)); // Log requests > 5s
```

**Predefined Strategies:**

- `TimeoutStrategies.database` - 5s
- `TimeoutStrategies.externalAPI` - 10s
- `TimeoutStrategies.fileUpload` - 60s
- `TimeoutStrategies.search` - 3s
- `TimeoutStrategies.reportGeneration` - 30s
- `TimeoutStrategies.email` - 15s
- `TimeoutStrategies.payment` - 30s

---

## Integration Examples

### Complete External API Service

```javascript
const { retryWithBackoff, RetryStrategies } = require('./middleware/retryMiddleware');
const { circuitBreakerManager, CircuitBreakers } = require('./middleware/circuitBreaker');
const { withTimeout, TimeoutStrategies } = require('./middleware/timeoutHandler');
const { logExternalAPI } = require('./utils/logger');

class ExternalAPIService {
  async fetchUser(userId) {
    return circuitBreakerManager.execute(
      'user-api',
      async () => {
        return retryWithBackoff(
          async () => {
            return withTimeout(
              async () => {
                const response = await fetch(`https://api.example.com/users/${userId}`);

                if (!response.ok) {
                  throw new Error(`API error: ${response.status}`);
                }

                logExternalAPI('UserAPI', 'fetchUser', true);
                return response.json();
              },
              TimeoutStrategies.externalAPI.timeout
            );
          },
          RetryStrategies.externalAPI,
          { operation: 'fetchUser', userId }
        );
      },
      {
        ...CircuitBreakers.externalAPI,
        fallback: (error) => {
          logExternalAPI('UserAPI', 'fetchUser', false, { error: error.message });
          return { id: userId, cached: true };
        }
      }
    );
  }
}
```

### Database Operation with Retry

```javascript
const { retryWithBackoff, RetryStrategies } = require('./middleware/retryMiddleware');
const { withTimeout } = require('./middleware/timeoutHandler');

async function createUser(userData) {
  return retryWithBackoff(
    async () => {
      return withTimeout(
        async () => {
          const user = new User(userData);
          await user.save();
          return user;
        },
        5000 // 5 second timeout
      );
    },
    RetryStrategies.database,
    { operation: 'createUser' }
  );
}
```

### Email Service with Circuit Breaker

```javascript
const { circuitBreakerManager, CircuitBreakers } = require('./middleware/circuitBreaker');
const { retryWithBackoff, RetryStrategies } = require('./middleware/retryMiddleware');

class EmailService {
  async send(to, subject, body) {
    return circuitBreakerManager.execute(
      'email-service',
      async () => {
        return retryWithBackoff(
          async () => {
            await emailProvider.send({ to, subject, body });
          },
          RetryStrategies.email,
          { operation: 'sendEmail', to }
        );
      },
      {
        ...CircuitBreakers.email,
        fallback: () => {
          // Queue email for later
          emailQueue.add({ to, subject, body });
          return { queued: true };
        }
      }
    );
  }
}
```

---

## Server Setup

```javascript
const express = require('express');
const { slaMonitor } = require('./middleware/slaMonitor');
const { requestTimeout, trackRequest, timeoutMonitor } = require('./middleware/timeoutHandler');

const app = express();

// SLA monitoring (track all requests)
app.use(slaMonitor({
  trackAll: true,
  logSlowRequests: true,
  slowRequestThreshold: 1000
}));

// Request tracking
app.use(trackRequest);

// Global timeout (30 seconds)
app.use(requestTimeout({ timeout: 30000 }));

// Monitor slow requests
app.use(timeoutMonitor(5000));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));

// Error handler
app.use(errorHandler);

app.listen(8090);
```

---

## Monitoring & Admin Routes

### SLA Metrics Endpoint

```javascript
const { getAllMetrics, getEndpointMetrics } = require('./middleware/slaMonitor');

router.get('/admin/metrics', authMiddleware, requireRole('owner'), (req, res) => {
  const { endpoint, window = '15m' } = req.query;

  if (endpoint) {
    const metrics = getEndpointMetrics(endpoint, window);
    return res.json({ success: true, data: metrics });
  }

  const allMetrics = getAllMetrics(window);
  res.json({ success: true, data: allMetrics });
});
```

### Circuit Breaker Status

```javascript
const { circuitBreakerManager } = require('./middleware/circuitBreaker');

router.get('/admin/circuit-breakers', authMiddleware, requireRole('owner'), (req, res) => {
  const status = circuitBreakerManager.getAllStatus();
  res.json({ success: true, data: status });
});

router.post('/admin/circuit-breakers/:name/reset', authMiddleware, requireRole('owner'), (req, res) => {
  circuitBreakerManager.reset(req.params.name);
  res.json({ success: true, message: 'Circuit breaker reset' });
});
```

### Active Requests

```javascript
const { getTimeoutStats } = require('./middleware/timeoutHandler');

router.get('/admin/active-requests', authMiddleware, requireRole('owner'), (req, res) => {
  const stats = getTimeoutStats();
  res.json({ success: true, data: stats });
});
```

---

## SLA Compliance Monitoring

### Periodic SLA Checks

```javascript
const { checkSLACompliance, defaultSLAConfigs } = require('./middleware/slaMonitor');
const cron = require('node-cron');

// Check SLA compliance every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const alerts = await checkSLACompliance(defaultSLAConfigs);

  if (alerts.length > 0) {
    console.error('SLA Violations:', alerts);

    // Send alerts (email, Slack, PagerDuty, etc.)
    for (const alert of alerts) {
      if (alert.severity === 'critical') {
        await notificationService.sendCritical(alert);
      } else {
        await notificationService.sendWarning(alert);
      }
    }
  }
});
```

### Custom SLA Configuration

```javascript
const customSLAs = [
  {
    endpoint: '/api/appointments',
    minSuccessRate: 98,
    maxAvgDuration: 300,
    maxP95Duration: 800,
    window: '15m',
    severity: 'warning',
    alertCallback: async (result) => {
      // Custom alert logic
      await slack.send({
        channel: '#ops',
        text: `SLA violation on ${result.endpoint}`,
        violations: result.violations
      });
    }
  }
];

await checkSLACompliance(customSLAs);
```

---

## Best Practices

### 1. Always Use Timeout + Retry + Circuit Breaker Together

```javascript
// ✅ Complete protection
async function callExternalAPI() {
  return circuitBreakerManager.execute(
    'api-name',
    async () => {
      return retryWithBackoff(
        async () => {
          return withTimeout(
            async () => await apiCall(),
            10000
          );
        },
        RetryStrategies.externalAPI
      );
    },
    { ...CircuitBreakers.externalAPI, fallback: () => cachedData }
  );
}

// ❌ No protection
async function callExternalAPI() {
  return await apiCall();
}
```

### 2. Provide Fallbacks for Circuit Breakers

```javascript
// ✅ Graceful degradation
circuitBreakerManager.execute('service', operation, {
  fallback: () => ({ data: [], source: 'cache' })
});

// ❌ No fallback - users see errors
circuitBreakerManager.execute('service', operation);
```

### 3. Use Appropriate Timeouts

```javascript
// ✅ Different timeouts for different operations
await withTimeout(databaseQuery, 5000);
await withTimeout(fileUpload, 60000);
await withTimeout(searchQuery, 3000);

// ❌ Same timeout for everything
await withTimeout(operation, 30000);
```

### 4. Monitor SLA Compliance

```javascript
// ✅ Proactive monitoring
setInterval(async () => {
  const alerts = await checkSLACompliance(slaConfigs);
  if (alerts.length > 0) {
    sendAlerts(alerts);
  }
}, 300000); // Every 5 minutes

// ❌ No monitoring
// Discover issues when users complain
```

### 5. Log All Retry Attempts

The middleware automatically logs retries, but add context:

```javascript
// ✅ With context
await retryWithBackoff(
  operation,
  config,
  { userId, operation: 'fetchUser', endpoint: '/api/users/:id' }
);

// ❌ No context
await retryWithBackoff(operation, config);
```

---

## Performance Considerations

### Memory Usage

SLA metrics are stored in-memory by default. For production with high traffic:

1. **Use Redis for metrics storage**:
```javascript
// Implement RedisMetricsStore
class RedisMetricsStore {
  async record(endpoint, duration, statusCode, success) {
    await redis.zadd(`metrics:${endpoint}`, Date.now(), JSON.stringify({ duration, statusCode, success }));
  }
}
```

2. **Limit data retention**:
```javascript
// Keep only last 24 hours
const cutoff = Date.now() - (24 * 60 * 60 * 1000);
```

3. **Use time-series database** (InfluxDB, TimescaleDB) for long-term storage

### Circuit Breaker Overhead

Circuit breakers add minimal overhead (~1-2ms per request). To minimize:

- Use per-service breakers, not per-request
- Set appropriate `volumeThreshold` (don't open on low traffic)
- Use event emitters for monitoring instead of polling

---

## Testing

### Testing Retry Logic

```javascript
describe('Retry Logic', () => {
  test('should retry on transient failure', async () => {
    let attempts = 0;

    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('ECONNRESET');
      }
      return 'success';
    };

    const result = await retryWithBackoff(
      operation,
      new RetryConfig({ maxRetries: 3, initialDelay: 10 })
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});
```

### Testing Circuit Breaker

```javascript
describe('Circuit Breaker', () => {
  test('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 50,
      volumeThreshold: 5
    });

    // Trigger 5 failures (100% failure rate)
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Service failure');
        });
      } catch (error) {}
    }

    expect(breaker.state).toBe(CircuitState.OPEN);
  });
});
```

### Testing Timeouts

```javascript
describe('Timeout Handler', () => {
  test('should timeout long operations', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'completed';
    };

    await expect(
      withTimeout(operation, 1000)
    ).rejects.toThrow('Operation timeout');
  });
});
```

---

## Troubleshooting

### Circuit Breaker Keeps Opening

**Problem**: Circuit opens too frequently

**Solutions:**
1. Increase `volumeThreshold` - need more requests before decision
2. Increase `failureThreshold` - tolerate more failures
3. Check if underlying service is actually failing
4. Increase `resetTimeout` - allow more recovery time

### Retries Not Working

**Problem**: Operations fail without retries

**Solutions:**
1. Check error codes - ensure they're in `retryableErrors`
2. Check status codes - ensure they're in `retryableStatusCodes`
3. Verify `maxRetries` configuration
4. Check logs for retry attempts

### SLA False Positives

**Problem**: SLA violations reported incorrectly

**Solutions:**
1. Adjust percentile thresholds (P95, P99)
2. Increase time windows for smoother metrics
3. Set appropriate `volumeThreshold`
4. Review endpoint normalization rules

---

## Environment Configuration

```env
# SLA Monitoring
SLA_TRACK_ALL=true
SLA_SLOW_REQUEST_THRESHOLD=1000
SLA_MONITORING_WINDOW=900000

# Retry Configuration
RETRY_MAX_RETRIES=3
RETRY_INITIAL_DELAY=1000
RETRY_MAX_DELAY=30000

# Circuit Breaker
CIRCUIT_FAILURE_THRESHOLD=50
CIRCUIT_RESET_TIMEOUT=30000
CIRCUIT_VOLUME_THRESHOLD=10

# Timeout Configuration
REQUEST_TIMEOUT=30000
OPERATION_TIMEOUT=10000
```

---

## Files Created

1. **[slaMonitor.js](../middleware/slaMonitor.js)** - SLA monitoring and metrics tracking
2. **[retryMiddleware.js](../middleware/retryMiddleware.js)** - Retry logic with exponential backoff
3. **[circuitBreaker.js](../middleware/circuitBreaker.js)** - Circuit breaker pattern implementation
4. **[timeoutHandler.js](../middleware/timeoutHandler.js)** - Timeout handling and request tracking
5. **[SLA_RETRY_MIDDLEWARE.md](SLA_RETRY_MIDDLEWARE.md)** - This documentation

---

## Summary

TASK-1.9 provides a complete, production-ready solution for:

- **SLA Monitoring**: Track performance metrics, success rates, and compliance
- **Automatic Retry**: Handle transient failures with exponential backoff
- **Circuit Breaker**: Prevent cascading failures with automatic recovery
- **Timeout Handling**: Manage request and operation timeouts effectively

All components work together to create a robust, fault-tolerant system that gracefully handles failures, monitors performance, and ensures SLA compliance.
