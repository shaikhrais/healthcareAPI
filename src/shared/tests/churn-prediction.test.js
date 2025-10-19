const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const ChurnPrediction = require('../models/ChurnPrediction');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const User = require('../models/User');
/* eslint-env jest */
// eslint-disable-next-line no-unused-vars
describe('Churn Prediction API Endpoints', () => {
  let authToken;
  let adminUser;
  let testPatient;
  let testAppointments = [];

  beforeAll(async () => {
    // Create admin user
    adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      accessLevel: 'full_access',
    });

    // Login to get token
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'password123',
    });

    authToken = loginResponse.body.token;

    // Create test patient
    testPatient = await Patient.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      phone: '555-0123',
      dateOfBirth: new Date('1980-01-01'),
      active: true,
    });

    // Create appointments for the patient (mix of statuses)
    const now = new Date();
    const appointments = [
      {
        patient: testPatient._id,
        practitioner: adminUser._id,
        serviceType: 'RMT',
        appointmentType: 'consultation',
        startTime: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000), // 150 days ago
        endTime: new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        duration: 60,
        status: 'completed',
      },
      {
        patient: testPatient._id,
        practitioner: adminUser._id,
        serviceType: 'RMT',
        appointmentType: 'follow-up',
        startTime: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        endTime: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        duration: 60,
        status: 'completed',
      },
      {
        patient: testPatient._id,
        practitioner: adminUser._id,
        serviceType: 'RMT',
        appointmentType: 'follow-up',
        startTime: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        endTime: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        duration: 60,
        status: 'cancelled',
      },
    ];

    testAppointments = await Appointment.insertMany(appointments);

    // Create payments
    await Payment.create({
      patientId: testPatient._id,
      appointmentId: testAppointments[0]._id,
      amount: 85.0,
      paymentMethod: 'credit_card',
      status: 'completed',
      processedBy: adminUser._id,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await ChurnPrediction.deleteMany({});
    await Appointment.deleteMany({});
    await Payment.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/analytics/churn/generate/:patientId', () => {
    it('should generate churn prediction for a patient', async () => {
      const response = await request(app)
        .post(`/api/analytics/churn/generate/${testPatient._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('churnRisk');
      expect(response.body.data.churnRisk).toHaveProperty('score');
      expect(response.body.data.churnRisk).toHaveProperty('level');
      expect(response.body.data.patient._id).toBe(testPatient._id.toString());
      expect(response.body.cached).toBe(false);
    });

    it('should return cached prediction if generated recently', async () => {
      // Generate first prediction
      await request(app)
        .post(`/api/analytics/churn/generate/${testPatient._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to generate again
      const response = await request(app)
        .post(`/api/analytics/churn/generate/${testPatient._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
      expect(response.body.message).toContain('Recent prediction found');
    });

    it('should require authentication', async () => {
      await request(app).post(`/api/analytics/churn/generate/${testPatient._id}`).expect(401);
    });

    it('should require proper authorization', async () => {
      // Create limited access user
      const limitedUser = await User.create({
        firstName: 'Limited',
        lastName: 'User',
        email: 'limited@test.com',
        password: 'password123',
        role: 'staff',
        accessLevel: 'limited',
      });

      const limitedLoginResponse = await request(app).post('/api/auth/login').send({
        email: 'limited@test.com',
        password: 'password123',
      });

      const limitedToken = limitedLoginResponse.body.token;

      await request(app)
        .post(`/api/analytics/churn/generate/${testPatient._id}`)
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);

      await User.findByIdAndDelete(limitedUser._id);
    });

    it('should handle invalid patient ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/analytics/churn/generate/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Patient not found');
    });
  });

  describe('POST /api/analytics/churn/batch-generate', () => {
    it('should generate predictions for multiple patients', async () => {
      // Create additional test patient
      const testPatient2 = await Patient.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        phone: '555-0124',
        dateOfBirth: new Date('1985-01-01'),
        active: true,
      });

      // Create appointments for patient 2
      await Appointment.create({
        patient: testPatient2._id,
        practitioner: adminUser._id,
        serviceType: 'RPT',
        appointmentType: 'consultation',
        startTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        duration: 60,
        status: 'completed',
      });

      const response = await request(app)
        .post('/api/analytics/churn/batch-generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientIds: [testPatient._id, testPatient2._id],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results.total).toBe(2);
      expect(response.body.results.successful).toBeGreaterThan(0);

      // Clean up
      await Patient.findByIdAndDelete(testPatient2._id);
    });

    it('should require full_access authorization', async () => {
      const response = await request(app)
        .post('/api/analytics/churn/batch-generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientIds: [testPatient._id],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/analytics/churn/patients-at-risk', () => {
    beforeAll(async () => {
      // Ensure we have at least one prediction
      await ChurnPrediction.deleteMany({});
      await request(app)
        .post(`/api/analytics/churn/generate/${testPatient._id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should return list of patients at risk', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/patients-at-risk')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('riskLevelCounts');
    });

    it('should filter by risk level', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/patients-at-risk?riskLevel=High')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach((pred) => {
          expect(pred.churnRisk.level).toBe('High');
        });
      }
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/patients-at-risk?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/analytics/churn/patients-at-risk').expect(401);
    });
  });

  describe('GET /api/analytics/churn/dashboard', () => {
    it('should return dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalPredictions');
      expect(response.body.summary).toHaveProperty('averageChurnScore');
      expect(response.body.summary).toHaveProperty('patientsAtHighRisk');
      expect(response.body).toHaveProperty('riskDistribution');
      expect(response.body).toHaveProperty('retentionStrategies');
      expect(response.body).toHaveProperty('topChurnIndicators');
    });

    it('should accept date range filters', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/analytics/churn/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.period.start).toBeTruthy();
      expect(response.body.period.end).toBeTruthy();
    });

    it('should require authentication', async () => {
      await request(app).get('/api/analytics/churn/dashboard').expect(401);
    });
  });

  describe('GET /api/analytics/churn/patient/:patientId', () => {
    it('should return churn prediction history for a patient', async () => {
      const response = await request(app)
        .get(`/api/analytics/churn/patient/${testPatient._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('latest');
      expect(response.body).toHaveProperty('trend');
    });

    it('should return empty array for patient with no predictions', async () => {
      const newPatient = await Patient.create({
        firstName: 'New',
        lastName: 'Patient',
        email: 'new.patient@test.com',
        phone: '555-9999',
        dateOfBirth: new Date('1990-01-01'),
        active: true,
      });

      const response = await request(app)
        .get(`/api/analytics/churn/patient/${newPatient._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(0);

      await Patient.findByIdAndDelete(newPatient._id);
    });

    it('should require authentication', async () => {
      await request(app).get(`/api/analytics/churn/patient/${testPatient._id}`).expect(401);
    });
  });

  describe('PUT /api/analytics/churn/:predictionId/retention-strategy', () => {
    let predictionId;

    beforeAll(async () => {
      // Create a prediction
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction.save();
      predictionId = prediction._id;
    });

    it('should update retention strategy status', async () => {
      const response = await request(app)
        .put(`/api/analytics/churn/${predictionId}/retention-strategy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'in_progress',
          notes: 'Started outreach campaign',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.retentionStrategy.status).toBe('in_progress');
      expect(response.body.data.retentionStrategy.notes).toBe('Started outreach campaign');
    });

    it('should update assigned user', async () => {
      const response = await request(app)
        .put(`/api/analytics/churn/${predictionId}/retention-strategy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignedTo: adminUser._id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.retentionStrategy.assignedTo).toBeTruthy();
    });

    it('should handle invalid prediction ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .put(`/api/analytics/churn/${fakeId}/retention-strategy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/analytics/churn/${predictionId}/retention-strategy`)
        .send({ status: 'completed' })
        .expect(401);
    });
  });

  describe('POST /api/analytics/churn/:predictionId/retention-effort', () => {
    let predictionId;

    beforeAll(async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction.save();
      predictionId = prediction._id;
    });

    it('should add retention effort', async () => {
      const response = await request(app)
        .post(`/api/analytics/churn/${predictionId}/retention-effort`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'call',
          description: 'Called patient to schedule follow-up',
          outcome: 'positive',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.retentionEfforts.length).toBeGreaterThan(0);

      const latestEffort =
        response.body.data.retentionEfforts[response.body.data.retentionEfforts.length - 1];
      expect(latestEffort.type).toBe('call');
      expect(latestEffort.outcome).toBe('positive');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post(`/api/analytics/churn/${predictionId}/retention-effort`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'email',
          // Missing description and outcome
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/analytics/churn/${predictionId}/retention-effort`)
        .send({
          type: 'sms',
          description: 'Sent reminder',
          outcome: 'no_response',
        })
        .expect(401);
    });
  });

  describe('PUT /api/analytics/churn/:predictionId/actual-outcome', () => {
    let predictionId;

    beforeAll(async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction.save();
      predictionId = prediction._id;
    });

    it('should update actual outcome', async () => {
      const response = await request(app)
        .put(`/api/analytics/churn/${predictionId}/actual-outcome`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          churned: false,
          churnDate: null,
          churnReason: null,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.actualOutcome.churned).toBe(false);
      expect(response.body).toHaveProperty('predictionAccurate');
    });

    it('should record churn with reason', async () => {
      const newPrediction = await ChurnPrediction.generatePrediction(
        testPatient._id,
        adminUser._id
      );
      await newPrediction.save();

      const response = await request(app)
        .put(`/api/analytics/churn/${newPrediction._id}/actual-outcome`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          churned: true,
          churnDate: new Date(),
          churnReason: 'price',
          churnReasonDetails: 'Found cheaper alternative',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.actualOutcome.churned).toBe(true);
      expect(response.body.data.actualOutcome.churnReason).toBe('price');
    });

    it('should require churned field', async () => {
      const response = await request(app)
        .put(`/api/analytics/churn/${predictionId}/actual-outcome`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing churned field
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('churned');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/analytics/churn/${predictionId}/actual-outcome`)
        .send({ churned: false })
        .expect(401);
    });
  });

  describe('GET /api/analytics/churn/model-accuracy', () => {
    beforeAll(async () => {
      // Create predictions with validated outcomes
      const prediction1 = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction1.save();
      await prediction1.updateOutcome(true, new Date(), 'quality');

      const prediction2 = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction2.save();
      await prediction2.updateOutcome(false);
    });

    it('should return model accuracy metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/model-accuracy')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('accuracy');
      expect(response.body.metrics).toHaveProperty('precision');
      expect(response.body.metrics).toHaveProperty('recall');
      expect(response.body.metrics).toHaveProperty('f1Score');
      expect(response.body.metrics).toHaveProperty('totalPredictions');
    });

    it('should accept date range', async () => {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/analytics/churn/model-accuracy?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.period).toBeTruthy();
    });

    it('should require authentication', async () => {
      await request(app).get('/api/analytics/churn/model-accuracy').expect(401);
    });
  });

  describe('GET /api/analytics/churn/trends', () => {
    it('should return churn risk trends', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('trends');
      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body).toHaveProperty('groupBy');
    });

    it('should support grouping by month', async () => {
      const response = await request(app)
        .get('/api/analytics/churn/trends?groupBy=month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.groupBy).toBe('month');
    });

    it('should accept date range', async () => {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/analytics/churn/trends?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app).get('/api/analytics/churn/trends').expect(401);
    });
  });

  describe('DELETE /api/analytics/churn/:predictionId', () => {
    it('should delete a churn prediction', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction.save();

      const response = await request(app)
        .delete(`/api/analytics/churn/${prediction._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify deletion
      const deletedPrediction = await ChurnPrediction.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it('should handle invalid prediction ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await request(app)
        .delete(`/api/analytics/churn/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);
      await prediction.save();

      await request(app).delete(`/api/analytics/churn/${prediction._id}`).expect(401);
    });
  });

  describe('ChurnPrediction Model Methods', () => {
    it('should calculate churn risk correctly', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);

      expect(prediction.churnRisk.score).toBeGreaterThanOrEqual(0);
      expect(prediction.churnRisk.score).toBeLessThanOrEqual(100);
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(prediction.churnRisk.level);
    });

    it('should identify churn indicators', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);

      expect(prediction.churnIndicators).toHaveProperty('redFlags');
      expect(prediction.churnIndicators).toHaveProperty('protectiveFactors');
      expect(Array.isArray(prediction.churnIndicators.redFlags)).toBe(true);
      expect(Array.isArray(prediction.churnIndicators.protectiveFactors)).toBe(true);
    });

    it('should generate retention strategy', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);

      expect(prediction.retentionStrategy).toHaveProperty('recommendedActions');
      expect(Array.isArray(prediction.retentionStrategy.recommendedActions)).toBe(true);
      expect(prediction.retentionStrategy.recommendedActions.length).toBeGreaterThan(0);

      prediction.retentionStrategy.recommendedActions.forEach((action) => {
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('timeline');
        expect(action).toHaveProperty('expectedImpact');
      });
    });

    it('should extract all feature categories', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);

      expect(prediction.engagementFeatures).toBeTruthy();
      expect(prediction.appointmentBehavior).toBeTruthy();
      expect(prediction.paymentBehavior).toBeTruthy();
      expect(prediction.communicationFeatures).toBeTruthy();
      expect(prediction.relationshipFeatures).toBeTruthy();
      expect(prediction.treatmentFeatures).toBeTruthy();
      expect(prediction.temporalFeatures).toBeTruthy();
      expect(prediction.competitiveFeatures).toBeTruthy();
    });

    it('should assign higher risk for inactive patients', async () => {
      const prediction = await ChurnPrediction.generatePrediction(testPatient._id, adminUser._id);

      // Patient has no appointments in last 90 days, should be high risk
      expect(prediction.engagementFeatures.daysSinceLastAppointment).toBeGreaterThan(90);
      expect(['High', 'Critical']).toContain(prediction.churnRisk.level);
    });
  });
});
