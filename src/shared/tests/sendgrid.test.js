/* eslint-disable camelcase */
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const SendGridEmail = require('../models/SendGridEmail');
/* eslint-env jest */
/**
 * SendGrid Email Service API Tests
 * TASK-15.12 - SendGrid Email Service
 *
 * Tests for:
 * - Email sending (single, bulk, templates)
 * - Webhook event processing
 * - Engagement tracking (opens, clicks)
 * - Bounce management
 * - Scheduled emails
 * - Campaign management
 * - Analytics and reporting
 * - Suppression lists
 */

// eslint-disable-next-line no-unused-vars
describe('SendGrid Email Service API - TASK-15.12', () => {
  let testUserId;
  let testOrgId;
  let testEmail;
  let testCampaignId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await SendGridEmail.deleteMany({});

    testUserId = new mongoose.Types.ObjectId();
    testOrgId = new mongoose.Types.ObjectId();
    testCampaignId = new mongoose.Types.ObjectId();

    // Create a test email
    testEmail = await SendGridEmail.create({
      type: 'transactional',
      to: [{ email: 'patient@example.com', name: 'John Doe' }],
      from: {
        email: 'noreply@expojane.app',
        name: 'ExpoJane',
      },
      subject: 'Test Email',
      content: {
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      },
      organization: testOrgId,
      status: 'sent',
      sendgrid: {
        messageId: 'msg123456789',
      },
      sentBy: testUserId,
    });
  });

  // ==================== EMAIL SENDING ====================

  describe('POST /api/sendgrid/send', () => {
    it('should send an email', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Welcome to ExpoJane',
        text: 'Welcome!',
        html: '<h1>Welcome!</h1>',
        type: 'transactional',
      };

      const response = await request(app)
        .post('/api/sendgrid/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(emailData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.type).toBe('transactional');
      expect(response.body.subject).toBe('Welcome to ExpoJane');
      expect(response.body.status).toBe('queued');
      expect(response.body.to[0].email).toBe('recipient@example.com');
    });

    it('should send email to multiple recipients', async () => {
      const emailData = {
        to: [
          { email: 'recipient1@example.com', name: 'User 1' },
          { email: 'recipient2@example.com', name: 'User 2' },
        ],
        subject: 'Group Email',
        text: 'Hello everyone',
      };

      const response = await request(app)
        .post('/api/sendgrid/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(emailData)
        .expect(201);

      expect(response.body.to).toHaveLength(2);
    });

    it('should schedule email for later', async () => {
      const scheduledFor = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Scheduled Email',
        text: 'This is scheduled',
        scheduledFor: scheduledFor.toISOString(),
      };

      const response = await request(app)
        .post('/api/sendgrid/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(emailData)
        .expect(201);

      expect(response.body.status).toBe('scheduled');
      expect(response.body.scheduling.scheduledFor).toBeTruthy();
    });

    it('should reject email without subject', async () => {
      await request(app)
        .post('/api/sendgrid/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          to: 'recipient@example.com',
          text: 'No subject',
        })
        .expect(400);
    });

    it('should reject email without content', async () => {
      await request(app)
        .post('/api/sendgrid/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          to: 'recipient@example.com',
          subject: 'No content',
        })
        .expect(400);
    });
  });

  describe('POST /api/sendgrid/send-template', () => {
    it('should send email using template', async () => {
      const emailData = {
        to: 'recipient@example.com',
        templateId: 'd-template123',
        dynamicData: {
          firstName: 'John',
          appointmentDate: '2024-01-15',
        },
        categories: ['appointment-reminder'],
      };

      const response = await request(app)
        .post('/api/sendgrid/send-template')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(emailData)
        .expect(201);

      expect(response.body.template.templateId).toBe('d-template123');
      expect(response.body.template.dynamicData.firstName).toBe('John');
    });

    it('should reject template email without templateId', async () => {
      await request(app)
        .post('/api/sendgrid/send-template')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          to: 'recipient@example.com',
        })
        .expect(400);
    });
  });

  describe('POST /api/sendgrid/send-bulk', () => {
    it('should send bulk emails', async () => {
      const bulkData = {
        recipients: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
          { email: 'user3@example.com', name: 'User 3' },
        ],
        subject: 'Bulk Email',
        text: 'Bulk message',
        categories: ['marketing'],
      };

      const response = await request(app)
        .post('/api/sendgrid/send-bulk')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(bulkData)
        .expect(201);

      expect(response.body.count).toBe(3);
      expect(response.body.emails).toHaveLength(3);
    });

    it('should reject empty recipients list', async () => {
      await request(app)
        .post('/api/sendgrid/send-bulk')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          recipients: [],
          subject: 'Test',
          text: 'Test',
        })
        .expect(400);
    });
  });

  // ==================== WEBHOOKS ====================

  describe('POST /api/sendgrid/webhook/events', () => {
    it('should process delivered event', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'delivered',
          timestamp: Date.now() / 1000,
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);

      const updatedEmail = await SendGridEmail.findById(testEmail._id);
      expect(updatedEmail.status).toBe('delivered');
      expect(updatedEmail.delivery.deliveredAt).toBeTruthy();
    });

    it('should process open event', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'open',
          timestamp: Date.now() / 1000,
          useragent: 'Mozilla/5.0',
          country: 'US',
          city: 'San Francisco',
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);

      const updatedEmail = await SendGridEmail.findById(testEmail._id);
      expect(updatedEmail.status).toBe('opened');
      expect(updatedEmail.engagement.opened).toBe(true);
      expect(updatedEmail.engagement.openCount).toBe(1);
      expect(updatedEmail.engagement.location.country).toBe('US');
    });

    it('should process click event', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'click',
          url: 'https://expojane.app/appointments',
          timestamp: Date.now() / 1000,
          useragent: 'Mozilla/5.0',
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);

      const updatedEmail = await SendGridEmail.findById(testEmail._id);
      expect(updatedEmail.status).toBe('clicked');
      expect(updatedEmail.engagement.clicked).toBe(true);
      expect(updatedEmail.engagement.clickCount).toBe(1);
      expect(updatedEmail.engagement.clickedUrls).toHaveLength(1);
      expect(updatedEmail.engagement.clickedUrls[0].url).toBe('https://expojane.app/appointments');
    });

    it('should process bounce event', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'bounce',
          type: 'hard',
          reason: 'Invalid email address',
          timestamp: Date.now() / 1000,
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);

      const updatedEmail = await SendGridEmail.findById(testEmail._id);
      expect(updatedEmail.status).toBe('bounced');
      expect(updatedEmail.delivery.bounced).toBe(true);
      expect(updatedEmail.delivery.bounceType).toBe('hard');
      expect(updatedEmail.delivery.bounceReason).toBe('Invalid email address');
    });

    it('should process spam report event', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'spamreport',
          timestamp: Date.now() / 1000,
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);

      const updatedEmail = await SendGridEmail.findById(testEmail._id);
      expect(updatedEmail.delivery.spamReport).toBe(true);
      expect(updatedEmail.delivery.spamReportAt).toBeTruthy();
    });

    it('should process unsubscribe event', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'unsubscribe',
          timestamp: Date.now() / 1000,
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);

      const updatedEmail = await SendGridEmail.findById(testEmail._id);
      expect(updatedEmail.delivery.unsubscribed).toBe(true);
      expect(updatedEmail.delivery.unsubscribeAt).toBeTruthy();
    });
  });

  // ==================== EMAIL MANAGEMENT ====================

  describe('GET /api/sendgrid/emails/:id', () => {
    it('should get an email by ID', async () => {
      const response = await request(app)
        .get(`/api/sendgrid/emails/${testEmail._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body._id).toBe(testEmail._id.toString());
      expect(response.body.subject).toBe('Test Email');
    });

    it('should return 404 for non-existent email', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/sendgrid/emails/${fakeId}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(404);
    });
  });

  describe('GET /api/sendgrid/emails', () => {
    beforeEach(async () => {
      await SendGridEmail.create([
        {
          type: 'marketing',
          to: [{ email: 'test1@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Marketing Email',
          content: { text: 'Marketing' },
          organization: testOrgId,
          status: 'delivered',
          categories: ['newsletter'],
        },
        {
          type: 'transactional',
          to: [{ email: 'test2@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Receipt',
          content: { text: 'Receipt' },
          organization: testOrgId,
          status: 'bounced',
        },
      ]);
    });

    it('should list all emails', async () => {
      const response = await request(app)
        .get('/api/sendgrid/emails')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/sendgrid/emails?type=marketing')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.every((e) => e.type === 'marketing')).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/sendgrid/emails?status=bounced')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.every((e) => e.status === 'bounced')).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/sendgrid/emails?category=newsletter')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.every((e) => e.categories.includes('newsletter'))).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/sendgrid/emails?limit=1&skip=0')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails).toHaveLength(1);
      expect(response.body.limit).toBe(1);
    });
  });

  describe('GET /api/sendgrid/emails/recipient/:email', () => {
    beforeEach(async () => {
      await SendGridEmail.create([
        {
          type: 'transactional',
          to: [{ email: 'specific@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Email 1',
          content: { text: 'Test' },
          organization: testOrgId,
          status: 'delivered',
        },
        {
          type: 'transactional',
          to: [{ email: 'specific@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Email 2',
          content: { text: 'Test' },
          organization: testOrgId,
          status: 'opened',
        },
      ]);
    });

    it('should get emails by recipient', async () => {
      const response = await request(app)
        .get('/api/sendgrid/emails/recipient/specific@example.com')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.length).toBeGreaterThanOrEqual(2);
      expect(response.body.emails.every((e) => e.to[0].email === 'specific@example.com')).toBe(
        true
      );
    });
  });

  describe('DELETE /api/sendgrid/emails/:id', () => {
    it('should soft delete an email', async () => {
      await request(app)
        .delete(`/api/sendgrid/emails/${testEmail._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      const deletedEmail = await SendGridEmail.findById(testEmail._id);
      expect(deletedEmail.isDeleted).toBe(true);
      expect(deletedEmail.deletedAt).toBeTruthy();
    });
  });

  // ==================== SCHEDULED EMAILS ====================

  describe('GET /api/sendgrid/scheduled', () => {
    beforeEach(async () => {
      await SendGridEmail.create({
        type: 'transactional',
        to: [{ email: 'scheduled@example.com' }],
        from: { email: 'noreply@expojane.app' },
        subject: 'Scheduled Email',
        content: { text: 'Test' },
        organization: testOrgId,
        status: 'scheduled',
        scheduling: {
          scheduledFor: new Date(Date.now() - 1000), // In the past, ready to send
        },
      });
    });

    it('should get scheduled emails', async () => {
      const response = await request(app)
        .get('/api/sendgrid/scheduled')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.length).toBeGreaterThanOrEqual(1);
      expect(response.body.emails.every((e) => e.status === 'scheduled')).toBe(true);
    });
  });

  describe('PUT /api/sendgrid/scheduled/:id/cancel', () => {
    it('should cancel a scheduled email', async () => {
      const scheduledEmail = await SendGridEmail.create({
        type: 'transactional',
        to: [{ email: 'cancel@example.com' }],
        from: { email: 'noreply@expojane.app' },
        subject: 'To Be Canceled',
        content: { text: 'Test' },
        organization: testOrgId,
        status: 'scheduled',
        scheduling: {
          scheduledFor: new Date(Date.now() + 60000),
        },
      });

      const response = await request(app)
        .put(`/api/sendgrid/scheduled/${scheduledEmail._id}/cancel`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ reason: 'User requested cancellation' })
        .expect(200);

      expect(response.body.email.scheduling.isCanceled).toBe(true);
      expect(response.body.email.status).toBe('failed');
    });
  });

  // ==================== CAMPAIGN MANAGEMENT ====================

  describe('GET /api/sendgrid/campaign/:campaignId', () => {
    beforeEach(async () => {
      await SendGridEmail.create([
        {
          type: 'marketing',
          to: [{ email: 'campaign1@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Campaign Email 1',
          content: { text: 'Test' },
          organization: testOrgId,
          campaign: { id: testCampaignId, name: 'Summer Sale' },
          status: 'delivered',
        },
        {
          type: 'marketing',
          to: [{ email: 'campaign2@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Campaign Email 2',
          content: { text: 'Test' },
          organization: testOrgId,
          campaign: { id: testCampaignId, name: 'Summer Sale' },
          status: 'opened',
          engagement: { opened: true },
        },
      ]);
    });

    it('should get campaign emails', async () => {
      const response = await request(app)
        .get(`/api/sendgrid/campaign/${testCampaignId}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.length).toBe(2);
      expect(response.body.emails.every((e) => e.campaign.id === testCampaignId.toString())).toBe(
        true
      );
    });
  });

  describe('GET /api/sendgrid/campaign/:campaignId/stats', () => {
    beforeEach(async () => {
      await SendGridEmail.create([
        {
          type: 'marketing',
          to: [{ email: 'stats1@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Stats Email 1',
          content: { text: 'Test' },
          organization: testOrgId,
          campaign: { id: testCampaignId },
          status: 'delivered',
        },
        {
          type: 'marketing',
          to: [{ email: 'stats2@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Stats Email 2',
          content: { text: 'Test' },
          organization: testOrgId,
          campaign: { id: testCampaignId },
          status: 'opened',
          engagement: { opened: true, openCount: 3 },
        },
        {
          type: 'marketing',
          to: [{ email: 'stats3@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Stats Email 3',
          content: { text: 'Test' },
          organization: testOrgId,
          campaign: { id: testCampaignId },
          status: 'clicked',
          engagement: { opened: true, clicked: true, clickCount: 2 },
        },
      ]);
    });

    it('should get campaign statistics', async () => {
      const response = await request(app)
        .get(`/api/sendgrid/campaign/${testCampaignId}/stats`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.delivered).toBeGreaterThanOrEqual(2);
      expect(response.body.opened).toBeGreaterThanOrEqual(2);
      expect(response.body.clicked).toBeGreaterThanOrEqual(1);
      expect(response.body).toHaveProperty('openRate');
      expect(response.body).toHaveProperty('clickRate');
    });
  });

  // ==================== ANALYTICS ====================

  describe('GET /api/sendgrid/analytics/delivery', () => {
    beforeEach(async () => {
      await SendGridEmail.create([
        {
          type: 'transactional',
          to: [{ email: 'analytics1@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Analytics 1',
          content: { text: 'Test' },
          organization: testOrgId,
          status: 'delivered',
        },
        {
          type: 'transactional',
          to: [{ email: 'analytics2@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Analytics 2',
          content: { text: 'Test' },
          organization: testOrgId,
          status: 'bounced',
          delivery: { bounced: true },
        },
      ]);
    });

    it('should get delivery statistics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/sendgrid/analytics/delivery?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('delivered');
      expect(response.body).toHaveProperty('bounced');
      expect(response.body).toHaveProperty('deliveryRate');
      expect(response.body).toHaveProperty('bounceRate');
    });

    it('should require date range', async () => {
      await request(app)
        .get('/api/sendgrid/analytics/delivery')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(400);
    });
  });

  describe('GET /api/sendgrid/analytics/engagement', () => {
    it('should get engagement analytics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/sendgrid/analytics/engagement?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('topClickedUrls');
      expect(response.body).toHaveProperty('deviceBreakdown');
      expect(response.body).toHaveProperty('topCountries');
    });
  });

  // ==================== BOUNCES & SUPPRESSION ====================

  describe('GET /api/sendgrid/bounces', () => {
    beforeEach(async () => {
      await SendGridEmail.create([
        {
          type: 'transactional',
          to: [{ email: 'bounce1@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Bounced 1',
          content: { text: 'Test' },
          organization: testOrgId,
          status: 'bounced',
          delivery: {
            bounced: true,
            bounceType: 'hard',
            bounceReason: 'Invalid address',
          },
        },
        {
          type: 'transactional',
          to: [{ email: 'bounce2@example.com' }],
          from: { email: 'noreply@expojane.app' },
          subject: 'Bounced 2',
          content: { text: 'Test' },
          organization: testOrgId,
          status: 'bounced',
          delivery: {
            bounced: true,
            bounceType: 'soft',
            bounceReason: 'Mailbox full',
          },
        },
      ]);
    });

    it('should get all bounced emails', async () => {
      const response = await request(app)
        .get('/api/sendgrid/bounces')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.length).toBeGreaterThanOrEqual(2);
      expect(response.body.emails.every((e) => e.delivery.bounced)).toBe(true);
    });

    it('should filter by bounce type', async () => {
      const response = await request(app)
        .get('/api/sendgrid/bounces?type=hard')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.emails.every((e) => e.delivery.bounceType === 'hard')).toBe(true);
    });
  });

  describe('GET /api/sendgrid/suppression-list', () => {
    it('should get suppression list', async () => {
      const response = await request(app)
        .get('/api/sendgrid/suppression-list')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('bounced');
      expect(response.body).toHaveProperty('spam');
      expect(response.body).toHaveProperty('unsubscribed');
      expect(response.body).toHaveProperty('total');
    });
  });

  // ==================== AUTHENTICATION ====================

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .post('/api/sendgrid/send')
        .send({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
        .expect(401);
    });

    it('should allow public access to webhooks', async () => {
      const events = [
        {
          sg_message_id: 'msg123456789',
          event: 'delivered',
          timestamp: Date.now() / 1000,
        },
      ];

      await request(app).post('/api/sendgrid/webhook/events').send(events).expect(200);
    });
  });

  // ==================== MODEL METHODS ====================

  describe('Model Methods', () => {
    it('should calculate virtual fields correctly', () => {
      expect(testEmail.isDelivered).toBe(false);

      testEmail.status = 'delivered';
      expect(testEmail.isDelivered).toBe(true);
    });

    it('should calculate open rate', async () => {
      testEmail.engagement.uniqueOpens = 1;
      testEmail.engagement.openCount = 3;

      expect(parseFloat(testEmail.openRate)).toBe(100); // 1/1 * 100
    });
  });
});
