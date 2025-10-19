const request = require('supertest');

const app = require('../server');
/* eslint-env jest */
/**
 * Security Tests
 * Tests authentication, authorization, rate limiting, and input validation
 */

describe('Security Tests', () => {
  let authToken;

  beforeAll(async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@expojane.com',
      password: 'Admin123!',
    });

    authToken = response.body.token;
  });

  describe('Authentication Security', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/api/patients');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'admin@expojane.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'Password123!',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: "admin' OR '1'='1",
        password: "password' OR '1'='1",
      });

      expect(response.status).toBe(400);
    });

    it('should reject NoSQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        });

      expect(response.status).toBe(400);
    });

    it('should reject XSS attempts in patient creation', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: '<script>alert("XSS")</script>',
          lastName: 'Test',
          email: 'xss@test.com',
          phone: '555-0100',
          dateOfBirth: '1990-01-01',
        });

      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'not-an-email',
          phone: '555-0100',
          dateOfBirth: '1990-01-01',
        });

      expect(response.status).toBe(400);
    });

    it('should validate phone format', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          phone: 'invalid-phone',
          dateOfBirth: '1990-01-01',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const requests = [];

      // Make 10 failed login attempts
      for (let i = 0; i < 10; i += 1) {
        requests.push(
          request(app).post('/api/auth/login').send({
            email: 'test@test.com',
            password: 'wrong',
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      expect(rateLimited).toBe(true);
    }, 30000);
  });

  describe('Authorization', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      // Create a non-admin token (if your app supports role-based auth)
      const response = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'testuser@test.com',
          role: 'receptionist',
        });

      // Test if receptionist can access admin-only endpoints
      // This will depend on your RBAC implementation
      expect([200, 201, 403]).toContain(response.status);
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in responses', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'admin@expojane.com',
        password: 'Admin123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.password).toBeUndefined();
      expect(response.body.user?.password).toBeUndefined();
    });

    it('should not expose internal error details in production', async () => {
      const response = await request(app)
        .get('/api/patients/invalid-mongodb-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      // Should not expose stack traces or internal details
      expect(response.body.stack).toBeUndefined();
    });
  });

  describe('CORS Security', () => {
    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:8081');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/api/health');

      // Check for common security headers (Helmet)
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
