const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
// Update existing tasks with technical details from documentation
router.post('/', async (req, res) => {
  try {
    console.log('Updating tasks with technical details from documentation...');

    // Update TASK-1.1: User Registration System
    await Task.findOneAndUpdate(
      { title: 'User Registration System', sprintNumber: 1 },
      {
        $set: {
          technicalDetails: {
            architecture: [
              'MVC Pattern: Separate routes, controllers, models, and services',
              'Middleware Chain: Validation → Sanitization → Business Logic → Response',
              'Service Layer: Reusable UserService for registration logic',
              'Repository Pattern: UserRepository for database operations',
            ],
            databaseSchema: {
              _id: 'ObjectId',
              email: 'String (unique, lowercase, indexed)',
              password: 'String (hashed with bcrypt, salt rounds: 12)',
              firstName: 'String',
              lastName: 'String',
              role: "String (enum: ['admin', 'provider', 'staff', 'patient'])",
              isEmailVerified: 'Boolean (default: false)',
              emailVerificationToken: 'String (hashed)',
              emailVerificationExpires: 'Date',
              createdAt: 'Date',
              updatedAt: 'Date',
              lastLoginAt: 'Date',
            },
            security: [
              'Password Hashing: bcrypt with 12 salt rounds (OWASP recommended)',
              'Token Generation: Crypto.randomBytes(32) for verification tokens',
              'Token Storage: SHA256 hash stored in database, plain token sent via email',
              'Token Expiry: 24 hours for email verification',
              'Rate Limiting: Max 5 registration attempts per hour per IP',
              'Input Validation: express-validator for email format, password strength',
              'SQL Injection Prevention: Mongoose parameterized queries',
              'XSS Prevention: Sanitize all user inputs with validator.escape()',
            ],
            emailService: [
              'Provider: Nodemailer with SendGrid/AWS SES/Gmail SMTP',
              'Template Engine: Handlebars for email templates',
              'Queue System: Bull/Redis for asynchronous email sending',
              'Retry Logic: 3 attempts with exponential backoff',
              'Tracking: Email delivery status stored in EmailLog collection',
              'Content: Welcome message, verification link (HTTPS), support contact',
            ],
            apiEndpoints: [
              'POST /api/auth/register - Body: { email, password, firstName, lastName, role } - Status: 201 (Created), 400 (Validation Error), 409 (Email Exists)',
              'GET /api/auth/verify-email?token={token} - Response: { message, isVerified: true } - Status: 200 (Success), 400 (Invalid/Expired Token)',
              'POST /api/auth/resend-verification - Body: { email } - Status: 200 (Sent), 404 (User Not Found), 429 (Rate Limited)',
            ],
            testing: [
              'Unit Tests: Jest tests for validation, hashing, token generation',
              'Integration Tests: Supertest for API endpoint testing',
              'Test Cases: Valid registration, duplicate email, weak password, invalid email format, token expiry, resend verification',
              'Coverage Target: 90%+ code coverage for auth module',
              'Mocking: Mock email service in tests (no actual emails sent)',
            ],
            performance: [
              'Database Indexing: Unique index on email field',
              "Async Operations: Email sending doesn't block response",
              'Response Time: Target < 200ms (excluding email queue)',
              'Caching: Rate limit counters in Redis (5 min TTL)',
            ],
            errorHandling: [
              'Validation Errors: Return 400 with field-specific error messages',
              'Duplicate Email: Return 409 "Email already registered"',
              'Email Service Failure: Log error, register user anyway, retry email',
              'Database Errors: Return 500 with generic message, log details',
              'Logging: Winston logger with debug/info/error levels',
            ],
            checklist: [
              'Create User model with Mongoose schema',
              'Implement password hashing pre-save hook',
              'Create registration controller and validation middleware',
              'Set up email templates (HTML + plain text)',
              'Configure email service with environment variables',
              'Implement token generation and verification logic',
              'Add rate limiting middleware',
              'Write unit and integration tests',
              'Add API documentation (Swagger/OpenAPI)',
              'Test in staging environment',
            ],
          },
        },
      }
    );

    // Update TASK-1.2: Login System with JWT
    await Task.findOneAndUpdate(
      { title: 'Login System with JWT', sprintNumber: 1 },
      {
        $set: {
          technicalDetails: {
            description:
              'Secure login system using JWT tokens. Generates access and refresh tokens, handles token expiration, and implements secure session management.',
            techStack: ['JWT', 'bcrypt', 'HTTP-only cookies'],
            acceptanceCriteria:
              'User logs in → JWT issued → Protected routes accessible → Token refresh works',
          },
        },
      }
    );

    // Update TASK-1.3: Password Reset Flow
    await Task.findOneAndUpdate(
      { title: 'Password Reset Flow', sprintNumber: 1 },
      {
        $set: {
          technicalDetails: {
            description:
              'Allows users to reset forgotten passwords via email. Generates secure reset tokens, sends email links, and validates token expiration.',
            techStack: ['Crypto tokens', 'email templates'],
            acceptanceCriteria:
              'User requests reset → Email received → New password set → Can log in',
          },
        },
      }
    );

    // Update TASK-1.4: Docker Configuration
    await Task.findOneAndUpdate(
      { title: 'Docker Configuration', sprintNumber: 1 },
      {
        $set: {
          technicalDetails: {
            description:
              'Sets up Docker containers for development and production environments. Creates Dockerfile, docker-compose.yml for services (app, database, Redis).',
            techStack: ['Docker', 'Docker Compose', 'multi-stage builds'],
            acceptanceCriteria:
              'Docker containers run → Services communicate → Hot reload works in dev → Production optimized',
          },
        },
      }
    );

    // Update TASK-1.5: CI/CD Pipeline Setup
    await Task.findOneAndUpdate(
      { title: 'CI/CD Pipeline Setup', sprintNumber: 1 },
      {
        $set: {
          technicalDetails: {
            description:
              'Automated build, test, and deployment pipeline using GitHub Actions. Runs tests on every commit, builds Docker images, and deploys to staging/production.',
            techStack: ['GitHub Actions', 'Docker Hub/ECR', 'AWS/Azure'],
            acceptanceCriteria:
              'PR triggers tests → Main deploys to staging → Manual approval for prod → Rollback capability',
          },
        },
      }
    );

    // Update Sprint 1 with technical overview
    await Sprint.findOneAndUpdate(
      { sprintNumber: 1 },
      {
        $set: {
          technicalDetails: {
            focus: 'Foundation & Authentication',
            goal: 'Establish core authentication infrastructure and set up DevOps pipeline for continuous deployment',
            keyTechnologies: [
              'Node.js',
              'Express',
              'JWT',
              'Docker',
              'GitHub Actions',
              'MongoDB',
              'Redis',
            ],
            deliverables: [
              'User Registration with Email Verification',
              'Login System with JWT Authentication',
              'Password Reset Flow',
              'Docker Development & Production Environment',
              'CI/CD Pipeline with Automated Testing',
            ],
          },
        },
      }
    );

    const updatedTasks = await Task.countDocuments({
      sprintNumber: 1,
      technicalDetails: { $exists: true, $ne: null },
    });

    const updatedSprints = await Sprint.countDocuments({
      sprintNumber: 1,
      technicalDetails: { $exists: true, $ne: null },
    });

    res.status(200).json({
      message: 'Technical details updated successfully',
      stats: {
        tasksUpdated: updatedTasks,
        sprintsUpdated: updatedSprints,
      },
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      error: 'Failed to update technical details',
      details: error.message,
    });
  }
});

module.exports = router;
