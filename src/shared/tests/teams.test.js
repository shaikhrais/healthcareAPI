const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const TeamsIntegration = require('../models/TeamsIntegration');
/* eslint-env jest */
// eslint-disable-next-line no-unused-vars
// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'admin',
    };
    next();
  },
}));

describe('Microsoft Teams Integration API - TASK-15.17', () => {
  let organizationId;
  let userId;
  let connectionId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/expojane_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Cleanup and close connection
    await TeamsIntegration.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await TeamsIntegration.deleteMany({});

    organizationId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  describe('POST /api/teams/connect', () => {
    it('should connect to Microsoft Teams', async () => {
      const response = await request(app)
        .post('/api/teams/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tenantId: 'tenant-12345',
          tenantName: 'Test Dental Clinic',
          accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1uQ19WWmNB...',
          refreshToken: 'MCR1.AQIAAABHh8dSAAAAAU4FiQAAAAAAsHhq0...',
          expiresIn: 3600,
          scope: ['ChannelMessage.Send', 'Team.ReadBasic.All'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.tenant.tenantId).toBe('tenant-12345');
      expect(response.body.connection.tenant.tenantName).toBe('Test Dental Clinic');
      expect(response.body.connection.status).toBe('connected');
      expect(response.body.connection.tenant.accessToken).toContain('***'); // Should be masked

      connectionId = response.body.connection._id;
    });

    it('should require tenantId, tenantName, accessToken, and refreshToken', async () => {
      const response = await request(app)
        .post('/api/teams/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tenantId: 'tenant-123',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should update existing connection', async () => {
      // First connection
      await request(app)
        .post('/api/teams/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tenantId: 'tenant-old',
          tenantName: 'Old Tenant',
          accessToken: 'old-access-token',
          refreshToken: 'old-refresh-token',
        });

      // Second connection (should update)
      const response = await request(app)
        .post('/api/teams/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tenantId: 'tenant-new',
          tenantName: 'New Tenant',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        });

      expect(response.status).toBe(201);
      expect(response.body.connection.tenant.tenantName).toBe('New Tenant');

      // Verify only one connection exists
      const connections = await TeamsIntegration.find({ organization: organizationId });
      expect(connections.length).toBe(1);
    });
  });

  describe('POST /api/teams/disconnect', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/teams/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tenantId: 'tenant-123',
          tenantName: 'Test Disconnect',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        });

      connectionId = response.body.connection._id;
    });

    it('should disconnect from Teams', async () => {
      const response = await request(app)
        .post('/api/teams/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'User requested disconnect',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disconnected');
    });

    it('should mark connection as disconnected in database', async () => {
      await request(app)
        .post('/api/teams/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Testing',
        });

      const connection = await TeamsIntegration.findById(connectionId);
      expect(connection.status).toBe('disconnected');
      expect(connection.disconnectedAt).toBeDefined();
      expect(connection.disconnectedBy).toEqual(userId);
      expect(connection.disconnectReason).toBe('Testing');
    });

    it('should return 404 if no connection exists', async () => {
      await TeamsIntegration.findByIdAndDelete(connectionId);

      const response = await request(app)
        .post('/api/teams/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Test',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/teams/connection', () => {
    it('should get current connection status', async () => {
      await request(app)
        .post('/api/teams/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tenantId: 'tenant-123',
          tenantName: 'Test Connection',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        });

      const response = await request(app)
        .get('/api/teams/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.tenant.tenantName).toBe('Test Connection');
      expect(response.body.connection.isConnected).toBe(true);
      expect(response.body.connection.tenant.accessToken).toContain('***'); // Masked
    });

    it('should return 404 if no connection exists', async () => {
      const response = await request(app)
        .get('/api/teams/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/teams/refresh-token', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'old-token',
          refreshToken: 'old-refresh',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
        status: 'token_expired',
        createdBy: userId,
      });
    });

    it('should refresh OAuth token', async () => {
      const response = await request(app)
        .post('/api/teams/refresh-token')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('refreshed');
    });

    it('should update token in database', async () => {
      await request(app)
        .post('/api/teams/refresh-token')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          accessToken: 'updated-token',
          refreshToken: 'updated-refresh',
          expiresIn: 7200,
        });

      const connection = await TeamsIntegration.findOne({ organization: organizationId });
      expect(connection.tenant.accessToken).toBe('updated-token');
      expect(connection.tenant.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(connection.status).toBe('connected'); // Should change from token_expired
    });

    it('should require accessToken', async () => {
      const response = await request(app)
        .post('/api/teams/refresh-token')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          refreshToken: 'refresh-token',
          // Missing accessToken
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/teams/teams', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        teams: [
          { teamId: 'team-1', displayName: 'General Team', visibility: 'public', memberCount: 50 },
          { teamId: 'team-2', displayName: 'Private Team', visibility: 'private', memberCount: 10 },
        ],
      });
    });

    it('should get all teams', async () => {
      const response = await request(app)
        .get('/api/teams/teams')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.teams).toBeDefined();
      expect(response.body.teams.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('POST /api/teams/teams', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new team', async () => {
      const response = await request(app)
        .post('/api/teams/teams')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'team-new',
          displayName: 'New Team',
          description: 'A new team for testing',
          visibility: 'private',
          memberCount: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require teamId and displayName', async () => {
      const response = await request(app)
        .post('/api/teams/teams')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          visibility: 'public',
          // Missing teamId and displayName
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/teams/channels', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        channels: [
          {
            channelId: 'ch-1',
            teamId: 'team-1',
            displayName: 'General',
            membershipType: 'standard',
          },
          {
            channelId: 'ch-2',
            teamId: 'team-1',
            displayName: 'Announcements',
            membershipType: 'standard',
          },
          {
            channelId: 'ch-3',
            teamId: 'team-2',
            displayName: 'Private Channel',
            membershipType: 'private',
          },
        ],
      });
    });

    it('should get all channels', async () => {
      const response = await request(app)
        .get('/api/teams/channels')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.channels).toBeDefined();
      expect(response.body.channels.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter channels by teamId', async () => {
      const response = await request(app)
        .get('/api/teams/channels?teamId=team-1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.channels.length).toBe(2);
      expect(response.body.channels.every((c) => c.teamId === 'team-1')).toBe(true);
    });
  });

  describe('POST /api/teams/channels', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new channel', async () => {
      const response = await request(app)
        .post('/api/teams/channels')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'ch-new',
          teamId: 'team-1',
          displayName: 'New Channel',
          description: 'Channel for new features',
          membershipType: 'standard',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require channelId, teamId, and displayName', async () => {
      const response = await request(app)
        .post('/api/teams/channels')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          membershipType: 'standard',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/teams/channels/:channelId/notifications', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        channels: [
          {
            channelId: 'ch-123',
            teamId: 'team-1',
            displayName: 'Notifications',
            notifications: {
              appointmentReminders: false,
              taskAssignments: false,
            },
          },
        ],
      });
    });

    it('should update channel notification settings', async () => {
      const response = await request(app)
        .put('/api/teams/channels/ch-123/notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          appointmentReminders: true,
          taskAssignments: true,
          newPatients: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should return 404 for non-existent channel', async () => {
      const response = await request(app)
        .put('/api/teams/channels/ch-999/notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          appointmentReminders: true,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/teams/users', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        users: [
          { userId: 'user-1', displayName: 'John Doe', email: 'john@example.com', isActive: true },
          {
            userId: 'user-2',
            displayName: 'Jane Smith',
            email: 'jane@example.com',
            isActive: true,
          },
          {
            userId: 'user-3',
            displayName: 'Bob Johnson',
            email: 'bob@example.com',
            isActive: false,
          },
        ],
      });
    });

    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/teams/users')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter users by active status', async () => {
      const response = await request(app)
        .get('/api/teams/users?isActive=true')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(2);
      expect(response.body.users.every((u) => u.isActive === true)).toBe(true);
    });
  });

  describe('POST /api/teams/users', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new user', async () => {
      const response = await request(app)
        .post('/api/teams/users')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: 'user-new',
          displayName: 'New User',
          email: 'newuser@example.com',
          jobTitle: 'Dentist',
          isActive: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require userId', async () => {
      const response = await request(app)
        .post('/api/teams/users')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          displayName: 'Test User',
          // Missing userId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/teams/messages', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        channels: [{ channelId: 'ch-123', teamId: 'team-1', displayName: 'General' }],
      });
    });

    it('should send a message to Teams channel', async () => {
      const response = await request(app)
        .post('/api/teams/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'ch-123',
          content: 'Test message from API',
          contentType: 'text',
          messageType: 'message',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');
    });

    it('should send adaptive card message', async () => {
      const response = await request(app)
        .post('/api/teams/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'ch-123',
          content: 'Appointment Reminder',
          adaptiveCard: {
            type: 'AdaptiveCard',
            version: '1.0',
            body: [
              {
                type: 'TextBlock',
                text: 'Appointment Reminder',
                weight: 'bolder',
              },
            ],
          },
          messageType: 'adaptive_card',
        });

      expect(response.status).toBe(200);
    });

    it('should require channelId or chatId', async () => {
      const response = await request(app)
        .post('/api/teams/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          content: 'Test',
          // Missing channelId or chatId
        });

      expect(response.status).toBe(400);
    });

    it('should require content or adaptiveCard', async () => {
      const response = await request(app)
        .post('/api/teams/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'ch-123',
          // Missing content or adaptiveCard
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/teams/messages', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        messages: [
          {
            messageId: 'msg-1',
            channelId: 'ch-123',
            content: 'Message 1',
            messageType: 'message',
            deliveryStatus: 'sent',
            sentAt: new Date(Date.now() - 3600000),
          },
          {
            messageId: 'msg-2',
            channelId: 'ch-123',
            content: 'Appointment reminder',
            messageType: 'appointment_reminder',
            deliveryStatus: 'sent',
            sentAt: new Date(),
          },
          {
            messageId: 'msg-3',
            channelId: 'ch-456',
            content: 'Message 3',
            messageType: 'message',
            deliveryStatus: 'sent',
            sentAt: new Date(),
          },
        ],
      });
    });

    it('should get all messages', async () => {
      const response = await request(app)
        .get('/api/teams/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages).toBeDefined();
      expect(response.body.messages.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter messages by channelId', async () => {
      const response = await request(app)
        .get('/api/teams/messages?channelId=ch-123')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBe(2);
      expect(response.body.messages.every((m) => m.channelId === 'ch-123')).toBe(true);
    });

    it('should filter messages by messageType', async () => {
      const response = await request(app)
        .get('/api/teams/messages?messageType=appointment_reminder')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBe(1);
      expect(response.body.messages[0].messageType).toBe('appointment_reminder');
    });
  });

  describe('Notification Rules', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        notificationRules: [
          {
            ruleId: 'rule-1',
            name: 'Appointment Created',
            eventType: 'appointment.created',
            targetType: 'channel',
            targetId: 'ch-123',
            enabled: true,
          },
        ],
      });
    });

    it('should get all notification rules', async () => {
      const response = await request(app)
        .get('/api/teams/notification-rules')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.rules).toBeDefined();
      expect(response.body.rules.length).toBe(1);
    });

    it('should create a notification rule', async () => {
      const response = await request(app)
        .post('/api/teams/notification-rules')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          ruleId: 'rule-new',
          name: 'Task Assigned',
          eventType: 'task.assigned',
          targetType: 'channel',
          targetId: 'ch-456',
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should update a notification rule', async () => {
      const response = await request(app)
        .put('/api/teams/notification-rules/rule-1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          enabled: false,
          priority: 'urgent',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should delete a notification rule', async () => {
      const response = await request(app)
        .delete('/api/teams/notification-rules/rule-1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Adaptive Cards', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should get all adaptive cards', async () => {
      const response = await request(app)
        .get('/api/teams/adaptive-cards')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.cards).toBeDefined();
    });

    it('should create an adaptive card template', async () => {
      const response = await request(app)
        .post('/api/teams/adaptive-cards')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          cardId: 'card-appointment',
          title: 'Appointment Card',
          cardType: 'appointment',
          cardSchema: {
            type: 'AdaptiveCard',
            version: '1.0',
            body: [
              {
                type: 'TextBlock',
                text: 'Appointment Details',
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Meetings', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should get all meetings', async () => {
      const response = await request(app)
        .get('/api/teams/meetings')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.meetings).toBeDefined();
    });

    it('should create a Teams meeting', async () => {
      const response = await request(app)
        .post('/api/teams/meetings')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          meetingId: 'meeting-123',
          subject: 'Team Standup',
          startDateTime: new Date(),
          endDateTime: new Date(Date.now() + 3600000),
          joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
          organizerId: 'user-1',
          isOnlineMeeting: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Webhooks', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        webhooks: [
          {
            webhookId: 'webhook-1',
            resource: 'teams',
            changeType: 'created',
            notificationUrl: 'https://api.example.com/webhook',
            expirationDateTime: new Date(Date.now() + 86400000),
            clientState: 'secret-state-123',
          },
        ],
      });
    });

    it('should process webhook notifications', async () => {
      const response = await request(app)
        .post('/api/teams/webhook/notifications')
        .send({
          value: [
            {
              subscriptionId: 'sub-123',
              resource: 'teams/team-123',
              changeType: 'created',
              clientState: 'secret-state-123',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle bot interactions', async () => {
      const response = await request(app)
        .post('/api/teams/webhook/bot')
        .send({
          type: 'message',
          text: 'Hello bot',
          from: { id: 'user-123', name: 'John Doe' },
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/teams/stats', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalMessagesSent: 150,
          totalMessagesReceived: 75,
          totalNotificationsSent: 100,
          totalMeetingsCreated: 10,
          totalBotInteractions: 25,
          totalCardsSent: 50,
          failedMessages: 5,
        },
        teams: [{ teamId: 'team-1', displayName: 'Team 1' }],
        channels: [{ channelId: 'ch-1', teamId: 'team-1', displayName: 'Channel 1' }],
        users: [{ userId: 'user-1', displayName: 'User 1' }],
        notificationRules: [
          {
            ruleId: 'rule-1',
            name: 'Rule 1',
            eventType: 'appointment.created',
            targetType: 'channel',
            targetId: 'ch-1',
          },
        ],
      });
    });

    it('should get overall statistics', async () => {
      const response = await request(app)
        .get('/api/teams/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalMessagesSent).toBe(150);
      expect(response.body.stats.totalMessagesReceived).toBe(75);
      expect(response.body.stats.totalMeetingsCreated).toBe(10);
      expect(response.body.stats.totalTeams).toBe(1);
      expect(response.body.stats.totalChannels).toBe(1);
      expect(response.body.stats.totalUsers).toBe(1);
      expect(response.body.connection.isConnected).toBe(true);
    });
  });

  describe('Configuration', () => {
    beforeEach(async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        syncConfig: {
          autoSync: true,
          syncInterval: 'hourly',
          syncTeams: true,
          syncUsers: true,
          syncPresence: false,
        },
      });
    });

    it('should get sync configuration', async () => {
      const response = await request(app)
        .get('/api/teams/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.autoSync).toBe(true);
      expect(response.body.config.syncInterval).toBe('hourly');
    });

    it('should update sync configuration', async () => {
      const response = await request(app)
        .put('/api/teams/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          autoSync: false,
          syncInterval: 'daily',
          syncPresence: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.autoSync).toBe(false);
      expect(response.body.config.syncInterval).toBe('daily');
    });

    it('should reject invalid syncInterval', async () => {
      const response = await request(app)
        .put('/api/teams/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          syncInterval: 'invalid_interval',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate isConnected correctly', async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
      });

      const response = await request(app)
        .get('/api/teams/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.isConnected).toBe(true);
    });

    it('should calculate needsTokenRefresh when token expired', async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        },
        status: 'connected',
        createdBy: userId,
      });

      const response = await request(app)
        .get('/api/teams/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.needsTokenRefresh).toBe(true);
    });

    it('should calculate messageSuccessRate correctly', async () => {
      await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId: 'tenant-123',
          tenantName: 'Test Tenant',
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalMessagesSent: 100,
          failedMessages: 10,
        },
      });

      const response = await request(app)
        .get('/api/teams/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.stats.messageSuccessRate)).toBe(90);
    });
  });
});
