const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const TwilioMessage = require('../models/TwilioMessage');
/* eslint-env jest */
/**
 * Twilio Integration API Tests
 * TASK-15.11 - Twilio SMS/Voice Integration
 *
 * Tests for:
 * - SMS sending and receiving
 * - Voice call management
 * - Bulk SMS
 * - Conversation threads
 * - Scheduled messages
 * - Opt-in/Opt-out management
 * - Delivery tracking
 * - Analytics (delivery rates, response rates)
 */

// eslint-disable-next-line no-unused-vars
describe('Twilio Integration API - TASK-15.11', () => {
  let testUserId;
  let testOrgId;
  let testFromPhone;
  let testToPhone;
  let testMessage;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await TwilioMessage.deleteMany({});

    testUserId = new mongoose.Types.ObjectId();
    testOrgId = new mongoose.Types.ObjectId();
    testFromPhone = '+15551234567';
    testToPhone = '+15557654321';

    // Create a test message
    testMessage = await TwilioMessage.create({
      type: 'sms',
      direction: 'outbound',
      from: {
        phoneNumber: testFromPhone,
        userId: testUserId,
      },
      to: {
        phoneNumber: testToPhone,
      },
      organization: testOrgId,
      smsContent: {
        body: 'Test message',
        numSegments: 1,
      },
      status: 'sent',
      twilio: {
        messageSid: 'SM123456789',
      },
    });
  });

  // ==================== SMS SENDING ====================

  describe('POST /api/twilio/sms/send', () => {
    it('should send an SMS message', async () => {
      const smsData = {
        to: '+15559876543',
        from: testFromPhone,
        body: 'Hello from ExpoJane!',
        priority: 'normal',
      };

      const response = await request(app)
        .post('/api/twilio/sms/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(smsData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.type).toBe('sms');
      expect(response.body.direction).toBe('outbound');
      expect(response.body.smsContent.body).toBe('Hello from ExpoJane!');
      expect(response.body.status).toBe('queued');
    });

    it('should calculate SMS segments', async () => {
      const longMessage = 'A'.repeat(320); // 2 segments

      const response = await request(app)
        .post('/api/twilio/sms/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          to: '+15559876543',
          body: longMessage,
        })
        .expect(201);

      expect(response.body.smsContent.numSegments).toBe(2);
    });

    it('should schedule SMS for later', async () => {
      const scheduledFor = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const response = await request(app)
        .post('/api/twilio/sms/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          to: '+15559876543',
          body: 'Scheduled message',
          scheduledFor: scheduledFor.toISOString(),
        })
        .expect(201);

      expect(response.body.status).toBe('scheduled');
      expect(response.body.scheduling.scheduledFor).toBeTruthy();
    });

    it('should reject SMS without required fields', async () => {
      await request(app)
        .post('/api/twilio/sms/send')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          to: '+15559876543',
        })
        .expect(400);
    });
  });

  describe('POST /api/twilio/sms/send-bulk', () => {
    it('should send bulk SMS messages', async () => {
      const bulkData = {
        recipients: ['+15551111111', '+15552222222', '+15553333333'],
        body: 'Bulk message test',
        from: testFromPhone,
      };

      const response = await request(app)
        .post('/api/twilio/sms/send-bulk')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(bulkData)
        .expect(201);

      expect(response.body.count).toBe(3);
      expect(response.body.messages).toHaveLength(3);
    });

    it('should reject empty recipients list', async () => {
      await request(app)
        .post('/api/twilio/sms/send-bulk')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          recipients: [],
          body: 'Test',
        })
        .expect(400);
    });
  });

  describe('POST /api/twilio/sms/receive', () => {
    it('should receive inbound SMS', async () => {
      const twilioWebhookData = {
        MessageSid: 'SM987654321',
        From: '+15559999999',
        To: testFromPhone,
        Body: 'Hello from patient',
        NumMedia: 0,
      };

      await request(app).post('/api/twilio/sms/receive').send(twilioWebhookData).expect(200);

      const message = await TwilioMessage.findOne({
        'twilio.messageSid': 'SM987654321',
      });

      expect(message).toBeTruthy();
      expect(message.direction).toBe('inbound');
      expect(message.smsContent.body).toBe('Hello from patient');
      expect(message.status).toBe('received');
    });

    it('should handle opt-out keyword STOP', async () => {
      const twilioWebhookData = {
        MessageSid: 'SM_STOP_123',
        From: '+15559999999',
        To: testFromPhone,
        Body: 'STOP',
        NumMedia: 0,
      };

      const response = await request(app)
        .post('/api/twilio/sms/receive')
        .send(twilioWebhookData)
        .expect(200);

      expect(response.text).toContain('unsubscribed');

      const message = await TwilioMessage.findOne({
        'twilio.messageSid': 'SM_STOP_123',
      });

      expect(message.consent.status).toBe('opted_out');
    });

    it('should handle opt-in keyword START', async () => {
      const twilioWebhookData = {
        MessageSid: 'SM_START_123',
        From: '+15559999999',
        To: testFromPhone,
        Body: 'START',
        NumMedia: 0,
      };

      const response = await request(app)
        .post('/api/twilio/sms/receive')
        .send(twilioWebhookData)
        .expect(200);

      expect(response.text).toContain('subscribed');

      const message = await TwilioMessage.findOne({
        'twilio.messageSid': 'SM_START_123',
      });

      expect(message.consent.status).toBe('opted_in');
    });
  });

  describe('POST /api/twilio/sms/status', () => {
    it('should update message delivery status', async () => {
      const statusUpdate = {
        MessageSid: 'SM123456789',
        MessageStatus: 'delivered',
      };

      await request(app).post('/api/twilio/sms/status').send(statusUpdate).expect(200);

      const updatedMessage = await TwilioMessage.findById(testMessage._id);
      expect(updatedMessage.status).toBe('delivered');
      expect(updatedMessage.delivery.deliveredAt).toBeTruthy();
    });

    it('should handle failed delivery', async () => {
      const statusUpdate = {
        MessageSid: 'SM123456789',
        MessageStatus: 'failed',
        ErrorCode: '30001',
        ErrorMessage: 'Queue overflow',
      };

      await request(app).post('/api/twilio/sms/status').send(statusUpdate).expect(200);

      const updatedMessage = await TwilioMessage.findById(testMessage._id);
      expect(updatedMessage.status).toBe('failed');
      expect(updatedMessage.delivery.errorCode).toBe('30001');
      expect(updatedMessage.delivery.errorMessage).toBe('Queue overflow');
    });
  });

  // ==================== VOICE CALLS ====================

  describe('POST /api/twilio/voice/call', () => {
    it('should make an outbound voice call', async () => {
      const callData = {
        to: '+15559876543',
        from: testFromPhone,
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/twilio/voice/call')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(callData)
        .expect(201);

      expect(response.body.type).toBe('voice');
      expect(response.body.direction).toBe('outbound');
      expect(response.body.to.phoneNumber).toBe('+15559876543');
      expect(response.body.status).toBe('queued');
    });

    it('should reject call without phone number', async () => {
      await request(app)
        .post('/api/twilio/voice/call')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/twilio/voice/receive', () => {
    it('should receive inbound call', async () => {
      const twilioCallData = {
        CallSid: 'CA123456789',
        From: '+15559999999',
        To: testFromPhone,
        CallStatus: 'ringing',
      };

      const response = await request(app)
        .post('/api/twilio/voice/receive')
        .send(twilioCallData)
        .expect(200);

      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response>');

      const call = await TwilioMessage.findOne({
        'twilio.callSid': 'CA123456789',
      });

      expect(call).toBeTruthy();
      expect(call.type).toBe('voice');
      expect(call.direction).toBe('inbound');
    });
  });

  describe('POST /api/twilio/voice/status', () => {
    it('should update call status', async () => {
      const voiceMessage = await TwilioMessage.create({
        type: 'voice',
        direction: 'outbound',
        from: { phoneNumber: testFromPhone },
        to: { phoneNumber: testToPhone },
        organization: testOrgId,
        twilio: { callSid: 'CA987654321' },
        voiceContent: { callStatus: 'ringing' },
        status: 'queued',
      });

      const statusUpdate = {
        CallSid: 'CA987654321',
        CallStatus: 'completed',
        CallDuration: 120,
        AnsweredBy: 'human',
      };

      await request(app).post('/api/twilio/voice/status').send(statusUpdate).expect(200);

      const updatedCall = await TwilioMessage.findById(voiceMessage._id);
      expect(updatedCall.voiceContent.callStatus).toBe('completed');
      expect(updatedCall.voiceContent.duration).toBe(120);
      expect(updatedCall.voiceContent.answeredBy).toBe('human');
      expect(updatedCall.status).toBe('delivered');
    });
  });

  // ==================== CONVERSATIONS ====================

  describe('GET /api/twilio/conversations/:phone1/:phone2', () => {
    beforeEach(async () => {
      const threadId = TwilioMessage.generateThreadId(testFromPhone, testToPhone);

      await TwilioMessage.create([
        {
          type: 'sms',
          direction: 'outbound',
          from: { phoneNumber: testFromPhone },
          to: { phoneNumber: testToPhone },
          organization: testOrgId,
          smsContent: { body: 'Message 1' },
          conversation: { threadId },
          status: 'delivered',
          createdAt: new Date(Date.now() - 60000),
        },
        {
          type: 'sms',
          direction: 'inbound',
          from: { phoneNumber: testToPhone },
          to: { phoneNumber: testFromPhone },
          organization: testOrgId,
          smsContent: { body: 'Message 2' },
          conversation: { threadId },
          status: 'received',
          createdAt: new Date(),
        },
      ]);
    });

    it('should get conversation between two phones', async () => {
      const response = await request(app)
        .get(`/api/twilio/conversations/${testFromPhone}/${testToPhone}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.conversation.length).toBeGreaterThanOrEqual(2);
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get(`/api/twilio/conversations/${testFromPhone}/${testToPhone}?limit=1`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.conversation).toHaveLength(1);
    });
  });

  describe('GET /api/twilio/user/:userId/messages', () => {
    beforeEach(async () => {
      await TwilioMessage.create([
        {
          type: 'sms',
          direction: 'outbound',
          from: { phoneNumber: testFromPhone, userId: testUserId },
          to: { phoneNumber: testToPhone },
          organization: testOrgId,
          smsContent: { body: 'User message 1' },
          status: 'sent',
        },
        {
          type: 'voice',
          direction: 'outbound',
          from: { phoneNumber: testFromPhone, userId: testUserId },
          to: { phoneNumber: testToPhone },
          organization: testOrgId,
          voiceContent: { callStatus: 'completed' },
          status: 'delivered',
        },
      ]);
    });

    it('should get all messages for user', async () => {
      const response = await request(app)
        .get(`/api/twilio/user/${testUserId}/messages`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by message type', async () => {
      const response = await request(app)
        .get(`/api/twilio/user/${testUserId}/messages?type=sms`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages.every((m) => m.type === 'sms')).toBe(true);
    });
  });

  // ==================== MESSAGE MANAGEMENT ====================

  describe('GET /api/twilio/messages/:id', () => {
    it('should get a message by ID', async () => {
      const response = await request(app)
        .get(`/api/twilio/messages/${testMessage._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body._id).toBe(testMessage._id.toString());
      expect(response.body.smsContent.body).toBe('Test message');
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/twilio/messages/${fakeId}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(404);
    });
  });

  describe('GET /api/twilio/messages', () => {
    beforeEach(async () => {
      await TwilioMessage.create([
        {
          type: 'sms',
          direction: 'outbound',
          from: { phoneNumber: testFromPhone },
          to: { phoneNumber: testToPhone },
          organization: testOrgId,
          smsContent: { body: 'Message 1' },
          status: 'delivered',
        },
        {
          type: 'voice',
          direction: 'inbound',
          from: { phoneNumber: testToPhone },
          to: { phoneNumber: testFromPhone },
          organization: testOrgId,
          voiceContent: { callStatus: 'completed' },
          status: 'delivered',
        },
      ]);
    });

    it('should list all messages', async () => {
      const response = await request(app)
        .get('/api/twilio/messages')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/twilio/messages?type=sms')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages.every((m) => m.type === 'sms')).toBe(true);
    });

    it('should filter by direction', async () => {
      const response = await request(app)
        .get('/api/twilio/messages?direction=inbound')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages.every((m) => m.direction === 'inbound')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/twilio/messages?limit=1&skip=0')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages).toHaveLength(1);
      expect(response.body.limit).toBe(1);
    });
  });

  describe('PUT /api/twilio/messages/:id/read', () => {
    it('should mark message as read', async () => {
      const response = await request(app)
        .put(`/api/twilio/messages/${testMessage._id}/read`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.data.status).toBe('read');
      expect(response.body.data.delivery.readAt).toBeTruthy();
      expect(response.body.data.analytics.opened).toBe(true);
    });
  });

  describe('DELETE /api/twilio/messages/:id', () => {
    it('should soft delete a message', async () => {
      await request(app)
        .delete(`/api/twilio/messages/${testMessage._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      const deletedMessage = await TwilioMessage.findById(testMessage._id);
      expect(deletedMessage.isDeleted).toBe(true);
      expect(deletedMessage.deletedAt).toBeTruthy();
    });
  });

  // ==================== SCHEDULED MESSAGES ====================

  describe('GET /api/twilio/scheduled', () => {
    beforeEach(async () => {
      await TwilioMessage.create({
        type: 'sms',
        direction: 'outbound',
        from: { phoneNumber: testFromPhone },
        to: { phoneNumber: testToPhone },
        organization: testOrgId,
        smsContent: { body: 'Scheduled message' },
        status: 'scheduled',
        scheduling: {
          scheduledFor: new Date(Date.now() + 60000),
        },
      });
    });

    it('should get scheduled messages', async () => {
      const response = await request(app)
        .get('/api/twilio/scheduled')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.messages.length).toBeGreaterThanOrEqual(1);
      expect(response.body.messages.every((m) => m.status === 'scheduled')).toBe(true);
    });
  });

  describe('PUT /api/twilio/scheduled/:id/cancel', () => {
    it('should cancel a scheduled message', async () => {
      const scheduledMessage = await TwilioMessage.create({
        type: 'sms',
        direction: 'outbound',
        from: { phoneNumber: testFromPhone },
        to: { phoneNumber: testToPhone },
        organization: testOrgId,
        smsContent: { body: 'To be canceled' },
        status: 'scheduled',
        scheduling: {
          scheduledFor: new Date(Date.now() + 60000),
        },
      });

      const response = await request(app)
        .put(`/api/twilio/scheduled/${scheduledMessage._id}/cancel`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ reason: 'User requested cancellation' })
        .expect(200);

      expect(response.body.data.scheduling.isCanceled).toBe(true);
      expect(response.body.data.status).toBe('failed');
    });
  });

  // ==================== OPT-IN/OPT-OUT ====================

  describe('GET /api/twilio/opt-out/check/:phoneNumber', () => {
    beforeEach(async () => {
      await TwilioMessage.create({
        type: 'sms',
        direction: 'inbound',
        from: { phoneNumber: '+15558888888' },
        to: { phoneNumber: testFromPhone },
        organization: testOrgId,
        smsContent: { body: 'STOP' },
        consent: {
          status: 'opted_out',
          optedOutAt: new Date(),
          optOutMethod: 'user_reply',
          optOutKeyword: 'STOP',
        },
        status: 'received',
      });
    });

    it('should check opt-out status', async () => {
      const response = await request(app)
        .get('/api/twilio/opt-out/check/+15558888888')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.isOptedOut).toBe(true);
      expect(response.body.method).toBe('user_reply');
    });
  });

  describe('POST /api/twilio/opt-out/:messageId', () => {
    it('should manually opt out a phone number', async () => {
      const response = await request(app)
        .post(`/api/twilio/opt-out/${testMessage._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.data.consent.status).toBe('opted_out');
      expect(response.body.data.consent.optOutMethod).toBe('admin_action');
    });
  });

  // ==================== ANALYTICS ====================

  describe('GET /api/twilio/analytics/delivery', () => {
    beforeEach(async () => {
      await TwilioMessage.create([
        {
          type: 'sms',
          direction: 'outbound',
          from: { phoneNumber: testFromPhone },
          to: { phoneNumber: testToPhone },
          organization: testOrgId,
          smsContent: { body: 'Message 1' },
          status: 'delivered',
          twilio: { price: -0.0075 },
        },
        {
          type: 'sms',
          direction: 'outbound',
          from: { phoneNumber: testFromPhone },
          to: { phoneNumber: testToPhone },
          organization: testOrgId,
          smsContent: { body: 'Message 2' },
          status: 'failed',
        },
      ]);
    });

    it('should get delivery stats', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/twilio/analytics/delivery?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('delivered');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('deliveryRate');
      expect(response.body).toHaveProperty('totalCost');
    });

    it('should require date range', async () => {
      await request(app)
        .get('/api/twilio/analytics/delivery')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(400);
    });
  });

  describe('GET /api/twilio/analytics/response-rate', () => {
    it('should get response rate', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(
          `/api/twilio/analytics/response-rate?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('totalOutbound');
      expect(response.body).toHaveProperty('withResponse');
      expect(response.body).toHaveProperty('responseRate');
    });
  });

  // ==================== AUTHENTICATION ====================

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .post('/api/twilio/sms/send')
        .send({
          to: '+15559999999',
          body: 'Test',
        })
        .expect(401);
    });

    it('should allow public access to webhooks', async () => {
      const twilioWebhookData = {
        MessageSid: 'SM_PUBLIC_TEST',
        From: '+15559999999',
        To: testFromPhone,
        Body: 'Test webhook',
        NumMedia: 0,
      };

      await request(app).post('/api/twilio/sms/receive').send(twilioWebhookData).expect(200);
    });
  });

  // ==================== MODEL METHODS ====================

  describe('Model Methods', () => {
    it('should generate consistent thread IDs', () => {
      const thread1 = TwilioMessage.generateThreadId('+15551111111', '+15552222222');
      const thread2 = TwilioMessage.generateThreadId('+15552222222', '+15551111111');

      expect(thread1).toBe(thread2);
    });

    it('should calculate virtual fields correctly', async () => {
      expect(testMessage.isDelivered).toBe(false);
      expect(testMessage.isFailed).toBe(false);

      testMessage.status = 'delivered';
      expect(testMessage.isDelivered).toBe(true);
    });
  });
});
