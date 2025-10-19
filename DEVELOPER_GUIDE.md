# Healthcare API - Developer Guide

## Project Overview

This is a comprehensive Healthcare Management System REST API built with Node.js, Express.js, and MongoDB. The system manages patient data, appointments, clinical records, billing, communication, and administrative functions while maintaining HIPAA compliance.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Development Standards](#development-standards)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Documentation](#api-documentation)
6. [Database Guidelines](#database-guidelines)
7. [Testing Guidelines](#testing-guidelines)
8. [Deployment Guidelines](#deployment-guidelines)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- MongoDB
- Git

### Setup
```bash
# Clone the repository
git clone [repository-url]
cd healthCare/API

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/healthcare
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

## 🏗️ Project Structure

```
src/
├── modules/                    # Feature modules
│   ├── auth/                  # Authentication & authorization
│   ├── patients/              # Patient management
│   ├── appointments/          # Appointment scheduling
│   ├── clinical/              # Clinical records & notes
│   ├── billing/               # Billing & payments
│   ├── communication/         # Messaging & notifications
│   ├── analytics/             # Reports & analytics
│   ├── administration/        # System administration
│   └── staff/                 # Staff management
├── shared/                    # Shared utilities
│   ├── config/               # Configuration files
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   └── database/             # Database connections & migrations
└── server.js                 # Main server file
```

### Module Structure (Standard Pattern)
```
module/
├── controllers/              # Route handlers
├── models/                   # Database models
├── routes/                   # Route definitions
├── services/                 # Business logic
├── middleware/               # Module-specific middleware
└── index.js                  # Module entry point
```

## 📖 Development Standards

### Code Style
- Use ES6+ features (async/await, destructuring, arrow functions)
- Follow camelCase for variables and functions
- Use PascalCase for classes and models
- Use UPPER_SNAKE_CASE for constants
- Maximum line length: 100 characters
- Use meaningful variable and function names

### File Naming
- Routes: `kebab-case.js` (e.g., `patient-records.js`)
- Models: `PascalCase.js` (e.g., `PatientRecord.js`)
- Services: `camelCase.js` (e.g., `patientService.js`)
- Controllers: `camelCaseController.js` (e.g., `patientController.js`)

### Code Organization
```javascript
// File structure template
const express = require('express');
const { body, param, query } = require('express-validator');

// Middleware imports
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');

// Model imports
const ModelName = require('../models/ModelName');

// Service imports
const { serviceFunction } = require('../services/serviceName');

const router = express.Router();

// Route definitions with proper middleware chain
router.post('/',
  authMiddleware,                    // Authentication
  requireRole(['admin', 'staff']),   // Authorization
  rateLimiterMiddleware,             // Rate limiting
  [                                  // Validation
    body('field').isString().withMessage('Field is required')
  ],
  controllerFunction                 // Controller
);

module.exports = router;
```

## 🔐 Authentication & Authorization

### Authentication Middleware
```javascript
const authMiddleware = require('../../auth/middleware/authMiddleware');

// Apply to protected routes
router.use(authMiddleware);
```

### Role-Based Authorization
```javascript
const { requireRole } = require('../middleware/rolePermissions');

// Single role
router.post('/admin-only', requireRole('admin'), handler);

// Multiple roles
router.get('/staff-access', requireRole(['admin', 'staff', 'provider']), handler);
```

### Available Roles
- `admin` - Full system access
- `provider` - Healthcare providers (doctors, nurses)
- `staff` - Administrative staff
- `patient` - Patient users

### Permission Levels
```javascript
// Hierarchy (higher roles include lower role permissions)
admin > provider > staff > patient
```

### JWT Token Structure
```javascript
{
  userId: "user_id",
  role: "admin",
  permissions: ["read:patients", "write:appointments"],
  iat: timestamp,
  exp: timestamp
}
```

## 📚 API Documentation

### Swagger Documentation
- Access API docs at: `http://localhost:3000/api-docs`
- All endpoints must include Swagger documentation
- Use JSDoc comments for route documentation

### Swagger Documentation Template
```javascript
/**
 * @swagger
 * /api/module/endpoint:
 *   post:
 *     summary: Brief description
 *     description: Detailed description
 *     tags:
 *       - Module Name
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResponseSchema'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
```

### Required Schema Components
```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     ModelName:
 *       type: object
 *       required:
 *         - field1
 *         - field2
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier
 *         field1:
 *           type: string
 *           description: Field description
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
```

## 🗄️ Database Guidelines

### MongoDB Connection
```javascript
const mongoose = require('mongoose');

// Use existing connection from server.js
// Models automatically connect to the shared database instance
```

### Model Standards
```javascript
const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  // Required fields first
  requiredField: {
    type: String,
    required: [true, 'Field is required'],
    trim: true
  },
  
  // Optional fields
  optionalField: {
    type: String,
    default: null
  },
  
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Enums
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
modelSchema.index({ userId: 1, status: 1 });

// Instance methods
modelSchema.methods.methodName = function() {
  // Method implementation
};

// Static methods
modelSchema.statics.staticMethod = function() {
  // Static method implementation
};

module.exports = mongoose.model('ModelName', modelSchema);
```

### Query Best Practices
```javascript
// Use projection to limit returned fields
const users = await User.find({}, 'name email role');

// Use populate for references
const patient = await Patient.findById(id).populate('userId', 'name email');

// Use lean() for read-only queries
const results = await Model.find(query).lean();

// Use aggregation for complex queries
const stats = await Model.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$category', count: { $sum: 1 } } }
]);
```

## 🧪 Testing Guidelines

### Test Structure
```javascript
// tests/module.test.js
const request = require('supertest');
const app = require('../server');
const Model = require('../src/modules/module/models/Model');

describe('Module API', () => {
  beforeEach(async () => {
    // Clean database
    await Model.deleteMany({});
  });

  describe('POST /api/module', () => {
    it('should create new resource', async () => {
      const response = await request(app)
        .post('/api/module')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/module')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch       # Watch mode
npm test module.test.js    # Run specific test file
```

## 🚀 Deployment Guidelines

### Environment Configuration
```javascript
// Production environment variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://prod-cluster/healthcare
JWT_SECRET=strong-secret-key
JWT_EXPIRE=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Health Checks
```javascript
// Built-in health check endpoint
GET /health

// Response
{
  "status": "healthy",
  "timestamp": "2025-10-18T10:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

## 🛠️ Common Tasks

### Adding a New Module

1. **Create module structure:**
```bash
mkdir -p src/modules/new-module/{controllers,models,routes,services}
touch src/modules/new-module/index.js
```

2. **Create base files:**
```javascript
// src/modules/new-module/index.js
const express = require('express');
const routes = require('./routes');

const router = express.Router();
router.use('/new-module', routes);

module.exports = router;
```

3. **Register module in server.js:**
```javascript
// Add to server.js
const newModuleRoutes = require('./src/modules/new-module');
app.use('/api', newModuleRoutes);
```

### Adding a New Route

1. **Create route file:**
```javascript
// src/modules/module/routes/new-route.js
const express = require('express');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const controller = require('../controllers/newController');

const router = express.Router();

router.post('/', authMiddleware, controller.create);
router.get('/', authMiddleware, controller.getAll);

module.exports = router;
```

2. **Create controller:**
```javascript
// src/modules/module/controllers/newController.js
const Model = require('../models/Model');

exports.create = async (req, res) => {
  try {
    const data = await Model.create(req.body);
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
```

3. **Register route:**
```javascript
// src/modules/module/routes/index.js
const newRoute = require('./new-route');
router.use('/new-route', newRoute);
```

### Adding Swagger Documentation

1. **Add schemas:**
```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     NewModel:
 *       type: object
 *       properties:
 *         field1:
 *           type: string
 *         field2:
 *           type: number
 */
```

2. **Document endpoints:**
```javascript
/**
 * @swagger
 * /api/module/new-route:
 *   post:
 *     summary: Create new resource
 *     tags: [Module]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewModel'
 *     responses:
 *       201:
 *         description: Created successfully
 */
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```javascript
// Issue: JWT token invalid
// Solution: Check token format and secret
const token = req.header('Authorization')?.replace('Bearer ', '');
```

#### 2. Database Connection Issues
```javascript
// Issue: MongoDB connection failed
// Solution: Verify MongoDB URI and network connectivity
console.log('MongoDB URI:', process.env.MONGODB_URI);
```

#### 3. CORS Issues
```javascript
// Issue: CORS policy blocking requests
// Solution: Configure CORS in server.js
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

#### 4. Rate Limiting
```javascript
// Issue: Too many requests
// Solution: Check rate limiting configuration
const rateLimiter = rateLimiterMiddleware('endpoint', maxRequests, windowMs);
```

### Debug Commands
```bash
# Check environment variables
node -e "console.log(process.env)"

# Test database connection
node -e "require('./src/shared/database/connection').connect()"

# Check route registration
npm run dev | grep "Route"
```

### Logging
```javascript
const { logger } = require('../shared/utils/logger');

// Log levels: error, warn, info, debug
logger.info('User action', { userId, action, timestamp });
logger.error('Error occurred', { error: error.message, stack: error.stack });
```

## 📊 Performance Guidelines

### Database Optimization
- Use indexes for frequently queried fields
- Implement pagination for large datasets
- Use aggregation pipelines for complex queries
- Implement caching for expensive operations

### API Optimization
- Implement rate limiting
- Use compression middleware
- Optimize response payload size
- Implement request/response caching

### Memory Management
- Use streaming for large file uploads
- Implement garbage collection monitoring
- Avoid memory leaks in event listeners
- Use connection pooling

## 🔒 Security Guidelines

### Input Validation
```javascript
const { body, validationResult } = require('express-validator');

// Validate all inputs
router.post('/',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().escape()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
);
```

### HIPAA Compliance
- Encrypt sensitive data at rest and in transit
- Implement audit logging for PHI access
- Use role-based access controls
- Implement data retention policies
- Regular security assessments

### Best Practices
- Never log sensitive information
- Use HTTPS in production
- Implement CSRF protection
- Validate file uploads
- Regular dependency updates

## 📞 Support & Contact

### Development Team
- **Tech Lead**: [Name] - [email]
- **Senior Developer**: [Name] - [email]
- **Code Review**: Submit PR for review

### Resources
- **API Documentation**: http://localhost:3000/api-docs
- **Project Repository**: [repository-url]
- **Issue Tracking**: [issue-tracker-url]
- **Team Slack**: #healthcare-api-dev

---

**Remember**: Always follow HIPAA compliance guidelines and never commit sensitive information to version control.