const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const ZapierWebhook = require('../models/ZapierWebhook');
/* eslint-env jest */
/**
 * Zapier Webhooks API Tests
 * TASK-15.13 - Zapier Webhooks
 *
 * Tests for:
 * - Webhook subscription management
 * - Event triggering
 * - Webhook authentication
 * - Event filtering
 * - REST Hooks (subscribe/unsubscribe)
 * - Statistics and monitoring
 * - Webhook testing
 */

// eslint-disable-next-line no-unused-vars
describe('Zapier Webhooks API - TASK-15.13', () => {
  let testUserId;
  let testOrgId;
  let testWebhook;
  let testApiKey;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ZapierWebhook.deleteMany({});

    testUserId = new mongoose.Types.ObjectId();
    testOrgId = new mongoose.Types.ObjectId();

    // Create a test webhook
    testWebhook = await ZapierWebhook.createWebhook({
      type: 'trigger',
      event: 'appointment.created',
      targetUrl: 'https://hooks.zapier.com/test/123',
      organization: testOrgId,
      createdBy: testUserId,
    });

    testApiKey = testWebhook.authentication.apiKey;
  });

  // ==================== WEBHOOK MANAGEMENT ====================

  describe('POST /api/zapier/webhooks', () => {
    it('should create a new webhook', async () => {
      const webhookData = {
        type: 'trigger',
        event: 'patient.created',
        targetUrl: 'https://hooks.zapier.com/test/456',
      };

      const response = await request(app)
        .post('/api/zapier/webhooks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(webhookData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.type).toBe('trigger');
      expect(response.body.event).toBe('patient.created');
      expect(response.body.status).toBe('active');
      expect(response.body.authentication).toHaveProperty('apiKey');
      expect(response.body.authentication).toHaveProperty('secret');
    });

    it('should reject webhook with invalid event', async () => {
      const webhookData = {
        type: 'trigger',
        event: 'invalid.event',
        targetUrl: 'https://hooks.zapier.com/test',
      };

      await request(app)
        .post('/api/zapier/webhooks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(webhookData)
        .expect(400);
    });

    it('should reject webhook without required fields', async () => {
      await request(app)
        .post('/api/zapier/webhooks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          type: 'trigger',
        })
        .expect(400);
    });

    it('should create webhook with filters', async () => {
      const webhookData = {
        type: 'trigger',
        event: 'appointment.created',
        targetUrl: 'https://hooks.zapier.com/test',
        filters: {
          conditions: [{ field: 'status', operator: 'equals', value: 'confirmed' }],
          includedFields: ['id', 'patientName', 'date'],
        },
      };

      const response = await request(app)
        .post('/api/zapier/webhooks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(webhookData)
        .expect(201);

      expect(response.body.filters.conditions).toHaveLength(1);
      expect(response.body.filters.includedFields).toHaveLength(3);
    });
  });

  describe('GET /api/zapier/webhooks', () => {
    beforeEach(async () => {
      await ZapierWebhook.create([
        {
          type: 'trigger',
          event: 'invoice.paid',
          targetUrl: 'https://hooks.zapier.com/test/1',
          organization: testOrgId,
          createdBy: testUserId,
          status: 'active',
        },
        {
          type: 'action',
          event: 'patient.updated',
          targetUrl: 'https://hooks.zapier.com/test/2',
          organization: testOrgId,
          createdBy: testUserId,
          status: 'paused',
        },
      ]);
    });

    it('should list all webhooks', async () => {
      const response = await request(app)
        .get('/api/zapier/webhooks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhooks.length).toBeGreaterThanOrEqual(2);
      expect(response.body.count).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/zapier/webhooks?status=active')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhooks.every((w) => w.status === 'active')).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/zapier/webhooks?type=trigger')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhooks.every((w) => w.type === 'trigger')).toBe(true);
    });

    it('should filter by event', async () => {
      const response = await request(app)
        .get('/api/zapier/webhooks?event=invoice.paid')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhooks.every((w) => w.event === 'invoice.paid')).toBe(true);
    });
  });

  describe('GET /api/zapier/webhooks/:id', () => {
    it('should get a webhook by ID', async () => {
      const response = await request(app)
        .get(`/api/zapier/webhooks/${testWebhook._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body._id).toBe(testWebhook._id.toString());
      expect(response.body.event).toBe('appointment.created');
    });

    it('should return 404 for non-existent webhook', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/zapier/webhooks/${fakeId}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(404);
    });
  });

  describe('PUT /api/zapier/webhooks/:id', () => {
    it('should update a webhook', async () => {
      const updates = {
        targetUrl: 'https://hooks.zapier.com/updated',
        filters: {
          includedFields: ['id', 'name'],
        },
      };

      const response = await request(app)
        .put(`/api/zapier/webhooks/${testWebhook._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(updates)
        .expect(200);

      expect(response.body.targetUrl).toBe('https://hooks.zapier.com/updated');
    });

    it('should not allow updating authentication', async () => {
      const updates = {
        authentication: {
          apiKey: 'hacked-key',
        },
      };

      const response = await request(app)
        .put(`/api/zapier/webhooks/${testWebhook._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(updates)
        .expect(200);

      // API key should remain unchanged
      expect(response.body.authentication.apiKey).toBe(testApiKey);
    });
  });

  describe('DELETE /api/zapier/webhooks/:id', () => {
    it('should soft delete a webhook', async () => {
      await request(app)
        .delete(`/api/zapier/webhooks/${testWebhook._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      const deletedWebhook = await ZapierWebhook.findById(testWebhook._id);
      expect(deletedWebhook.isDeleted).toBe(true);
      expect(deletedWebhook.deletedAt).toBeTruthy();
    });
  });

  // ==================== WEBHOOK CONTROL ====================

  describe('PUT /api/zapier/webhooks/:id/pause', () => {
    it('should pause a webhook', async () => {
      const response = await request(app)
        .put(`/api/zapier/webhooks/${testWebhook._id}/pause`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhook.status).toBe('paused');
    });
  });

  describe('PUT /api/zapier/webhooks/:id/resume', () => {
    it('should resume a paused webhook', async () => {
      await testWebhook.pause();

      const response = await request(app)
        .put(`/api/zapier/webhooks/${testWebhook._id}/resume`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhook.status).toBe('active');
    });
  });

  describe('POST /api/zapier/webhooks/:id/test', () => {
    it('should test a webhook', async () => {
      const testPayload = {
        test: true,
        message: 'Test webhook',
      };

      const response = await request(app)
        .post(`/api/zapier/webhooks/${testWebhook._id}/test`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ payload: testPayload })
        .expect(200);

      expect(response.body.result).toHaveProperty('success');
      expect(response.body.result).toHaveProperty('testedAt');
    });
  });

  describe('POST /api/zapier/webhooks/:id/regenerate-key', () => {
    it('should regenerate API key', async () => {
      const oldApiKey = testWebhook.authentication.apiKey;

      const response = await request(app)
        .post(`/api/zapier/webhooks/${testWebhook._id}/regenerate-key`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.apiKey).toBeTruthy();
      expect(response.body.apiKey).not.toBe(oldApiKey);
      expect(response.body.secret).toBeTruthy();
    });
  });

  // ==================== EVENT TRIGGERING ====================

  describe('POST /api/zapier/trigger/:event', () => {
    it('should trigger event to all subscribed webhooks', async () => {
      const payload = {
        id: '123',
        patientName: 'John Doe',
        date: '2024-01-15',
        status: 'scheduled',
      };

      const response = await request(app)
        .post('/api/zapier/trigger/appointment.created')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(payload)
        .expect(200);

      expect(response.body.event).toBe('appointment.created');
      expect(response.body.triggeredCount).toBeGreaterThanOrEqual(1);
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should skip webhooks when conditions not met', async () => {
      // Add webhook with conditions
      await ZapierWebhook.createWebhook({
        type: 'trigger',
        event: 'appointment.created',
        targetUrl: 'https://hooks.zapier.com/conditional',
        organization: testOrgId,
        createdBy: testUserId,
        filters: {
          conditions: [{ field: 'status', operator: 'equals', value: 'confirmed' }],
        },
      });

      const payload = {
        id: '123',
        status: 'scheduled', // Doesn't match 'confirmed'
      };

      const response = await request(app)
        .post('/api/zapier/trigger/appointment.created')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(payload)
        .expect(200);

      const skippedResults = response.body.results.filter((r) => r.status === 'skipped');
      expect(skippedResults.length).toBeGreaterThan(0);
    });

    it('should apply field filters to payload', async () => {
      await testWebhook.updateOne({
        $set: {
          'filters.includedFields': ['id', 'patientName'],
        },
      });

      const payload = {
        id: '123',
        patientName: 'John Doe',
        date: '2024-01-15',
        secretField: 'should-be-filtered',
      };

      const response = await request(app)
        .post('/api/zapier/trigger/appointment.created')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(payload)
        .expect(200);

      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should return empty results for no subscribed webhooks', async () => {
      const response = await request(app)
        .post('/api/zapier/trigger/non.existent.event')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ test: true })
        .expect(200);

      expect(response.body.triggeredCount).toBe(0);
    });
  });

  // ==================== REST HOOKS ====================

  describe('POST /api/zapier/hooks/subscribe', () => {
    it('should subscribe to webhook with API key', async () => {
      const subscribeData = {
        hookUrl: 'https://hooks.zapier.com/new-subscription',
        event: 'patient.created',
      };

      const response = await request(app)
        .post('/api/zapier/hooks/subscribe')
        .set('x-api-key', testApiKey)
        .send(subscribeData)
        .expect(200);

      expect(response.body.id).toBeTruthy();
      expect(response.body.message).toBe('Subscription created');

      // Verify webhook was updated
      const updatedWebhook = await ZapierWebhook.findById(testWebhook._id);
      expect(updatedWebhook.zapierConfig.hookUrl).toBe('https://hooks.zapier.com/new-subscription');
    });

    it('should reject subscription without API key', async () => {
      await request(app)
        .post('/api/zapier/hooks/subscribe')
        .send({
          hookUrl: 'https://hooks.zapier.com/test',
          event: 'patient.created',
        })
        .expect(401);
    });

    it('should reject subscription with invalid API key', async () => {
      await request(app)
        .post('/api/zapier/hooks/subscribe')
        .set('x-api-key', 'invalid-key')
        .send({
          hookUrl: 'https://hooks.zapier.com/test',
          event: 'patient.created',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/zapier/hooks/unsubscribe/:id', () => {
    it('should unsubscribe from webhook', async () => {
      const response = await request(app)
        .delete(`/api/zapier/hooks/unsubscribe/${testWebhook._id}`)
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(response.body.message).toBe('Subscription deleted');

      const deletedWebhook = await ZapierWebhook.findById(testWebhook._id);
      expect(deletedWebhook.isDeleted).toBe(true);
    });
  });

  describe('GET /api/zapier/hooks/perform-list', () => {
    it('should get sample data for event', async () => {
      const response = await request(app)
        .get('/api/zapier/hooks/perform-list?event=appointment.created')
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  // ==================== STATISTICS ====================

  describe('GET /api/zapier/webhooks/:id/stats', () => {
    it('should get webhook statistics', async () => {
      // Add some events
      await testWebhook.recordEvent({
        eventType: 'appointment.created',
        payload: { test: true },
        status: 'sent',
        statusCode: 200,
        responseTime: 150,
      });

      await testWebhook.recordEvent({
        eventType: 'appointment.created',
        payload: { test: true },
        status: 'failed',
        errorMessage: 'Connection timeout',
      });

      const response = await request(app)
        .get(`/api/zapier/webhooks/${testWebhook._id}/stats`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.totalEvents).toBe(2);
      expect(response.body.successfulEvents).toBe(1);
      expect(response.body.failedEvents).toBe(1);
      expect(response.body.successRate).toBeTruthy();
    });
  });

  describe('GET /api/zapier/webhooks/:id/events', () => {
    beforeEach(async () => {
      // Add multiple events
      for (let i = 0; i < 5; i += 1) {
        await testWebhook.recordEvent({
          eventType: 'appointment.created',
          payload: { index: i },
          status: 'sent',
          statusCode: 200,
        });
      }
    });

    it('should get recent events', async () => {
      const response = await request(app)
        .get(`/api/zapier/webhooks/${testWebhook._id}/events`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.events.length).toBeGreaterThanOrEqual(5);
      expect(response.body.count).toBeGreaterThanOrEqual(5);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get(`/api/zapier/webhooks/${testWebhook._id}/events?limit=2`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.events).toHaveLength(2);
    });
  });

  describe('GET /api/zapier/stats', () => {
    beforeEach(async () => {
      await ZapierWebhook.create([
        {
          type: 'trigger',
          event: 'invoice.paid',
          targetUrl: 'https://hooks.zapier.com/test',
          organization: testOrgId,
          createdBy: testUserId,
          stats: {
            totalEvents: 100,
            successfulEvents: 95,
            failedEvents: 5,
          },
        },
        {
          type: 'action',
          event: 'patient.updated',
          targetUrl: 'https://hooks.zapier.com/test',
          organization: testOrgId,
          createdBy: testUserId,
          status: 'paused',
          stats: {
            totalEvents: 50,
            successfulEvents: 45,
            failedEvents: 5,
          },
        },
      ]);
    });

    it('should get organization-wide statistics', async () => {
      const response = await request(app)
        .get('/api/zapier/stats')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.totalWebhooks).toBeGreaterThanOrEqual(2);
      expect(response.body.activeWebhooks).toBeGreaterThanOrEqual(1);
      expect(response.body.totalEvents).toBeGreaterThanOrEqual(150);
      expect(response.body.successRate).toBeTruthy();
    });
  });

  describe('GET /api/zapier/failing-webhooks', () => {
    beforeEach(async () => {
      await ZapierWebhook.create({
        type: 'trigger',
        event: 'test.event',
        targetUrl: 'https://hooks.zapier.com/test',
        organization: testOrgId,
        createdBy: testUserId,
        status: 'active',
        stats: {
          totalEvents: 100,
          successfulEvents: 30,
          failedEvents: 70, // 70% failure rate
        },
      });
    });

    it('should get webhooks with high failure rates', async () => {
      const response = await request(app)
        .get('/api/zapier/failing-webhooks?threshold=50')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.webhooks.length).toBeGreaterThan(0);
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  // ==================== AVAILABLE EVENTS ====================

  describe('GET /api/zapier/events', () => {
    it('should get list of available events', async () => {
      const response = await request(app).get('/api/zapier/events').expect(200);

      expect(response.body.events).toBeInstanceOf(Array);
      expect(response.body.events.length).toBeGreaterThan(0);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.events).toContain('appointment.created');
      expect(response.body.events).toContain('patient.created');
      expect(response.body.events).toContain('invoice.paid');
    });
  });

  // ==================== ADMIN OPERATIONS ====================

  describe('POST /api/zapier/admin/cleanup', () => {
    beforeEach(async () => {
      // Add old events
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      testWebhook.recentEvents.push({
        eventId: 'old-event',
        eventType: 'test.event',
        payload: {},
        triggeredAt: oldDate,
        status: 'sent',
      });
      await testWebhook.save();
    });

    it('should cleanup old webhook events', async () => {
      const response = await request(app)
        .post('/api/zapier/admin/cleanup')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ daysToKeep: 30 })
        .expect(200);

      expect(response.body.message).toBe('Cleanup completed');
      expect(response.body).toHaveProperty('modified');
    });
  });

  // ==================== AUTHENTICATION ====================

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .post('/api/zapier/webhooks')
        .send({
          type: 'trigger',
          event: 'test.event',
          targetUrl: 'https://hooks.zapier.com/test',
        })
        .expect(401);
    });

    it('should allow API key authentication for webhooks', async () => {
      const response = await request(app)
        .get('/api/zapier/hooks/perform-list')
        .set('x-api-key', testApiKey)
        .expect(200);

      expect(response.body).toBeTruthy();
    });

    it('should reject inactive webhooks', async () => {
      await testWebhook.pause();

      await request(app)
        .post('/api/zapier/hooks/subscribe')
        .set('x-api-key', testApiKey)
        .send({
          hookUrl: 'https://hooks.zapier.com/test',
          event: 'test.event',
        })
        .expect(403);
    });
  });

  // ==================== MODEL METHODS ====================

  describe('Model Methods', () => {
    it('should generate API key and secret', () => {
      const webhook = new ZapierWebhook({
        type: 'trigger',
        event: 'test.event',
        targetUrl: 'https://test.com',
        organization: testOrgId,
        createdBy: testUserId,
      });

      const apiKey = webhook.generateApiKey();
      const secret = webhook.generateSecret();

      expect(apiKey).toBeTruthy();
      expect(secret).toBeTruthy();
      expect(apiKey.length).toBe(64); // 32 bytes = 64 hex chars
      expect(secret.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should verify API key', () => {
      expect(testWebhook.verifyApiKey(testApiKey)).toBe(true);
      expect(testWebhook.verifyApiKey('wrong-key')).toBe(false);
    });

    it('should apply filters correctly', () => {
      testWebhook.filters.includedFields = ['id', 'name'];

      const payload = {
        id: '123',
        name: 'Test',
        secret: 'should-be-removed',
      };

      const filtered = testWebhook.applyFilters(payload);

      expect(filtered).toHaveProperty('id');
      expect(filtered).toHaveProperty('name');
      expect(filtered).not.toHaveProperty('secret');
    });

    it('should check condition matching', () => {
      testWebhook.filters.conditions = [
        { field: 'status', operator: 'equals', value: 'confirmed' },
      ];

      expect(testWebhook.matchesConditions({ status: 'confirmed' })).toBe(true);
      expect(testWebhook.matchesConditions({ status: 'pending' })).toBe(false);
    });

    it('should calculate virtual fields', () => {
      testWebhook.stats.totalEvents = 100;
      testWebhook.stats.successfulEvents = 80;
      testWebhook.stats.failedEvents = 20;

      expect(parseFloat(testWebhook.successRate)).toBe(80);
      expect(parseFloat(testWebhook.failureRate)).toBe(20);
      expect(testWebhook.isActive).toBe(true);
    });
  });
});
