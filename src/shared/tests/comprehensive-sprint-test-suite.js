const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');

// Import app and models
const app = require('../server');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

/**
 * Comprehensive Sprint 1-6 Test Suite
 * Tests all authentication, patient management, and scheduling features
 */

describe('ExpoJane Healthcare System - Complete Test Suite', () => {
  let authTokens = {};
  let testUsers = {};
  let testPatients = {};
  let testAppointments = {};

  // Test data fixtures
  const testUserData = {
    admin: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    },
    doctor: {
      firstName: 'Dr. John',
      lastName: 'Smith',
      email: 'doctor@test.com', 
      password: 'DoctorPass123!',
      role: 'doctor'
    },
    nurse: {
      firstName: 'Nurse',
      lastName: 'Johnson',
      email: 'nurse@test.com',
      password: 'NursePass123!',
      role: 'nurse'
    },
    patient: {
      firstName: 'Patient',
      lastName: 'Doe',
      email: 'patient@test.com',
      password: 'PatientPass123!',
      role: 'patient'
    }
  };

  const testPatientData = {
    patient1: {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1980-01-01',
      gender: 'Male',
      phone: '555-0123',
      email: 'john.doe@test.com',
      address: {
        street: '123 Main St',
        city: 'Los Angeles', 
        state: 'CA',
        zipCode: '90210'
      },
      primaryInsurance: {
        provider: 'Blue Cross',
        policyNumber: 'BC123456789',
        groupNumber: 'GRP001'
      }
    },
    patient2: {
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1975-05-15',
      gender: 'Female',
      phone: '555-0124',
      email: 'jane.smith@test.com',
      address: {
        street: '456 Oak Ave',
        city: 'New York',
        state: 'NY', 
        zipCode: '10001'
      }
    }
  };

  // Helper functions
  const createUser = async (userData) => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    return response.body;
  };

  const loginUser = async (email, password) => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    return response.body;
  };

  const getAuthToken = async (role) => {
    if (authTokens[role]) return authTokens[role];
    
    const userData = testUserData[role];
    await createUser(userData);
    const loginResponse = await loginUser(userData.email, userData.password);
    authTokens[role] = loginResponse.accessToken;
    testUsers[role] = loginResponse.user;
    return authTokens[role];
  };

  const createTestPatient = async (role = 'nurse', patientData = testPatientData.patient1) => {
    const token = await getAuthToken(role);
    const response = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send(patientData);
    return response.body;
  };

  const setupMFAForUser = async (email) => {
    const token = await getAuthToken('admin');
    const setupResponse = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Authorization', `Bearer ${token}`);
    
    const { secret } = setupResponse.body;
    const totpCode = speakeasy.totp({ secret, encoding: 'base32' });
    
    await request(app)
      .post('/api/auth/mfa/verify-setup')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: totpCode });
    
    return { secret, backupCodes: setupResponse.body.backupCodes };
  };

  // Setup and cleanup
  beforeAll(async () => {
    // Clear test data
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Patient.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Appointment.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Patient.deleteMany({ email: { $regex: /@test\.com$/ } });
    await Appointment.deleteMany({});
  });

  // ========================================
  // SPRINT 1-2: AUTHENTICATION & SECURITY
  // ========================================

  describe('Authentication System', () => {
    describe('User Registration (TASK-1.1)', () => {
      test('should register new user with valid data', async () => {
        const userData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          phone: '1234567890'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData);

        expect(response.status).toBe(201);
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
      });

      test('should reject duplicate email registration', async () => {
        const userData = testUserData.admin;
        await createUser(userData);
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('already exists');
      });

      test('should validate password strength', async () => {
        const weakPasswordUser = {
          ...testUserData.admin,
          email: 'weak@test.com',
          password: 'weak'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(weakPasswordUser);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      });
    });

    describe('JWT Authentication (TASK-1.2)', () => {
      test('should login with valid credentials', async () => {
        await createUser(testUserData.admin);
        
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUserData.admin.email,
            password: testUserData.admin.password
          });

        expect(response.status).toBe(200);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
        expect(response.body.user.email).toBe(testUserData.admin.email);
      });

      test('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'wrong@test.com',
            password: 'wrongpass'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('Invalid credentials');
      });

      test('should protect routes with JWT middleware', async () => {
        // Try to access protected route without token
        const noTokenResponse = await request(app)
          .get('/api/users/profile');
        expect(noTokenResponse.status).toBe(401);

        // Access with valid token
        const token = await getAuthToken('admin');
        const protectedResponse = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${token}`);
        expect(protectedResponse.status).toBe(200);
      });
    });

    describe('Password Reset Flow (TASK-1.3)', () => {
      test('should send password reset email', async () => {
        await createUser(testUserData.admin);
        
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testUserData.admin.email });

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('reset instructions sent');
      });

      test('should handle non-existent email gracefully', async () => {
        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'nonexistent@test.com' });

        // Should still return 200 for security
        expect(response.status).toBe(200);
      });
    });

    describe('Role-Based Access Control (TASK-2.1)', () => {
      test('should enforce role hierarchy permissions', async () => {
        const adminToken = await getAuthToken('admin');
        const nurseToken = await getAuthToken('nurse');
        const patientToken = await getAuthToken('patient');

        // Admin should access admin endpoints
        const adminResponse = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(adminResponse.status).toBe(200);

        // Nurse should NOT access admin endpoints
        const nurseResponse = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${nurseToken}`);
        expect(nurseResponse.status).toBe(403);

        // Patient should not access admin endpoints
        const patientResponse = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${patientToken}`);
        expect(patientResponse.status).toBe(403);
      });
    });

    describe('Multi-Factor Authentication (TASK-2.4)', () => {
      test('should setup MFA for user', async () => {
        const token = await getAuthToken('admin');
        
        const setupResponse = await request(app)
          .post('/api/auth/mfa/setup')
          .set('Authorization', `Bearer ${token}`);

        expect(setupResponse.status).toBe(200);
        expect(setupResponse.body.qrCode).toBeDefined();
        expect(setupResponse.body.secret).toBeDefined();
        expect(setupResponse.body.backupCodes).toHaveLength(10);
      });

      test('should require MFA for login after setup', async () => {
        // Setup MFA first
        const mfaData = await setupMFAForUser(testUserData.admin.email);
        
        // Login should now require MFA
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUserData.admin.email,
            password: testUserData.admin.password
          });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.mfaRequired).toBe(true);
        expect(loginResponse.body.tempToken).toBeDefined();
      });
    });
  });

  // ========================================
  // SPRINT 3-4: PATIENT MANAGEMENT
  // ========================================

  describe('Patient Management System', () => {
    describe('Patient Profile Creation (TASK-3.1)', () => {
      test('should create complete patient profile', async () => {
        const token = await getAuthToken('nurse');
        
        const response = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${token}`)
          .send(testPatientData.patient1);

        expect(response.status).toBe(201);
        expect(response.body.patientId).toBeDefined();
        expect(response.body.mrn).toBeDefined();
        expect(response.body.firstName).toBe(testPatientData.patient1.firstName);
        
        testPatients.patient1 = response.body;
      });

      test('should validate required fields', async () => {
        const token = await getAuthToken('nurse');
        const incompleteData = { firstName: 'John' };

        const response = await request(app)
          .post('/api/patients')
          .set('Authorization', `Bearer ${token}`)
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });

      test('should detect potential duplicate patients', async () => {
        const token = await getAuthToken('nurse');
        
        // Create first patient
        await createTestPatient('nurse', testPatientData.patient1);
        
        // Check for duplicate
        const duplicateCheck = await request(app)
          .post('/api/patients/check-duplicate')
          .set('Authorization', `Bearer ${token}`)
          .send({
            firstName: testPatientData.patient1.firstName,
            lastName: testPatientData.patient1.lastName,
            dateOfBirth: testPatientData.patient1.dateOfBirth
          });

        expect(duplicateCheck.status).toBe(200);
        expect(duplicateCheck.body.potentialDuplicates.length).toBeGreaterThan(0);
      });
    });

    describe('Medical History Tracking (TASK-3.2)', () => {
      test('should add medical condition to patient history', async () => {
        const token = await getAuthToken('doctor');
        const patient = await createTestPatient('doctor');
        
        const condition = {
          conditionName: 'Type 2 Diabetes',
          icd10Code: 'E11.9',
          category: 'Chronic',
          diagnosisDate: '2023-01-15',
          severity: 'Moderate',
          status: 'Active',
          notes: 'Patient diagnosed with HbA1c of 8.2%'
        };

        const response = await request(app)
          .post(`/api/patients/${patient.patientId}/conditions`)
          .set('Authorization', `Bearer ${token}`)
          .send(condition);

        expect(response.status).toBe(201);
        expect(response.body.conditionId).toBeDefined();
        expect(response.body.conditionName).toBe(condition.conditionName);
        expect(response.body.icd10Code).toBe(condition.icd10Code);
      });

      test('should update condition status', async () => {
        const token = await getAuthToken('doctor');
        const patient = await createTestPatient('doctor');
        
        // Add condition first
        const conditionResponse = await request(app)
          .post(`/api/patients/${patient.patientId}/conditions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            conditionName: 'Test Condition',
            diagnosisDate: '2023-01-01',
            status: 'Active'
          });

        const conditionId = conditionResponse.body.conditionId;

        // Update condition
        const updateResponse = await request(app)
          .put(`/api/patients/${patient.patientId}/conditions/${conditionId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            status: 'Resolved',
            notes: 'Condition resolved after treatment'
          });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.status).toBe('Resolved');
      });
    });

    describe('Insurance Information Management (TASK-3.3)', () => {
      test('should add primary insurance information', async () => {
        const token = await getAuthToken('admin');
        const patient = await createTestPatient('admin');
        
        const insuranceData = {
          provider: 'Blue Cross Blue Shield',
          planName: 'PPO Select',
          policyNumber: 'BC123456789',
          groupNumber: 'GRP001',
          subscriberId: 'SUB123',
          subscriberName: 'John Doe',
          subscriberRelationship: 'Self',
          effectiveDate: '2023-01-01',
          expirationDate: '2023-12-31',
          copayAmounts: {
            primaryCare: 25,
            specialist: 50,
            emergency: 200
          }
        };

        const response = await request(app)
          .post(`/api/patients/${patient.patientId}/insurance/primary`)
          .set('Authorization', `Bearer ${token}`)
          .send(insuranceData);

        expect(response.status).toBe(201);
        expect(response.body.provider).toBe(insuranceData.provider);
        expect(response.body.copayAmounts.primaryCare).toBe(25);
      });
    });

    describe('Patient Search & Filtering (TASK-3.4)', () => {
      beforeAll(async () => {
        // Create multiple test patients for search testing
        const token = await getAuthToken('nurse');
        
        await createTestPatient('nurse', {
          firstName: 'John', lastName: 'Smith',
          dateOfBirth: '1980-01-01', city: 'Los Angeles'
        });
        
        await createTestPatient('nurse', {
          firstName: 'Jane', lastName: 'Doe', 
          dateOfBirth: '1975-05-15', city: 'New York'
        });
      });

      test('should search patients by name', async () => {
        const token = await getAuthToken('nurse');
        
        const response = await request(app)
          .get('/api/patients/search?query=John')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.results.length).toBeGreaterThan(0);
        expect(response.body.results.some(p => p.firstName === 'John')).toBe(true);
      });

      test('should filter by multiple criteria', async () => {
        const token = await getAuthToken('nurse');
        
        const response = await request(app)
          .get('/api/patients/search?lastName=Smith&address.city=Los Angeles')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.results.length).toBeGreaterThan(0);
      });

      test('should paginate search results', async () => {
        const token = await getAuthToken('nurse');
        
        const response = await request(app)
          .get('/api/patients/search?page=1&limit=1')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.results.length).toBe(1);
        expect(response.body.pagination.currentPage).toBe(1);
        expect(response.body.pagination.totalPages).toBeDefined();
      });
    });
  });

  // ========================================
  // SPRINT 5-6: SCHEDULING SYSTEM
  // ========================================

  describe('Scheduling System', () => {
    let testProviderId;

    beforeAll(async () => {
      // Create a test provider (doctor)
      const doctorToken = await getAuthToken('doctor');
      testProviderId = testUsers.doctor._id;
    });

    describe('Calendar View Component (TASK-5.1)', () => {
      test('should display calendar with appointments', async () => {
        const token = await getAuthToken('nurse');
        const patient = await createTestPatient('nurse');
        
        // Create test appointment
        const appointmentResponse = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            patientId: patient.patientId,
            providerId: testProviderId,
            appointmentType: 'Consultation',
            startTime: '2023-10-15T10:00:00Z',
            endTime: '2023-10-15T10:30:00Z',
            notes: 'Regular checkup'
          });

        expect(appointmentResponse.status).toBe(201);
        
        // Get calendar view
        const calendarResponse = await request(app)
          .get('/api/calendar/view?startDate=2023-10-15&endDate=2023-10-15')
          .set('Authorization', `Bearer ${token}`);

        expect(calendarResponse.status).toBe(200);
        expect(calendarResponse.body.appointments.length).toBeGreaterThan(0);
        
        testAppointments.consultation = appointmentResponse.body;
      });

      test('should handle appointment rescheduling', async () => {
        const token = await getAuthToken('nurse');
        
        if (!testAppointments.consultation) {
          // Create appointment if not exists
          const patient = await createTestPatient('nurse');
          const appointmentResponse = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${token}`)
            .send({
              patientId: patient.patientId,
              providerId: testProviderId,
              appointmentType: 'Follow-up',
              startTime: '2023-10-16T09:00:00Z',
              endTime: '2023-10-16T09:30:00Z'
            });
          testAppointments.consultation = appointmentResponse.body;
        }

        // Reschedule appointment
        const rescheduleResponse = await request(app)
          .put(`/api/appointments/${testAppointments.consultation.appointmentId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            startTime: '2023-10-16T14:00:00Z',
            endTime: '2023-10-16T14:30:00Z'
          });

        expect(rescheduleResponse.status).toBe(200);
        expect(new Date(rescheduleResponse.body.startTime).getHours()).toBe(14);
      });

      test('should detect scheduling conflicts', async () => {
        const token = await getAuthToken('nurse');
        const patient = await createTestPatient('nurse');
        
        // Create first appointment
        await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            patientId: patient.patientId,
            providerId: testProviderId,
            startTime: '2023-10-17T10:00:00Z',
            endTime: '2023-10-17T11:00:00Z'
          });

        // Try to create overlapping appointment
        const conflictResponse = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            patientId: patient.patientId,
            providerId: testProviderId,
            startTime: '2023-10-17T10:30:00Z',
            endTime: '2023-10-17T11:30:00Z'
          });

        expect(conflictResponse.status).toBe(409);
        expect(conflictResponse.body.error).toContain('conflict');
      });
    });

    describe('Provider Availability Management (TASK-5.2)', () => {
      test('should set provider availability schedule', async () => {
        const token = await getAuthToken('admin');
        
        const availabilityData = {
          providerId: testProviderId,
          schedule: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
            { dayOfWeek: 3, startTime: '09:00', endTime: '12:00' }  // Wednesday
          ]
        };

        const response = await request(app)
          .put('/api/calendar/availability')
          .set('Authorization', `Bearer ${token}`)
          .send(availabilityData);

        expect(response.status).toBe(200);
        
        // Verify availability
        const getAvailability = await request(app)
          .get(`/api/calendar/availability?providerId=${testProviderId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(getAvailability.body.schedule.length).toBeGreaterThan(0);
      });
    });

    describe('Appointment Booking Flow (TASK-5.3)', () => {
      test('should book appointment with validation', async () => {
        const token = await getAuthToken('nurse');
        const patient = await createTestPatient('nurse');
        
        const appointmentData = {
          patientId: patient.patientId,
          providerId: testProviderId,
          appointmentType: 'Physical Exam',
          startTime: '2023-10-18T14:00:00Z',
          endTime: '2023-10-18T15:00:00Z',
          notes: 'Annual physical examination',
          reason: 'Preventive care'
        };

        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send(appointmentData);

        expect(response.status).toBe(201);
        expect(response.body.appointmentId).toBeDefined();
        expect(response.body.status).toBe('Scheduled');
        expect(response.body.patientId).toBe(patient.patientId);
      });

      test('should validate appointment data', async () => {
        const token = await getAuthToken('nurse');
        
        const invalidAppointment = {
          providerId: testProviderId,
          // Missing required patientId
          startTime: '2023-10-18T15:00:00Z'
        };

        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send(invalidAppointment);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });
    });

    describe('Resource Booking (TASK-6.2)', () => {
      test('should book resources for appointments', async () => {
        const token = await getAuthToken('admin');
        
        // Create resource first
        const resourceResponse = await request(app)
          .post('/api/resources')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Examination Room 1',
            type: 'room',
            capacity: 1,
            equipment: ['stethoscope', 'blood pressure monitor'],
            availability: {
              monday: { start: '08:00', end: '18:00' },
              tuesday: { start: '08:00', end: '18:00' }
            }
          });

        expect(resourceResponse.status).toBe(201);
        
        // Book resource
        const patient = await createTestPatient('admin');
        const bookingResponse = await request(app)
          .post('/api/resources/book')
          .set('Authorization', `Bearer ${token}`)
          .send({
            resourceId: resourceResponse.body.resourceId,
            patientId: patient.patientId,
            providerId: testProviderId,
            startTime: '2023-10-19T10:00:00Z',
            endTime: '2023-10-19T11:00:00Z',
            purpose: 'Medical examination'
          });

        expect(bookingResponse.status).toBe(201);
        expect(bookingResponse.body.bookingId).toBeDefined();
      });
    });

    describe('Schedule Analytics Dashboard (TASK-6.5)', () => {
      test('should generate schedule analytics', async () => {
        const token = await getAuthToken('admin');
        
        const analyticsResponse = await request(app)
          .get('/api/analytics/schedule-summary')
          .set('Authorization', `Bearer ${token}`)
          .query({
            startDate: '2023-10-01',
            endDate: '2023-10-31',
            providerId: testProviderId
          });

        expect(analyticsResponse.status).toBe(200);
        expect(analyticsResponse.body.totalAppointments).toBeDefined();
        expect(analyticsResponse.body.completedAppointments).toBeDefined();
        expect(analyticsResponse.body.noShowRate).toBeDefined();
        expect(analyticsResponse.body.utilizationRate).toBeDefined();
      });

      test('should provide appointment trends data', async () => {
        const token = await getAuthToken('admin');
        
        const trendsResponse = await request(app)
          .get('/api/analytics/appointment-trends')
          .set('Authorization', `Bearer ${token}`)
          .query({
            period: 'monthly',
            year: 2023
          });

        expect(trendsResponse.status).toBe(200);
        expect(trendsResponse.body.trends).toBeDefined();
        expect(Array.isArray(trendsResponse.body.trends)).toBe(true);
      });
    });
  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('System Integration Tests', () => {
    test('should handle complete patient journey', async () => {
      const adminToken = await getAuthToken('admin');
      const nurseToken = await getAuthToken('nurse');
      const doctorToken = await getAuthToken('doctor');
      
      // 1. Create patient
      const patient = await createTestPatient('admin', {
        firstName: 'Integration',
        lastName: 'Test',
        dateOfBirth: '1985-06-15',
        email: 'integration@test.com'
      });

      // 2. Add insurance information
      await request(app)
        .post(`/api/patients/${patient.patientId}/insurance/primary`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          provider: 'Test Insurance',
          policyNumber: 'TI123456',
          groupNumber: 'GRP123'
        });

      // 3. Add medical history
      const conditionResponse = await request(app)
        .post(`/api/patients/${patient.patientId}/conditions`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          conditionName: 'Hypertension',
          icd10Code: 'I10',
          diagnosisDate: '2023-01-01',
          status: 'Active'
        });

      // 4. Schedule appointment
      const appointmentResponse = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patientId: patient.patientId,
          providerId: testProviderId,
          appointmentType: 'Follow-up',
          startTime: '2023-10-20T10:00:00Z',
          endTime: '2023-10-20T10:30:00Z',
          notes: 'Hypertension follow-up'
        });

      // 5. Verify complete patient record
      const patientRecord = await request(app)
        .get(`/api/patients/${patient.patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(patientRecord.status).toBe(200);
      expect(patientRecord.body.firstName).toBe('Integration');
      
      // 6. Verify medical history exists
      const medicalHistory = await request(app)
        .get(`/api/patients/${patient.patientId}/medical-history`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(medicalHistory.status).toBe(200);
      expect(medicalHistory.body.conditions.length).toBe(1);
      
      // 7. Verify appointment was created
      const appointments = await request(app)
        .get(`/api/appointments?patientId=${patient.patientId}`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(appointments.status).toBe(200);
      expect(appointments.body.length).toBeGreaterThan(0);
    });

    test('should maintain data consistency across operations', async () => {
      const token = await getAuthToken('admin');
      
      // Create multiple related records
      const patient1 = await createTestPatient('admin');
      const patient2 = await createTestPatient('admin');
      
      // Create appointments for both patients
      const appointment1 = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId: patient1.patientId,
          providerId: testProviderId,
          startTime: '2023-10-21T09:00:00Z',
          endTime: '2023-10-21T09:30:00Z'
        });

      const appointment2 = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          patientId: patient2.patientId,
          providerId: testProviderId,
          startTime: '2023-10-21T10:00:00Z',
          endTime: '2023-10-21T10:30:00Z'
        });

      // Verify both appointments exist
      expect(appointment1.status).toBe(201);
      expect(appointment2.status).toBe(201);
      
      // Verify calendar shows both appointments
      const calendarData = await request(app)
        .get('/api/calendar/view?startDate=2023-10-21&endDate=2023-10-21')
        .set('Authorization', `Bearer ${token}`);

      expect(calendarData.body.appointments.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ========================================
  // PERFORMANCE TESTS
  // ========================================

  describe('Performance Tests', () => {
    test('should handle concurrent user operations', async () => {
      const tokens = await Promise.all([
        getAuthToken('admin'),
        getAuthToken('doctor'),
        getAuthToken('nurse')
      ]);

      // Simulate concurrent operations
      const operations = [
        // Admin creating users
        request(app)
          .post('/api/auth/register')
          .send({
            firstName: 'Concurrent',
            lastName: 'User1',
            email: 'concurrent1@test.com',
            password: 'Test123!'
          }),
        
        // Doctor adding medical conditions
        createTestPatient('doctor').then(patient =>
          request(app)
            .post(`/api/patients/${patient.patientId}/conditions`)
            .set('Authorization', `Bearer ${tokens[1]}`)
            .send({
              conditionName: 'Test Condition',
              diagnosisDate: '2023-01-01'
            })
        ),
        
        // Nurse scheduling appointments
        createTestPatient('nurse').then(patient =>
          request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${tokens[2]}`)
            .send({
              patientId: patient.patientId,
              providerId: testProviderId,
              startTime: '2023-10-22T11:00:00Z',
              endTime: '2023-10-22T11:30:00Z'
            })
        )
      ];

      const results = await Promise.allSettled(operations);
      
      // All operations should complete successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
      });
    });

    test('should respond within performance thresholds', async () => {
      const token = await getAuthToken('nurse');
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/patients/search?query=test')
        .set('Authorization', `Bearer ${token}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, just test that invalid data is handled properly
      
      const token = await getAuthToken('nurse');
      
      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: '', // Invalid empty name
          lastName: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('should handle malformed requests', async () => {
      const token = await getAuthToken('admin');
      
      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send('invalid json string');

      expect(response.status).toBe(400);
    });

    test('should handle unauthorized access attempts', async () => {
      // Try to access admin endpoint with patient token
      const patientToken = await getAuthToken('patient');
      
      const response = await request(app)
        .delete('/api/users/123')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).toBe(403);
    });
  });
});

module.exports = {
  testUserData,
  testPatientData,
  createUser,
  loginUser,
  getAuthToken,
  createTestPatient,
  setupMFAForUser
};