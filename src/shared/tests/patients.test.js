const request = require('supertest');

const app = require('../server');
const Patient = require('../models/Patient');
/* eslint-env jest */
/**
 * Patient API Integration Tests
 * Tests patient CRUD operations, search, and pagination
 */

describe('Patient API Tests', () => {
  let authToken;
  let testPatientId;

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
    if (testPatientId) {
      await Patient.findByIdAndDelete(testPatientId);
    }
  });

  describe('POST /api/patients', () => {
    it('should create a new patient', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          phone: '555-0100',
          dateOfBirth: '1990-01-01',
          gender: 'male',
          address: {
            street: '123 Test St',
            city: 'Test City',
            province: 'ON',
            postalCode: 'M1M 1M1',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.patient).toBeDefined();
      expect(response.body.patient.firstName).toBe('John');
      testPatientId = response.body.patient._id;
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
        });

      expect(response.status).toBe(400);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'invalid-email',
          phone: '555-0101',
          dateOfBirth: '1995-05-15',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/patients', () => {
    it('should get all patients with pagination', async () => {
      const response = await request(app)
        .get('/api/patients?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patients).toBeDefined();
      expect(Array.isArray(response.body.patients)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should search patients by name', async () => {
      const response = await request(app)
        .get('/api/patients?search=John')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patients).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/patients');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should get a patient by ID', async () => {
      const response = await request(app)
        .get(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patient).toBeDefined();
      expect(response.body.patient._id).toBe(testPatientId);
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update a patient', async () => {
      const response = await request(app)
        .put(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '555-9999',
        });

      expect(response.status).toBe(200);
      expect(response.body.patient.phone).toBe('555-9999');
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('should delete a patient', async () => {
      const response = await request(app)
        .delete(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      testPatientId = null; // Prevent cleanup attempt
    });
  });
});
