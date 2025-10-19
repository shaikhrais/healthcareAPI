/* eslint-disable camelcase */
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const SlackNotification = require('../models/SlackNotification');
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

describe('Slack Integration API - TASK-15.16', () => {
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
    await SlackNotification.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await SlackNotification.deleteMany({});

    organizationId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  describe('POST /api/slack/connect', () => {
    it('should connect to Slack workspace', async () => {
      const response = await request(app)
        .post('/api/slack/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'T01234567',
          teamName: 'Test Dental Clinic',
          botToken: 'xoxb-test-token-12345',
          botUserId: 'U01234567',
          appId: 'A01234567',
          scopes: ['chat:write', 'channels:read', 'users:read'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.workspace.teamId).toBe('T01234567');
      expect(response.body.connection.workspace.teamName).toBe('Test Dental Clinic');
      expect(response.body.connection.status).toBe('connected');
      expect(response.body.connection.workspace.botToken).toContain('***'); // Should be masked

      connectionId = response.body.connection._id;
    });

    it('should require teamId, teamName, and botToken', async () => {
      const response = await request(app)
        .post('/api/slack/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'T123',
          // Missing teamName and botToken
        });

      expect(response.status).toBe(400);
    });

    it('should update existing connection', async () => {
      // First connection
      await request(app)
        .post('/api/slack/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'T111',
          teamName: 'Old Workspace',
          botToken: 'xoxb-old-token',
        });

      // Second connection (should update)
      const response = await request(app)
        .post('/api/slack/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'T222',
          teamName: 'New Workspace',
          botToken: 'xoxb-new-token',
        });

      expect(response.status).toBe(201);
      expect(response.body.connection.workspace.teamName).toBe('New Workspace');

      // Verify only one connection exists
      const connections = await SlackNotification.find({ organization: organizationId });
      expect(connections.length).toBe(1);
    });
  });

  describe('POST /api/slack/disconnect', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/slack/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'T123',
          teamName: 'Test Disconnect',
          botToken: 'xoxb-token',
        });

      connectionId = response.body.connection._id;
    });

    it('should disconnect from Slack', async () => {
      const response = await request(app)
        .post('/api/slack/disconnect')
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
        .post('/api/slack/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Testing',
        });

      const connection = await SlackNotification.findById(connectionId);
      expect(connection.status).toBe('disconnected');
      expect(connection.disconnectedAt).toBeDefined();
      expect(connection.disconnectedBy).toEqual(userId);
      expect(connection.disconnectReason).toBe('Testing');
    });

    it('should return 404 if no connection exists', async () => {
      await SlackNotification.findByIdAndDelete(connectionId);

      const response = await request(app)
        .post('/api/slack/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Test',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/slack/connection', () => {
    it('should get current connection status', async () => {
      await request(app)
        .post('/api/slack/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          teamId: 'T123',
          teamName: 'Test Connection',
          botToken: 'xoxb-token',
        });

      const response = await request(app)
        .get('/api/slack/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.workspace.teamName).toBe('Test Connection');
      expect(response.body.connection.isConnected).toBe(true);
      expect(response.body.connection.workspace.botToken).toContain('***'); // Masked
    });

    it('should return 404 if no connection exists', async () => {
      const response = await request(app)
        .get('/api/slack/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/slack/channels', () => {
    beforeEach(async () => {
      const connection = await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        channels: [
          { channelId: 'C123', channelName: 'general', isPrivate: false, memberCount: 50 },
          { channelId: 'C456', channelName: 'notifications', isPrivate: false, memberCount: 10 },
        ],
      });

      connectionId = connection._id;
    });

    it('should get all channels', async () => {
      const response = await request(app)
        .get('/api/slack/channels')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.channels).toBeDefined();
      expect(response.body.channels.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('POST /api/slack/channels', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new channel', async () => {
      const response = await request(app)
        .post('/api/slack/channels')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'C789',
          channelName: 'new-channel',
          isPrivate: false,
          purpose: 'Channel for testing',
          memberCount: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require channelId and channelName', async () => {
      const response = await request(app)
        .post('/api/slack/channels')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          isPrivate: false,
          // Missing channelId and channelName
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/slack/channels/:channelId/notifications', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        channels: [
          {
            channelId: 'C123',
            channelName: 'notifications',
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
        .put('/api/slack/channels/C123/notifications')
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
        .put('/api/slack/channels/C999/notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          appointmentReminders: true,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/slack/users', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        users: [
          { slackUserId: 'U123', slackUsername: 'john', realName: 'John Doe', isActive: true },
          { slackUserId: 'U456', slackUsername: 'jane', realName: 'Jane Smith', isActive: true },
          { slackUserId: 'U789', slackUsername: 'bob', realName: 'Bob Johnson', isActive: false },
        ],
      });
    });

    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/slack/users')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter users by active status', async () => {
      const response = await request(app)
        .get('/api/slack/users?isActive=true')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(2);
      expect(response.body.users.every((u) => u.isActive === true)).toBe(true);
    });
  });

  describe('POST /api/slack/users', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new user', async () => {
      const response = await request(app)
        .post('/api/slack/users')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          slackUserId: 'U999',
          slackUsername: 'newuser',
          realName: 'New User',
          email: 'newuser@example.com',
          isActive: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require slackUserId', async () => {
      const response = await request(app)
        .post('/api/slack/users')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          slackUsername: 'test',
          // Missing slackUserId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/slack/messages', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        channels: [{ channelId: 'C123', channelName: 'general' }],
      });
    });

    it('should send a message to Slack', async () => {
      const response = await request(app)
        .post('/api/slack/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'C123',
          channelName: 'general',
          text: 'Test message from API',
          messageType: 'custom',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent');
    });

    it('should require channelId and text', async () => {
      const response = await request(app)
        .post('/api/slack/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'C123',
          // Missing text
        });

      expect(response.status).toBe(400);
    });

    it('should increment message count', async () => {
      await request(app)
        .post('/api/slack/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          channelId: 'C123',
          text: 'Test message',
        });

      const connection = await SlackNotification.findOne({ organization: organizationId });
      expect(connection.stats.totalMessagesSent).toBe(1);
    });
  });

  describe('GET /api/slack/messages', () => {
    beforeEach(async () => {
      const connection = await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        messages: [
          {
            messageId: 'msg-1',
            channelId: 'C123',
            text: 'Message 1',
            messageType: 'custom',
            deliveryStatus: 'sent',
            sentAt: new Date(Date.now() - 3600000),
          },
          {
            messageId: 'msg-2',
            channelId: 'C123',
            text: 'Message 2',
            messageType: 'appointment_reminder',
            deliveryStatus: 'sent',
            sentAt: new Date(Date.now() - 1800000),
          },
          {
            messageId: 'msg-3',
            channelId: 'C456',
            text: 'Message 3',
            messageType: 'task_assigned',
            deliveryStatus: 'sent',
            sentAt: new Date(),
          },
        ],
      });

      connectionId = connection._id;
    });

    it('should get all messages', async () => {
      const response = await request(app)
        .get('/api/slack/messages')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages).toBeDefined();
      expect(response.body.messages.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter messages by channelId', async () => {
      const response = await request(app)
        .get('/api/slack/messages?channelId=C123')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBe(2);
      expect(response.body.messages.every((m) => m.channelId === 'C123')).toBe(true);
    });

    it('should filter messages by messageType', async () => {
      const response = await request(app)
        .get('/api/slack/messages?messageType=appointment_reminder')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBe(1);
      expect(response.body.messages[0].messageType).toBe('appointment_reminder');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/slack/messages?page=1&limit=2')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
    });
  });

  describe('GET /api/slack/notification-rules', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        notificationRules: [
          {
            ruleId: 'rule-1',
            name: 'Appointment Created',
            eventType: 'appointment.created',
            channelId: 'C123',
            enabled: true,
          },
          {
            ruleId: 'rule-2',
            name: 'Task Assigned',
            eventType: 'task.assigned',
            channelId: 'C456',
            enabled: true,
          },
          {
            ruleId: 'rule-3',
            name: 'Payment Received',
            eventType: 'payment.received',
            channelId: 'C123',
            enabled: false,
          },
        ],
      });
    });

    it('should get all notification rules', async () => {
      const response = await request(app)
        .get('/api/slack/notification-rules')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.rules).toBeDefined();
      expect(response.body.rules.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter rules by eventType', async () => {
      const response = await request(app)
        .get('/api/slack/notification-rules?eventType=appointment.created')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.rules.length).toBe(1);
      expect(response.body.rules[0].eventType).toBe('appointment.created');
    });

    it('should filter rules by enabled status', async () => {
      const response = await request(app)
        .get('/api/slack/notification-rules?enabled=true')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.rules.length).toBe(2);
      expect(response.body.rules.every((r) => r.enabled === true)).toBe(true);
    });
  });

  describe('POST /api/slack/notification-rules', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should create a notification rule', async () => {
      const response = await request(app)
        .post('/api/slack/notification-rules')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          ruleId: 'rule-new',
          name: 'New Patient Alert',
          eventType: 'patient.created',
          channelId: 'C123',
          messageTemplate: 'New patient registered: {{patientName}}',
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should require ruleId, name, eventType, and channelId', async () => {
      const response = await request(app)
        .post('/api/slack/notification-rules')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          name: 'Incomplete Rule',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/slack/notification-rules/:ruleId', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        notificationRules: [
          {
            ruleId: 'rule-update',
            name: 'Update Test',
            eventType: 'appointment.created',
            channelId: 'C123',
            enabled: true,
            priority: 'normal',
          },
        ],
      });
    });

    it('should update a notification rule', async () => {
      const response = await request(app)
        .put('/api/slack/notification-rules/rule-update')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          enabled: false,
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should return error for non-existent rule', async () => {
      const response = await request(app)
        .put('/api/slack/notification-rules/non-existent')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          enabled: false,
        });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/slack/notification-rules/:ruleId', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        notificationRules: [
          {
            ruleId: 'rule-delete',
            name: 'Delete Test',
            eventType: 'appointment.created',
            channelId: 'C123',
          },
        ],
      });
    });

    it('should delete a notification rule', async () => {
      const response = await request(app)
        .delete('/api/slack/notification-rules/rule-delete')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('GET /api/slack/slash-commands', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        slashCommands: [
          {
            command: '/appointments',
            description: 'View appointments',
            enabled: true,
            usageCount: 10,
          },
          { command: '/patients', description: 'Search patients', enabled: true, usageCount: 5 },
        ],
      });
    });

    it('should get all slash commands', async () => {
      const response = await request(app)
        .get('/api/slack/slash-commands')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.commands).toBeDefined();
      expect(response.body.commands.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('POST /api/slack/slash-commands', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should create a slash command', async () => {
      const response = await request(app)
        .post('/api/slack/slash-commands')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          command: '/tasks',
          description: 'View tasks',
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should require command', async () => {
      const response = await request(app)
        .post('/api/slack/slash-commands')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          description: 'Test',
          // Missing command
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/slack/webhook/events', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should handle URL verification challenge', async () => {
      const response = await request(app).post('/api/slack/webhook/events').send({
        type: 'url_verification',
        challenge: 'test_challenge_12345',
      });

      expect(response.status).toBe(200);
      expect(response.body.challenge).toBe('test_challenge_12345');
    });

    it('should process message event', async () => {
      const response = await request(app)
        .post('/api/slack/webhook/events')
        .send({
          type: 'event_callback',
          team_id: 'T123',
          event: {
            type: 'message',
            channel: 'C123',
            user: 'U123',
            text: 'Hello from Slack',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should increment received messages count', async () => {
      await request(app)
        .post('/api/slack/webhook/events')
        .send({
          type: 'event_callback',
          team_id: 'T123',
          event: {
            type: 'message',
            text: 'Test',
          },
        });

      const connection = await SlackNotification.findOne({ 'workspace.teamId': 'T123' });
      expect(connection.stats.totalMessagesReceived).toBe(1);
    });
  });

  describe('POST /api/slack/webhook/interactions', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should handle button interaction', async () => {
      const payload = JSON.stringify({
        type: 'block_actions',
        team: { id: 'T123', domain: 'test-workspace' },
        user: { id: 'U123', username: 'testuser' },
        actions: [
          {
            action_id: 'approve_appointment',
            block_id: 'block_1',
            value: 'approve',
          },
        ],
      });

      const response = await request(app).post('/api/slack/webhook/interactions').send({ payload });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should increment interactions count', async () => {
      const payload = JSON.stringify({
        type: 'block_actions',
        team: { id: 'T123' },
        user: { id: 'U123' },
        actions: [],
      });

      await request(app).post('/api/slack/webhook/interactions').send({ payload });

      const connection = await SlackNotification.findOne({ 'workspace.teamId': 'T123' });
      expect(connection.stats.totalInteractions).toBe(1);
    });
  });

  describe('POST /api/slack/webhook/commands', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        slashCommands: [
          {
            command: '/appointments',
            description: 'View appointments',
            enabled: true,
            usageCount: 0,
          },
        ],
      });
    });

    it('should handle slash command', async () => {
      const response = await request(app).post('/api/slack/webhook/commands').send({
        team_id: 'T123',
        command: '/appointments',
        text: 'today',
        user_id: 'U123',
        channel_id: 'C123',
      });

      expect(response.status).toBe(200);
      expect(response.body.text).toContain('Command /appointments received');
    });

    it('should increment command usage count', async () => {
      await request(app).post('/api/slack/webhook/commands').send({
        team_id: 'T123',
        command: '/appointments',
        text: 'today',
        user_id: 'U123',
        channel_id: 'C123',
      });

      const connection = await SlackNotification.findOne({ 'workspace.teamId': 'T123' });
      expect(connection.stats.totalCommandsExecuted).toBe(1);
      expect(connection.slashCommands[0].usageCount).toBe(1);
    });
  });

  describe('GET /api/slack/stats', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalMessagesSent: 100,
          totalMessagesReceived: 50,
          totalCommandsExecuted: 25,
          totalInteractions: 30,
          totalNotificationsSent: 75,
          failedMessages: 5,
        },
        channels: [
          { channelId: 'C123', channelName: 'general' },
          { channelId: 'C456', channelName: 'notifications' },
        ],
        users: [
          { slackUserId: 'U123', slackUsername: 'user1' },
          { slackUserId: 'U456', slackUsername: 'user2' },
        ],
        notificationRules: [
          { ruleId: 'rule-1', name: 'Rule 1', eventType: 'appointment.created', channelId: 'C123' },
        ],
        lastSyncedAt: new Date(),
      });
    });

    it('should get overall statistics', async () => {
      const response = await request(app)
        .get('/api/slack/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalMessagesSent).toBe(100);
      expect(response.body.stats.totalMessagesReceived).toBe(50);
      expect(response.body.stats.totalCommandsExecuted).toBe(25);
      expect(response.body.stats.totalInteractions).toBe(30);
      expect(response.body.stats.totalNotificationsSent).toBe(75);
      expect(response.body.stats.failedMessages).toBe(5);
      expect(response.body.stats.totalChannels).toBe(2);
      expect(response.body.stats.totalUsers).toBe(2);
      expect(response.body.stats.totalRules).toBe(1);
      expect(response.body.connection.isConnected).toBe(true);
    });
  });

  describe('GET /api/slack/rate-limits', () => {
    beforeEach(async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        rateLimits: {
          messagesPerMinute: 60,
          messagesPerHour: 3600,
          currentMinuteCount: 10,
          currentHourCount: 50,
        },
      });
    });

    it('should get rate limit status', async () => {
      const response = await request(app)
        .get('/api/slack/rate-limits')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.rateLimits).toBeDefined();
      expect(response.body.rateLimits.messagesPerMinute).toBe(60);
      expect(response.body.rateLimits.messagesPerHour).toBe(3600);
      expect(response.body.rateLimits.withinLimits).toBeDefined();
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate isConnected correctly', async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
      });

      const response = await request(app)
        .get('/api/slack/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.isConnected).toBe(true);
    });

    it('should calculate messageSuccessRate correctly', async () => {
      await SlackNotification.create({
        organization: organizationId,
        workspace: {
          teamId: 'T123',
          teamName: 'Test Workspace',
          botToken: 'xoxb-token',
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalMessagesSent: 100,
          failedMessages: 10,
        },
      });

      const response = await request(app)
        .get('/api/slack/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.stats.messageSuccessRate)).toBe(90);
    });
  });
});
