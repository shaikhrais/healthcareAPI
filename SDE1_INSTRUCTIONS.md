# SDE1 Developer Instructions

## 🎯 Role & Responsibilities

As an SDE1 (Software Development Engineer 1), you will focus on:
- Implementing well-defined features and bug fixes
- Writing unit tests for your code
- Following established patterns and conventions
- Learning the codebase and development practices
- Code reviews and pair programming

## 📚 Learning Path

### Week 1-2: Setup & Familiarization
1. **Environment Setup**
   - Clone repository and run locally
   - Understand project structure
   - Review API documentation at `/api-docs`
   - Study authentication flow

2. **Code Review Practice**
   - Review 5-10 recent PRs to understand patterns
   - Identify common coding patterns
   - Understand error handling conventions

### Week 3-4: First Contributions
1. **Start with Small Tasks**
   - Bug fixes in existing endpoints
   - Adding validation to existing routes
   - Writing unit tests for untested functions
   - Documentation improvements

2. **Practice Areas**
   - Express route handlers
   - MongoDB queries and models
   - Input validation with express-validator
   - Swagger documentation

## 🛠️ Development Workflow

### 1. Pick Up Tasks
```markdown
Suitable SDE1 Tasks:
- [ ] Add input validation to existing endpoints
- [ ] Fix bugs in route handlers
- [ ] Write unit tests for controllers
- [ ] Add new simple CRUD endpoints
- [ ] Update Swagger documentation
- [ ] Add logging to existing functions
```

### 2. Development Process
```bash
# 1. Create feature branch
git checkout -b feature/SDE1-task-description

# 2. Make changes following patterns
# 3. Test locally
npm run dev

# 4. Run tests
npm test

# 5. Commit with clear messages
git add .
git commit -m "feat: add validation to patient endpoint"

# 6. Push and create PR
git push origin feature/SDE1-task-description
```

### 3. Code Pattern Examples

#### Simple CRUD Endpoint
```javascript
// GET endpoint pattern
exports.getItems = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const items = await Model.find()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items'
    });
  }
};
```

#### POST endpoint with validation
```javascript
// Route with validation
router.post('/',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone()
  ],
  async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const newItem = await Model.create({
        ...req.body,
        createdBy: req.user._id
      });

      res.status(201).json({
        success: true,
        data: newItem
      });
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create item'
      });
    }
  }
);
```

## 🧪 Testing Guidelines for SDE1

### Unit Test Template
```javascript
const request = require('supertest');
const app = require('../../server');
const Model = require('../models/Model');

describe('Model Controller', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Setup test user and auth token
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'patient'
    });
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = response.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Model.deleteMany({});
  });

  describe('GET /api/model', () => {
    it('should return empty array when no items exist', async () => {
      const response = await request(app)
        .get('/api/model')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return items when they exist', async () => {
      // Create test data
      await Model.create({
        name: 'Test Item',
        userId: testUser._id
      });

      const response = await request(app)
        .get('/api/model')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('name', 'Test Item');
    });
  });

  describe('POST /api/model', () => {
    it('should create new item with valid data', async () => {
      const itemData = {
        name: 'New Item',
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/model')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'New Item');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/model')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Empty data
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});
```

## 📋 Common Tasks & Solutions

### 1. Adding Input Validation
```javascript
// Before (needs validation)
router.post('/patients', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// After (with validation)
router.post('/patients', 
  authMiddleware,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date required'),
    body('phone').isMobilePhone().withMessage('Valid phone number required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    try {
      const patient = await Patient.create(req.body);
      res.status(201).json({ success: true, data: patient });
    } catch (error) {
      console.error('Error creating patient:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create patient' 
      });
    }
  }
);
```

### 2. Adding Swagger Documentation
```javascript
/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Create a new patient
 *     description: Register a new patient in the system
 *     tags:
 *       - Patients
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - dateOfBirth
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@email.com"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: Patient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
```

### 3. Error Handling Pattern
```javascript
// Standard error response format
const handleError = (res, error, customMessage = 'Operation failed') => {
  console.error('Error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: Object.values(error.errors).map(e => e.message)
    });
  }
  
  // Duplicate key error
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: customMessage
  });
};

// Usage in controller
exports.createItem = async (req, res) => {
  try {
    const item = await Model.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    handleError(res, error, 'Failed to create item');
  }
};
```

## 🎯 Learning Assignments

### Assignment 1: Add Validation
Pick an existing endpoint that lacks input validation and add comprehensive validation:
1. Find route without validation
2. Add express-validator middleware
3. Test with invalid data
4. Write unit tests
5. Update Swagger documentation

### Assignment 2: Fix a Bug
Find and fix a bug in existing code:
1. Identify issue in error handling
2. Create test case that reproduces the bug
3. Fix the issue
4. Verify test passes
5. Submit PR with explanation

### Assignment 3: Add Logging
Add proper logging to existing controllers:
1. Import logger utility
2. Add info logs for successful operations
3. Add error logs with context
4. Test logging in development
5. Ensure no sensitive data is logged

## 🚨 Common Mistakes to Avoid

### 1. Security Issues
```javascript
// ❌ Don't log sensitive data
console.log('User login:', req.body); // Contains password

// ✅ Log safely
console.log('User login attempt:', { email: req.body.email });
```

### 2. Error Handling
```javascript
// ❌ Don't expose internal errors
res.status(500).json({ error: error.message });

// ✅ Use generic error messages
res.status(500).json({ error: 'Internal server error' });
```

### 3. Validation
```javascript
// ❌ Don't trust user input
const user = await User.create(req.body);

// ✅ Validate and sanitize
const { name, email } = req.body;
const user = await User.create({ name: name.trim(), email: email.toLowerCase() });
```

### 4. Database Queries
```javascript
// ❌ Don't return sensitive fields
const user = await User.findById(id);

// ✅ Exclude sensitive fields
const user = await User.findById(id).select('-password -resetToken');
```

## 📞 Getting Help

### Code Review Checklist
Before submitting PR, ensure:
- [ ] Code follows project patterns
- [ ] Input validation added where needed
- [ ] Error handling implemented properly
- [ ] Tests written and passing
- [ ] Swagger documentation updated
- [ ] No console.log statements left
- [ ] No sensitive data exposed
- [ ] Code is readable and commented

### Questions to Ask
1. **Before Starting**: "Is this the right approach for this feature?"
2. **During Development**: "Am I following the established patterns?"
3. **Before Submitting**: "Have I tested all edge cases?"

### Resources
- Pair with SDE2 for complex features
- Ask questions in team Slack
- Review similar existing code
- Check API documentation
- Run tests frequently

---

**Remember**: Focus on learning and following patterns. Don't hesitate to ask questions!