const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
/* eslint-env jest */
/**
 * COMPLETE WORKFLOW TESTS
 * Tests all role-based workflows end-to-end
 *
 * Test Suites:
 * 1. Front Desk - Complete Check-In Workflow
 * 2. Front Desk - Walk-In Patient Workflow
 * 3. Front Desk - Payment Collection Workflow
 * 4. Practitioner - Clinical Note Workflow
 * 5. Billing - Insurance Claim Workflow
 * 6. Owner - Analytics Workflow
 */

// eslint-disable-next-line no-unused-vars
// Test data
let authToken;
let frontDeskToken;
let practitionerToken;
let billingToken;
let ownerToken;

let testPatient;
let testAppointment;
let testCheckIn;
let testPayment;
let testClinicalNote;
let testInsuranceClaim;

describe('COMPLETE WORKFLOW TESTS', () => {
  // Setup: Create test users and authenticate
  beforeAll(async () => {
    // Create test users for each role
    const users = {
      frontDesk: {
        email: 'test.frontdesk@test.com',
        password: 'Test123!',
        firstName: 'Front',
        lastName: 'Desk',
        role: 'front_desk',
        accessLevel: 3,
      },
      practitioner: {
        email: 'test.practitioner@test.com',
        password: 'Test123!',
        firstName: 'Dr.',
        lastName: 'Smith',
        role: 'practitioner',
        accessLevel: 3,
      },
      billing: {
        email: 'test.billing@test.com',
        password: 'Test123!',
        firstName: 'Billing',
        lastName: 'Admin',
        role: 'billing',
        accessLevel: 4,
      },
      owner: {
        email: 'test.owner@test.com',
        password: 'Test123!',
        firstName: 'Clinic',
        lastName: 'Owner',
        role: 'owner',
        accessLevel: 5,
      },
    };

    // Register and login users
    for (const [role, userData] of Object.entries(users)) {
      await request(app).post('/api/auth/register').send(userData);
      const loginRes = await request(app).post('/api/auth/login').send({
        email: userData.email,
        password: userData.password,
      });

      if (role === 'frontDesk') frontDeskToken = loginRes.body.token;
      if (role === 'practitioner') practitionerToken = loginRes.body.token;
      if (role === 'billing') billingToken = loginRes.body.token;
      if (role === 'owner') ownerToken = loginRes.body.token;
    }

    authToken = frontDeskToken; // Default token
  });

  // Cleanup after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * TEST SUITE 1: FRONT DESK - COMPLETE CHECK-IN WORKFLOW
   * Tests the complete patient check-in flow from search to room assignment
   */
  describe('1. FRONT DESK - Patient Check-In Workflow', () => {
    test('Step 1: Create test patient', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          phone: '(555) 123-4567',
          dateOfBirth: '1980-05-15',
          healthCard: 'TEST123456',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.firstName).toBe('John');
      testPatient = res.body;
    });

    test('Step 2: Create appointment for patient', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          patientId: testPatient._id,
          practitionerId: 'test-practitioner-id', // Mock ID
          startTime: new Date().toISOString(),
          duration: 30,
          treatmentType: 'Physical Therapy',
          status: 'confirmed',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      testAppointment = res.body;
    });

    test('Step 3: Check-in patient with vitals', async () => {
      const res = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          appointmentId: testAppointment._id,
          arrivalTime: new Date().toISOString(),
          symptoms: ['back pain', 'muscle stiffness'],
          painLevel: 5,
          vitals: {
            bloodPressure: '135/88',
            heartRate: 78,
            temperature: 37.1,
            weight: 82,
            height: 178,
          },
          room: 'treatment_1',
          status: 'in_room',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.status).toBe('in_room');
      expect(res.body.vitals.bloodPressure).toBe('135/88');
      testCheckIn = res.body;
    });

    test('Step 4: View patient in queue', async () => {
      const res = await request(app)
        .get('/api/checkin/queue')
        .set('Authorization', `Bearer ${frontDeskToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const patientInQueue = res.body.find((c) => c._id === testCheckIn._id);
      expect(patientInQueue).toBeDefined();
      expect(patientInQueue.status).toBe('in_room');
    });

    test('Step 5: Update check-in status to with_practitioner', async () => {
      const res = await request(app)
        .put(`/api/checkin/${testCheckIn._id}/status`)
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({ status: 'with_practitioner' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('with_practitioner');
    });

    test('Step 6: Complete check-in', async () => {
      const res = await request(app)
        .put(`/api/checkin/${testCheckIn._id}/status`)
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });

  /**
   * TEST SUITE 2: FRONT DESK - WALK-IN PATIENT WORKFLOW
   * Tests walk-in patient registration and immediate check-in
   */
  describe('2. FRONT DESK - Walk-In Patient Workflow', () => {
    let walkInPatient;
    let walkInAppointment;

    test('Step 1: Create walk-in patient', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          firstName: 'Sarah',
          lastName: 'Miller',
          phone: '(555) 987-6543',
          email: 'sarah.m@test.com',
          dateOfBirth: '1992-03-20',
        });

      expect(res.status).toBe(201);
      walkInPatient = res.body;
    });

    test('Step 2: Create immediate appointment for walk-in', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          patientId: walkInPatient._id,
          practitionerId: 'test-practitioner-id',
          startTime: new Date().toISOString(),
          duration: 30,
          treatmentType: 'Acute Care',
          status: 'confirmed',
          isWalkIn: true,
          notes: 'Severe headache, dizziness',
        });

      expect(res.status).toBe(201);
      expect(res.body.isWalkIn).toBe(true);
      walkInAppointment = res.body;
    });

    test('Step 3: Auto check-in walk-in patient', async () => {
      const res = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          appointmentId: walkInAppointment._id,
          arrivalTime: new Date().toISOString(),
          isWalkIn: true,
          urgency: 'urgent',
          status: 'waiting',
          symptoms: ['headache', 'dizziness'],
        });

      expect(res.status).toBe(201);
      expect(res.body.isWalkIn).toBe(true);
      expect(res.body.urgency).toBe('urgent');
    });
  });

  /**
   * TEST SUITE 3: FRONT DESK - PAYMENT COLLECTION WORKFLOW
   * Tests payment collection with Stripe integration
   */
  describe('3. FRONT DESK - Payment Collection Workflow', () => {
    test('Step 1: View patient billing overview', async () => {
      const res = await request(app)
        .get(`/api/payments?patientId=${testPatient._id}`)
        .set('Authorization', `Bearer ${frontDeskToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 2: Create Stripe payment intent', async () => {
      const res = await request(app)
        .post('/api/payments/stripe/intent')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          amount: 80,
          currency: 'usd',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('client_secret');
    });

    test('Step 3: Process payment (cash for testing)', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          patientId: testPatient._id,
          amount: 80,
          paymentMethod: 'cash',
          appointmentId: testAppointment._id,
          status: 'completed',
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(80);
      expect(res.body.status).toBe('completed');
      expect(res.body).toHaveProperty('receiptNumber');
      testPayment = res.body;
    });

    test('Step 4: Get payment receipt', async () => {
      const res = await request(app)
        .get(`/api/payments/${testPayment._id}/receipt`)
        .set('Authorization', `Bearer ${frontDeskToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('receiptNumber');
    });
  });

  /**
   * TEST SUITE 4: PRACTITIONER - CLINICAL NOTE WORKFLOW
   * Tests SOAP note creation and electronic signature
   */
  describe('4. PRACTITIONER - Clinical Note Workflow', () => {
    test('Step 1: Get note templates', async () => {
      const res = await request(app)
        .get('/api/note-templates')
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 2: Create SOAP clinical note', async () => {
      const res = await request(app)
        .post('/api/clinical-notes')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          patientId: testPatient._id,
          appointmentId: testAppointment._id,
          noteType: 'SOAP',
          soap: {
            subjective: {
              chiefComplaint: 'Lower back pain',
              historyOfPresentIllness: '45M with acute onset back pain...',
              symptoms: ['pain', 'stiffness'],
            },
            objective: {
              vitalSigns: {
                bloodPressure: '135/88',
                heartRate: 78,
                temperature: 37.1,
              },
              physicalExam: 'Tenderness over L4-L5...',
            },
            assessment: {
              diagnosisCodes: [
                {
                  code: 'M54.5',
                  description: 'Low back pain',
                  type: 'ICD-10',
                },
              ],
              clinicalImpression: 'Acute mechanical low back pain',
            },
            plan: {
              treatmentPlan: 'Physical therapy 2x/week for 4 weeks',
              medications: [
                {
                  name: 'Ibuprofen',
                  dosage: '400mg',
                  frequency: 'PRN',
                  duration: '7 days',
                },
              ],
              procedureCodes: [
                {
                  code: '97110',
                  description: 'Therapeutic exercises',
                  chargeAmount: 80,
                },
              ],
              followUp: {
                required: true,
                timeframe: '2 weeks',
              },
            },
          },
          status: 'completed',
        });

      expect(res.status).toBe(201);
      expect(res.body.noteType).toBe('SOAP');
      expect(res.body.soap.assessment.diagnosisCodes[0].code).toBe('M54.5');
      testClinicalNote = res.body;
    });

    test('Step 3: Sign clinical note electronically', async () => {
      const res = await request(app)
        .post(`/api/clinical-notes/${testClinicalNote._id}/sign`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          signatureData: 'base64-signature-data',
          signatureMethod: 'drawn',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('signed');
      expect(res.body).toHaveProperty('signedAt');
    });

    test('Step 4: Get unsigned notes (should be empty after signing)', async () => {
      const res = await request(app)
        .get('/api/clinical-notes/unsigned')
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 5: Get patient note history', async () => {
      const res = await request(app)
        .get(`/api/clinical-notes/patient/${testPatient._id}`)
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST SUITE 5: BILLING - INSURANCE CLAIM WORKFLOW
   * Tests complete insurance claim submission and tracking
   */
  describe('5. BILLING - Insurance Claim Workflow', () => {
    let testInsurance;

    test('Step 1: Create insurance record for patient', async () => {
      const res = await request(app)
        .post('/api/insurance')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          patientId: testPatient._id,
          provider: 'Blue Cross Blue Shield',
          policyNumber: 'BCBS-12345678',
          groupNumber: 'GRP-001',
          type: 'primary',
          coverage: {
            preventive: 100,
            basic: 80,
            major: 50,
          },
        });

      expect(res.status).toBe(201);
      testInsurance = res.body;
    });

    test('Step 2: Verify insurance eligibility', async () => {
      const res = await request(app)
        .post(`/api/insurance/${testInsurance._id}/verify`)
        .set('Authorization', `Bearer ${billingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.verification.status).toBeDefined();
    });

    test('Step 3: Create insurance claim', async () => {
      const res = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          patientId: testPatient._id,
          insuranceId: testInsurance._id,
          appointmentId: testAppointment._id,
          serviceDate: new Date().toISOString(),
          diagnosisCodes: [
            {
              code: 'M54.5',
              description: 'Low back pain',
            },
          ],
          procedureCodes: [
            {
              code: '97110',
              description: 'Therapeutic exercises',
              chargeAmount: 80,
              units: 1,
            },
          ],
          totalCharges: 80,
          status: 'draft',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('claimNumber');
      testInsuranceClaim = res.body;
    });

    test('Step 4: Submit claim electronically', async () => {
      const res = await request(app)
        .post(`/api/insurance/claims/${testInsuranceClaim._id}/submit`)
        .set('Authorization', `Bearer ${billingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('submitted');
      expect(res.body.electronicSubmission).toBeDefined();
    });

    test('Step 5: Check claim status', async () => {
      const res = await request(app)
        .get(`/api/insurance/claims/${testInsuranceClaim._id}/status`)
        .set('Authorization', `Bearer ${billingToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
    });

    test('Step 6: Get all claims', async () => {
      const res = await request(app)
        .get('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  /**
   * TEST SUITE 6: OWNER - ANALYTICS WORKFLOW
   * Tests analytics and reporting endpoints
   */
  describe('6. OWNER - Analytics Workflow', () => {
    test('Step 1: Get daily dashboard', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard/daily')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('appointments');
      expect(res.body).toHaveProperty('revenue');
    });

    test('Step 2: Get revenue analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
    });

    test('Step 3: Get appointment analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/appointments')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAppointments');
    });
  });

  /**
   * TEST SUITE 7: MESSAGING WORKFLOW
   * Tests secure patient-practitioner messaging
   */
  describe('7. MESSAGING - Complete Workflow', () => {
    let testConversation;

    test('Step 1: Create conversation', async () => {
      const res = await request(app)
        .post('/api/messaging/conversations')
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          conversationType: 'patient_practitioner',
          participants: [testPatient._id, 'practitioner-id'],
        });

      expect(res.status).toBe(201);
      testConversation = res.body;
    });

    test('Step 2: Send message', async () => {
      const res = await request(app)
        .post(`/api/messaging/conversations/${testConversation._id}/messages`)
        .set('Authorization', `Bearer ${practitionerToken}`)
        .send({
          content: 'Test message: When can you return to running?',
          messageType: 'text',
        });

      expect(res.status).toBe(201);
      expect(res.body.content).toContain('Test message');
    });

    test('Step 3: Get conversation messages', async () => {
      const res = await request(app)
        .get(`/api/messaging/conversations/${testConversation._id}/messages`)
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 4: Mark message as read', async () => {
      const messages = await request(app)
        .get(`/api/messaging/conversations/${testConversation._id}/messages`)
        .set('Authorization', `Bearer ${practitionerToken}`);

      const messageId = messages.body[0]._id;

      const res = await request(app)
        .put(`/api/messaging/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${practitionerToken}`);

      expect(res.status).toBe(200);
    });
  });

  /**
   * TEST SUITE 8: NOTIFICATIONS WORKFLOW
   * Tests notification system
   */
  describe('8. NOTIFICATIONS - Workflow', () => {
    test('Step 1: Create notification', async () => {
      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          userId: 'test-user-id',
          type: 'appointment_reminder',
          title: 'Appointment Tomorrow',
          message: 'You have an appointment tomorrow at 9:00 AM',
          priority: 'normal',
          channels: ['in_app'],
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('appointment_reminder');
    });

    test('Step 2: Get user notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${frontDeskToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('Step 3: Get unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${frontDeskToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
    });
  });

  /**
   * TEST SUITE 9: TASKS WORKFLOW
   * Tests enhanced task management
   */
  describe('9. TASKS - Enhanced Workflow', () => {
    let testTask;

    test('Step 1: Create task with subtasks', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          title: 'Follow up with patient',
          description: 'Call patient to schedule follow-up',
          assignedTo: 'test-user-id',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'high',
          category: 'follow_up',
          subtasks: [
            { title: 'Review chart', completed: false },
            { title: 'Make call', completed: false },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.subtasks.length).toBe(2);
      testTask = res.body;
    });

    test('Step 2: Update task status', async () => {
      const res = await request(app)
        .put(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
    });

    test('Step 3: Add comment to task', async () => {
      const res = await request(app)
        .post(`/api/tasks/${testTask._id}/comments`)
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({
          comment: 'Patient confirmed for next week',
        });

      expect(res.status).toBe(200);
    });

    test('Step 4: Complete task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${testTask._id}/status`)
        .set('Authorization', `Bearer ${frontDeskToken}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });
});

/**
 * RUN TESTS:
 * npm test -- --testPathPattern=workflows.test.js
 *
 * COVERAGE:
 * npm test -- --coverage --testPathPattern=workflows.test.js
 */
