# SDE2 Developer Instructions

## 🎯 Role & Responsibilities

As an SDE2 (Software Development Engineer 2), you will:
- Lead feature development and architectural decisions
- Mentor SDE1 developers and conduct code reviews
- Design and implement complex features
- Ensure code quality and system reliability
- Make technical decisions and solve complex problems

## 🏗️ Technical Leadership Areas

### 1. System Architecture
- Design new modules and services
- Make technology stack decisions
- Plan database schema changes
- Design API contracts and integrations

### 2. Code Quality & Standards
- Establish coding standards and patterns
- Review and approve complex PRs
- Ensure security and performance standards
- Implement CI/CD improvements

### 3. Mentorship & Development
- Guide SDE1 developers
- Conduct technical interviews
- Lead design discussions
- Create technical documentation

## 🛠️ Advanced Development Patterns

### 1. Service Layer Pattern
```javascript
// services/patientService.js
class PatientService {
  constructor() {
    this.Patient = require('../models/Patient');
    this.logger = require('../../shared/utils/logger');
  }

  async createPatient(patientData, createdBy) {
    try {
      // Business logic validation
      await this.validatePatientData(patientData);
      
      // Check for duplicates
      const existingPatient = await this.findByEmail(patientData.email);
      if (existingPatient) {
        throw new Error('Patient with this email already exists');
      }

      // Create patient
      const patient = await this.Patient.create({
        ...patientData,
        createdBy,
        status: 'active'
      });

      // Post-creation hooks
      await this.sendWelcomeEmail(patient);
      await this.createInitialRecords(patient);

      this.logger.info('Patient created successfully', {
        patientId: patient._id,
        createdBy,
        email: patient.email
      });

      return patient;
    } catch (error) {
      this.logger.error('Error creating patient', {
        error: error.message,
        patientData: { email: patientData.email },
        createdBy
      });
      throw error;
    }
  }

  async validatePatientData(data) {
    // Complex business rules validation
    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      if (age < 0 || age > 150) {
        throw new Error('Invalid date of birth');
      }
    }

    // Insurance validation
    if (data.insurance && !await this.validateInsurance(data.insurance)) {
      throw new Error('Invalid insurance information');
    }
  }

  async findByEmail(email) {
    return await this.Patient.findOne({ 
      email: email.toLowerCase() 
    }).select('-sensitiveField');
  }

  async getPatientHistory(patientId, options = {}) {
    const { includeDeleted = false, limit = 50 } = options;
    
    const query = { patientId };
    if (!includeDeleted) {
      query.deletedAt = { $exists: false };
    }

    return await this.Patient.aggregate([
      { $match: query },
      { $lookup: {
        from: 'appointments',
        localField: '_id',
        foreignField: 'patientId',
        as: 'appointments'
      }},
      { $lookup: {
        from: 'medicalrecords',
        localField: '_id',
        foreignField: 'patientId',
        as: 'medicalRecords'
      }},
      { $limit: limit }
    ]);
  }
}

module.exports = new PatientService();
```

### 2. Advanced Middleware Patterns
```javascript
// middleware/advancedAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

class AuthMiddleware {
  static create(options = {}) {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          return this.handleMissingToken(res, options);
        }

        const decoded = await this.verifyToken(token);
        const user = await this.loadUser(decoded.userId);
        
        if (!user || !user.isActive) {
          return this.handleInvalidUser(res);
        }

        // Set user context
        req.user = user;
        req.userId = user._id;
        
        // Check session if required
        if (options.requireSession) {
          await this.validateSession(req, res);
        }

        // Audit logging
        this.logAccess(req);

        next();
      } catch (error) {
        return this.handleError(error, res);
      }
    };
  }

  static extractToken(req) {
    // Support multiple token sources
    return req.header('Authorization')?.replace('Bearer ', '') ||
           req.cookies?.token ||
           req.query?.token;
  }

  static async verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthError('Token expired', 'TOKEN_EXPIRED');
      }
      throw new AuthError('Invalid token', 'INVALID_TOKEN');
    }
  }

  static async loadUser(userId) {
    return await User.findById(userId)
      .select('-password -resetToken')
      .populate('role', 'name permissions');
  }

  static logAccess(req) {
    logger.info('API access', {
      userId: req.user._id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
}

// Usage
router.use('/admin', AuthMiddleware.create({ requireSession: true }));
```

### 3. Database Transaction Pattern
```javascript
// services/transactionService.js
const mongoose = require('mongoose');

class TransactionService {
  static async executeTransaction(operations) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const results = [];
      for (const operation of operations) {
        const result = await operation(session);
        results.push(result);
      }
      
      await session.commitTransaction();
      return results;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async transferPatient(patientId, fromProviderId, toProviderId) {
    return await this.executeTransaction([
      // Operation 1: Update patient record
      async (session) => {
        return await Patient.findByIdAndUpdate(
          patientId,
          { primaryProviderId: toProviderId },
          { new: true, session }
        );
      },
      
      // Operation 2: Transfer appointments
      async (session) => {
        return await Appointment.updateMany(
          { patientId, providerId: fromProviderId, status: 'scheduled' },
          { providerId: toProviderId },
          { session }
        );
      },
      
      // Operation 3: Create transfer record
      async (session) => {
        return await TransferRecord.create([{
          patientId,
          fromProviderId,
          toProviderId,
          transferDate: new Date(),
          reason: 'Provider transfer'
        }], { session });
      }
    ]);
  }
}
```

### 4. Event-Driven Architecture
```javascript
// events/eventEmitter.js
const EventEmitter = require('events');
const { logger } = require('../utils/logger');

class HealthcareEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.on('error', (error) => {
      logger.error('Event emitter error', { error: error.message });
    });
  }

  emitPatientEvent(eventType, patientData) {
    this.emit('patient:' + eventType, patientData);
    this.emit('audit:log', {
      eventType: 'patient:' + eventType,
      data: patientData,
      timestamp: new Date()
    });
  }

  emitAppointmentEvent(eventType, appointmentData) {
    this.emit('appointment:' + eventType, appointmentData);
  }
}

const healthcareEvents = new HealthcareEventEmitter();

// Event listeners
healthcareEvents.on('patient:created', async (patient) => {
  // Send welcome email
  await emailService.sendWelcomeEmail(patient);
  
  // Create initial records
  await medicalRecordService.createInitialRecord(patient._id);
  
  // Notify providers
  await notificationService.notifyProviders('new_patient', patient);
});

healthcareEvents.on('appointment:scheduled', async (appointment) => {
  // Send confirmation
  await notificationService.sendAppointmentConfirmation(appointment);
  
  // Update provider calendar
  await calendarService.addToCalendar(appointment);
});

module.exports = healthcareEvents;
```

## 🧪 Advanced Testing Strategies

### 1. Integration Testing
```javascript
// tests/integration/patient.integration.test.js
const request = require('supertest');
const app = require('../../server');
const { setupTestDatabase, teardownTestDatabase } = require('../helpers/database');

describe('Patient Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('Patient Registration Flow', () => {
    it('should complete full patient registration workflow', async () => {
      // Step 1: Create patient
      const patientResponse = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPatientData)
        .expect(201);

      const patientId = patientResponse.body.data._id;

      // Step 2: Verify patient was created
      const getResponse = await request(app)
        .get(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.data.email).toBe(validPatientData.email);

      // Step 3: Verify initial records were created
      const recordsResponse = await request(app)
        .get(`/api/patients/${patientId}/records`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(recordsResponse.body.data).toHaveLength(1);

      // Step 4: Verify notifications were sent
      // Mock verification would go here
    });
  });

  describe('Error Handling', () => {
    it('should handle database failures gracefully', async () => {
      // Simulate database disconnection
      await mongoose.disconnect();

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPatientData)
        .expect(500);

      expect(response.body.error).toBe('Service temporarily unavailable');

      // Reconnect for other tests
      await mongoose.connect(process.env.TEST_MONGODB_URI);
    });
  });
});
```

### 2. Performance Testing
```javascript
// tests/performance/api.performance.test.js
const request = require('supertest');
const app = require('../../server');

describe('API Performance Tests', () => {
  describe('Patient Search Performance', () => {
    beforeAll(async () => {
      // Create test data
      const patients = Array.from({ length: 1000 }, (_, i) => ({
        firstName: `Patient${i}`,
        lastName: `Test${i}`,
        email: `patient${i}@test.com`,
        dateOfBirth: new Date(1990, 0, 1)
      }));
      
      await Patient.insertMany(patients);
    });

    it('should search patients within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/patients/search?q=Patient')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 500ms
      expect(responseTime).toBeLessThan(500);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/patients?page=1&limit=50')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      
      // All requests should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
```

## 🏗️ Architecture Decisions

### 1. Module Organization
```javascript
// Module structure design
src/modules/[module]/
├── controllers/          # HTTP request handlers
├── services/            # Business logic
├── models/              # Database models
├── routes/              # Route definitions
├── middleware/          # Module-specific middleware
├── validators/          # Input validation schemas
├── types/              # TypeScript definitions
└── tests/              # Module-specific tests
```

### 2. Error Handling Strategy
```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// errors/errorHandler.js
const handleError = (error, res) => {
  let { statusCode = 500, message = 'Internal Server Error' } = error;
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (!error.isOperational) {
    // Log programming errors
    logger.error('Programming error:', error);
    message = 'Something went wrong';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
```

### 3. API Versioning Strategy
```javascript
// routes/v1/index.js
const express = require('express');
const router = express.Router();

// V1 API routes
router.use('/patients', require('./patients'));
router.use('/appointments', require('./appointments'));

module.exports = router;

// routes/v2/index.js (when needed)
const express = require('express');
const router = express.Router();

// V2 API routes with breaking changes
router.use('/patients', require('./patients-v2'));

module.exports = router;

// server.js
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
app.use('/api', v1Routes); // Default to latest stable
```

## 📊 Performance Optimization

### 1. Database Optimization
```javascript
// Indexing strategy
const patientSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  lastName: { type: String, index: true },
  providerId: { type: ObjectId, ref: 'Provider', index: true },
  status: { type: String, enum: ['active', 'inactive'], index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound indexes for common queries
patientSchema.index({ providerId: 1, status: 1 });
patientSchema.index({ lastName: 1, firstName: 1 });
patientSchema.index({ createdAt: -1, status: 1 });

// Query optimization
class PatientRepository {
  async findActivePatients(providerId, options = {}) {
    const { page = 1, limit = 50 } = options;
    
    return await Patient.find({ 
      providerId, 
      status: 'active' 
    })
    .select('firstName lastName email phone') // Limit fields
    .sort({ lastName: 1, firstName: 1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean() // Return plain objects
    .exec();
  }
}
```

### 2. Caching Strategy
```javascript
// cache/redisCache.js
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

class CacheService {
  static async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key, value, expiration = 3600) {
    try {
      await client.setEx(key, expiration, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  static async invalidate(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }
}

// Usage in service
class PatientService {
  async getPatient(patientId) {
    const cacheKey = `patient:${patientId}`;
    
    // Try cache first
    let patient = await CacheService.get(cacheKey);
    
    if (!patient) {
      // Load from database
      patient = await Patient.findById(patientId);
      
      // Cache for 1 hour
      await CacheService.set(cacheKey, patient, 3600);
    }
    
    return patient;
  }

  async updatePatient(patientId, updates) {
    const patient = await Patient.findByIdAndUpdate(patientId, updates);
    
    // Invalidate cache
    await CacheService.invalidate(`patient:${patientId}`);
    
    return patient;
  }
}
```

## 🔒 Security Implementation

### 1. Advanced Authentication
```javascript
// auth/jwtService.js
class JWTService {
  static generateTokens(user) {
    const payload = {
      userId: user._id,
      role: user.role,
      permissions: user.permissions
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m',
      issuer: 'healthcare-api',
      audience: 'healthcare-client'
    });

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
```

### 2. Input Sanitization
```javascript
// middleware/sanitization.js
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

const sanitizeInput = (req, res, next) => {
  // Remove MongoDB operators
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.query);
  mongoSanitize.sanitize(req.params);

  // XSS protection
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = xss(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(req.body);
  next();
};

module.exports = sanitizeInput;
```

## 📈 Monitoring & Observability

### 1. Application Metrics
```javascript
// monitoring/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Middleware to collect metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

module.exports = { metricsMiddleware, activeConnections };
```

### 2. Health Checks
```javascript
// health/healthCheck.js
class HealthCheckService {
  static async checkDatabase() {
    try {
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  static async checkRedis() {
    try {
      const start = Date.now();
      await redis.ping();
      return { 
        status: 'healthy', 
        responseTime: Date.now() - start 
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  static async getHealthStatus() {
    const [database, cache] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis()
    ]);

    const overall = database.status === 'healthy' && cache.status === 'healthy'
      ? 'healthy' : 'unhealthy';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      services: { database, cache }
    };
  }
}
```

## 🎯 SDE2 Assignments

### 1. Design New Feature
Design and implement a complex feature like "Patient Care Coordination":
- Multi-provider communication
- Care plan management
- Progress tracking
- Integration with external systems

### 2. Performance Optimization
Identify and optimize performance bottlenecks:
- Database query optimization
- Implement caching strategy
- API response time improvement
- Memory usage optimization

### 3. Security Enhancement
Implement advanced security features:
- Rate limiting enhancements
- Audit logging system
- Data encryption at rest
- API security scanning

### 4. Mentor SDE1 Developer
Guide an SDE1 through:
- Feature planning and design
- Code review process
- Best practices implementation
- Problem-solving techniques

---

**Leadership Note**: As an SDE2, you're expected to balance technical excellence with team development. Focus on building sustainable, scalable solutions while helping others grow.