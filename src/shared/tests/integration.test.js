const request = require('supertest');

const app = require('../server');
/* eslint-env jest */
/**
 * Integration Tests
 * Tests complete user workflows across multiple endpoints
 */

describe('Integration Tests - Complete User Workflows', () => {
  let authToken;
  let patientId;
  let staffId;
  let appointmentId;

  describe('Complete Appointment Booking Flow', () => {
    it('1. Admin should login successfully', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'admin@expojane.com',
        password: 'Admin123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      authToken = response.body.token;
    });

    it('2. Should create a new patient', async () => {
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Integration',
          lastName: 'Test',
          email: 'integration@test.com',
          phone: '555-9999',
          dateOfBirth: '1985-06-15',
          gender: 'other',
        });

      expect(response.status).toBe(201);
      patientId = response.body.patient._id;
    });

    it('3. Should get available staff members', async () => {
      const response = await request(app)
        .get('/api/staff?role=practitioner&isActive=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.staff.length).toBeGreaterThan(0);
      staffId = response.body.staff[0]._id;
    });

    it('4. Should create an appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId: staffId,
          treatmentType: 'Consultation',
          startTime: tomorrow.toISOString(),
          duration: 60,
          status: 'scheduled',
          notes: 'Integration test appointment',
        });

      expect(response.status).toBe(201);
      expect(response.body.appointment).toBeDefined();
      appointmentId = response.body.appointment._id;
    });

    it('5. Should retrieve the appointment', async () => {
      const response = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.appointment.patientId).toBe(patientId);
    });

    it('6. Should update appointment status to confirmed', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'confirmed',
        });

      expect(response.status).toBe(200);
      expect(response.body.appointment.status).toBe('confirmed');
    });

    it('7. Should get patient appointments', async () => {
      const response = await request(app)
        .get(`/api/patients/${patientId}/appointments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.appointments).toBeDefined();
      expect(response.body.appointments.length).toBeGreaterThan(0);
    });

    it('8. Should cancel the appointment', async () => {
      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'cancelled',
        });

      expect(response.status).toBe(200);
      expect(response.body.appointment.status).toBe('cancelled');
    });

    it('9. Cleanup - delete appointment', async () => {
      const response = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('10. Cleanup - delete patient', async () => {
      const response = await request(app)
        .delete(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Schedule Management Flow', () => {
    it('should get schedule for a specific date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/schedule?date=${today}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.schedule).toBeDefined();
    });

    it('should get schedule for a practitioner', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${authToken}`);

      const practitioner = response.body.staff.find((s) => s.role === 'practitioner');
      if (practitioner) {
        const scheduleResponse = await request(app)
          .get(`/api/schedule?practitionerId=${practitioner._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(scheduleResponse.status).toBe(200);
      }
    });
  });

  describe('Search and Filter Workflows', () => {
    it('should search patients across multiple fields', async () => {
      const response = await request(app)
        .get('/api/patients?search=test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.patients).toBeDefined();
    });

    it('should filter appointments by status', async () => {
      const response = await request(app)
        .get('/api/appointments?status=scheduled')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.appointments).toBeDefined();
    });

    it('should filter appointments by date range', async () => {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/appointments?startDate=${today.toISOString()}&endDate=${nextWeek.toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle invalid patient ID gracefully', async () => {
      const response = await request(app)
        .get('/api/patients/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should prevent double-booking', async () => {
      const response = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${authToken}`);

      const practitioner = response.body.staff.find((s) => s.role === 'practitioner');

      if (practitioner) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);

        // Create first appointment
        const apt1 = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            patientId: 'test-patient-id',
            practitionerId: practitioner._id,
            treatmentType: 'Massage',
            startTime: tomorrow.toISOString(),
            duration: 60,
            status: 'scheduled',
          });

        // Try to create overlapping appointment
        const apt2 = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            patientId: 'test-patient-id-2',
            practitionerId: practitioner._id,
            treatmentType: 'Massage',
            startTime: tomorrow.toISOString(),
            duration: 60,
            status: 'scheduled',
          });

        expect(apt2.status).toBe(400);

        // Cleanup
        if (apt1.body.appointment) {
          await request(app)
            .delete(`/api/appointments/${apt1.body.appointment._id}`)
            .set('Authorization', `Bearer ${authToken}`);
        }
      }
    });
  });
});
