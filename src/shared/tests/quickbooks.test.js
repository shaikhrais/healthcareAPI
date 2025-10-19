const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const QuickBooksSync = require('../models/QuickBooksSync');
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

describe('QuickBooks Integration API - TASK-15.14', () => {
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
    await QuickBooksSync.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await QuickBooksSync.deleteMany({});

    organizationId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  describe('POST /api/quickbooks/connect', () => {
    it('should connect to QuickBooks with OAuth credentials', async () => {
      const response = await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-123456789',
          companyName: 'Test Dental Clinic',
          accessToken: 'QB_ACCESS_TOKEN_12345',
          refreshToken: 'QB_REFRESH_TOKEN_67890',
          expiresIn: 3600,
          country: 'US',
          currency: 'USD',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.quickbooksCompany.realmId).toBe('QB-123456789');
      expect(response.body.connection.quickbooksCompany.companyName).toBe('Test Dental Clinic');
      expect(response.body.connection.status).toBe('connected');
      expect(response.body.connection.oauth).toBeDefined();
      expect(response.body.connection.oauth.accessToken).toContain('***'); // Should be masked

      connectionId = response.body.connection._id;
    });

    it('should set default sync configuration on connect', async () => {
      const response = await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-987654321',
          companyName: 'Another Clinic',
          accessToken: 'ACCESS_TOKEN',
          refreshToken: 'REFRESH_TOKEN',
          expiresIn: 3600,
        });

      expect(response.status).toBe(201);
      expect(response.body.connection.syncConfig).toBeDefined();
      expect(response.body.connection.syncConfig.syncInvoices).toBe(true);
      expect(response.body.connection.syncConfig.syncCustomers).toBe(true);
      expect(response.body.connection.syncConfig.syncPayments).toBe(true);
      expect(response.body.connection.syncConfig.direction).toBe('two_way');
      expect(response.body.connection.syncConfig.autoSync).toBe(false);
      expect(response.body.connection.syncConfig.syncInterval).toBe('hourly');
      expect(response.body.connection.syncConfig.conflictResolution).toBe('newest_wins');
    });

    it('should reject connection with missing required fields', async () => {
      const response = await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-123',
          // Missing companyName, accessToken, refreshToken
        });

      expect(response.status).toBe(400);
    });

    it('should update existing connection if already connected', async () => {
      // First connection
      await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-111',
          companyName: 'Clinic v1',
          accessToken: 'TOKEN_1',
          refreshToken: 'REFRESH_1',
          expiresIn: 3600,
        });

      // Second connection (should update)
      const response = await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-111',
          companyName: 'Clinic v2 Updated',
          accessToken: 'TOKEN_2',
          refreshToken: 'REFRESH_2',
          expiresIn: 3600,
        });

      expect(response.status).toBe(201);
      expect(response.body.connection.quickbooksCompany.companyName).toBe('Clinic v2 Updated');

      // Verify only one connection exists
      const connections = await QuickBooksSync.find({ organization: organizationId });
      expect(connections.length).toBe(1);
    });
  });

  describe('POST /api/quickbooks/disconnect', () => {
    beforeEach(async () => {
      // Create a connection
      const response = await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-DISCONNECT-TEST',
          companyName: 'Test Disconnect',
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresIn: 3600,
        });

      connectionId = response.body.connection._id;
    });

    it('should disconnect from QuickBooks', async () => {
      const response = await request(app)
        .post('/api/quickbooks/disconnect')
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
        .post('/api/quickbooks/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Testing',
        });

      const connection = await QuickBooksSync.findById(connectionId);
      expect(connection.status).toBe('disconnected');
      expect(connection.disconnectedAt).toBeDefined();
      expect(connection.disconnectedBy).toEqual(userId);
      expect(connection.disconnectReason).toBe('Testing');
    });

    it('should return 404 if no connection exists', async () => {
      // Delete the connection
      await QuickBooksSync.findByIdAndDelete(connectionId);

      const response = await request(app)
        .post('/api/quickbooks/disconnect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          reason: 'Test',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quickbooks/connection', () => {
    it('should get current connection status', async () => {
      // Create connection
      await request(app)
        .post('/api/quickbooks/connect')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          realmId: 'QB-STATUS',
          companyName: 'Status Test',
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresIn: 3600,
        });

      const response = await request(app)
        .get('/api/quickbooks/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection).toBeDefined();
      expect(response.body.connection.quickbooksCompany.companyName).toBe('Status Test');
      expect(response.body.connection.isConnected).toBe(true);
      expect(response.body.connection.oauth.accessToken).toContain('***'); // Masked
    });

    it('should return 404 if no connection exists', async () => {
      const response = await request(app)
        .get('/api/quickbooks/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });

    it('should show needsTokenRefresh virtual field', async () => {
      // Create connection with expired token
      const connection = await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-EXPIRED',
          companyName: 'Expired Token Test',
        },
        oauth: {
          accessToken: 'EXPIRED_TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
        status: 'connected',
      });

      const response = await request(app)
        .get('/api/quickbooks/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.needsTokenRefresh).toBe(true);
    });
  });

  describe('POST /api/quickbooks/refresh-token', () => {
    beforeEach(async () => {
      // Create connection with expired token
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-REFRESH',
          companyName: 'Refresh Test',
        },
        oauth: {
          accessToken: 'OLD_TOKEN',
          refreshToken: 'OLD_REFRESH',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
        status: 'connected',
      });
    });

    it('should refresh OAuth token', async () => {
      const response = await request(app)
        .post('/api/quickbooks/refresh-token')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          accessToken: 'NEW_ACCESS_TOKEN',
          refreshToken: 'NEW_REFRESH_TOKEN',
          expiresIn: 3600,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('refreshed');
    });

    it('should update token in database', async () => {
      await request(app)
        .post('/api/quickbooks/refresh-token')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          accessToken: 'UPDATED_TOKEN',
          refreshToken: 'UPDATED_REFRESH',
          expiresIn: 7200,
        });

      const connection = await QuickBooksSync.findOne({ organization: organizationId });
      expect(connection.oauth.accessToken).toBe('UPDATED_TOKEN');
      expect(connection.oauth.refreshToken).toBe('UPDATED_REFRESH');
      expect(connection.oauth.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 404 if no connection exists', async () => {
      await QuickBooksSync.deleteMany({ organization: organizationId });

      const response = await request(app)
        .post('/api/quickbooks/refresh-token')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresIn: 3600,
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/quickbooks/sync', () => {
    beforeEach(async () => {
      const connection = await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-SYNC',
          companyName: 'Sync Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncConfig: {
          syncInvoices: true,
          syncCustomers: true,
          syncPayments: true,
        },
      });

      connectionId = connection._id;
    });

    it('should trigger sync for invoices', async () => {
      const response = await request(app)
        .post('/api/quickbooks/sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invoices',
          direction: 'two_way',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sync).toBeDefined();
      expect(response.body.sync.syncId).toBeDefined();
      expect(response.body.message).toContain('started');
    });

    it('should trigger sync for customers', async () => {
      const response = await request(app)
        .post('/api/quickbooks/sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'customers',
          direction: 'one_way_to_qb',
        });

      expect(response.status).toBe(200);
      expect(response.body.sync.entityType).toBe('customers');
      expect(response.body.sync.direction).toBe('one_way_to_qb');
    });

    it('should trigger sync for payments', async () => {
      const response = await request(app)
        .post('/api/quickbooks/sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'payments',
          direction: 'one_way_from_qb',
        });

      expect(response.status).toBe(200);
      expect(response.body.sync.entityType).toBe('payments');
    });

    it('should reject invalid entity type', async () => {
      const response = await request(app)
        .post('/api/quickbooks/sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invalid_type',
          direction: 'two_way',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid direction', async () => {
      const response = await request(app)
        .post('/api/quickbooks/sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invoices',
          direction: 'invalid_direction',
        });

      expect(response.status).toBe(400);
    });

    it('should update connection status to syncing', async () => {
      await request(app)
        .post('/api/quickbooks/sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invoices',
          direction: 'two_way',
        });

      const connection = await QuickBooksSync.findById(connectionId);
      expect(connection.status).toBe('syncing');
      expect(connection.lastSyncedAt).toBeDefined();
    });
  });

  describe('GET /api/quickbooks/sync/:syncId', () => {
    let syncId;

    beforeEach(async () => {
      const connection = await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-SYNC-STATUS',
          companyName: 'Sync Status Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncHistory: [
          {
            syncId: 'sync-12345',
            entityType: 'invoices',
            direction: 'two_way',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            stats: {
              created: 5,
              updated: 3,
              deleted: 1,
              skipped: 2,
              failed: 0,
            },
          },
        ],
      });

      connectionId = connection._id;
      syncId = 'sync-12345';
    });

    it('should get sync status by syncId', async () => {
      const response = await request(app)
        .get(`/api/quickbooks/sync/${syncId}`)
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.sync).toBeDefined();
      expect(response.body.sync.syncId).toBe(syncId);
      expect(response.body.sync.status).toBe('completed');
      expect(response.body.sync.stats.created).toBe(5);
      expect(response.body.sync.stats.updated).toBe(3);
    });

    it('should return 404 for non-existent syncId', async () => {
      const response = await request(app)
        .get('/api/quickbooks/sync/non-existent-sync')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quickbooks/sync-history', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-HISTORY',
          companyName: 'History Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncHistory: [
          {
            syncId: 'sync-1',
            entityType: 'invoices',
            direction: 'two_way',
            status: 'completed',
            startedAt: new Date(Date.now() - 7200000),
            completedAt: new Date(Date.now() - 7000000),
            stats: { created: 10, updated: 5, deleted: 2, skipped: 1, failed: 0 },
          },
          {
            syncId: 'sync-2',
            entityType: 'customers',
            direction: 'one_way_to_qb',
            status: 'completed',
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date(Date.now() - 3400000),
            stats: { created: 3, updated: 2, deleted: 0, skipped: 0, failed: 1 },
          },
          {
            syncId: 'sync-3',
            entityType: 'payments',
            direction: 'two_way',
            status: 'in_progress',
            startedAt: new Date(Date.now() - 1000000),
            stats: { created: 0, updated: 0, deleted: 0, skipped: 0, failed: 0 },
          },
        ],
      });
    });

    it('should get all sync history', async () => {
      const response = await request(app)
        .get('/api/quickbooks/sync-history')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      expect(response.body.history.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter by entity type', async () => {
      const response = await request(app)
        .get('/api/quickbooks/sync-history?entityType=invoices')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(1);
      expect(response.body.history[0].entityType).toBe('invoices');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/quickbooks/sync-history?status=completed')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(2);
      expect(response.body.history.every((h) => h.status === 'completed')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/quickbooks/sync-history?page=1&limit=2')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
    });
  });

  describe('POST /api/quickbooks/queue', () => {
    beforeEach(async () => {
      const connection = await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-QUEUE',
          companyName: 'Queue Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
      });

      connectionId = connection._id;
    });

    it('should add invoice to sync queue', async () => {
      const invoiceId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/quickbooks/queue')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invoice',
          entityId: invoiceId.toString(),
          operation: 'create',
          priority: 'high',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('added to sync queue');
    });

    it('should add customer to sync queue', async () => {
      const customerId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/quickbooks/queue')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'customer',
          entityId: customerId.toString(),
          operation: 'update',
          priority: 'normal',
        });

      expect(response.status).toBe(200);
    });

    it('should add payment to sync queue', async () => {
      const paymentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/quickbooks/queue')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'payment',
          entityId: paymentId.toString(),
          operation: 'delete',
          priority: 'low',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid entity type', async () => {
      const response = await request(app)
        .post('/api/quickbooks/queue')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invalid',
          entityId: new mongoose.Types.ObjectId().toString(),
          operation: 'create',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid operation', async () => {
      const response = await request(app)
        .post('/api/quickbooks/queue')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          entityType: 'invoice',
          entityId: new mongoose.Types.ObjectId().toString(),
          operation: 'invalid_op',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/quickbooks/queue', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-GET-QUEUE',
          companyName: 'Get Queue Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncQueue: [
          {
            entityType: 'invoice',
            entityId: new mongoose.Types.ObjectId(),
            operation: 'create',
            priority: 'high',
            status: 'pending',
            addedAt: new Date(Date.now() - 3600000),
          },
          {
            entityType: 'customer',
            entityId: new mongoose.Types.ObjectId(),
            operation: 'update',
            priority: 'normal',
            status: 'processing',
            addedAt: new Date(Date.now() - 1800000),
          },
          {
            entityType: 'payment',
            entityId: new mongoose.Types.ObjectId(),
            operation: 'create',
            priority: 'low',
            status: 'pending',
            addedAt: new Date(Date.now() - 900000),
          },
        ],
      });
    });

    it('should get sync queue', async () => {
      const response = await request(app)
        .get('/api/quickbooks/queue')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.queue).toBeDefined();
      expect(response.body.queue.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter by entity type', async () => {
      const response = await request(app)
        .get('/api/quickbooks/queue?entityType=invoice')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.queue.length).toBe(1);
      expect(response.body.queue[0].entityType).toBe('invoice');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/quickbooks/queue?status=pending')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.queue.length).toBe(2);
      expect(response.body.queue.every((q) => q.status === 'pending')).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/quickbooks/queue?priority=high')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.queue.length).toBe(1);
      expect(response.body.queue[0].priority).toBe('high');
    });
  });

  describe('DELETE /api/quickbooks/queue/:queueId', () => {
    let queueItemId;

    beforeEach(async () => {
      const queueId = new mongoose.Types.ObjectId();
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-DELETE-QUEUE',
          companyName: 'Delete Queue Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncQueue: [
          {
            _id: queueId,
            entityType: 'invoice',
            entityId: new mongoose.Types.ObjectId(),
            operation: 'create',
            priority: 'high',
            status: 'pending',
          },
        ],
      });

      queueItemId = queueId.toString();
    });

    it('should remove item from sync queue', async () => {
      const response = await request(app)
        .delete(`/api/quickbooks/queue/${queueItemId}`)
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed from sync queue');
    });

    it('should return 404 for non-existent queue item', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .delete(`/api/quickbooks/queue/${fakeId}`)
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quickbooks/mappings', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-MAPPINGS',
          companyName: 'Mappings Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        mappings: {
          customers: [
            {
              expoJaneId: new mongoose.Types.ObjectId(),
              quickbooksId: 'QB-CUST-1',
              displayName: 'John Doe',
              lastSynced: new Date(),
            },
            {
              expoJaneId: new mongoose.Types.ObjectId(),
              quickbooksId: 'QB-CUST-2',
              displayName: 'Jane Smith',
              lastSynced: new Date(),
            },
          ],
          invoices: [
            {
              expoJaneId: new mongoose.Types.ObjectId(),
              quickbooksId: 'QB-INV-1001',
              docNumber: 'INV-1001',
              syncVersion: 2,
              lastSynced: new Date(),
            },
          ],
          payments: [
            {
              expoJaneId: new mongoose.Types.ObjectId(),
              quickbooksId: 'QB-PAY-5001',
              lastSynced: new Date(),
            },
          ],
        },
      });
    });

    it('should get all mappings', async () => {
      const response = await request(app)
        .get('/api/quickbooks/mappings')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.mappings).toBeDefined();
      expect(response.body.mappings.customers).toBeDefined();
      expect(response.body.mappings.invoices).toBeDefined();
      expect(response.body.mappings.payments).toBeDefined();
      expect(response.body.mappings.customers.length).toBe(2);
      expect(response.body.mappings.invoices.length).toBe(1);
      expect(response.body.mappings.payments.length).toBe(1);
    });

    it('should filter mappings by type', async () => {
      const response = await request(app)
        .get('/api/quickbooks/mappings?type=customers')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.mappings.customers).toBeDefined();
      expect(response.body.mappings.invoices).toBeUndefined();
      expect(response.body.mappings.payments).toBeUndefined();
    });
  });

  describe('POST /api/quickbooks/mappings/customer', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-CUSTOMER-MAP',
          companyName: 'Customer Mapping Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
      });
    });

    it('should add customer mapping', async () => {
      const expoJaneCustomerId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/quickbooks/mappings/customer')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          expoJaneId: expoJaneCustomerId.toString(),
          quickbooksId: 'QB-NEW-CUST-123',
          displayName: 'New Customer',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Customer mapping added');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/quickbooks/mappings/customer')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          expoJaneId: new mongoose.Types.ObjectId().toString(),
          // Missing quickbooksId and displayName
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/quickbooks/mappings/invoice', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-INVOICE-MAP',
          companyName: 'Invoice Mapping Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
      });
    });

    it('should add invoice mapping', async () => {
      const expoJaneInvoiceId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/quickbooks/mappings/invoice')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          expoJaneId: expoJaneInvoiceId.toString(),
          quickbooksId: 'QB-INV-9999',
          docNumber: 'INV-9999',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Invoice mapping added');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/quickbooks/mappings/invoice')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          expoJaneId: new mongoose.Types.ObjectId().toString(),
          quickbooksId: 'QB-INV-8888',
          // Missing docNumber
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/quickbooks/mappings/payment', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-PAYMENT-MAP',
          companyName: 'Payment Mapping Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
      });
    });

    it('should add payment mapping', async () => {
      const expoJanePaymentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/quickbooks/mappings/payment')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          expoJaneId: expoJanePaymentId.toString(),
          quickbooksId: 'QB-PAY-7777',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Payment mapping added');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/quickbooks/mappings/payment')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          expoJaneId: new mongoose.Types.ObjectId().toString(),
          // Missing quickbooksId
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/quickbooks/config', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-CONFIG',
          companyName: 'Config Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncConfig: {
          syncInvoices: true,
          syncCustomers: true,
          syncPayments: false,
          direction: 'one_way_to_qb',
          autoSync: true,
          syncInterval: 'daily',
          conflictResolution: 'qb_wins',
        },
      });
    });

    it('should get sync configuration', async () => {
      const response = await request(app)
        .get('/api/quickbooks/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.syncInvoices).toBe(true);
      expect(response.body.config.syncCustomers).toBe(true);
      expect(response.body.config.syncPayments).toBe(false);
      expect(response.body.config.direction).toBe('one_way_to_qb');
      expect(response.body.config.autoSync).toBe(true);
      expect(response.body.config.syncInterval).toBe('daily');
      expect(response.body.config.conflictResolution).toBe('qb_wins');
    });
  });

  describe('PUT /api/quickbooks/config', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-UPDATE-CONFIG',
          companyName: 'Update Config Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        syncConfig: {
          syncInvoices: true,
          syncCustomers: true,
          syncPayments: true,
          direction: 'two_way',
          autoSync: false,
          syncInterval: 'hourly',
          conflictResolution: 'newest_wins',
        },
      });
    });

    it('should update sync configuration', async () => {
      const response = await request(app)
        .put('/api/quickbooks/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          syncInvoices: false,
          syncPayments: false,
          direction: 'one_way_from_qb',
          autoSync: true,
          syncInterval: 'realtime',
          conflictResolution: 'expojane_wins',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.syncInvoices).toBe(false);
      expect(response.body.config.syncPayments).toBe(false);
      expect(response.body.config.direction).toBe('one_way_from_qb');
      expect(response.body.config.autoSync).toBe(true);
      expect(response.body.config.syncInterval).toBe('realtime');
      expect(response.body.config.conflictResolution).toBe('expojane_wins');
    });

    it('should reject invalid direction', async () => {
      const response = await request(app)
        .put('/api/quickbooks/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          direction: 'invalid_direction',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid sync interval', async () => {
      const response = await request(app)
        .put('/api/quickbooks/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          syncInterval: 'invalid_interval',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid conflict resolution', async () => {
      const response = await request(app)
        .put('/api/quickbooks/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          conflictResolution: 'invalid_resolution',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/quickbooks/stats', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-STATS',
          companyName: 'Stats Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        stats: {
          totalSyncs: 50,
          successfulSyncs: 45,
          failedSyncs: 5,
          totalCustomersSynced: 120,
          totalInvoicesSynced: 350,
          totalPaymentsSynced: 280,
        },
        syncHistory: [
          {
            syncId: 'sync-stats-1',
            entityType: 'invoices',
            direction: 'two_way',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            stats: { created: 10, updated: 5, deleted: 0, skipped: 2, failed: 1 },
          },
          {
            syncId: 'sync-stats-2',
            entityType: 'customers',
            direction: 'one_way_to_qb',
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            stats: { created: 5, updated: 3, deleted: 1, skipped: 0, failed: 0 },
          },
        ],
      });
    });

    it('should get sync statistics', async () => {
      const response = await request(app)
        .get('/api/quickbooks/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalSyncs).toBe(50);
      expect(response.body.stats.successfulSyncs).toBe(45);
      expect(response.body.stats.failedSyncs).toBe(5);
      expect(response.body.stats.totalCustomersSynced).toBe(120);
      expect(response.body.stats.totalInvoicesSynced).toBe(350);
      expect(response.body.stats.totalPaymentsSynced).toBe(280);
    });

    it('should calculate sync success rate', async () => {
      const response = await request(app)
        .get('/api/quickbooks/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.syncSuccessRate).toBe(90); // 45/50 = 90%
    });

    it('should include recent sync history', async () => {
      const response = await request(app)
        .get('/api/quickbooks/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.recentSyncs).toBeDefined();
      expect(response.body.recentSyncs.length).toBe(2);
    });
  });

  describe('POST /api/quickbooks/webhook', () => {
    beforeEach(async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: '123456789',
          companyName: 'Webhook Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
      });
    });

    it('should process QuickBooks webhook for invoice creation', async () => {
      const response = await request(app)
        .post('/api/quickbooks/webhook')
        .send({
          eventNotifications: [
            {
              realmId: '123456789',
              dataChangeEvent: {
                entities: [
                  {
                    name: 'Invoice',
                    id: 'QB-INV-NEW',
                    operation: 'Create',
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('processed');
    });

    it('should process webhook for customer update', async () => {
      const response = await request(app)
        .post('/api/quickbooks/webhook')
        .send({
          eventNotifications: [
            {
              realmId: '123456789',
              dataChangeEvent: {
                entities: [
                  {
                    name: 'Customer',
                    id: 'QB-CUST-UPDATE',
                    operation: 'Update',
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(200);
    });

    it('should process webhook for payment deletion', async () => {
      const response = await request(app)
        .post('/api/quickbooks/webhook')
        .send({
          eventNotifications: [
            {
              realmId: '123456789',
              dataChangeEvent: {
                entities: [
                  {
                    name: 'Payment',
                    id: 'QB-PAY-DELETE',
                    operation: 'Delete',
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(200);
    });

    it('should ignore webhooks for different realmId', async () => {
      const response = await request(app)
        .post('/api/quickbooks/webhook')
        .send({
          eventNotifications: [
            {
              realmId: 'DIFFERENT-REALM-ID',
              dataChangeEvent: {
                entities: [
                  {
                    name: 'Invoice',
                    id: 'QB-INV-IGNORE',
                    operation: 'Create',
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.processed).toBe(0);
    });

    it('should handle multiple entities in webhook', async () => {
      const response = await request(app)
        .post('/api/quickbooks/webhook')
        .send({
          eventNotifications: [
            {
              realmId: '123456789',
              dataChangeEvent: {
                entities: [
                  {
                    name: 'Invoice',
                    id: 'QB-INV-1',
                    operation: 'Create',
                    lastUpdated: new Date().toISOString(),
                  },
                  {
                    name: 'Customer',
                    id: 'QB-CUST-1',
                    operation: 'Update',
                    lastUpdated: new Date().toISOString(),
                  },
                  {
                    name: 'Payment',
                    id: 'QB-PAY-1',
                    operation: 'Create',
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.processed).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate isConnected virtual field correctly', async () => {
      const connection = await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-VIRTUAL',
          companyName: 'Virtual Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
      });

      const response = await request(app)
        .get('/api/quickbooks/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.isConnected).toBe(true);
    });

    it('should calculate needsTokenRefresh when token expired', async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-EXPIRED-TOKEN',
          companyName: 'Expired Token Test',
        },
        oauth: {
          accessToken: 'EXPIRED',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        },
        status: 'connected',
      });

      const response = await request(app)
        .get('/api/quickbooks/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.needsTokenRefresh).toBe(true);
    });

    it('should calculate syncSuccessRate correctly', async () => {
      await QuickBooksSync.create({
        organization: organizationId,
        quickbooksCompany: {
          realmId: 'QB-SUCCESS-RATE',
          companyName: 'Success Rate Test',
        },
        oauth: {
          accessToken: 'TOKEN',
          refreshToken: 'REFRESH',
          expiresAt: new Date(Date.now() + 3600000),
        },
        status: 'connected',
        stats: {
          totalSyncs: 100,
          successfulSyncs: 85,
          failedSyncs: 15,
        },
      });

      const response = await request(app)
        .get('/api/quickbooks/connection')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.connection.syncSuccessRate).toBe(85);
    });
  });
});
