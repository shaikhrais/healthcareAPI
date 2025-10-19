const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const DoxyRoom = require('../models/DoxyRoom');
/* eslint-env jest */
/**
 * Doxy.me Integration API Tests
 * TASK-15.10 - Doxy.me Integration
 *
 * Tests for:
 * - Room creation and management
 * - Session lifecycle (start, end, cancel, no-show)
 * - Waiting room functionality
 * - Participant management
 * - Chat messaging
 * - Recording with consent
 * - Technical issue tracking
 * - Connection quality monitoring
 * - Analytics and reporting
 * - Provider/patient session queries
 */

// eslint-disable-next-line no-unused-vars
describe('Doxy.me Integration API - TASK-15.10', () => {
  let testProviderId;
  let testPatientId;
  let testOrgId;
  let testAppointmentId;
  let testRoom;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await DoxyRoom.deleteMany({});

    testProviderId = new mongoose.Types.ObjectId();
    testPatientId = new mongoose.Types.ObjectId();
    testOrgId = new mongoose.Types.ObjectId();
    testAppointmentId = new mongoose.Types.ObjectId();

    // Create a test room
    testRoom = await DoxyRoom.create({
      roomName: 'test-room-001',
      displayName: 'Dr. Smith - John Doe Consultation',
      roomUrl: 'https://doxy.me/drsmith',
      appointment: testAppointmentId,
      provider: {
        userId: testProviderId,
        name: 'Dr. Jane Smith',
        title: 'Dentist',
        credentials: 'DDS',
        doxyUsername: 'drsmith',
      },
      patient: {
        userId: testPatientId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0100',
      },
      organization: testOrgId,
      session: {
        status: 'scheduled',
        scheduledStart: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        scheduledEnd: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      },
    });
  });

  // ==================== ROOM CREATION & MANAGEMENT ====================

  describe('POST /api/doxy/rooms', () => {
    it('should create a new Doxy.me room', async () => {
      const roomData = {
        displayName: 'Dr. Johnson - Jane Smith Consultation',
        appointment: testAppointmentId.toString(),
        provider: {
          userId: testProviderId.toString(),
          name: 'Dr. Bob Johnson',
          title: 'Dentist',
          credentials: 'DMD',
          doxyUsername: 'drjohnson',
        },
        patient: {
          userId: testPatientId.toString(),
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '555-0200',
        },
        session: {
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        roomType: 'standard',
      };

      const response = await request(app)
        .post('/api/doxy/rooms')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(roomData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('roomName');
      expect(response.body).toHaveProperty('roomUrl');
      expect(response.body.displayName).toBe('Dr. Johnson - Jane Smith Consultation');
      expect(response.body.provider.name).toBe('Dr. Bob Johnson');
      expect(response.body.patient.name).toBe('Jane Smith');
      expect(response.body.session.status).toBe('scheduled');
    });

    it('should reject room creation without required fields', async () => {
      const invalidData = {
        displayName: 'Test Room',
      };

      await request(app)
        .post('/api/doxy/rooms')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(invalidData)
        .expect(400);
    });

    it('should auto-generate unique room name', async () => {
      const roomData = {
        displayName: 'Test Room 1',
        provider: {
          userId: testProviderId.toString(),
          name: 'Provider',
        },
        patient: {
          userId: testPatientId.toString(),
          name: 'Patient',
        },
        session: {
          scheduledStart: new Date(),
        },
      };

      const response1 = await request(app)
        .post('/api/doxy/rooms')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(roomData)
        .expect(201);

      const response2 = await request(app)
        .post('/api/doxy/rooms')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(roomData)
        .expect(201);

      expect(response1.body.roomName).not.toBe(response2.body.roomName);
    });
  });

  describe('GET /api/doxy/rooms/:id', () => {
    it('should get a room by ID', async () => {
      const response = await request(app)
        .get(`/api/doxy/rooms/${testRoom._id}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body._id).toBe(testRoom._id.toString());
      expect(response.body.roomName).toBe('test-room-001');
      expect(response.body.provider.name).toBe('Dr. Jane Smith');
    });

    it('should return 404 for non-existent room', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/doxy/rooms/${fakeId}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(404);
    });
  });

  describe('GET /api/doxy/rooms/name/:roomName', () => {
    it('should get a room by room name (public access)', async () => {
      const response = await request(app).get('/api/doxy/rooms/name/test-room-001').expect(200);

      expect(response.body.roomName).toBe('test-room-001');
      expect(response.body.displayName).toBe('Dr. Smith - John Doe Consultation');
      expect(response.body).toHaveProperty('canJoin');
    });

    it('should return limited info for public access', async () => {
      const response = await request(app).get('/api/doxy/rooms/name/test-room-001').expect(200);

      expect(response.body.provider).toHaveProperty('name');
      expect(response.body.provider).not.toHaveProperty('userId');
      expect(response.body).not.toHaveProperty('technical');
      expect(response.body).not.toHaveProperty('chatMessages');
    });
  });

  describe('GET /api/doxy/rooms', () => {
    beforeEach(async () => {
      await DoxyRoom.create([
        {
          roomName: 'room-002',
          displayName: 'Room 2',
          roomUrl: 'https://doxy.me/room2',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'in_progress',
            scheduledStart: new Date(),
          },
        },
        {
          roomName: 'room-003',
          displayName: 'Room 3',
          roomUrl: 'https://doxy.me/room3',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'completed',
            scheduledStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      ]);
    });

    it('should list all rooms for organization', async () => {
      const response = await request(app)
        .get('/api/doxy/rooms')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.rooms).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter rooms by status', async () => {
      const response = await request(app)
        .get('/api/doxy/rooms?status=in_progress')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.rooms).toHaveLength(1);
      expect(response.body.rooms[0].session.status).toBe('in_progress');
    });

    it('should filter rooms by provider', async () => {
      const response = await request(app)
        .get(`/api/doxy/rooms?providerId=${testProviderId}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(
        response.body.rooms.every((r) => r.provider.userId === testProviderId.toString())
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/doxy/rooms?limit=2&skip=1')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.rooms).toHaveLength(2);
      expect(response.body.limit).toBe(2);
      expect(response.body.skip).toBe(1);
    });
  });

  describe('PUT /api/doxy/rooms/:id', () => {
    it('should update a room', async () => {
      const updates = {
        displayName: 'Updated Display Name',
        'settings.chatEnabled': true,
        'settings.screenShareEnabled': true,
      };

      const response = await request(app)
        .put(`/api/doxy/rooms/${testRoom._id}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(updates)
        .expect(200);

      expect(response.body.displayName).toBe('Updated Display Name');
    });

    it('should not allow updating protected fields', async () => {
      await request(app)
        .put(`/api/doxy/rooms/${testRoom._id}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ roomName: 'hacked-room' })
        .expect(400);
    });
  });

  describe('DELETE /api/doxy/rooms/:id', () => {
    it('should soft delete a room', async () => {
      const response = await request(app)
        .delete(`/api/doxy/rooms/${testRoom._id}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.isDeleted).toBe(true);
      expect(response.body.room.deletedAt).toBeTruthy();

      // Verify room is not returned in regular queries
      const getResponse = await request(app)
        .get(`/api/doxy/rooms/${testRoom._id}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(404);
    });
  });

  // ==================== SESSION MANAGEMENT ====================

  describe('POST /api/doxy/rooms/:id/start', () => {
    it('should start a session', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/start`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.session.status).toBe('in_progress');
      expect(response.body.room.session.actualStart).toBeTruthy();
    });

    it('should calculate waiting room duration', async () => {
      // Patient joins waiting room
      testRoom.session.status = 'waiting';
      testRoom.session.patientJoinedWaitingRoom = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
      await testRoom.save();

      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/start`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.session.waitingRoomDuration).toBeGreaterThan(0);
    });
  });

  describe('POST /api/doxy/rooms/:id/end', () => {
    it('should end a session', async () => {
      // Start session first
      testRoom.session.status = 'in_progress';
      testRoom.session.actualStart = new Date(Date.now() - 30 * 60 * 1000); // Started 30 min ago
      await testRoom.save();

      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/end`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.session.status).toBe('completed');
      expect(response.body.room.session.actualEnd).toBeTruthy();
      expect(response.body.room.session.duration).toBeGreaterThan(0);
      expect(response.body.summary).toBeDefined();
    });
  });

  describe('POST /api/doxy/rooms/:id/cancel', () => {
    it('should cancel a session', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/cancel`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ reason: 'Patient requested cancellation' })
        .expect(200);

      expect(response.body.room.session.status).toBe('cancelled');
    });

    it('should add cancellation note', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/cancel`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ reason: 'Technical issues' })
        .expect(200);

      expect(response.body.room.notes.length).toBeGreaterThan(0);
      expect(response.body.room.notes[0].content).toContain('cancelled');
    });
  });

  describe('POST /api/doxy/rooms/:id/no-show', () => {
    it('should mark session as no-show', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/no-show`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.session.status).toBe('no_show');
    });
  });

  // ==================== WAITING ROOM ====================

  describe('POST /api/doxy/rooms/:id/waiting-room/join', () => {
    beforeEach(async () => {
      // Set session to be joinable
      testRoom.session.scheduledStart = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      await testRoom.save();
    });

    it('should allow patient to join waiting room', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/waiting-room/join`)
        .expect(200);

      expect(response.body.room.status).toBe('waiting');
    });

    it('should record when patient joined', async () => {
      const beforeJoin = new Date();

      await request(app).post(`/api/doxy/rooms/${testRoom._id}/waiting-room/join`).expect(200);

      const updatedRoom = await DoxyRoom.findById(testRoom._id);
      expect(updatedRoom.session.patientJoinedWaitingRoom).toBeTruthy();
      expect(updatedRoom.session.patientJoinedWaitingRoom.getTime()).toBeGreaterThanOrEqual(
        beforeJoin.getTime()
      );
    });

    it('should not allow joining too early', async () => {
      testRoom.session.scheduledStart = new Date(Date.now() + 30 * 60 * 1000); // 30 min in future
      await testRoom.save();

      await request(app).post(`/api/doxy/rooms/${testRoom._id}/waiting-room/join`).expect(400);
    });
  });

  describe('GET /api/doxy/waiting-room/queue', () => {
    beforeEach(async () => {
      await DoxyRoom.create([
        {
          roomName: 'waiting-1',
          displayName: 'Waiting 1',
          roomUrl: 'https://doxy.me/w1',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient 1' },
          organization: testOrgId,
          session: {
            status: 'waiting',
            scheduledStart: new Date(),
            patientJoinedWaitingRoom: new Date(Date.now() - 10 * 60 * 1000),
          },
        },
        {
          roomName: 'waiting-2',
          displayName: 'Waiting 2',
          roomUrl: 'https://doxy.me/w2',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: new mongoose.Types.ObjectId(), name: 'Patient 2' },
          organization: testOrgId,
          session: {
            status: 'waiting',
            scheduledStart: new Date(),
            patientJoinedWaitingRoom: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      ]);
    });

    it('should get waiting room queue for provider', async () => {
      const response = await request(app)
        .get(`/api/doxy/waiting-room/queue?providerId=${testProviderId}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.queue).toHaveLength(2);
      expect(response.body.count).toBe(2);
      // Should be sorted by join time (earliest first)
      expect(response.body.queue[0].patient.name).toBe('Patient 1');
    });
  });

  // ==================== PARTICIPANTS ====================

  describe('POST /api/doxy/rooms/:id/participants', () => {
    it('should add a participant', async () => {
      const participantData = {
        userId: new mongoose.Types.ObjectId(),
        name: 'Dr. Assistant',
        role: 'assistant',
        deviceInfo: {
          type: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
        },
      };

      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/participants`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(participantData)
        .expect(200);

      expect(response.body.room.participants).toHaveLength(1);
      expect(response.body.room.participants[0].name).toBe('Dr. Assistant');
      expect(response.body.room.participants[0].joinedAt).toBeTruthy();
    });
  });

  describe('DELETE /api/doxy/rooms/:id/participants/:userId', () => {
    it('should remove a participant', async () => {
      const participantId = new mongoose.Types.ObjectId();

      testRoom.participants.push({
        userId: participantId,
        name: 'Participant',
        role: 'observer',
        joinedAt: new Date(Date.now() - 15 * 60 * 1000),
      });
      await testRoom.save();

      const response = await request(app)
        .delete(`/api/doxy/rooms/${testRoom._id}/participants/${participantId}`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      const participant = response.body.room.participants[0];
      expect(participant.leftAt).toBeTruthy();
      expect(participant.duration).toBeGreaterThan(0);
    });
  });

  // ==================== CHAT ====================

  describe('POST /api/doxy/rooms/:id/chat', () => {
    it('should send a chat message', async () => {
      const messageData = {
        message: 'Hello, how are you feeling today?',
        type: 'text',
      };

      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/chat`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(messageData)
        .expect(200);

      expect(response.body.room.chatMessages).toHaveLength(1);
      expect(response.body.room.chatMessages[0].message).toBe('Hello, how are you feeling today?');
      expect(response.body.room.chatMessages[0].senderId).toBe(testProviderId.toString());
    });

    it('should reject chat when chat is disabled', async () => {
      testRoom.settings.chatEnabled = false;
      await testRoom.save();

      await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/chat`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ message: 'Test message' })
        .expect(400);
    });
  });

  describe('GET /api/doxy/rooms/:id/chat', () => {
    beforeEach(async () => {
      testRoom.chatMessages = [
        {
          senderId: testProviderId,
          message: 'First message',
          type: 'text',
          timestamp: new Date(Date.now() - 60000),
        },
        {
          senderId: testPatientId,
          message: 'Second message',
          type: 'text',
          timestamp: new Date(),
        },
      ];
      await testRoom.save();
    });

    it('should get chat history', async () => {
      const response = await request(app)
        .get(`/api/doxy/rooms/${testRoom._id}/chat`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });
  });

  // ==================== RECORDING ====================

  describe('POST /api/doxy/rooms/:id/recording/consent', () => {
    it('should record provider consent', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/recording/consent`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ role: 'provider' })
        .expect(200);

      expect(response.body.room.settings.recordingConsent.provider.consented).toBe(true);
      expect(response.body.room.settings.recordingConsent.provider.consentedAt).toBeTruthy();
    });

    it('should record patient consent', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/recording/consent`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ role: 'patient' })
        .expect(200);

      expect(response.body.room.settings.recordingConsent.patient.consented).toBe(true);
    });
  });

  describe('POST /api/doxy/rooms/:id/recording/start', () => {
    beforeEach(async () => {
      testRoom.settings.recordingEnabled = true;
      testRoom.settings.recordingConsent.provider = {
        consented: true,
        consentedAt: new Date(),
      };
      testRoom.settings.recordingConsent.patient = {
        consented: true,
        consentedAt: new Date(),
      };
      await testRoom.save();
    });

    it('should start recording', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/recording/start`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.recording.isRecorded).toBe(true);
      expect(response.body.room.recording.recordingStarted).toBeTruthy();
      expect(response.body.room.recording.recordingStatus).toBe('recording');
      expect(response.body.room.recording.recordingId).toBeTruthy();
    });

    it('should reject recording without consent', async () => {
      testRoom.settings.recordingConsent.patient.consented = false;
      await testRoom.save();

      await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/recording/start`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(500);
    });
  });

  describe('POST /api/doxy/rooms/:id/recording/stop', () => {
    beforeEach(async () => {
      testRoom.recording.isRecorded = true;
      testRoom.recording.recordingStarted = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago
      testRoom.recording.recordingStatus = 'recording';
      await testRoom.save();
    });

    it('should stop recording', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/recording/stop`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.room.recording.recordingStopped).toBeTruthy();
      expect(response.body.room.recording.recordingStatus).toBe('processing');
      expect(response.body.room.recording.recordingDuration).toBeGreaterThan(0);
    });
  });

  // ==================== TECHNICAL ====================

  describe('POST /api/doxy/rooms/:id/connection-quality', () => {
    it('should update provider connection quality', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/connection-quality`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ role: 'provider', quality: 'excellent' })
        .expect(200);

      expect(response.body.room.technical.connectionQuality.provider).toBe('excellent');
    });

    it('should update patient connection quality', async () => {
      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/connection-quality`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ role: 'patient', quality: 'poor' })
        .expect(200);

      expect(response.body.room.technical.connectionQuality.patient).toBe('poor');
    });
  });

  describe('POST /api/doxy/rooms/:id/technical-issue', () => {
    it('should report a technical issue', async () => {
      const issueData = {
        issue: 'Audio not working for patient',
        severity: 'high',
      };

      const response = await request(app)
        .post(`/api/doxy/rooms/${testRoom._id}/technical-issue`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(issueData)
        .expect(200);

      expect(response.body.room.technical.technicalIssues).toHaveLength(1);
      expect(response.body.room.technical.technicalIssues[0].issue).toBe(
        'Audio not working for patient'
      );
      expect(response.body.room.technical.technicalIssues[0].severity).toBe('high');
      expect(response.body.room.technical.technicalIssues[0].resolved).toBe(false);
    });
  });

  // ==================== ANALYTICS & REPORTING ====================

  describe('GET /api/doxy/rooms/:id/summary', () => {
    it('should get session summary', async () => {
      testRoom.session.status = 'completed';
      testRoom.session.actualStart = new Date(Date.now() - 45 * 60 * 1000);
      testRoom.session.actualEnd = new Date();
      testRoom.session.duration = 45;
      testRoom.analytics.totalParticipants = 2;
      testRoom.analytics.chatMessageCount = 15;
      await testRoom.save();

      const response = await request(app)
        .get(`/api/doxy/rooms/${testRoom._id}/summary`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.roomName).toBe('test-room-001');
      expect(response.body.status).toBe('completed');
      expect(response.body.duration).toBe(45);
      expect(response.body.participantCount).toBe(2);
      expect(response.body.chatMessageCount).toBe(15);
    });
  });

  describe('GET /api/doxy/analytics', () => {
    beforeEach(async () => {
      await DoxyRoom.create([
        {
          roomName: 'analytics-1',
          displayName: 'Session 1',
          roomUrl: 'https://doxy.me/s1',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'completed',
            scheduledStart: new Date(),
            duration: 30,
          },
        },
        {
          roomName: 'analytics-2',
          displayName: 'Session 2',
          roomUrl: 'https://doxy.me/s2',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'completed',
            scheduledStart: new Date(),
            duration: 45,
          },
        },
        {
          roomName: 'analytics-3',
          displayName: 'Session 3',
          roomUrl: 'https://doxy.me/s3',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'no_show',
            scheduledStart: new Date(),
          },
        },
      ]);
    });

    it('should get analytics for date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(
          `/api/doxy/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.totalSessions).toBeGreaterThan(0);
      expect(response.body.completedSessions).toBe(2);
      expect(response.body.noShowSessions).toBe(1);
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('avgDuration');
    });

    it('should require date range parameters', async () => {
      await request(app)
        .get('/api/doxy/analytics')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(400);
    });
  });

  describe('GET /api/doxy/provider/:providerId/upcoming', () => {
    beforeEach(async () => {
      await DoxyRoom.create([
        {
          roomName: 'upcoming-1',
          displayName: 'Upcoming 1',
          roomUrl: 'https://doxy.me/u1',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'scheduled',
            scheduledStart: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          },
        },
        {
          roomName: 'upcoming-2',
          displayName: 'Upcoming 2',
          roomUrl: 'https://doxy.me/u2',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'scheduled',
            scheduledStart: new Date(Date.now() + 120 * 60 * 1000), // 2 hours from now
          },
        },
      ]);
    });

    it('should get upcoming sessions for provider', async () => {
      const response = await request(app)
        .get(`/api/doxy/provider/${testProviderId}/upcoming`)
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.sessions.length).toBeGreaterThan(0);
      expect(response.body.sessions.every((s) => s.session.status === 'scheduled')).toBe(true);
      // Should be sorted by scheduled time
      expect(new Date(response.body.sessions[0].session.scheduledStart).getTime()).toBeLessThan(
        new Date(response.body.sessions[1].session.scheduledStart).getTime()
      );
    });
  });

  describe('GET /api/doxy/patient/:patientId/upcoming', () => {
    it('should get upcoming sessions for patient', async () => {
      const response = await request(app)
        .get(`/api/doxy/patient/${testPatientId}/upcoming`)
        .set('x-user-id', testPatientId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.sessions).toBeDefined();
      expect(response.body.count).toBeDefined();
    });
  });

  describe('GET /api/doxy/active', () => {
    beforeEach(async () => {
      await DoxyRoom.create([
        {
          roomName: 'active-1',
          displayName: 'Active 1',
          roomUrl: 'https://doxy.me/a1',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'in_progress',
            scheduledStart: new Date(),
            actualStart: new Date(),
          },
        },
        {
          roomName: 'active-2',
          displayName: 'Active 2',
          roomUrl: 'https://doxy.me/a2',
          provider: { userId: testProviderId, name: 'Provider' },
          patient: { userId: testPatientId, name: 'Patient' },
          organization: testOrgId,
          session: {
            status: 'waiting',
            scheduledStart: new Date(),
            patientJoinedWaitingRoom: new Date(),
          },
        },
      ]);
    });

    it('should get active sessions', async () => {
      const response = await request(app)
        .get('/api/doxy/active')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.sessions).toHaveLength(2);
      expect(
        response.body.sessions.every((s) => ['in_progress', 'waiting'].includes(s.session.status))
      ).toBe(true);
    });
  });

  // ==================== ADMIN OPERATIONS ====================

  describe('POST /api/doxy/admin/cleanup', () => {
    beforeEach(async () => {
      await DoxyRoom.create({
        roomName: 'old-room',
        displayName: 'Old Room',
        roomUrl: 'https://doxy.me/old',
        provider: { userId: testProviderId, name: 'Provider' },
        patient: { userId: testPatientId, name: 'Patient' },
        organization: testOrgId,
        session: {
          status: 'completed',
          scheduledStart: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        },
      });
    });

    it('should cleanup old sessions', async () => {
      const response = await request(app)
        .post('/api/doxy/admin/cleanup')
        .set('x-user-id', testProviderId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ daysToKeep: 90 })
        .expect(200);

      expect(response.body.modified).toBe(1);

      const oldRoom = await DoxyRoom.findOne({ roomName: 'old-room' });
      expect(oldRoom.isDeleted).toBe(true);
    });
  });

  // ==================== AUTHENTICATION ====================

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .post('/api/doxy/rooms')
        .send({
          displayName: 'Test Room',
          provider: { name: 'Provider' },
          patient: { name: 'Patient' },
          session: { scheduledStart: new Date() },
        })
        .expect(401);
    });

    it('should allow public access to room lookup by name', async () => {
      await request(app).get('/api/doxy/rooms/name/test-room-001').expect(200);
    });
  });
});
