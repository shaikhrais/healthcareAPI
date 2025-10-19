const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const BadgeCount = require('../models/BadgeCount');
/* eslint-env jest */
/**
 * Badge Counts API Tests
 * TASK-14.8 - App Badge Counts
 *
 * Comprehensive test suite for app badge count management
 */

// eslint-disable-next-line no-unused-vars
describe('Badge Counts API', () => {
  let userId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up and close connection
    await BadgeCount.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await BadgeCount.deleteMany({});
  });

  // ============================================
  // BADGE COUNT RETRIEVAL TESTS
  // ============================================

  describe('GET /api/badge-counts', () => {
    it('should create and return default badge counts if none exist', async () => {
      const response = await request(app)
        .get('/api/badge-counts')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('displayCount');
      expect(response.body.data).toHaveProperty('categories');
      expect(response.body.data.total).toBe(0);
    });

    it('should return existing badge counts', async () => {
      await BadgeCount.create({
        userId,
        total: 5,
        'categories.messages.unread': 3,
        'categories.messages.total': 3,
        'categories.notifications.unread': 2,
        'categories.notifications.total': 2,
      });

      const response = await request(app)
        .get('/api/badge-counts')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(5);
    });
  });

  describe('GET /api/badge-counts/summary', () => {
    beforeEach(async () => {
      await BadgeCount.create({
        userId,
        total: 10,
        categories: {
          messages: { unread: 5, total: 5 },
          notifications: { unread: 3, total: 3 },
          appointments: { upcoming: 2, total: 2 },
        },
      });
    });

    it('should get category summary', async () => {
      const response = await request(app)
        .get('/api/badge-counts/summary')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('priorityScore');
      expect(response.body.data.summary).toHaveProperty('messages');
      expect(response.body.data.summary).toHaveProperty('notifications');
    });
  });

  // ============================================
  // INCREMENT TESTS
  // ============================================

  describe('POST /api/badge-counts/increment', () => {
    it('should increment badge count for category', async () => {
      const response = await request(app)
        .post('/api/badge-counts/increment')
        .set('x-user-id', userId.toString())
        .send({
          category: 'messages',
          subcategory: 'unread',
          amount: 1,
          reason: 'New message received',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category.unread).toBe(1);
      expect(response.body.data.category.total).toBe(1);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should increment by custom amount', async () => {
      const response = await request(app)
        .post('/api/badge-counts/increment')
        .set('x-user-id', userId.toString())
        .send({
          category: 'notifications',
          subcategory: 'unread',
          amount: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category.unread).toBe(5);
    });

    it('should fail without category', async () => {
      const response = await request(app)
        .post('/api/badge-counts/increment')
        .set('x-user-id', userId.toString())
        .send({ amount: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // DECREMENT TESTS
  // ============================================

  describe('POST /api/badge-counts/decrement', () => {
    beforeEach(async () => {
      await BadgeCount.create({
        userId,
        total: 10,
        categories: {
          messages: { unread: 10, total: 10 },
        },
      });
    });

    it('should decrement badge count', async () => {
      const response = await request(app)
        .post('/api/badge-counts/decrement')
        .set('x-user-id', userId.toString())
        .send({
          category: 'messages',
          subcategory: 'unread',
          amount: 3,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category.unread).toBe(7);
    });

    it('should not go below zero', async () => {
      const response = await request(app)
        .post('/api/badge-counts/decrement')
        .set('x-user-id', userId.toString())
        .send({
          category: 'messages',
          subcategory: 'unread',
          amount: 15, // More than current count
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category.unread).toBe(0);
    });
  });

  // ============================================
  // SET COUNT TESTS
  // ============================================

  describe('POST /api/badge-counts/set', () => {
    it('should set badge count to specific value', async () => {
      const response = await request(app)
        .post('/api/badge-counts/set')
        .set('x-user-id', userId.toString())
        .send({
          category: 'appointments',
          subcategory: 'upcoming',
          count: 7,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category.upcoming).toBe(7);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/badge-counts/set')
        .set('x-user-id', userId.toString())
        .send({ category: 'messages' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // CLEAR TESTS
  // ============================================

  describe('POST /api/badge-counts/clear', () => {
    beforeEach(async () => {
      await BadgeCount.create({
        userId,
        total: 15,
        categories: {
          messages: { unread: 10, directMessages: 5, total: 10 },
          notifications: { unread: 5, total: 5 },
        },
      });
    });

    it('should clear specific subcategory', async () => {
      const response = await request(app)
        .post('/api/badge-counts/clear')
        .set('x-user-id', userId.toString())
        .send({
          category: 'messages',
          subcategory: 'unread',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeLessThan(15);
    });

    it('should clear entire category', async () => {
      const response = await request(app)
        .post('/api/badge-counts/clear')
        .set('x-user-id', userId.toString())
        .send({ category: 'messages' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBeLessThan(15);
    });

    it('should clear all categories', async () => {
      const response = await request(app)
        .post('/api/badge-counts/clear')
        .set('x-user-id', userId.toString())
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(0);
    });
  });

  // ============================================
  // CATEGORY TESTS
  // ============================================

  describe('GET /api/badge-counts/category/:category', () => {
    beforeEach(async () => {
      await BadgeCount.create({
        userId,
        categories: {
          messages: { unread: 5, directMessages: 3, total: 5 },
        },
      });
    });

    it('should get specific category', async () => {
      const response = await request(app)
        .get('/api/badge-counts/category/messages')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('unread');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.unread).toBe(5);
    });

    it('should return 404 for invalid category', async () => {
      const response = await request(app)
        .get('/api/badge-counts/category/invalid')
        .set('x-user-id', userId.toString())
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // CONFIGURATION TESTS
  // ============================================

  describe('PUT /api/badge-counts/config', () => {
    it('should update badge configuration', async () => {
      const config = {
        includedCategories: ['messages', 'appointments'],
        maxDisplayCount: 50,
        showWhenZero: true,
      };

      const response = await request(app)
        .put('/api/badge-counts/config')
        .set('x-user-id', userId.toString())
        .send(config)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.maxDisplayCount).toBe(50);
      expect(response.body.data.config.showWhenZero).toBe(true);
    });
  });

  describe('GET /api/badge-counts/config', () => {
    it('should get badge configuration', async () => {
      const response = await request(app)
        .get('/api/badge-counts/config')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('includedCategories');
      expect(response.body.data).toHaveProperty('maxDisplayCount');
    });
  });

  // ============================================
  // DEVICE SYNC TESTS
  // ============================================

  describe('POST /api/badge-counts/sync', () => {
    it('should sync badge count to device', async () => {
      const response = await request(app)
        .post('/api/badge-counts/sync')
        .set('x-user-id', userId.toString())
        .send({
          deviceId: 'device-123',
          platform: 'ios',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('device-123');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/badge-counts/sync')
        .set('x-user-id', userId.toString())
        .send({ deviceId: 'device-123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/badge-counts/devices', () => {
    beforeEach(async () => {
      const badgeCount = await BadgeCount.create({ userId });
      await badgeCount.syncToDevice('device-1', 'ios');
      await badgeCount.syncToDevice('device-2', 'android');
    });

    it('should get synced devices', async () => {
      const response = await request(app)
        .get('/api/badge-counts/devices')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });
  });

  // ============================================
  // HISTORY TESTS
  // ============================================

  describe('GET /api/badge-counts/history', () => {
    beforeEach(async () => {
      const badgeCount = await BadgeCount.create({ userId });
      await badgeCount.increment('messages', 'unread', 5, 'Test increment');
      await badgeCount.decrement('messages', 'unread', 2, 'Test decrement');
      await badgeCount.clear('messages', 'unread', 'Test clear');
    });

    it('should get badge count history', async () => {
      const response = await request(app)
        .get('/api/badge-counts/history')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('action');
      expect(response.body.data[0]).toHaveProperty('timestamp');
    });

    it('should filter by action', async () => {
      const response = await request(app)
        .get('/api/badge-counts/history?action=increment')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((h) => h.action === 'increment')).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/badge-counts/history?category=messages')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((h) => h.category === 'messages')).toBe(true);
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/badge-counts/history?limit=2')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeLessThanOrEqual(2);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('GET /api/badge-counts/stats', () => {
    beforeEach(async () => {
      const badgeCount = await BadgeCount.create({
        userId,
        total: 10,
        stats: {
          totalIncrements: 15,
          totalDecrements: 5,
          totalClears: 2,
          highestCount: 20,
        },
      });
    });

    it('should get badge statistics', async () => {
      const response = await request(app)
        .get('/api/badge-counts/stats')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.current).toHaveProperty('total');
      expect(response.body.data.stats).toHaveProperty('totalIncrements');
    });
  });

  // ============================================
  // BATCH OPERATIONS TESTS
  // ============================================

  describe('POST /api/badge-counts/batch', () => {
    it('should process batch operations', async () => {
      const operations = [
        {
          action: 'increment',
          category: 'messages',
          subcategory: 'unread',
          amount: 5,
        },
        {
          action: 'increment',
          category: 'notifications',
          subcategory: 'unread',
          amount: 3,
        },
        {
          action: 'set',
          category: 'appointments',
          subcategory: 'upcoming',
          count: 2,
        },
      ];

      const response = await request(app)
        .post('/api/badge-counts/batch')
        .set('x-user-id', userId.toString())
        .send({ operations })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories.messages.unread).toBe(5);
      expect(response.body.data.categories.notifications.unread).toBe(3);
      expect(response.body.data.categories.appointments.upcoming).toBe(2);
    });

    it('should fail without operations array', async () => {
      const response = await request(app)
        .post('/api/badge-counts/batch')
        .set('x-user-id', userId.toString())
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // RECALCULATE TESTS
  // ============================================

  describe('POST /api/badge-counts/recalculate', () => {
    beforeEach(async () => {
      await BadgeCount.create({
        userId,
        total: 20, // Intentionally wrong
        categories: {
          messages: { unread: 5, total: 5 },
          notifications: { unread: 3, total: 3 },
        },
      });
    });

    it('should recalculate total from categories', async () => {
      const response = await request(app)
        .post('/api/badge-counts/recalculate')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.previousTotal).toBe(20);
      expect(response.body.data.newTotal).toBeLessThan(20);
    });
  });

  // ============================================
  // ADMIN TESTS
  // ============================================

  describe('GET /api/badge-counts/admin/analytics', () => {
    beforeEach(async () => {
      await BadgeCount.create([
        { userId: new mongoose.Types.ObjectId(), total: 10 },
        { userId: new mongoose.Types.ObjectId(), total: 5 },
        { userId: new mongoose.Types.ObjectId(), total: 0 },
      ]);
    });

    it('should get global analytics', async () => {
      const response = await request(app)
        .get('/api/badge-counts/admin/analytics')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('totalBadges');
      expect(response.body.data).toHaveProperty('avgBadgeCount');
      expect(response.body.data).toHaveProperty('usersWithBadges');
      expect(response.body.data.totalUsers).toBe(3);
      expect(response.body.data.usersWithBadges).toBe(2);
    });
  });

  describe('GET /api/badge-counts/admin/high-counts', () => {
    beforeEach(async () => {
      await BadgeCount.create([
        { userId: new mongoose.Types.ObjectId(), total: 50 },
        { userId: new mongoose.Types.ObjectId(), total: 25 },
        { userId: new mongoose.Types.ObjectId(), total: 5 },
      ]);
    });

    it('should get users with high badge counts', async () => {
      const response = await request(app)
        .get('/api/badge-counts/admin/high-counts?threshold=20')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data.every((u) => u.total >= 20)).toBe(true);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('BadgeCount Model Methods', () => {
    it('should calculate display count correctly', async () => {
      const badgeCount = await BadgeCount.create({
        userId,
        total: 150,
        config: { maxDisplayCount: 99 },
      });

      expect(badgeCount.displayCount).toBe('99+');
    });

    it('should show regular count when under max', async () => {
      const badgeCount = await BadgeCount.create({
        userId,
        total: 50,
        config: { maxDisplayCount: 99 },
      });

      expect(badgeCount.displayCount).toBe('50');
    });

    it('should calculate priority score', async () => {
      const badgeCount = await BadgeCount.create({
        userId,
        categories: {
          messages: { total: 5 },
          billing: { total: 2 }, // Higher weight (2)
          medical: { total: 1 }, // Higher weight (2)
        },
      });

      const score = badgeCount.getPriorityScore();
      expect(score).toBeGreaterThan(0);
      // Score = (5 * 1) + (2 * 2) + (1 * 2) = 11
      expect(score).toBe(11);
    });

    it('should determine if has notifications', async () => {
      const withBadges = await BadgeCount.create({
        userId: new mongoose.Types.ObjectId(),
        total: 5,
      });

      const withoutBadges = await BadgeCount.create({
        userId: new mongoose.Types.ObjectId(),
        total: 0,
      });

      expect(withBadges.hasNotifications).toBe(true);
      expect(withoutBadges.hasNotifications).toBe(false);
    });
  });
});
