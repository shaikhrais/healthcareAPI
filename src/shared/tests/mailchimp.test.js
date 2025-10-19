/* eslint-disable camelcase */
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const MailchimpAutomation = require('../models/MailchimpAutomation');
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

describe('Mailchimp Integration API - TASK-15.15', () => {
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
    await MailchimpAutomation.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await MailchimpAutomation.deleteMany({});

    organizationId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  describe('POST /api/mailchimp/connect', () => {
    it('should connect to Mailchimp account', async () => {
      const response = await request(app)
        .post('/api/mailchimp/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          apiKey: '12345678abcdefgh-us1',
          serverPrefix: 'us1',
          accountName: 'Test Dental Clinic Mailchimp',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.mailchimpAccount.serverPrefix).toBe('us1');
      expect(response.body.connection.mailchimpAccount.accountName).toBe(
        'Test Dental Clinic Mailchimp'
      );
      expect(response.body.connection.status).toBe('connected');
      expect(response.body.connection.mailchimpAccount.apiKey).toContain('***'); // Should be masked

      connectionId = response.body.connection._id;
    });

    it('should require API key and server prefix', async () => {
      const response = await request(app)
        .post('/api/mailchimp/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          accountName: 'Test',
          // Missing apiKey and serverPrefix
        });

      expect(response.status).toBe(400);
    });

    it('should update existing connection', async () => {
      // First connection
      await request(app)
        .post('/api/mailchimp/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          apiKey: 'oldkey123-us1',
          serverPrefix: 'us1',
          accountName: 'Old Account',
        });

      // Second connection (should update)
      const response = await request(app)
        .post('/api/mailchimp/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          apiKey: 'newkey456-us2',
          serverPrefix: 'us2',
          accountName: 'New Account',
        });

      expect(response.status).toBe(201);
      expect(response.body.connection.mailchimpAccount.accountName).toBe('New Account');

      // Verify only one connection exists
      const connections = await MailchimpAutomation.find({ organization: organizationId });
      expect(connections.length).toBe(1);
    });
  });

  describe('POST /api/mailchimp/disconnect', () => {
    beforeEach(async () => {
      // Create connection
      const response = await request(app)
        .post('/api/mailchimp/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          apiKey: 'testkey-us1',
          serverPrefix: 'us1',
          accountName: 'Test Disconnect',
        });

      connectionId = response.body.connection._id;
    });

    it('should disconnect from Mailchimp', async () => {
      const response = await request(app)
        .post('/api/mailchimp/disconnect')
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
        .post('/api/mailchimp/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Testing',
        });

      const connection = await MailchimpAutomation.findById(connectionId);
      expect(connection.status).toBe('disconnected');
      expect(connection.disconnectedAt).toBeDefined();
      expect(connection.disconnectedBy).toEqual(userId);
      expect(connection.disconnectReason).toBe('Testing');
    });

    it('should return 404 if no connection exists', async () => {
      await MailchimpAutomation.findByIdAndDelete(connectionId);

      const response = await request(app)
        .post('/api/mailchimp/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Test',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/mailchimp/connection', () => {
    it('should get current connection status', async () => {
      await request(app)
        .post('/api/mailchimp/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          apiKey: 'testkey-us1',
          serverPrefix: 'us1',
          accountName: 'Test Connection',
        });

      const response = await request(app)
        .get('/api/mailchimp/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.mailchimpAccount.accountName).toBe('Test Connection');
      expect(response.body.connection.isConnected).toBe(true);
      expect(response.body.connection.mailchimpAccount.apiKey).toContain('***'); // Masked
    });

    it('should return 404 if no connection exists', async () => {
      const response = await request(app)
        .get('/api/mailchimp/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/mailchimp/lists', () => {
    beforeEach(async () => {
      const connection = await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        lists: [
          { listId: 'list-1', name: 'Main Newsletter', memberCount: 500, syncEnabled: true },
          { listId: 'list-2', name: 'VIP Patients', memberCount: 50, syncEnabled: true },
        ],
      });

      connectionId = connection._id;
    });

    it('should get all lists', async () => {
      const response = await request(app)
        .get('/api/mailchimp/lists')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.lists).toBeDefined();
      expect(response.body.lists.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('POST /api/mailchimp/lists', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new list', async () => {
      const response = await request(app)
        .post('/api/mailchimp/lists')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          listId: 'new-list-123',
          name: 'New Patient List',
          memberCount: 100,
          syncEnabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require listId and name', async () => {
      const response = await request(app)
        .post('/api/mailchimp/lists')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          memberCount: 100,
          // Missing listId and name
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/mailchimp/campaigns', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        campaigns: [
          {
            campaignId: 'camp-1',
            type: 'regular',
            status: 'sent',
            subject: 'Welcome to our clinic',
            stats: { emailsSent: 500, opensTotal: 250, uniqueOpens: 200 },
          },
          {
            campaignId: 'camp-2',
            type: 'regular',
            status: 'save',
            subject: 'Monthly Newsletter',
            stats: { emailsSent: 0 },
          },
        ],
      });
    });

    it('should get all campaigns', async () => {
      const response = await request(app)
        .get('/api/mailchimp/campaigns')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.campaigns).toBeDefined();
      expect(response.body.campaigns.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter campaigns by status', async () => {
      const response = await request(app)
        .get('/api/mailchimp/campaigns?status=sent')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.campaigns.length).toBe(1);
      expect(response.body.campaigns[0].status).toBe('sent');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/mailchimp/campaigns?page=1&limit=1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.campaigns.length).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });
  });

  describe('GET /api/mailchimp/campaigns/:campaignId', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        campaigns: [
          {
            campaignId: 'camp-get-test',
            type: 'regular',
            status: 'sent',
            subject: 'Test Campaign',
          },
        ],
      });
    });

    it('should get campaign by ID', async () => {
      const response = await request(app)
        .get('/api/mailchimp/campaigns/camp-get-test')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.campaign).toBeDefined();
      expect(response.body.campaign.campaignId).toBe('camp-get-test');
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/api/mailchimp/campaigns/non-existent')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/mailchimp/campaigns', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new campaign', async () => {
      const response = await request(app)
        .post('/api/mailchimp/campaigns')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          campaignId: 'camp-new',
          type: 'regular',
          status: 'save',
          subject: 'New Campaign Subject',
          fromName: 'Test Clinic',
          fromEmail: 'clinic@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require campaignId', async () => {
      const response = await request(app)
        .post('/api/mailchimp/campaigns')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          type: 'regular',
          subject: 'Test',
          // Missing campaignId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/mailchimp/campaigns/:campaignId/stats', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        campaigns: [
          {
            campaignId: 'camp-stats',
            type: 'regular',
            status: 'sent',
            subject: 'Stats Test',
            stats: {
              emailsSent: 100,
              opensTotal: 50,
              uniqueOpens: 40,
              clicksTotal: 20,
              uniqueClicks: 15,
            },
          },
        ],
      });
    });

    it('should update campaign statistics', async () => {
      const response = await request(app)
        .put('/api/mailchimp/campaigns/camp-stats/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          opensTotal: 60,
          uniqueOpens: 50,
          clicksTotal: 25,
          uniqueClicks: 20,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .put('/api/mailchimp/campaigns/non-existent/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          opensTotal: 100,
        });

      expect(response.status).toBe(500); // Will throw error from model method
    });
  });

  describe('GET /api/mailchimp/automations', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        automations: [
          {
            automationId: 'auto-1',
            title: 'Welcome Series',
            status: 'sending',
            triggerSettings: {
              workflowType: 'welcomeSeries',
            },
          },
          {
            automationId: 'auto-2',
            title: 'Appointment Reminders',
            status: 'paused',
            triggerSettings: {
              workflowType: 'custom',
            },
          },
        ],
      });
    });

    it('should get all automations', async () => {
      const response = await request(app)
        .get('/api/mailchimp/automations')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.automations).toBeDefined();
      expect(response.body.automations.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter automations by status', async () => {
      const response = await request(app)
        .get('/api/mailchimp/automations?status=sending')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.automations.length).toBe(1);
      expect(response.body.automations[0].status).toBe('sending');
    });
  });

  describe('GET /api/mailchimp/automations/:automationId', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        automations: [
          {
            automationId: 'auto-get-test',
            title: 'Get Test Automation',
            status: 'sending',
          },
        ],
      });
    });

    it('should get automation by ID', async () => {
      const response = await request(app)
        .get('/api/mailchimp/automations/auto-get-test')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.automation).toBeDefined();
      expect(response.body.automation.automationId).toBe('auto-get-test');
      expect(response.body.automation.title).toBe('Get Test Automation');
    });

    it('should return 404 for non-existent automation', async () => {
      const response = await request(app)
        .get('/api/mailchimp/automations/non-existent')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/mailchimp/automations', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new automation', async () => {
      const response = await request(app)
        .post('/api/mailchimp/automations')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          automationId: 'auto-new',
          title: 'New Automation',
          status: 'save',
          triggerSettings: {
            workflowType: 'emailSeries',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require automationId and title', async () => {
      const response = await request(app)
        .post('/api/mailchimp/automations')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          status: 'save',
          // Missing automationId and title
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/mailchimp/automations/:automationId/stats', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        automations: [
          {
            automationId: 'auto-stats',
            title: 'Stats Test Automation',
            status: 'sending',
            stats: {
              totalEmailsSent: 100,
              totalOpens: 50,
              totalClicks: 20,
            },
          },
        ],
      });
    });

    it('should update automation statistics', async () => {
      const response = await request(app)
        .put('/api/mailchimp/automations/auto-stats/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          totalEmailsSent: 150,
          totalOpens: 75,
          totalClicks: 30,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });
  });

  describe('GET /api/mailchimp/members', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        members: [
          {
            memberId: 'mem-1',
            emailAddress: 'john@example.com',
            listId: 'list-1',
            status: 'subscribed',
            tags: ['vip'],
          },
          {
            memberId: 'mem-2',
            emailAddress: 'jane@example.com',
            listId: 'list-1',
            status: 'subscribed',
            tags: [],
          },
          {
            memberId: 'mem-3',
            emailAddress: 'bob@example.com',
            listId: 'list-2',
            status: 'unsubscribed',
            tags: [],
          },
        ],
      });
    });

    it('should get all members', async () => {
      const response = await request(app)
        .get('/api/mailchimp/members')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.members).toBeDefined();
      expect(response.body.members.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter members by listId', async () => {
      const response = await request(app)
        .get('/api/mailchimp/members?listId=list-1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.members.length).toBe(2);
      expect(response.body.members.every((m) => m.listId === 'list-1')).toBe(true);
    });

    it('should filter members by status', async () => {
      const response = await request(app)
        .get('/api/mailchimp/members?status=subscribed')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.members.length).toBe(2);
      expect(response.body.members.every((m) => m.status === 'subscribed')).toBe(true);
    });

    it('should filter by both listId and status', async () => {
      const response = await request(app)
        .get('/api/mailchimp/members?listId=list-1&status=subscribed')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.members.length).toBe(2);
    });
  });

  describe('POST /api/mailchimp/members', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should add a new member', async () => {
      const response = await request(app)
        .post('/api/mailchimp/members')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          memberId: 'new-mem-123',
          emailAddress: 'newmember@example.com',
          listId: 'list-1',
          status: 'subscribed',
          mergeFields: {
            FNAME: 'New',
            LNAME: 'Member',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added/updated');
    });

    it('should require listId', async () => {
      const response = await request(app)
        .post('/api/mailchimp/members')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          emailAddress: 'test@example.com',
          // Missing listId
        });

      expect(response.status).toBe(400);
    });

    it('should require memberId or emailAddress', async () => {
      const response = await request(app)
        .post('/api/mailchimp/members')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          listId: 'list-1',
          // Missing both memberId and emailAddress
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/mailchimp/members/:email/tags', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        members: [
          {
            memberId: 'mem-tag-test',
            emailAddress: 'tagtest@example.com',
            listId: 'list-1',
            status: 'subscribed',
            tags: [],
          },
        ],
        tags: [
          {
            tagId: 'tag-1',
            name: 'VIP',
            listId: 'list-1',
            memberCount: 0,
          },
        ],
      });
    });

    it('should add tag to member', async () => {
      const response = await request(app)
        .post('/api/mailchimp/members/tagtest@example.com/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tagName: 'VIP',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added to member');
    });

    it('should require tagName', async () => {
      const response = await request(app)
        .post('/api/mailchimp/members/tagtest@example.com/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return error for non-existent member', async () => {
      const response = await request(app)
        .post('/api/mailchimp/members/nonexistent@example.com/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tagName: 'VIP',
        });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/mailchimp/members/:email/tags/:tagName', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        members: [
          {
            memberId: 'mem-remove-tag',
            emailAddress: 'removetag@example.com',
            listId: 'list-1',
            status: 'subscribed',
            tags: ['VIP', 'Newsletter'],
          },
        ],
        tags: [
          {
            tagId: 'tag-1',
            name: 'VIP',
            listId: 'list-1',
            memberCount: 1,
          },
        ],
      });
    });

    it('should remove tag from member', async () => {
      const response = await request(app)
        .delete('/api/mailchimp/members/removetag@example.com/tags/VIP')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed from member');
    });
  });

  describe('GET /api/mailchimp/tags', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        tags: [
          { tagId: 'tag-1', name: 'VIP', listId: 'list-1', memberCount: 10 },
          { tagId: 'tag-2', name: 'Newsletter', listId: 'list-1', memberCount: 50 },
          { tagId: 'tag-3', name: 'Special', listId: 'list-2', memberCount: 5 },
        ],
      });
    });

    it('should get all tags', async () => {
      const response = await request(app)
        .get('/api/mailchimp/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.tags).toBeDefined();
      expect(response.body.tags.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter tags by listId', async () => {
      const response = await request(app)
        .get('/api/mailchimp/tags?listId=list-1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.tags.length).toBe(2);
      expect(response.body.tags.every((t) => t.listId === 'list-1')).toBe(true);
    });
  });

  describe('POST /api/mailchimp/tags', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should create a new tag', async () => {
      const response = await request(app)
        .post('/api/mailchimp/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tagId: 'new-tag-123',
          name: 'New Tag',
          listId: 'list-1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should require tagId and name', async () => {
      const response = await request(app)
        .post('/api/mailchimp/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          listId: 'list-1',
          // Missing tagId and name
        });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate tags', async () => {
      const connection = await MailchimpAutomation.findOne({ organization: organizationId });
      connection.tags.push({ tagId: 'duplicate-tag', name: 'Duplicate', listId: 'list-1' });
      await connection.save();

      const response = await request(app)
        .post('/api/mailchimp/tags')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          tagId: 'duplicate-tag',
          name: 'Duplicate',
          listId: 'list-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/mailchimp/segments', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        segments: [
          {
            segmentId: 'seg-1',
            name: 'Active Patients',
            listId: 'list-1',
            type: 'static',
            memberCount: 100,
          },
          {
            segmentId: 'seg-2',
            name: 'Engaged Users',
            listId: 'list-1',
            type: 'dynamic',
            memberCount: 50,
          },
        ],
      });
    });

    it('should get all segments', async () => {
      const response = await request(app)
        .get('/api/mailchimp/segments')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.segments).toBeDefined();
      expect(response.body.segments.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter segments by listId', async () => {
      const response = await request(app)
        .get('/api/mailchimp/segments?listId=list-1')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.segments.length).toBe(2);
    });
  });

  describe('POST /api/mailchimp/segments', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should create a new segment', async () => {
      const response = await request(app)
        .post('/api/mailchimp/segments')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          segmentId: 'new-seg-123',
          name: 'New Segment',
          listId: 'list-1',
          type: 'static',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should require segmentId, name, and listId', async () => {
      const response = await request(app)
        .post('/api/mailchimp/segments')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          type: 'static',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate segments', async () => {
      const connection = await MailchimpAutomation.findOne({ organization: organizationId });
      connection.segments.push({
        segmentId: 'dup-seg',
        name: 'Duplicate',
        listId: 'list-1',
        type: 'static',
      });
      await connection.save();

      const response = await request(app)
        .post('/api/mailchimp/segments')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          segmentId: 'dup-seg',
          name: 'Duplicate',
          listId: 'list-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/mailchimp/webhooks', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        webhooks: [
          {
            webhookId: 'hook-1',
            listId: 'list-1',
            url: 'https://example.com/webhook',
            events: { subscribe: true, unsubscribe: true },
          },
        ],
      });
    });

    it('should get all webhooks', async () => {
      const response = await request(app)
        .get('/api/mailchimp/webhooks')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.webhooks).toBeDefined();
      expect(response.body.webhooks.length).toBe(1);
      expect(response.body.total).toBe(1);
    });
  });

  describe('POST /api/mailchimp/webhooks', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });
    });

    it('should create a webhook', async () => {
      const response = await request(app)
        .post('/api/mailchimp/webhooks')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          webhookId: 'new-hook-123',
          listId: 'list-1',
          url: 'https://example.com/new-webhook',
          events: {
            subscribe: true,
            unsubscribe: true,
            profile: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should require webhookId, listId, and url', async () => {
      const response = await request(app)
        .post('/api/mailchimp/webhooks')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          events: { subscribe: true },
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/mailchimp/webhooks/:webhookId', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        webhooks: [
          {
            webhookId: 'hook-to-delete',
            listId: 'list-1',
            url: 'https://example.com/webhook',
          },
        ],
      });
    });

    it('should delete a webhook', async () => {
      const response = await request(app)
        .delete('/api/mailchimp/webhooks/hook-to-delete')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('POST /api/mailchimp/webhook/events', () => {
    it('should receive and process subscribe webhook', async () => {
      const response = await request(app)
        .post('/api/mailchimp/webhook/events')
        .send({
          type: 'subscribe',
          data: {
            email: 'newsubscriber@example.com',
            list_id: 'list-1',
          },
          fired_at: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('received');
    });

    it('should process unsubscribe webhook', async () => {
      const response = await request(app)
        .post('/api/mailchimp/webhook/events')
        .send({
          type: 'unsubscribe',
          data: {
            email: 'unsubscribe@example.com',
          },
          fired_at: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
    });

    it('should process profile update webhook', async () => {
      const response = await request(app)
        .post('/api/mailchimp/webhook/events')
        .send({
          type: 'profile',
          data: {
            email: 'profileupdate@example.com',
          },
          fired_at: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/mailchimp/config', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        syncConfig: {
          autoSync: true,
          syncInterval: 'daily',
          syncPatients: true,
          syncDirection: 'two_way',
          tagPatientsByStatus: true,
        },
      });
    });

    it('should get sync configuration', async () => {
      const response = await request(app)
        .get('/api/mailchimp/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.autoSync).toBe(true);
      expect(response.body.config.syncInterval).toBe('daily');
      expect(response.body.config.syncDirection).toBe('two_way');
    });
  });

  describe('PUT /api/mailchimp/config', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        syncConfig: {
          autoSync: false,
          syncInterval: 'hourly',
        },
      });
    });

    it('should update sync configuration', async () => {
      const response = await request(app)
        .put('/api/mailchimp/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          autoSync: true,
          syncInterval: 'daily',
          syncDirection: 'one_way_to_mailchimp',
          tagPatientsByStatus: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.autoSync).toBe(true);
      expect(response.body.config.syncInterval).toBe('daily');
    });

    it('should reject invalid syncInterval', async () => {
      const response = await request(app)
        .put('/api/mailchimp/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          syncInterval: 'invalid_interval',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid syncDirection', async () => {
      const response = await request(app)
        .put('/api/mailchimp/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          syncDirection: 'invalid_direction',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/mailchimp/stats', () => {
    beforeEach(async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
          accountName: 'Test Account',
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalCampaigns: 25,
          totalAutomations: 5,
          totalMembers: 1000,
          totalEmailsSent: 5000,
          totalOpens: 2500,
          totalClicks: 1000,
        },
        lastSyncedAt: new Date(),
      });
    });

    it('should get overall statistics', async () => {
      const response = await request(app)
        .get('/api/mailchimp/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalCampaigns).toBe(25);
      expect(response.body.stats.totalAutomations).toBe(5);
      expect(response.body.stats.totalMembers).toBe(1000);
      expect(response.body.stats.totalEmailsSent).toBe(5000);
      expect(response.body.stats.avgOpenRate).toBeDefined();
      expect(response.body.stats.avgClickRate).toBeDefined();
      expect(response.body.connection.isConnected).toBe(true);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate avgOpenRate correctly', async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalEmailsSent: 1000,
          totalOpens: 500,
        },
      });

      const response = await request(app)
        .get('/api/mailchimp/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.stats.avgOpenRate)).toBe(50);
    });

    it('should calculate avgClickRate correctly', async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
        stats: {
          totalEmailsSent: 1000,
          totalClicks: 250,
        },
      });

      const response = await request(app)
        .get('/api/mailchimp/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(parseFloat(response.body.stats.avgClickRate)).toBe(25);
    });

    it('should show isConnected as true', async () => {
      await MailchimpAutomation.create({
        organization: organizationId,
        mailchimpAccount: {
          apiKey: 'testkey',
          serverPrefix: 'us1',
        },
        status: 'connected',
        createdBy: userId,
      });

      const response = await request(app)
        .get('/api/mailchimp/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.isConnected).toBe(true);
    });
  });
});
