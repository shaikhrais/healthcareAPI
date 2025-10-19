# API Error Handling Standard

Standardized error handling system for consistent, predictable API error responses across the application.

## Overview

The error handling system provides:
- **Consistent Error Responses**: All errors follow the same structure
- **Proper HTTP Status Codes**: Semantically correct status codes
- **Error Classes**: Type-safe error handling with custom error classes
- **Centralized Handling**: Single error handler for all routes
- **Detailed Logging**: Structured error logging with context
- **Validation Support**: Express-validator and Mongoose integration
- **Development vs Production**: Different error details based on environment

## Architecture

### Components

1. **Error Classes** ([errors.js](../utils/errors.js))
   - Custom error types for different scenarios
   - Consistent error structure
   - Error factory for common cases

2. **Error Handler** ([errorHandler.js](../middleware/errorHandler.js))
   - Centralizes error processing
   - Formats responses
   - Handles different error types

3. **Logger** ([logger.js](../utils/logger.js))
   - Structured logging with Winston
   - Multiple log levels
   - File and console transports

---

## Error Response Format

### Standard Error Response

All errors return this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "statusCode": 400,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### With Additional Fields

Errors may include additional context:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 422,
    "errors": [
      {
        "field": "email",
        "message": "Valid email is required",
        "value": "invalid-email"
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Development vs Production

**Development** includes stack traces:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Database connection failed",
    "statusCode": 500,
    "stack": "Error: Database connection failed\n    at ...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Production** hides sensitive details:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "statusCode": 500,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## HTTP Status Codes

| Code | Name | When to Use |
|------|------|-------------|
| 400 | Bad Request | Invalid request data, malformed JSON |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, concurrent modification |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | External service failed |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Error Classes

### ApiError (Base Class)

Base class for all API errors.

```javascript
const { ApiError } = require('./utils/errors');

throw new ApiError('Error message', 400, 'ERROR_CODE');
```

### BadRequestError (400)

Invalid request data.

```javascript
const { BadRequestError } = require('./utils/errors');

throw new BadRequestError('Invalid input data');
throw new BadRequestError('Missing required field', [
  { field: 'email', message: 'Email is required' }
]);
```

### UnauthorizedError (401)

Authentication failed or missing.

```javascript
const { UnauthorizedError } = require('./utils/errors');

throw new UnauthorizedError('Invalid credentials');
throw new UnauthorizedError('Token expired', 'TOKEN_EXPIRED');
```

### ForbiddenError (403)

Insufficient permissions.

```javascript
const { ForbiddenError } = require('./utils/errors');

throw new ForbiddenError('Admin access required');
throw new ForbiddenError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
```

### NotFoundError (404)

Resource not found.

```javascript
const { NotFoundError } = require('./utils/errors');

throw new NotFoundError('User');
throw new NotFoundError('User', userId);
// Results in: "User with id '123' not found"
```

### ConflictError (409)

Duplicate resource or conflict.

```javascript
const { ConflictError } = require('./utils/errors');

throw new ConflictError('Email already exists', 'email');
```

### ValidationError (422)

Validation failed.

```javascript
const { ValidationError } = require('./utils/errors');

throw new ValidationError('Validation failed', [
  { field: 'email', message: 'Email is required' },
  { field: 'password', message: 'Password must be at least 6 characters' }
]);

// From express-validator
throw ValidationError.fromExpressValidator(validationErrors);

// From Mongoose
throw ValidationError.fromMongoose(mongooseError);
```

### Other Errors

```javascript
// Rate Limiting
throw new RateLimitError('Too many requests', 60); // retryAfter in seconds

// Internal Server Error
throw new InternalServerError('Database query failed');

// Service Unavailable
throw new ServiceUnavailableError('Database', 'Connection timeout');

// Database Error
throw new DatabaseError('Connection failed', 'connect');

// Authentication Error
throw new AuthenticationError('Invalid password', 'INVALID_PASSWORD');

// Token Error
throw new TokenError('Token expired', 'TOKEN_EXPIRED');

// Payment Error
throw new PaymentError('Payment processing failed');

// External Service Error
throw new ExternalServiceError('Stripe', 'API timeout', 503);

// File Upload Error
throw new FileUploadError('File too large', 'FILE_TOO_LARGE');
```

---

## Error Factory

Convenience methods for common error scenarios.

```javascript
const { ErrorFactory } = require('./utils/errors');

// Authentication
throw ErrorFactory.invalidCredentials();
throw ErrorFactory.tokenExpired();
throw ErrorFactory.tokenInvalid();
throw ErrorFactory.sessionExpired();

// Authorization
throw ErrorFactory.insufficientPermissions();
throw ErrorFactory.insufficientPermissions('admin');

// Resources
throw ErrorFactory.resourceNotFound('User');
throw ErrorFactory.resourceNotFound('User', userId);
throw ErrorFactory.duplicateEntry('email');

// Validation
throw ErrorFactory.validationFailed(errors);

// Database
throw ErrorFactory.databaseConnection();

// External Services
throw ErrorFactory.emailDelivery();

// File Uploads
throw ErrorFactory.fileTooBig('10MB');
throw ErrorFactory.unsupportedFileType(['jpg', 'png']);

// System
throw ErrorFactory.maintenanceMode();
throw ErrorFactory.quotaExceeded('API calls');

// IP Blocking
throw ErrorFactory.ipBlocked('brute_force', expiresAt);
```

---

## Usage Examples

### Basic Route with Error Handling

```javascript
const { asyncHandler } = require('./middleware/errorHandler');
const { NotFoundError } = require('./utils/errors');

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }

  res.json({
    success: true,
    data: { user }
  });
}));
```

### With Validation

```javascript
const { validateRequest } = require('./middleware/errorHandler');
const { body, param } = require('express-validator');

router.post('/users',
  validateRequest([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ]),
  asyncHandler(async (req, res) => {
    // Validation errors are automatically handled
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: { user }
    });
  })
);
```

### With Authorization

```javascript
const { ErrorFactory } = require('./utils/errors');

router.delete('/users/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    // Check permissions
    if (!['owner', 'full_access'].includes(req.user.role)) {
      throw ErrorFactory.insufficientPermissions('owner or full_access');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw ErrorFactory.resourceNotFound('User', req.params.id);
    }

    await user.remove();

    res.json({
      success: true,
      message: 'User deleted'
    });
  })
);
```

### Handling Database Errors

```javascript
const { ConflictError } = require('./utils/errors');

router.post('/users', asyncHandler(async (req, res) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    // Mongoose duplicate key error
    if (error.code === 11000) {
      throw new ConflictError('Email already exists', 'email');
    }
    throw error; // Re-throw for centralized handler
  }
}));
```

### External Service Calls

```javascript
const { ExternalServiceError } = require('./utils/errors');
const { logExternalAPI } = require('./utils/logger');

router.post('/send-email', asyncHandler(async (req, res) => {
  try {
    const result = await emailService.send(req.body);
    logExternalAPI('EmailService', 'send', true);

    res.json({
      success: true,
      message: 'Email sent'
    });
  } catch (error) {
    logExternalAPI('EmailService', 'send', false, { error: error.message });
    throw new ExternalServiceError('Email', 'Failed to send email', 503);
  }
}));
```

---

## Integration with Server

### Setup Error Handling

```javascript
// server.js
const express = require('express');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger); // Log all requests

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

app.listen(3000);
```

### Using asyncHandler

Wrap async route handlers to catch errors:

```javascript
const { asyncHandler } = require('./middleware/errorHandler');

// Without asyncHandler (not recommended)
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// With asyncHandler (recommended)
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({ users });
}));
```

---

## Validation

### Express Validator

```javascript
const { validateRequest } = require('./middleware/errorHandler');
const { body, param, query } = require('express-validator');

router.post('/users',
  validateRequest([
    body('email')
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('age')
      .optional()
      .isInt({ min: 18 })
      .withMessage('Must be at least 18 years old')
  ]),
  asyncHandler(async (req, res) => {
    // Validation passed, handle request
  })
);
```

### Mongoose Validation

Mongoose validation errors are automatically converted:

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    validate: {
      validator: (v) => /\S+@\S+\.\S+/.test(v),
      message: 'Invalid email format'
    }
  }
});

// If validation fails, error handler converts it to:
// {
//   "error": {
//     "code": "VALIDATION_ERROR",
//     "message": "Validation failed",
//     "errors": [
//       { "field": "email", "message": "Invalid email format" }
//     ]
//   }
// }
```

---

## Logging

### Using Logger

```javascript
const { logError, logAuth, logSecurity } = require('./utils/logger');

// Log errors
try {
  await dangerousOperation();
} catch (error) {
  logError(error, { userId, operation: 'dangerousOperation' });
  throw error;
}

// Log authentication
logAuth('login', user, true, { ip: req.ip });
logAuth('login', { email }, false, { reason: 'invalid_password' });

// Log security events
logSecurity('suspicious_activity', 'warn', {
  ip: req.ip,
  endpoint: req.path
});
```

### Log Levels

```javascript
logger.error('Critical error');
logger.warn('Warning message');
logger.info('Information');
logger.http('HTTP request');
logger.debug('Debug information');
```

### Request Logging

Automatically logs all HTTP requests:

```javascript
// Logged for each request:
{
  "method": "POST",
  "url": "/api/users",
  "statusCode": 201,
  "duration": "45ms",
  "ip": "192.168.1.1",
  "userId": "123"
}
```

---

## Best Practices

### 1. Always Use asyncHandler

```javascript
// ✅ Good
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({ users });
}));

// ❌ Bad
router.get('/users', async (req, res) => {
  const users = await User.find(); // Unhandled promise rejection!
  res.json({ users });
});
```

### 2. Use Error Factory for Common Cases

```javascript
// ✅ Good
throw ErrorFactory.resourceNotFound('User', id);

// ❌ Bad
throw new ApiError(`User with id ${id} not found`, 404, 'NOT_FOUND');
```

### 3. Validate Input

```javascript
// ✅ Good
router.post('/users',
  validateRequest([
    body('email').isEmail()
  ]),
  asyncHandler(async (req, res) => {
    // Input is validated
  })
);

// ❌ Bad
router.post('/users', asyncHandler(async (req, res) => {
  // No validation, invalid data could cause errors
  const user = await User.create(req.body);
}));
```

### 4. Provide Context in Errors

```javascript
// ✅ Good
if (!user) {
  throw new NotFoundError('User', userId);
}

// ❌ Bad
if (!user) {
  throw new Error('Not found');
}
```

### 5. Use Appropriate Status Codes

```javascript
// ✅ Good
if (!user) {
  throw new NotFoundError('User'); // 404
}
if (existingUser) {
  throw new ConflictError('Email exists'); // 409
}
if (!hasPermission) {
  throw new ForbiddenError(); // 403
}

// ❌ Bad
throw new Error('Something went wrong'); // 500 always
```

### 6. Handle External Service Errors

```javascript
// ✅ Good
try {
  await externalAPI.call();
} catch (error) {
  logExternalAPI('ServiceName', 'endpoint', false);
  throw new ExternalServiceError('ServiceName', 'Call failed');
}

// ❌ Bad
await externalAPI.call(); // Let it throw generic error
```

### 7. Don't Expose Sensitive Information

```javascript
// ✅ Good (Production)
throw new InternalServerError('An error occurred');

// ❌ Bad
throw new InternalServerError('Database password: ' + dbPassword);
```

---

## Testing Error Handling

### Test Error Responses

```javascript
const request = require('supertest');
const app = require('./app');

describe('Error Handling', () => {
  test('should return 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/api/users/invalid-id')
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found')
      }
    });
  });

  test('should return validation errors', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'invalid-email' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.errors).toHaveLength(2);
  });
});
```

### Development Error Testing Endpoint

Use the test endpoint (development only):

```bash
# Test different error types
curl -X POST http://localhost:8090/api/example/error-test \
  -H "Content-Type: application/json" \
  -d '{"errorType":"not-found"}'

curl -X POST http://localhost:8090/api/example/error-test \
  -d '{"errorType":"validation"}'

curl -X POST http://localhost:8090/api/example/error-test \
  -d '{"errorType":"unauthorized"}'
```

---

## Common Error Scenarios

### Authentication Errors

```javascript
// Invalid credentials
throw ErrorFactory.invalidCredentials();

// Expired token
throw ErrorFactory.tokenExpired();

// Invalid token
throw ErrorFactory.tokenInvalid();

// Session expired
throw ErrorFactory.sessionExpired();
```

### Authorization Errors

```javascript
// Insufficient permissions
throw ErrorFactory.insufficientPermissions();

// Specific role required
throw ErrorFactory.insufficientPermissions('admin');

// IP blocked
throw ErrorFactory.ipBlocked('brute_force', expiresAt);
```

### Resource Errors

```javascript
// Not found
throw ErrorFactory.resourceNotFound('User', userId);

// Already exists
throw ErrorFactory.duplicateEntry('email');

// Conflict
throw new ConflictError('Cannot delete user with active sessions');
```

### Validation Errors

```javascript
// Single validation error
throw new BadRequestError('Invalid input');

// Multiple validation errors
throw ErrorFactory.validationFailed([
  { field: 'email', message: 'Email is required' },
  { field: 'password', message: 'Password too short' }
]);
```

---

## Environment Configuration

```env
# Logging
LOG_LEVEL=debug  # error, warn, info, http, debug
NODE_ENV=development  # development, production

# Error Handling
SHOW_ERROR_STACK=true  # Show stack traces (dev only)
```

---

## Troubleshooting

### Errors Not Being Caught

**Issue**: Async errors not handled

**Solution**: Use `asyncHandler`

```javascript
// ✅ Correct
router.get('/users', asyncHandler(async (req, res) => {
  // errors caught automatically
}));
```

### Validation Not Working

**Issue**: Validation middleware not applied

**Solution**: Use `validateRequest`

```javascript
// ✅ Correct
router.post('/users',
  validateRequest([...validators]),
  asyncHandler(handler)
);
```

### Custom Errors Not Formatted

**Issue**: Throwing non-ApiError instances

**Solution**: Use custom error classes

```javascript
// ✅ Correct
throw new NotFoundError('User');

// ❌ Wrong
throw new Error('User not found');
```

---

## Summary

The API Error Handling Standard provides:

✅ **Consistent error responses** across all endpoints
✅ **Proper HTTP status codes** for different error types
✅ **Type-safe error classes** for development
✅ **Centralized error handling** for maintainability
✅ **Structured logging** for debugging
✅ **Validation integration** with express-validator
✅ **Development vs production** error details
✅ **Error factory** for common scenarios

All routes should use `asyncHandler`, appropriate error classes, and the centralized error handler to ensure consistent, predictable error responses.
