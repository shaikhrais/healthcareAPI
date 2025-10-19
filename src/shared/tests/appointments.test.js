const request = require('supertest');

const app = require('../server');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Treatment = require('../models/Treatment');
const Appointment = require('../models/Appointment');
/* eslint-env jest */
/**
 * Appointments API Tests
 */

describe('Appointments API', () => {
  let token;
  let practitionerId;
  let patientId;
  let treatmentId;

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

    // Get auth token
    const authResponse = await request(app).post('/api/auth/login').send({
      email: 'sarah.johnson@expojane.com',
      password: 'Password123',
    });
    token = authResponse.body.token;

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

    // Create treatment
    const treatment = new Treatment({
      name: 'Initial Consultation',
      category: 'consultation',
      duration: 60,
      price: 100,
    });
    await treatment.save();
    treatmentId = treatment._id;
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment successfully', async () => {
      const appointmentData = {
        patient: patientId,
        practitioner: practitionerId,
        treatment: treatmentId,
        startTime: new Date('2025-12-01T10:00:00Z'),
        endTime: new Date('2025-12-01T11:00:00Z'),
        duration: 60,
        status: 'scheduled',
        appointmentType: 'consultation',
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.status).toBe('scheduled');
      expect(response.body.duration).toBe(60);
    });

    it('should reject appointment without authentication', async () => {
      const appointmentData = {
        patient: patientId,
        practitioner: practitionerId,
        treatment: treatmentId,
        startTime: new Date('2025-12-01T10:00:00Z'),
        endTime: new Date('2025-12-01T11:00:00Z'),
        duration: 60,
        appointmentType: 'consultation',
      };

      await request(app).post('/api/appointments').send(appointmentData).expect(401);
    });

    it('should reject appointment with invalid patient ID', async () => {
      const appointmentData = {
        patient: '507f1f77bcf86cd799439011', // Non-existent ID
        practitioner: practitionerId,
        treatment: treatmentId,
        startTime: new Date('2025-12-01T10:00:00Z'),
        endTime: new Date('2025-12-01T11:00:00Z'),
        duration: 60,
        appointmentType: 'consultation',
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send(appointmentData)
        .expect(400);
    });
  });

  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      // Create test appointments
      await Appointment.create([
        {
          patient: patientId,
          practitioner: practitionerId,
          treatment: treatmentId,
          startTime: new Date('2025-12-01T09:00:00Z'),
          endTime: new Date('2025-12-01T10:00:00Z'),
          duration: 60,
          status: 'scheduled',
          appointmentType: 'consultation',
          createdBy: practitionerId,
        },
        {
          patient: patientId,
          practitioner: practitionerId,
          treatment: treatmentId,
          startTime: new Date('2025-12-01T14:00:00Z'),
          endTime: new Date('2025-12-01T15:00:00Z'),
          duration: 60,
          status: 'confirmed',
          appointmentType: 'consultation',
          createdBy: practitionerId,
        },
      ]);
    });

    it('should get all appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should filter appointments by status', async () => {
      const response = await request(app)
        .get('/api/appointments?status=confirmed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('confirmed');
    });

    it('should filter appointments by practitioner', async () => {
      const response = await request(app)
        .get(`/api/appointments?practitioner=${practitionerId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].practitioner._id.toString()).toBe(practitionerId.toString());
    });
  });

  describe('PUT /api/appointments/:id', () => {
    let appointmentId;

    beforeEach(async () => {
      const appointment = await Appointment.create({
        patient: patientId,
        practitioner: practitionerId,
        treatment: treatmentId,
        startTime: new Date('2025-12-01T10:00:00Z'),
        endTime: new Date('2025-12-01T11:00:00Z'),
        duration: 60,
        status: 'scheduled',
        appointmentType: 'consultation',
        createdBy: practitionerId,
      });
      appointmentId = appointment._id;
    });

    it('should update appointment status', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.status).toBe('confirmed');
    });

    it('should return 404 for non-existent appointment', async () => {
      await request(app)
        .put('/api/appointments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'confirmed' })
        .expect(404);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    let appointmentId;

    beforeEach(async () => {
      const appointment = await Appointment.create({
        patient: patientId,
        practitioner: practitionerId,
        treatment: treatmentId,
        startTime: new Date('2025-12-01T10:00:00Z'),
        endTime: new Date('2025-12-01T11:00:00Z'),
        duration: 60,
        status: 'scheduled',
        appointmentType: 'consultation',
        createdBy: practitionerId,
      });
      appointmentId = appointment._id;
    });

    it('should delete appointment successfully', async () => {
      await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const deleted = await Appointment.findById(appointmentId);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent appointment', async () => {
      await request(app)
        .delete('/api/appointments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
