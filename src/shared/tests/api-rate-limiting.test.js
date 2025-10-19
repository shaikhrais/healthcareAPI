const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const ApiRateLimiting = require('../models/ApiRateLimiting');
/* eslint-env jest */
// eslint-disable-next-line no-unused-vars
describe('API Rate Limiting Tests', () => {
  let organizationId;
  let userId;

  beforeAll(async () => {
    organizationId = new mongoose.Types.ObjectId().toString();
    userId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(async () => {
    await ApiRateLimiting.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ============================================
  // INITIALIZATION TESTS
  // ============================================
  describe('POST /api/rate-limiting/initialize', () => {
    it('should initialize API rate limiting system', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          organizationName: 'Test Org',
          defaultSettings: {
            enableRateLimiting: true,
            defaultTier: 'free',
            alertThresholds: {
              usageWarning: 80,
              usageCritical: 95,
            },
          },
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizationId).toBe(organizationId);
      expect(res.body.data.tiers).toHaveLength(6); // free, basic, standard, premium, enterprise, unlimited
      expect(res.body.data.settings.enableRateLimiting).toBe(true);
    });

    it('should return 400 if already initialized', async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const res = await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('already initialized');
    });
  });

  describe('GET /api/rate-limiting', () => {
    it('should get rate limiting configuration', async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const res = await request(app)
        .get('/api/rate-limiting')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.organizationId).toBe(organizationId);
      expect(res.body.data.tiers).toHaveLength(6);
    });

    it('should return 404 if not initialized', async () => {
      const res = await request(app)
        .get('/api/rate-limiting')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(404);
    });
  });

  // ============================================
  // TIER MANAGEMENT TESTS
  // ============================================
  describe('GET /api/rate-limiting/tiers', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should get all tiers', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(6);
      expect(res.body.data[0]).toHaveProperty('tierId');
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('level');
      expect(res.body.data[0]).toHaveProperty('limits');
    });

    it('should filter tiers by level', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/tiers?level=premium')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].level).toBe('premium');
    });

    it('should filter active tiers', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/tiers?isActive=true')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((tier) => tier.isActive)).toBe(true);
    });
  });

  describe('POST /api/rate-limiting/tiers', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should create a new tier', async () => {
      const newTier = {
        name: 'Custom Tier',
        level: 'enterprise',
        description: 'Custom enterprise tier',
        limits: {
          requestsPerSecond: 100,
          requestsPerMinute: 5000,
          requestsPerHour: 250000,
          requestsPerDay: 5000000,
          requestsPerMonth: 100000000,
          concurrentRequests: 50,
          burstLimit: 200,
        },
        quotas: {
          dataTransferPerMonth: 10000,
          storageLimit: 500,
          webhookCallsPerMonth: 100000,
          customEndpoints: 500,
        },
        pricing: {
          monthlyPrice: 999,
          annualPrice: 9999,
          currency: 'USD',
        },
      };

      const res = await request(app)
        .post('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(newTier);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newTier.name);
      expect(res.body.data.limits.requestsPerSecond).toBe(100);
    });

    it('should validate tier data', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          name: 'Invalid Tier',
          level: 'invalid_level',
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/rate-limiting/tiers/:tierId', () => {
    let tierId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;
    });

    it('should get a specific tier', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/tiers/${tierId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tierId).toBe(tierId);
    });

    it('should return 404 for non-existent tier', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/rate-limiting/tiers/${fakeId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/rate-limiting/tiers/:tierId', () => {
    let tierId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;
    });

    it('should update a tier', async () => {
      const updates = {
        name: 'Updated Tier Name',
        description: 'Updated description',
        limits: {
          requestsPerSecond: 50,
        },
      };

      const res = await request(app)
        .put(`/api/rate-limiting/tiers/${tierId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(updates);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updates.name);
      expect(res.body.data.description).toBe(updates.description);
    });
  });

  describe('DELETE /api/rate-limiting/tiers/:tierId', () => {
    let tierId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const createRes = await request(app)
        .post('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          name: 'Deletable Tier',
          level: 'basic',
          limits: {
            requestsPerSecond: 10,
          },
        });

      tierId = createRes.body.data.tierId;
    });

    it('should delete a tier', async () => {
      const res = await request(app)
        .delete(`/api/rate-limiting/tiers/${tierId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);

      const getRes = await request(app)
        .get(`/api/rate-limiting/tiers/${tierId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(getRes.statusCode).toEqual(404);
    });
  });

  // ============================================
  // API KEY MANAGEMENT TESTS
  // ============================================
  describe('POST /api/rate-limiting/api-keys', () => {
    let tierId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;
    });

    it('should create a new API key', async () => {
      const keyData = {
        tierId,
        name: 'Test API Key',
        description: 'For testing purposes',
        permissions: [
          { resource: 'patients', actions: ['read', 'write'] },
          { resource: 'appointments', actions: ['read'] },
        ],
        ipWhitelist: ['192.168.1.1', '10.0.0.0/8'],
        scopes: ['patients:read', 'patients:write', 'appointments:read'],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };

      const res = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(keyData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('keyId');
      expect(res.body.data).toHaveProperty('key');
      expect(res.body.data).toHaveProperty('secret');
      expect(res.body.data.key).toContain('expojane_');
      expect(res.body.data.name).toBe(keyData.name);
      expect(res.body.data.permissions).toHaveLength(2);
    });

    it('should validate API key creation data', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          name: 'Invalid Key',
          // Missing tierId
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/rate-limiting/api-keys', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should get all API keys (with masked secrets)', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).not.toHaveProperty('key');
      expect(res.body.data[0]).not.toHaveProperty('secret');
      expect(res.body.data[0]).toHaveProperty('keyId');
      expect(res.body.data[0]).toHaveProperty('name');
    });

    it('should filter API keys by status', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/api-keys?status=active')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((key) => key.status === 'active')).toBe(true);
    });

    it('should filter API keys by tier', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/api-keys?tierId=${tierId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((key) => key.tierId === tierId)).toBe(true);
    });
  });

  describe('GET /api/rate-limiting/api-keys/:keyId', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should get a specific API key', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/api-keys/${keyId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.keyId).toBe(keyId);
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/rate-limiting/api-keys/${fakeId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/rate-limiting/api-keys/:keyId', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should update API key details', async () => {
      const updates = {
        name: 'Updated Key Name',
        description: 'Updated description',
        ipWhitelist: ['192.168.1.100'],
      };

      const res = await request(app)
        .put(`/api/rate-limiting/api-keys/${keyId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(updates);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updates.name);
      expect(res.body.data.description).toBe(updates.description);
      expect(res.body.data.ipWhitelist).toEqual(updates.ipWhitelist);
    });
  });

  describe('POST /api/rate-limiting/api-keys/:keyId/revoke', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should revoke an API key', async () => {
      const res = await request(app)
        .post(`/api/rate-limiting/api-keys/${keyId}/revoke`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ reason: 'Security breach' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('revoked');

      // Verify it's actually revoked
      const getRes = await request(app)
        .get(`/api/rate-limiting/api-keys/${keyId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(getRes.body.data.status).toBe('revoked');
    });

    it('should not allow revoking already revoked key', async () => {
      await request(app)
        .post(`/api/rate-limiting/api-keys/${keyId}/revoke`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ reason: 'First revoke' });

      const res = await request(app)
        .post(`/api/rate-limiting/api-keys/${keyId}/revoke`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ reason: 'Second revoke' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('already revoked');
    });
  });

  // ============================================
  // RATE LIMIT CHECKING TESTS
  // ============================================
  describe('POST /api/rate-limiting/check', () => {
    let tierId;
    let keyId;
    let apiKey;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data.find((t) => t.level === 'free').tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
      apiKey = keyRes.body.data.key;
    });

    it('should check rate limit and allow request', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/check')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          limitType: 'requestsPerMinute',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allowed).toBe(true);
      expect(res.body.data).toHaveProperty('remaining');
      expect(res.body.data).toHaveProperty('limit');
      expect(res.body.data).toHaveProperty('resetAt');
    });

    it('should provide limit information', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/check')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          limitType: 'requestsPerDay',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.limit).toBeGreaterThan(0);
      expect(res.body.data.remaining).toBeLessThanOrEqual(res.body.data.limit);
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/rate-limiting/check')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId: fakeId,
          limitType: 'requestsPerMinute',
        });

      expect(res.statusCode).toEqual(404);
    });
  });

  // ============================================
  // USAGE TRACKING TESTS
  // ============================================
  describe('POST /api/rate-limiting/usage', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should record usage data', async () => {
      const usageData = {
        keyId,
        metrics: {
          totalRequests: 150,
          successfulRequests: 145,
          failedRequests: 5,
          throttledRequests: 2,
          blockedRequests: 0,
          dataTransferred: 5242880, // 5 MB
          averageResponseTime: 125,
          peakRequestsPerSecond: 10,
        },
      };

      const res = await request(app)
        .post('/api/rate-limiting/usage')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(usageData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.totalRequests).toBe(150);
    });

    it('should validate usage data', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/usage')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          metrics: {
            totalRequests: -10, // Invalid negative value
          },
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/rate-limiting/usage/:keyId', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      // Record some usage
      await request(app)
        .post('/api/rate-limiting/usage')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          metrics: {
            totalRequests: 100,
            successfulRequests: 95,
            failedRequests: 5,
          },
        });
    });

    it('should get usage data for a key', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/usage/${keyId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter usage by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await request(app)
        .get(`/api/rate-limiting/usage/${keyId}?startDate=${startDate}&endDate=${endDate}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should filter usage by period', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/usage/${keyId}?period=hourly`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
    });
  });

  // ============================================
  // VIOLATION MANAGEMENT TESTS
  // ============================================
  describe('POST /api/rate-limiting/violations', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should record a violation', async () => {
      const violationData = {
        keyId,
        limitType: 'requestsPerMinute',
        limitValue: 60,
        actualValue: 85,
        action: 'throttled',
        endpoint: '/api/patients',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
      };

      const res = await request(app)
        .post('/api/rate-limiting/violations')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(violationData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.limitType).toBe(violationData.limitType);
      expect(res.body.data.action).toBe(violationData.action);
    });

    it('should validate violation data', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/violations')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          limitType: 'invalid_type',
          limitValue: 60,
          actualValue: 85,
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/rate-limiting/violations', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      // Record some violations
      await request(app)
        .post('/api/rate-limiting/violations')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          limitType: 'requestsPerMinute',
          limitValue: 60,
          actualValue: 85,
          action: 'throttled',
        });
    });

    it('should get all violations', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/violations')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter violations by keyId', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/violations?keyId=${keyId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((v) => v.keyId === keyId)).toBe(true);
    });

    it('should filter violations by action', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/violations?action=throttled')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((v) => v.action === 'throttled')).toBe(true);
    });

    it('should filter violations by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await request(app)
        .get(`/api/rate-limiting/violations?startDate=${startDate}&endDate=${endDate}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
    });
  });

  // ============================================
  // CUSTOM LIMITS TESTS
  // ============================================
  describe('POST /api/rate-limiting/custom-limits', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should add a custom limit', async () => {
      const customLimit = {
        keyId,
        endpoint: '/api/patients',
        limits: {
          requestsPerSecond: 5,
          requestsPerMinute: 250,
        },
        reason: 'Reduce load on patients endpoint',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const res = await request(app)
        .post('/api/rate-limiting/custom-limits')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(customLimit);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.endpoint).toBe(customLimit.endpoint);
      expect(res.body.data.limits.requestsPerSecond).toBe(5);
    });

    it('should validate custom limit data', async () => {
      const res = await request(app)
        .post('/api/rate-limiting/custom-limits')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          endpoint: '/api/patients',
          // Missing limits
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/rate-limiting/custom-limits', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      // Add a custom limit
      await request(app)
        .post('/api/rate-limiting/custom-limits')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          endpoint: '/api/patients',
          limits: {
            requestsPerSecond: 5,
          },
        });
    });

    it('should get all custom limits', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/custom-limits')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter custom limits by keyId', async () => {
      const res = await request(app)
        .get(`/api/rate-limiting/custom-limits?keyId=${keyId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((cl) => cl.keyId === keyId)).toBe(true);
    });

    it('should filter active custom limits', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/custom-limits?isActive=true')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.every((cl) => cl.isActive)).toBe(true);
    });
  });

  describe('DELETE /api/rate-limiting/custom-limits/:customLimitId', () => {
    let tierId;
    let keyId;
    let customLimitId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      const limitRes = await request(app)
        .post('/api/rate-limiting/custom-limits')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          endpoint: '/api/patients',
          limits: {
            requestsPerSecond: 5,
          },
        });

      customLimitId = limitRes.body.data.customLimitId;
    });

    it('should remove a custom limit', async () => {
      const res = await request(app)
        .delete(`/api/rate-limiting/custom-limits/${customLimitId}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ============================================
  // ALERTS MANAGEMENT TESTS
  // ============================================
  describe('GET /api/rate-limiting/alerts', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should get all alerts', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/alerts')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should filter alerts by severity', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/alerts?severity=high')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
    });

    it('should filter unacknowledged alerts', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/alerts?acknowledged=false')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
    });
  });

  describe('POST /api/rate-limiting/alerts/:alertId/acknowledge', () => {
    let tierId;
    let keyId;
    let alertId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      // Simulate an alert by recording violations
      await request(app)
        .post('/api/rate-limiting/violations')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          limitType: 'requestsPerMinute',
          limitValue: 60,
          actualValue: 85,
          action: 'blocked',
        });

      // Get alerts to find one
      const alertsRes = await request(app)
        .get('/api/rate-limiting/alerts')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      if (alertsRes.body.data.length > 0) {
        alertId = alertsRes.body.data[0].alertId;
      }
    });

    it('should acknowledge an alert', async () => {
      if (!alertId) {
        // Skip if no alerts exist
        return;
      }

      const res = await request(app)
        .post(`/api/rate-limiting/alerts/${alertId}/acknowledge`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ note: 'Investigating this issue' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.acknowledged).toBe(true);
    });
  });

  describe('POST /api/rate-limiting/alerts/:alertId/resolve', () => {
    let tierId;
    let keyId;
    let alertId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      // Simulate an alert
      await request(app)
        .post('/api/rate-limiting/violations')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          limitType: 'requestsPerMinute',
          limitValue: 60,
          actualValue: 85,
          action: 'blocked',
        });

      const alertsRes = await request(app)
        .get('/api/rate-limiting/alerts')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      if (alertsRes.body.data.length > 0) {
        alertId = alertsRes.body.data[0].alertId;
      }
    });

    it('should resolve an alert', async () => {
      if (!alertId) {
        return;
      }

      const res = await request(app)
        .post(`/api/rate-limiting/alerts/${alertId}/resolve`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ resolution: 'Increased tier limits' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resolved).toBe(true);
    });
  });

  // ============================================
  // ANALYTICS & STATISTICS TESTS
  // ============================================
  describe('GET /api/rate-limiting/analytics', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;

      // Record usage and violations
      await request(app)
        .post('/api/rate-limiting/usage')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          keyId,
          metrics: {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
          },
        });
    });

    it('should get analytics data', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/analytics')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('usageByTier');
      expect(res.body.data).toHaveProperty('totalRequests');
      expect(res.body.data).toHaveProperty('violationsByType');
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await request(app)
        .get(`/api/rate-limiting/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
    });
  });

  describe('GET /api/rate-limiting/stats', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should get statistics', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/stats')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalTiers');
      expect(res.body.data).toHaveProperty('totalApiKeys');
      expect(res.body.data).toHaveProperty('activeApiKeys');
    });
  });

  // ============================================
  // SETTINGS TESTS
  // ============================================
  describe('GET /api/rate-limiting/settings', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should get settings', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/settings')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('enableRateLimiting');
      expect(res.body.data).toHaveProperty('defaultTier');
    });
  });

  describe('PUT /api/rate-limiting/settings', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should update settings', async () => {
      const updates = {
        enableRateLimiting: false,
        defaultTier: 'basic',
        alertThresholds: {
          usageWarning: 75,
          usageCritical: 90,
        },
      };

      const res = await request(app)
        .put('/api/rate-limiting/settings')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(updates);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enableRateLimiting).toBe(false);
      expect(res.body.data.defaultTier).toBe('basic');
    });
  });

  // ============================================
  // NOTIFICATION SETTINGS TESTS
  // ============================================
  describe('GET /api/rate-limiting/notifications', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should get notification settings', async () => {
      const res = await request(app)
        .get('/api/rate-limiting/notifications')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('emailNotifications');
      expect(res.body.data).toHaveProperty('slackNotifications');
    });
  });

  describe('PUT /api/rate-limiting/notifications', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });
    });

    it('should update notification settings', async () => {
      const updates = {
        emailNotifications: {
          enabled: true,
          recipients: ['admin@example.com', 'dev@example.com'],
          events: ['limit_exceeded', 'key_expired'],
        },
        slackNotifications: {
          enabled: true,
          webhookUrl: 'https://hooks.slack.com/services/xxx',
          channel: '#api-alerts',
        },
      };

      const res = await request(app)
        .put('/api/rate-limiting/notifications')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send(updates);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emailNotifications.enabled).toBe(true);
      expect(res.body.data.slackNotifications.enabled).toBe(true);
    });
  });

  // ============================================
  // VIRTUAL FIELDS TESTS
  // ============================================
  describe('Virtual Fields', () => {
    let tierId;
    let keyId;

    beforeEach(async () => {
      await request(app)
        .post('/api/rate-limiting/initialize')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({ organizationName: 'Test Org' });

      const tiersRes = await request(app)
        .get('/api/rate-limiting/tiers')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      tierId = tiersRes.body.data[0].tierId;

      const keyRes = await request(app)
        .post('/api/rate-limiting/api-keys')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId)
        .send({
          tierId,
          name: 'Test Key',
          description: 'Test description',
        });

      keyId = keyRes.body.data.keyId;
    });

    it('should calculate throttleRate virtual field', async () => {
      const res = await request(app)
        .get('/api/rate-limiting')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveProperty('throttleRate');
      expect(typeof res.body.data.throttleRate).toBe('number');
    });

    it('should calculate activeKeysByTier virtual field', async () => {
      const res = await request(app)
        .get('/api/rate-limiting')
        .set('x-organization-id', organizationId)
        .set('x-user-id', userId);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveProperty('activeKeysByTier');
      expect(typeof res.body.data.activeKeysByTier).toBe('object');
    });
  });
});
