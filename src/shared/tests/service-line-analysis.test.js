const request = require('supertest');

const app = require('../server');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const ServiceLineAnalysis = require('../models/ServiceLineAnalysis');
/* eslint-env jest */
/**
 * Service Line Analysis API Tests
 */

describe('Service Line Analysis API', () => {
  let token;
  let adminToken;
  let practitionerId;
  let patientId;
  let adminId;

  beforeEach(async () => {
    // Create practitioner
    const practitioner = new User({
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@expojane.com',
      password: 'Password123',
      role: 'practitioner_frontdesk',
    });
    await practitioner.save();
    practitionerId = practitioner._id;

    // Create admin user
    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@expojane.com',
      password: 'AdminPass123',
      role: 'full_access',
    });
    await admin.save();
    adminId = admin._id;

    // Get auth tokens
    const authResponse = await request(app).post('/api/auth/login').send({
      email: 'sarah.johnson@expojane.com',
      password: 'Password123',
    });
    token = authResponse.body.token;

    const adminAuthResponse = await request(app).post('/api/auth/login').send({
      email: 'admin@expojane.com',
      password: 'AdminPass123',
    });
    adminToken = adminAuthResponse.body.token;

    // Create patient
    const patient = new Patient({
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '+1234567890',
      dateOfBirth: new Date('1990-01-15'),
    });
    await patient.save();
    patientId = patient._id;

    // Create test appointments with different service types
    const appointmentData = [
      {
        patient: patientId,
        practitioner: practitionerId,
        serviceType: 'RMT',
        appointmentType: 'consultation',
        startTime: new Date('2025-10-01T09:00:00Z'),
        endTime: new Date('2025-10-01T10:00:00Z'),
        duration: 60,
        status: 'completed',
      },
      {
        patient: patientId,
        practitioner: practitionerId,
        serviceType: 'RMT',
        appointmentType: 'follow-up',
        startTime: new Date('2025-10-02T09:00:00Z'),
        endTime: new Date('2025-10-02T10:00:00Z'),
        duration: 60,
        status: 'completed',
      },
      {
        patient: patientId,
        practitioner: practitionerId,
        serviceType: 'Physiotherapy',
        appointmentType: 'consultation',
        startTime: new Date('2025-10-03T09:00:00Z'),
        endTime: new Date('2025-10-03T10:00:00Z'),
        duration: 60,
        status: 'completed',
      },
      {
        patient: patientId,
        practitioner: practitionerId,
        serviceType: 'RMT',
        appointmentType: 'consultation',
        startTime: new Date('2025-10-04T09:00:00Z'),
        endTime: new Date('2025-10-04T10:00:00Z'),
        duration: 60,
        status: 'cancelled',
      },
      {
        patient: patientId,
        practitioner: practitionerId,
        serviceType: 'Acupuncture',
        appointmentType: 'consultation',
        startTime: new Date('2025-10-05T09:00:00Z'),
        endTime: new Date('2025-10-05T10:00:00Z'),
        duration: 60,
        status: 'no-show',
      },
    ];

    const appointments = await Appointment.create(appointmentData);

    // Create payments for completed appointments
    const completedAppointments = appointments.filter((a) => a.status === 'completed');
    await Payment.create(
      completedAppointments.map((apt, idx) => ({
        appointmentId: apt._id,
        patientId,
        amount: 100 + idx * 10,
        paymentMethod: idx % 2 === 0 ? 'card' : 'cash',
        status: 'completed',
        createdAt: apt.startTime,
      }))
    );
  });

  describe('GET /api/analytics/service-lines', () => {
    it('should get all service lines with statistics', async () => {
      const response = await request(app)
        .get('/api/analytics/service-lines')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.serviceLines)).toBe(true);
      expect(response.body.serviceLines.length).toBeGreaterThan(0);

      // Check that each service line has required fields
      response.body.serviceLines.forEach((sl) => {
        expect(sl).toHaveProperty('name');
        expect(sl).toHaveProperty('totalAppointments');
        expect(sl).toHaveProperty('completedAppointments');
      });
    });

    it('should reject request without authentication', async () => {
      await request(app).get('/api/analytics/service-lines').expect(401);
    });

    it('should reject request without proper authorization', async () => {
      // Create a patient user (not admin/billing)
      const patient = new User({
        firstName: 'Patient',
        lastName: 'User',
        email: 'patient@example.com',
        password: 'Patient123',
        role: 'patient',
      });
      await patient.save();

      const patientAuth = await request(app).post('/api/auth/login').send({
        email: 'patient@example.com',
        password: 'Patient123',
      });

      await request(app)
        .get('/api/analytics/service-lines')
        .set('Authorization', `Bearer ${patientAuth.body.token}`)
        .expect(403);
    });
  });

  describe('POST /api/analytics/service-line/generate', () => {
    it('should generate service line analysis successfully', async () => {
      const response = await request(app)
        .post('/api/analytics/service-line/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceLine: 'RMT',
          periodStart: '2025-10-01',
          periodEnd: '2025-10-31',
          periodType: 'monthly',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('serviceLine', 'RMT');
      expect(response.body.data).toHaveProperty('appointmentMetrics');
      expect(response.body.data).toHaveProperty('revenueMetrics');
      expect(response.body.data).toHaveProperty('utilizationMetrics');
      expect(response.body.data).toHaveProperty('patientMetrics');

      // Check that metrics are calculated
      expect(response.body.data.appointmentMetrics.total).toBeGreaterThan(0);
    });

    it('should return cached analysis if already exists', async () => {
      // Generate first time
      await request(app)
        .post('/api/analytics/service-line/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceLine: 'RMT',
          periodStart: '2025-10-01',
          periodEnd: '2025-10-31',
        });

      // Generate again with same parameters
      const response = await request(app)
        .post('/api/analytics/service-line/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceLine: 'RMT',
          periodStart: '2025-10-01',
          periodEnd: '2025-10-31',
        })
        .expect(200);

      expect(response.body.cached).toBe(true);
    });

    it('should reject request with missing parameters', async () => {
      const response = await request(app)
        .post('/api/analytics/service-line/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceLine: 'RMT',
          // Missing periodStart and periodEnd
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should calculate appointment metrics correctly', async () => {
      const response = await request(app)
        .post('/api/analytics/service-line/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceLine: 'RMT',
          periodStart: '2025-10-01',
          periodEnd: '2025-10-31',
        })
        .expect(200);

      const metrics = response.body.data.appointmentMetrics;
      expect(metrics.total).toBe(3); // 2 completed + 1 cancelled
      expect(metrics.completed).toBe(2);
      expect(metrics.cancelled).toBe(1);
      expect(metrics.completionRate).toBeGreaterThan(0);
    });

    it('should calculate revenue metrics correctly', async () => {
      const response = await request(app)
        .post('/api/analytics/service-line/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceLine: 'RMT',
          periodStart: '2025-10-01',
          periodEnd: '2025-10-31',
        })
        .expect(200);

      const metrics = response.body.data.revenueMetrics;
      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.averageRevenuePerAppointment).toBeGreaterThan(0);
      expect(metrics).toHaveProperty('revenueByPaymentMethod');
    });
  });

  describe('GET /api/analytics/service-line/:serviceLine', () => {
    beforeEach(async () => {
      // Generate some analysis data
      await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-09-01'),
        new Date('2025-09-30'),
        'monthly'
      ).then((analysis) => {
        analysis.calculatedBy = adminId;
        return analysis.save();
      });

      await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'monthly'
      ).then((analysis) => {
        analysis.calculatedBy = adminId;
        return analysis.save();
      });
    });

    it('should get analysis history for service line', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line/RMT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].serviceLine).toBe('RMT');
    });

    it('should filter by periodType', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line/RMT?periodType=monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((analysis) => {
        expect(analysis.periodType).toBe('monthly');
      });
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line/RMT?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/analytics/service-line-comparison', () => {
    it('should compare all service lines', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line-comparison?periodStart=2025-10-01&periodEnd=2025-10-31')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check summary
      expect(response.body.summary).toHaveProperty('totalRevenue');
      expect(response.body.summary).toHaveProperty('totalAppointments');
      expect(response.body.summary).toHaveProperty('serviceLinesCompared');
    });

    it('should compare specific service lines', async () => {
      const response = await request(app)
        .get(
          '/api/analytics/service-line-comparison?periodStart=2025-10-01&periodEnd=2025-10-31&serviceLines=RMT,Physiotherapy'
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should reject request without date range', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line-comparison')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/analytics/service-line-detail/:id', () => {
    let analysisId;

    beforeEach(async () => {
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'monthly'
      );
      analysis.calculatedBy = adminId;
      await analysis.save();
      analysisId = analysis._id;
    });

    it('should get specific analysis by ID', async () => {
      const response = await request(app)
        .get(`/api/analytics/service-line-detail/${analysisId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(analysisId.toString());
      expect(response.body.data.serviceLine).toBe('RMT');
    });

    it('should return 404 for non-existent analysis', async () => {
      await request(app)
        .get('/api/analytics/service-line-detail/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/analytics/service-line-detail/:id', () => {
    let analysisId;

    beforeEach(async () => {
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'monthly'
      );
      analysis.calculatedBy = adminId;
      await analysis.save();
      analysisId = analysis._id;
    });

    it('should delete analysis successfully', async () => {
      await request(app)
        .delete(`/api/analytics/service-line-detail/${analysisId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await ServiceLineAnalysis.findById(analysisId);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent analysis', async () => {
      await request(app)
        .delete('/api/analytics/service-line-detail/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should require full_access role', async () => {
      await request(app)
        .delete(`/api/analytics/service-line-detail/${analysisId}`)
        .set('Authorization', `Bearer ${token}`) // Non-admin token
        .expect(403);
    });
  });

  describe('GET /api/analytics/service-line-trends', () => {
    beforeEach(async () => {
      // Create multiple analyses for trend data
      const months = ['2025-08-01', '2025-09-01', '2025-10-01'];

      for (const month of months) {
        const start = new Date(month);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);

        const analysis = await ServiceLineAnalysis.generateAnalysis('RMT', start, end, 'monthly');
        analysis.calculatedBy = adminId;
        await analysis.save();
      }
    });

    it('should get trend data for service line', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line-trends?serviceLine=RMT')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.serviceLine).toBe('RMT');
      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body.dataPoints).toBeGreaterThan(0);

      // Check trend data structure
      if (response.body.trends.length > 0) {
        const trend = response.body.trends[0];
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('revenue');
        expect(trend).toHaveProperty('appointments');
        expect(trend).toHaveProperty('completionRate');
        expect(trend).toHaveProperty('utilizationRate');
      }
    });

    it('should filter by periodType', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line-trends?serviceLine=RMT&periodType=monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject request without serviceLine', async () => {
      const response = await request(app)
        .get('/api/analytics/service-line-trends')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('serviceLine is required');
    });
  });

  describe('ServiceLineAnalysis Model Methods', () => {
    it('should calculate metrics correctly', async () => {
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'monthly'
      );

      expect(analysis.appointmentMetrics.completionRate).toBeGreaterThanOrEqual(0);
      expect(analysis.appointmentMetrics.completionRate).toBeLessThanOrEqual(100);

      if (analysis.appointmentMetrics.total > 0) {
        const expectedRate =
          (analysis.appointmentMetrics.completed / analysis.appointmentMetrics.total) * 100;
        expect(analysis.appointmentMetrics.completionRate).toBeCloseTo(expectedRate, 1);
      }
    });

    it('should handle zero appointments gracefully', async () => {
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        'General',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'monthly'
      );

      expect(analysis.appointmentMetrics.total).toBe(0);
      expect(analysis.revenueMetrics.totalRevenue).toBe(0);
      expect(analysis.appointmentMetrics.completionRate).toBe(0);
    });

    it('should populate practitioner metrics', async () => {
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'monthly'
      );

      if (analysis.appointmentMetrics.completed > 0) {
        expect(analysis.practitionerMetrics.totalPractitioners).toBeGreaterThan(0);
        expect(Array.isArray(analysis.practitionerMetrics.topPerformers)).toBe(true);

        if (analysis.practitionerMetrics.topPerformers.length > 0) {
          const topPerformer = analysis.practitionerMetrics.topPerformers[0];
          expect(topPerformer).toHaveProperty('practitionerId');
          expect(topPerformer).toHaveProperty('practitionerName');
          expect(topPerformer).toHaveProperty('appointmentsCompleted');
          expect(topPerformer).toHaveProperty('revenueGenerated');
        }
      }
    });

    it('should populate time analysis', async () => {
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        'RMT',
        new Date('2025-10-01'),
        new Date('2025-10-31'),
        'monthly'
      );

      if (analysis.appointmentMetrics.total > 0) {
        expect(Array.isArray(analysis.timeAnalysis.peakDays)).toBe(true);
        expect(Array.isArray(analysis.timeAnalysis.peakHours)).toBe(true);

        if (analysis.timeAnalysis.peakDays.length > 0) {
          const peakDay = analysis.timeAnalysis.peakDays[0];
          expect(peakDay).toHaveProperty('day');
          expect(peakDay).toHaveProperty('appointmentCount');
          expect(peakDay).toHaveProperty('revenue');
        }
      }
    });
  });
});
