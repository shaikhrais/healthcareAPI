# Quick Reference Guide

## 🎯 Project At-a-Glance

**Healthcare Management API**: 1,297 endpoints across 73 files, 10+ modules
**Current Status**: 30.1% documented (22/73 files), production-ready core system
**Team**: SDE1 + SDE2 developers
**Priority**: Complete API documentation and establish testing infrastructure

## 🚀 Quick Commands

### Development
```bash
# Start development server
npm run dev

# Run tests (when implemented)
npm test

# Check API documentation
http://localhost:3000/api-docs

# Environment setup
cp .env.example .env
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/task-description

# Commit changes
git add .
git commit -m "feat: descriptive message"

# Push and create PR
git push origin feature/task-description
```

## 📁 Project Structure Quick Reference

```
src/modules/
├── auth/              # Authentication & JWT
├── patients/          # Patient management
├── appointments/      # Scheduling system
├── clinical/          # Medical records
├── billing/           # Payments & insurance
├── communication/     # Messaging system
├── analytics/         # Reports & analytics
├── administration/    # System admin
├── staff/            # Staff management
└── health-integrations/ # External APIs

Key Files:
├── server.js         # Main application entry
├── package.json      # Dependencies & scripts
└── DEVELOPER_GUIDE.md # Complete development guide
```

## 🔐 Authentication Quick Reference

### Roles Hierarchy
```
admin > provider > staff > patient
```

### Middleware Usage
```javascript
// Authentication required
router.use(authMiddleware);

// Role-based access
router.post('/admin-only', requireRole('admin'), handler);
router.get('/staff-access', requireRole(['admin', 'staff']), handler);
```

### JWT Token Format
```javascript
{
  userId: "user_id",
  role: "admin",
  permissions: ["read:patients", "write:appointments"],
  iat: timestamp,
  exp: timestamp
}
```

## 📝 Code Patterns

### Standard Route Structure
```javascript
const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const Controller = require('../controllers/controller');

const router = express.Router();

router.post('/',
  authMiddleware,                    // Auth
  requireRole(['admin', 'staff']),   // Authorization  
  [body('field').notEmpty()],        // Validation
  Controller.create                  // Handler
);

module.exports = router;
```

### Controller Pattern
```javascript
exports.create = async (req, res) => {
  try {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Business logic
    const item = await Model.create(req.body);

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create item'
    });
  }
};
```

### Swagger Documentation Template
```javascript
/**
 * @swagger
 * /api/endpoint:
 *   post:
 *     summary: Brief description
 *     tags: [Module Name]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchemaName'
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
```

## 🧪 Testing Quick Reference

### Test Structure
```javascript
describe('Module API', () => {
  beforeEach(async () => {
    await Model.deleteMany({});
  });

  it('should create new item', async () => {
    const response = await request(app)
      .post('/api/module')
      .set('Authorization', `Bearer ${token}`)
      .send(validData)
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

## 📊 Current Progress

### Documentation Status
```
Completed: 22/73 files (30.1%)
Remaining: 51 files (~1,119 endpoints)

Recent Completions:
✅ messaging.js (14 endpoints)
✅ documents.js (23 endpoints)
✅ payment-plans.js (21 endpoints)
✅ treatments.js (6 endpoints)
✅ referrals.js (18 endpoints)
✅ drug-safety.js (10 endpoints)
✅ mailchimp.js (54 endpoints)
✅ accessibility.js (36 endpoints)

Next Priority:
🎯 sprint-management.js (35 endpoints)
🎯 teams.js (27 endpoints)
🎯 bad-debt.js (27 endpoints)
```

## 🎯 Task Assignment Guide

### SDE1 Tasks (Junior Developer)
```
✅ Good for SDE1:
- Add input validation to existing routes
- Write unit tests for controllers
- Fix bugs in route handlers
- Add Swagger documentation to small files
- Add logging statements
- Simple CRUD operations

❌ Avoid for SDE1:
- Complex architectural changes
- Database schema modifications
- Authentication system changes
- Performance optimization
- Security implementations
```

### SDE2 Tasks (Senior Developer)
```
✅ Good for SDE2:
- System architecture decisions
- Complex feature design
- Performance optimization
- Security implementations
- Code review and mentoring
- Integration planning

Focus Areas:
- API documentation strategy
- Testing infrastructure setup
- Security enhancement planning
- Team mentorship and guidance
```

## 🚨 Common Issues & Solutions

### Authentication Errors
```javascript
// Issue: "Invalid token"
// Check: Token format and JWT secret
const token = req.header('Authorization')?.replace('Bearer ', '');
```

### Database Connection
```javascript
// Issue: MongoDB connection failed
// Check: Environment variables and network
console.log('MongoDB URI:', process.env.MONGODB_URI);
```

### CORS Issues
```javascript
// Add to server.js if needed
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## 📞 Team Communication

### Daily Standup Format
```
- What I completed yesterday
- What I'm working on today  
- Any blockers or questions
```

### Code Review Checklist
```
□ Follows established patterns
□ Input validation added
□ Error handling implemented
□ Tests written
□ Documentation updated
□ Security considerations addressed
□ No sensitive data exposed
```

## 🔗 Important Links

- **API Documentation**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`
- **Full Developer Guide**: `./DEVELOPER_GUIDE.md`
- **SDE1 Instructions**: `./SDE1_INSTRUCTIONS.md`
- **SDE2 Instructions**: `./SDE2_INSTRUCTIONS.md`
- **Project Management**: `./PROJECT_MANAGEMENT.md`

## 📋 Environment Variables

### Required Variables
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/healthcare
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

### Optional Variables
```env
REDIS_URL=redis://localhost:6379
EMAIL_SERVICE=gmail
EMAIL_USER=your-email
EMAIL_PASS=your-password
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🎯 Success Metrics

### Current Goals
- **Documentation**: 100% Swagger coverage
- **Testing**: 80% unit test coverage
- **Performance**: <200ms average response time
- **Security**: HIPAA compliance validation

### Quality Gates
- All PRs require SDE2 approval
- Tests must pass before merge
- Documentation required for new endpoints
- Security review for authentication changes

---

**Quick Help**: For immediate help, check the relevant instruction file for your role or ask in team chat. For architectural questions, consult with SDE2 lead.