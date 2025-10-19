const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../server');
const IntegrationMarketplace = require('../models/IntegrationMarketplace');
/* eslint-env jest */
// eslint-disable-next-line no-unused-vars
let mongoServer;

// Test data
const testOrganizationId = new mongoose.Types.ObjectId();
const testUserId = new mongoose.Types.ObjectId();
const testUserId2 = new mongoose.Types.ObjectId();

const testHeaders = {
  'x-user-id': testUserId.toString(),
  'x-organization-id': testOrganizationId.toString(),
};

describe('Integration Marketplace API - TASK-16.5', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await IntegrationMarketplace.deleteMany({});
  });

  describe('POST /api/integration-marketplace/initialize', () => {
    it('should initialize marketplace', async () => {
      const response = await request(app)
        .post('/api/integration-marketplace/initialize')
        .set(testHeaders)
        .send({
          settings: {
            autoInstallUpdates: false,
            requireApproval: true,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.organization.toString()).toBe(testOrganizationId.toString());
      expect(response.body.data.settings.requireApproval).toBe(true);
    });

    it('should return existing marketplace if already initialized', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
      });

      const response = await request(app)
        .post('/api/integration-marketplace/initialize')
        .set(testHeaders)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('already initialized');
    });
  });

  describe('GET /api/integration-marketplace/browse', () => {
    it('should browse all integrations', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting integration',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
            featured: true,
            ratings: { average: 4.5, count: 100 },
          },
          {
            integrationId: 'INT-002',
            name: 'Slack',
            slug: 'slack',
            description: 'Team communication',
            category: 'communication',
            provider: { name: 'Slack Technologies' },
            status: 'active',
            popular: true,
            ratings: { average: 4.8, count: 250 },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/browse')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should filter by category', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
          },
          {
            integrationId: 'INT-002',
            name: 'Slack',
            slug: 'slack',
            description: 'Communication',
            category: 'communication',
            provider: { name: 'Slack' },
            status: 'active',
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/browse?category=accounting')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('accounting');
    });

    it('should filter featured integrations', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
            featured: true,
          },
          {
            integrationId: 'INT-002',
            name: 'Slack',
            slug: 'slack',
            description: 'Communication',
            category: 'communication',
            provider: { name: 'Slack' },
            status: 'active',
            featured: false,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/browse?featured=true')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].featured).toBe(true);
    });

    it('should filter by minimum rating', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Integration A',
            slug: 'integration-a',
            description: 'Test A',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            ratings: { average: 4.8 },
          },
          {
            integrationId: 'INT-002',
            name: 'Integration B',
            slug: 'integration-b',
            description: 'Test B',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            ratings: { average: 3.5 },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/browse?minRating=4.0')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].ratings.average).toBeGreaterThanOrEqual(4.0);
    });

    it('should sort by popular', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Less Popular',
            slug: 'less-popular',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            statistics: { totalInstalls: 50 },
          },
          {
            integrationId: 'INT-002',
            name: 'More Popular',
            slug: 'more-popular',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            statistics: { totalInstalls: 500 },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/browse?sort=popular')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data[0].name).toBe('More Popular');
    });
  });

  describe('GET /api/integration-marketplace/search', () => {
    it('should search integrations', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks Online',
            slug: 'quickbooks',
            description: 'Accounting software',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
            tags: ['accounting', 'finance'],
          },
          {
            integrationId: 'INT-002',
            name: 'Slack',
            slug: 'slack',
            description: 'Team chat',
            category: 'communication',
            provider: { name: 'Slack' },
            status: 'active',
            tags: ['chat', 'collaboration'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/search?q=accounting')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('QuickBooks Online');
    });

    it('should require search query', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
      });

      const response = await request(app)
        .get('/api/integration-marketplace/search')
        .set(testHeaders);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/integration-marketplace/integrations/:integrationId', () => {
    it('should get specific integration', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting software',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
            features: [{ name: 'Invoice sync', description: 'Sync invoices' }],
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/integrations/INT-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationId).toBe('INT-001');
      expect(response.body.data.name).toBe('QuickBooks');
      expect(response.body.data.isInstalled).toBe(false);
    });

    it('should record integration view', async () => {
      const marketplace = await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
          },
        ],
        analytics: {
          totalViews: 0,
        },
      });

      await request(app).get('/api/integration-marketplace/integrations/INT-001').set(testHeaders);

      const updated = await IntegrationMarketplace.findById(marketplace._id);
      expect(updated.analytics.totalViews).toBe(1);
    });
  });

  describe('POST /api/integration-marketplace/integrations', () => {
    it('should add integration to marketplace', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/integrations')
        .set(testHeaders)
        .send({
          name: 'New Integration',
          description: 'Test integration',
          category: 'other',
          provider: { name: 'Test Provider' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Integration');
    });
  });

  describe('PUT /api/integration-marketplace/integrations/:integrationId', () => {
    it('should update integration', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Old Name',
            slug: 'old-name',
            description: 'Old description',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-marketplace/integrations/INT-001')
        .set(testHeaders)
        .send({
          name: 'New Name',
          description: 'New description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
      expect(response.body.data.description).toBe('New description');
    });
  });

  describe('GET /api/integration-marketplace/categories', () => {
    it('should get all categories with counts', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QB',
            slug: 'qb',
            description: 'Test',
            category: 'accounting',
            provider: { name: 'Test' },
            status: 'active',
          },
          {
            integrationId: 'INT-002',
            name: 'Slack',
            slug: 'slack',
            description: 'Test',
            category: 'communication',
            provider: { name: 'Test' },
            status: 'active',
          },
          {
            integrationId: 'INT-003',
            name: 'Teams',
            slug: 'teams',
            description: 'Test',
            category: 'communication',
            provider: { name: 'Test' },
            status: 'active',
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/categories')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const commCategory = response.body.data.find((c) => c.name === 'communication');
      expect(commCategory.count).toBe(2);
    });
  });

  describe('GET /api/integration-marketplace/featured', () => {
    it('should get featured integrations', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Featured 1',
            slug: 'featured-1',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            featured: true,
          },
          {
            integrationId: 'INT-002',
            name: 'Not Featured',
            slug: 'not-featured',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            featured: false,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/featured')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].featured).toBe(true);
    });
  });

  describe('POST /api/integration-marketplace/install', () => {
    it('should install integration', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
            version: '1.0.0',
            statistics: {
              totalInstalls: 0,
              activeInstalls: 0,
            },
          },
        ],
        analytics: {
          totalInstalls: 0,
        },
      });

      const response = await request(app)
        .post('/api/integration-marketplace/install')
        .set(testHeaders)
        .send({
          integrationId: 'INT-001',
          configuration: {
            apiKey: 'test-key',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationId).toBe('INT-001');
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.configuration.apiKey).toBe('test-key');
    });

    it('should reject duplicate installation', async () => {
      const marketplace = await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test',
            slug: 'test',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
        ],
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            status: 'active',
            installedBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/install')
        .set(testHeaders)
        .send({
          integrationId: 'INT-001',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already installed');
    });
  });

  describe('POST /api/integration-marketplace/uninstall', () => {
    it('should uninstall integration', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test',
            slug: 'test',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            statistics: {
              activeInstalls: 1,
            },
          },
        ],
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            name: 'Test',
            status: 'active',
            installedBy: testUserId,
          },
        ],
        analytics: {
          totalUninstalls: 0,
        },
      });

      const response = await request(app)
        .post('/api/integration-marketplace/uninstall')
        .set(testHeaders)
        .send({
          integrationId: 'INT-001',
          reason: 'No longer needed',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/integration-marketplace/installed', () => {
    it('should get installed integrations', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            name: 'QuickBooks',
            status: 'active',
            installedBy: testUserId,
          },
          {
            installationId: 'INST-002',
            integrationId: 'INT-002',
            name: 'Slack',
            status: 'active',
            installedBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/installed')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            name: 'Active',
            status: 'active',
            installedBy: testUserId,
          },
          {
            installationId: 'INST-002',
            integrationId: 'INT-002',
            name: 'Paused',
            status: 'paused',
            installedBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/installed?status=active')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');
    });
  });

  describe('PUT /api/integration-marketplace/installed/:integrationId/config', () => {
    it('should update installation configuration', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            name: 'Test',
            status: 'active',
            configuration: {
              apiKey: 'old-key',
            },
            installedBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-marketplace/installed/INT-001/config')
        .set(testHeaders)
        .send({
          configuration: {
            apiKey: 'new-key',
            webhookUrl: 'https://example.com/webhook',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configuration.apiKey).toBe('new-key');
      expect(response.body.data.configuration.webhookUrl).toBe('https://example.com/webhook');
    });
  });

  describe('POST /api/integration-marketplace/reviews', () => {
    it('should add review', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test',
            slug: 'test',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            ratings: {
              average: 0,
              count: 0,
              distribution: { one: 0, two: 0, three: 0, four: 0, five: 0 },
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/reviews')
        .set(testHeaders)
        .send({
          integrationId: 'INT-001',
          rating: 5,
          title: 'Excellent integration',
          comment: 'Works great!',
          pros: ['Easy to use', 'Great support'],
          cons: [],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.title).toBe('Excellent integration');
    });

    it('should reject duplicate review from same user', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test',
            slug: 'test',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
        ],
        reviews: [
          {
            reviewId: 'REV-001',
            integrationId: 'INT-001',
            userId: testUserId,
            rating: 5,
            comment: 'Good',
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/reviews')
        .set(testHeaders)
        .send({
          integrationId: 'INT-001',
          rating: 4,
          comment: 'Still good',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('already reviewed');
    });
  });

  describe('GET /api/integration-marketplace/reviews/:integrationId', () => {
    it('should get reviews for integration', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        reviews: [
          {
            reviewId: 'REV-001',
            integrationId: 'INT-001',
            userId: testUserId,
            rating: 5,
            comment: 'Great!',
            createdAt: new Date(),
          },
          {
            reviewId: 'REV-002',
            integrationId: 'INT-001',
            userId: testUserId2,
            rating: 4,
            comment: 'Good',
            createdAt: new Date(Date.now() - 86400000),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/reviews/INT-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should sort reviews by helpful', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        reviews: [
          {
            reviewId: 'REV-001',
            integrationId: 'INT-001',
            userId: testUserId,
            rating: 5,
            helpful: { count: 2 },
          },
          {
            reviewId: 'REV-002',
            integrationId: 'INT-001',
            userId: testUserId2,
            rating: 4,
            helpful: { count: 10 },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/reviews/INT-001?sort=helpful')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data[0].reviewId).toBe('REV-002');
    });
  });

  describe('PUT /api/integration-marketplace/reviews/:reviewId', () => {
    it('should update review', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test',
            slug: 'test',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            ratings: {
              average: 5,
              distribution: { five: 1, four: 0, three: 0, two: 0, one: 0 },
            },
          },
        ],
        reviews: [
          {
            reviewId: 'REV-001',
            integrationId: 'INT-001',
            userId: testUserId,
            rating: 5,
            comment: 'Old comment',
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-marketplace/reviews/REV-001')
        .set(testHeaders)
        .send({
          rating: 4,
          comment: 'Updated comment',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(4);
      expect(response.body.data.comment).toBe('Updated comment');
    });
  });

  describe('POST /api/integration-marketplace/reviews/:reviewId/helpful', () => {
    it('should mark review as helpful', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        reviews: [
          {
            reviewId: 'REV-001',
            integrationId: 'INT-001',
            userId: testUserId2,
            rating: 5,
            helpful: {
              count: 0,
              users: [],
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/reviews/REV-001/helpful')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const marketplace = await IntegrationMarketplace.findOne({
        organization: testOrganizationId,
      });
      const review = marketplace.reviews.find((r) => r.reviewId === 'REV-001');
      expect(review.helpful.count).toBe(1);
    });
  });

  describe('GET /api/integration-marketplace/favorites', () => {
    it('should get user favorites', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'QuickBooks',
            slug: 'quickbooks',
            description: 'Accounting',
            category: 'accounting',
            provider: { name: 'Intuit' },
            status: 'active',
          },
        ],
        favorites: [
          {
            userId: testUserId,
            integrationId: 'INT-001',
            addedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/favorites')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].integrationId).toBe('INT-001');
    });
  });

  describe('POST /api/integration-marketplace/favorites', () => {
    it('should add to favorites', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test',
            slug: 'test',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
        ],
        favorites: [],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/favorites')
        .set(testHeaders)
        .send({
          integrationId: 'INT-001',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/integration-marketplace/favorites/:integrationId', () => {
    it('should remove from favorites', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        favorites: [
          {
            userId: testUserId,
            integrationId: 'INT-001',
          },
        ],
      });

      const response = await request(app)
        .delete('/api/integration-marketplace/favorites/INT-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/integration-marketplace/collections', () => {
    it('should get all collections', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        collections: [
          {
            collectionId: 'COLL-001',
            name: 'Essential Integrations',
            description: 'Must-have integrations',
            integrations: ['INT-001', 'INT-002'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/collections')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Essential Integrations');
    });
  });

  describe('POST /api/integration-marketplace/collections', () => {
    it('should create collection', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        collections: [],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/collections')
        .set(testHeaders)
        .send({
          name: 'Healthcare Essentials',
          description: 'Essential healthcare integrations',
          integrations: ['INT-001', 'INT-002'],
          featured: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Healthcare Essentials');
    });
  });

  describe('POST /api/integration-marketplace/requests', () => {
    it('should submit integration request', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        integrationRequests: [],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/requests')
        .set(testHeaders)
        .send({
          integrationName: 'Zoom',
          description: 'Video conferencing integration',
          category: 'communication',
          useCase: 'Telemedicine appointments',
          priority: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationName).toBe('Zoom');
      expect(response.body.data.votes.count).toBe(1);
    });
  });

  describe('GET /api/integration-marketplace/requests', () => {
    it('should get integration requests', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        integrationRequests: [
          {
            requestId: 'REQ-001',
            userId: testUserId,
            integrationName: 'Zoom',
            status: 'pending',
            votes: { count: 5 },
          },
          {
            requestId: 'REQ-002',
            userId: testUserId,
            integrationName: 'Stripe',
            status: 'pending',
            votes: { count: 10 },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/requests')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should sort by votes', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        integrationRequests: [
          {
            requestId: 'REQ-001',
            userId: testUserId,
            integrationName: 'Less Popular',
            status: 'pending',
            votes: { count: 5 },
          },
          {
            requestId: 'REQ-002',
            userId: testUserId,
            integrationName: 'More Popular',
            status: 'pending',
            votes: { count: 20 },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/requests?sort=votes')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data[0].integrationName).toBe('More Popular');
    });
  });

  describe('POST /api/integration-marketplace/requests/:requestId/vote', () => {
    it('should vote for request', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        integrationRequests: [
          {
            requestId: 'REQ-001',
            userId: testUserId2,
            integrationName: 'Zoom',
            status: 'pending',
            votes: {
              count: 1,
              users: [testUserId2],
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-marketplace/requests/REQ-001/vote')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const marketplace = await IntegrationMarketplace.findOne({
        organization: testOrganizationId,
      });
      const request = marketplace.integrationRequests.find((r) => r.requestId === 'REQ-001');
      expect(request.votes.count).toBe(2);
    });
  });

  describe('GET /api/integration-marketplace/analytics', () => {
    it('should get marketplace analytics', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test 1',
            slug: 'test-1',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
          {
            integrationId: 'INT-002',
            name: 'Test 2',
            slug: 'test-2',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
        ],
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            status: 'active',
            installedBy: testUserId,
          },
        ],
        analytics: {
          totalViews: 100,
          totalInstalls: 50,
          totalUninstalls: 5,
        },
      });

      const response = await request(app)
        .get('/api/integration-marketplace/analytics')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAvailable).toBe(2);
      expect(response.body.data.totalInstalled).toBe(1);
      expect(response.body.data.totalViews).toBe(100);
      expect(response.body.data.totalInstalls).toBe(50);
    });
  });

  describe('GET /api/integration-marketplace/stats', () => {
    it('should get overall statistics', async () => {
      await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Featured',
            slug: 'featured',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            featured: true,
          },
          {
            integrationId: 'INT-002',
            name: 'Normal',
            slug: 'normal',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
            featured: false,
          },
        ],
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            status: 'active',
            installedBy: testUserId,
          },
        ],
        reviews: [{ reviewId: 'REV-001', integrationId: 'INT-001', userId: testUserId, rating: 5 }],
        favorites: [{ userId: testUserId, integrationId: 'INT-001' }],
        integrationRequests: [
          { requestId: 'REQ-001', userId: testUserId, integrationName: 'Test', status: 'pending' },
          {
            requestId: 'REQ-002',
            userId: testUserId,
            integrationName: 'Test 2',
            status: 'completed',
          },
        ],
        collections: [{ collectionId: 'COLL-001', name: 'Test Collection', integrations: [] }],
      });

      const response = await request(app)
        .get('/api/integration-marketplace/stats')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.availableIntegrations).toBe(2);
      expect(response.body.data.installedIntegrations).toBe(1);
      expect(response.body.data.featuredIntegrations).toBe(1);
      expect(response.body.data.totalReviews).toBe(1);
      expect(response.body.data.totalFavorites).toBe(1);
      expect(response.body.data.pendingRequests).toBe(1);
      expect(response.body.data.collections).toBe(1);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate totalAvailableIntegrations', async () => {
      const marketplace = await IntegrationMarketplace.create({
        organization: testOrganizationId,
        availableIntegrations: [
          {
            integrationId: 'INT-001',
            name: 'Test 1',
            slug: 'test-1',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
          {
            integrationId: 'INT-002',
            name: 'Test 2',
            slug: 'test-2',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'active',
          },
          {
            integrationId: 'INT-003',
            name: 'Test 3',
            slug: 'test-3',
            description: 'Test',
            category: 'other',
            provider: { name: 'Test' },
            status: 'beta',
          },
        ],
      });

      expect(marketplace.totalAvailableIntegrations).toBe(2);
    });

    it('should calculate totalInstalledIntegrations', async () => {
      const marketplace = await IntegrationMarketplace.create({
        organization: testOrganizationId,
        installedIntegrations: [
          {
            installationId: 'INST-001',
            integrationId: 'INT-001',
            status: 'active',
            installedBy: testUserId,
          },
          {
            installationId: 'INST-002',
            integrationId: 'INT-002',
            status: 'active',
            installedBy: testUserId,
          },
          {
            installationId: 'INST-003',
            integrationId: 'INT-003',
            status: 'paused',
            installedBy: testUserId,
          },
        ],
      });

      expect(marketplace.totalInstalledIntegrations).toBe(2);
    });

    it('should calculate installationRate', async () => {
      const marketplace = await IntegrationMarketplace.create({
        organization: testOrganizationId,
        analytics: {
          totalViews: 100,
          totalInstalls: 25,
        },
      });

      expect(parseFloat(marketplace.installationRate)).toBe(25.0);
    });
  });
});
