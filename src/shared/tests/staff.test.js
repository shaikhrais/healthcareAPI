const request = require('supertest');

const app = require('../server');
const User = require('../models/User');
/* eslint-env jest */
/**
 * Staff API Integration Tests
 * Tests staff CRUD operations, roles, and permissions
 */

describe('Staff API Tests', () => {
  let authToken;
  let testStaffId;

  beforeAll(async () => {
    // Login to get auth token
    const response = await request(app).post('/api/auth/login').send({
      email: 'admin@expojane.com',
      password: 'Admin123!',
    });

    authToken = response.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testStaffId) {
      await Staff.findByIdAndDelete(testStaffId);
    }
  });

  describe('POST /api/staff', () => {
    it('should create a new staff member', async () => {
      const response = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@test.com',
          role: 'practitioner',
          specialty: 'Physiotherapy',
          phone: '555-0200',
          color: '#4CAF50',
        });

      expect(response.status).toBe(201);
      expect(response.body.staff).toBeDefined();
      expect(response.body.staff.firstName).toBe('Dr. Sarah');
      testStaffId = response.body.staff._id;
    });

    it('should fail with duplicate email', async () => {
      const response = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@test.com',
          role: 'practitioner',
          specialty: 'Physiotherapy',
        });

      expect(response.status).toBe(400);
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          role: 'invalid_role',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/staff', () => {
    it('should get all staff members', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.staff).toBeDefined();
      expect(Array.isArray(response.body.staff)).toBe(true);
    });

    it('should filter staff by role', async () => {
      const response = await request(app)
        .get('/api/staff?role=practitioner')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.staff).toBeDefined();
    });
  });

  describe('GET /api/staff/:id', () => {
    it('should get a staff member by ID', async () => {
      const response = await request(app)
        .get(`/api/staff/${testStaffId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.staff).toBeDefined();
      expect(response.body.staff._id).toBe(testStaffId);
    });
  });

  describe('PUT /api/staff/:id', () => {
    it('should update a staff member', async () => {
      const response = await request(app)
        .put(`/api/staff/${testStaffId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '555-8888',
          isActive: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.staff.phone).toBe('555-8888');
    });
  });

  describe('DELETE /api/staff/:id', () => {
    it('should delete a staff member', async () => {
      const response = await request(app)
        .delete(`/api/staff/${testStaffId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      testStaffId = null;
    });
  });
});
