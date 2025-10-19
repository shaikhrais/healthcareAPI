const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const StartupMetrics = require('../models/StartupMetrics');
/* eslint-env jest */
/**
 * Startup Time Optimization API Tests
 * TASK-14.24 - Startup Time Optimization
 *
 * Comprehensive test suite for startup performance tracking
 */

// eslint-disable-next-line no-unused-vars
describe('Startup Time Optimization API', () => {
  let userId;
  let metricsId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up and close connection
    await StartupMetrics.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await StartupMetrics.deleteMany({});
  });

  // ============================================
  // METRICS RECORDING TESTS
  // ============================================

  describe('POST /api/startup-metrics', () => {
    it('should record cold start metrics', async () => {
      const metricsData = {
        sessionId: `session_${Date.now()}_${Math.random()}`,
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
          osVersion: '17.0',
          memory: 6144,
        },
        timing: {
          total: 2500,
          timeToInteractive: 2200,
          timeToFirstRender: 1800,
          splashScreenDuration: 500,
        },
        phases: {
          initialization: {
            duration: 300,
            startTime: 0,
            endTime: 300,
          },
          bundleLoad: {
            duration: 850,
            startTime: 300,
            endTime: 1150,
          },
          nativeModules: {
            duration: 420,
            startTime: 1150,
            endTime: 1570,
          },
          reactMount: {
            duration: 200,
            startTime: 1570,
            endTime: 1770,
          },
        },
        performance: {
          memory: {
            initial: 50,
            peak: 120,
            average: 85,
          },
        },
      };

      const response = await request(app)
        .post('/api/startup-metrics')
        .send(metricsData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.sessionId).toBe(metricsData.sessionId);
      expect(response.body.data.startupType).toBe('cold');

      metricsId = response.body.data._id;
    });

    it('should record warm start metrics', async () => {
      const metricsData = {
        sessionId: `session_${Date.now()}_${Math.random()}`,
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'warm',
        device: {
          platform: 'android',
          model: 'Pixel 7',
          osVersion: '14.0',
          memory: 8192,
        },
        timing: {
          total: 1200,
          timeToInteractive: 1100,
          timeToFirstRender: 900,
        },
      };

      const response = await request(app)
        .post('/api/startup-metrics')
        .send(metricsData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.startupType).toBe('warm');
    });

    it('should record hot start metrics', async () => {
      const metricsData = {
        sessionId: `session_${Date.now()}_${Math.random()}`,
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'hot',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
          osVersion: '17.0',
        },
        timing: {
          total: 400,
          timeToInteractive: 350,
        },
      };

      const response = await request(app)
        .post('/api/startup-metrics')
        .send(metricsData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.startupType).toBe('hot');
    });

    it('should fail with invalid startup type', async () => {
      const metricsData = {
        sessionId: `session_${Date.now()}`,
        appVersion: '2.5.0',
        startupType: 'invalid',
        timing: { total: 2000 },
      };

      const response = await request(app)
        .post('/api/startup-metrics')
        .send(metricsData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/startup-metrics', () => {
    beforeEach(async () => {
      await StartupMetrics.create([
        {
          sessionId: 'session1',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'cold',
          device: {
            platform: 'ios',
            model: 'iPhone 14 Pro',
            osVersion: '17.0',
          },
          timing: {
            total: 2500,
            timeToInteractive: 2200,
          },
          phases: {},
        },
        {
          sessionId: 'session2',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'warm',
          device: {
            platform: 'android',
            model: 'Pixel 7',
            osVersion: '14.0',
          },
          timing: {
            total: 1200,
            timeToInteractive: 1100,
          },
          phases: {},
        },
      ]);
    });

    it('should get all metrics', async () => {
      const response = await request(app)
        .get('/api/startup-metrics')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/startup-metrics?platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].device.platform).toBe('ios');
    });

    it('should filter by startup type', async () => {
      const response = await request(app)
        .get('/api/startup-metrics?type=cold')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].startupType).toBe('cold');
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/startup-metrics?limit=1')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/startup-metrics/:id', () => {
    beforeEach(async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test-session',
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
          osVersion: '17.0',
        },
        timing: {
          total: 2500,
          timeToInteractive: 2200,
        },
        phases: {},
      });
      metricsId = metrics._id.toString();
    });

    it('should get specific metrics', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(metricsId);
    });

    it('should return 404 for non-existent metrics', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/startup-metrics/${fakeId}`)
        .set('x-user-id', userId.toString())
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // ANALYSIS TESTS
  // ============================================

  describe('GET /api/startup-metrics/:id/summary', () => {
    beforeEach(async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test-session',
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
          osVersion: '17.0',
        },
        timing: {
          total: 2500,
          timeToInteractive: 2200,
        },
        phases: {},
        bottlenecks: [],
        optimizations: [],
      });
      metricsId = metrics._id.toString();
    });

    it('should get metrics summary', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}/summary`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('rating');
      expect(response.body.data).toHaveProperty('isFast');
    });
  });

  describe('GET /api/startup-metrics/:id/phases', () => {
    beforeEach(async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test-session',
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
        },
        timing: {
          total: 2000,
        },
        phases: {
          initialization: {
            duration: 200,
            startTime: 0,
            endTime: 200,
          },
          bundleLoad: {
            duration: 850,
            startTime: 200,
            endTime: 1050,
          },
          nativeModules: {
            duration: 420,
            startTime: 1050,
            endTime: 1470,
          },
          reactMount: {
            duration: 200,
            startTime: 1470,
            endTime: 1670,
          },
          apiCalls: {
            duration: 330,
            startTime: 1670,
            endTime: 2000,
          },
        },
      });
      metricsId = metrics._id.toString();
    });

    it('should get slowest phases', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}/phases`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('duration');
      expect(response.body.data[0]).toHaveProperty('percentage');
      // Should be sorted by duration (slowest first)
      expect(response.body.data[0].name).toBe('bundleLoad');
    });

    it('should limit number of phases', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}/phases?limit=3`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('GET /api/startup-metrics/:id/bottlenecks', () => {
    beforeEach(async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test-session',
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
        },
        timing: {
          total: 2500,
        },
        phases: {},
        bottlenecks: [
          {
            phase: 'bundleLoad',
            description: 'Large JavaScript bundle',
            duration: 850,
            severity: 'critical',
            suggestion: 'Reduce bundle size with tree shaking',
          },
          {
            phase: 'nativeModules',
            description: 'Too many native modules',
            duration: 420,
            severity: 'high',
            suggestion: 'Lazy load non-critical modules',
          },
          {
            phase: 'apiCalls',
            description: 'Blocking API calls',
            duration: 380,
            severity: 'medium',
            suggestion: 'Defer non-critical API calls',
          },
        ],
      });
      metricsId = metrics._id.toString();
    });

    it('should get critical bottlenecks', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}/bottlenecks`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2); // Only critical and high
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('phase');
      expect(response.body.data[0]).toHaveProperty('severity');
      expect(['critical', 'high']).toContain(response.body.data[0].severity);
    });
  });

  describe('GET /api/startup-metrics/:id/recommendations', () => {
    beforeEach(async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test-session',
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
        },
        timing: {
          total: 3500,
        },
        phases: {},
        optimizations: [
          {
            type: 'lazy_load_modules',
            description: 'Lazy load video player',
            estimatedImprovement: 500,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'reduce_bundle_size',
            description: 'Tree shake dependencies',
            estimatedImprovement: 400,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'defer_api_calls',
            description: 'Defer analytics calls',
            estimatedImprovement: 200,
            priority: 'medium',
            implemented: true, // Already implemented
          },
        ],
      });
      metricsId = metrics._id.toString();
    });

    it('should get optimization recommendations', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}/recommendations`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2); // Only unimplemented
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('description');
      expect(response.body.data[0]).toHaveProperty('improvement');
      expect(response.body.data[0].improvement).toHaveProperty('ms');
      expect(response.body.data[0].improvement).toHaveProperty('seconds');
      // Should be sorted by improvement (highest first)
      expect(response.body.data[0].improvement.ms).toBe(500);
    });
  });

  describe('GET /api/startup-metrics/:id/improvement', () => {
    beforeEach(async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test-session',
        appVersion: '2.5.0',
        buildNumber: '125',
        startupType: 'cold',
        device: {
          platform: 'ios',
          model: 'iPhone 14 Pro',
        },
        timing: {
          total: 3000,
        },
        phases: {},
        optimizations: [
          {
            type: 'lazy_load_modules',
            estimatedImprovement: 500,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'reduce_bundle_size',
            estimatedImprovement: 400,
            priority: 'high',
            implemented: false,
          },
        ],
      });
      metricsId = metrics._id.toString();
    });

    it('should calculate potential improvement', async () => {
      const response = await request(app)
        .get(`/api/startup-metrics/${metricsId}/improvement`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('potential');
      expect(response.body.data).toHaveProperty('improvement');
      expect(response.body.data.current.ms).toBe(3000);
      expect(response.body.data.improvement.ms).toBe(900); // 500 + 400
      expect(response.body.data.potential.ms).toBe(2100); // 3000 - 900
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('GET /api/startup-metrics/analytics/average', () => {
    beforeEach(async () => {
      await StartupMetrics.create([
        {
          sessionId: 'session1',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2500 },
          phases: {},
        },
        {
          sessionId: 'session2',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 3000 },
          phases: {},
        },
        {
          sessionId: 'session3',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'warm',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 1200 },
          phases: {},
        },
      ]);
    });

    it('should get average startup time by type', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/average')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('_id'); // startup type
      expect(response.body.data[0]).toHaveProperty('avgTime');
      expect(response.body.data[0]).toHaveProperty('minTime');
      expect(response.body.data[0]).toHaveProperty('maxTime');
      expect(response.body.data[0]).toHaveProperty('count');
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/average?platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/startup-metrics/analytics/trend', () => {
    beforeEach(async () => {
      const now = new Date();
      await StartupMetrics.create([
        {
          sessionId: 'session1',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2500 },
          phases: {},
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          sessionId: 'session2',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2200 },
          phases: {},
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          sessionId: 'session3',
          appVersion: '2.5.0',
          buildNumber: '125',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2000 },
          phases: {},
          timestamp: now,
        },
      ]);
    });

    it('should get startup time trend', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/trend?platform=ios&days=7')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(response.body.data[0]).toHaveProperty('timestamp');
      expect(response.body.data[0]).toHaveProperty('total');
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('rating');
    });

    it('should require platform parameter', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/trend')
        .set('x-user-id', userId.toString())
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Platform');
    });
  });

  describe('GET /api/startup-metrics/analytics/stats', () => {
    beforeEach(async () => {
      await StartupMetrics.create([
        {
          sessionId: 'session1',
          appVersion: '2.5.0',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 1800 }, // excellent
          phases: {},
        },
        {
          sessionId: 'session2',
          appVersion: '2.5.0',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2500 }, // good
          phases: {},
        },
        {
          sessionId: 'session3',
          appVersion: '2.5.0',
          startupType: 'warm',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 900 }, // excellent
          phases: {},
        },
        {
          sessionId: 'session4',
          appVersion: '2.5.0',
          startupType: 'hot',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 400 }, // excellent
          phases: {},
        },
      ]);
    });

    it('should get performance statistics', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/stats')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('average');
      expect(response.body.data).toHaveProperty('median');
      expect(response.body.data).toHaveProperty('percentiles');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('ratings');
      expect(response.body.data.count).toBe(4);
      expect(response.body.data.byType.cold).toBe(2);
      expect(response.body.data.byType.warm).toBe(1);
      expect(response.body.data.byType.hot).toBe(1);
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/stats?platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(4);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/stats?type=cold')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('GET /api/startup-metrics/analytics/bottlenecks', () => {
    beforeEach(async () => {
      await StartupMetrics.create([
        {
          sessionId: 'session1',
          appVersion: '2.5.0',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2500 },
          phases: {},
          bottlenecks: [
            {
              phase: 'bundleLoad',
              duration: 850,
              severity: 'critical',
            },
          ],
        },
        {
          sessionId: 'session2',
          appVersion: '2.5.0',
          startupType: 'cold',
          device: { platform: 'ios', model: 'iPhone 14 Pro' },
          timing: { total: 2700 },
          phases: {},
          bottlenecks: [
            {
              phase: 'bundleLoad',
              duration: 920,
              severity: 'critical',
            },
            {
              phase: 'apiCalls',
              duration: 400,
              severity: 'high',
            },
          ],
        },
      ]);
    });

    it('should get common bottlenecks', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/bottlenecks')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('_id'); // phase name
      expect(response.body.data[0]).toHaveProperty('count');
      expect(response.body.data[0]).toHaveProperty('avgDuration');
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/startup-metrics/analytics/bottlenecks?limit=1')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('StartupMetrics Model Methods', () => {
    it('should calculate performance rating correctly', async () => {
      const coldExcellent = await StartupMetrics.create({
        sessionId: 'cold-excellent',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 1800 }, // < 2000 = excellent
        phases: {},
      });
      expect(coldExcellent.performanceRating).toBe('excellent');

      const coldGood = await StartupMetrics.create({
        sessionId: 'cold-good',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 2500 }, // 2000-3000 = good
        phases: {},
      });
      expect(coldGood.performanceRating).toBe('good');

      const coldFair = await StartupMetrics.create({
        sessionId: 'cold-fair',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 4000 }, // 3000-5000 = fair
        phases: {},
      });
      expect(coldFair.performanceRating).toBe('fair');

      const coldPoor = await StartupMetrics.create({
        sessionId: 'cold-poor',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 6000 }, // > 5000 = poor
        phases: {},
      });
      expect(coldPoor.performanceRating).toBe('poor');
    });

    it('should determine if startup is fast', async () => {
      const fastCold = await StartupMetrics.create({
        sessionId: 'fast-cold',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 1500 }, // < 2000
        phases: {},
      });
      expect(fastCold.isFast).toBe(true);

      const slowCold = await StartupMetrics.create({
        sessionId: 'slow-cold',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 3000 }, // > 2000
        phases: {},
      });
      expect(slowCold.isFast).toBe(false);
    });

    it('should get slowest phases', async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 2000 },
        phases: {
          initialization: { duration: 200 },
          bundleLoad: { duration: 850 },
          nativeModules: { duration: 420 },
          reactMount: { duration: 200 },
          apiCalls: { duration: 330 },
        },
      });

      const slowest = metrics.getSlowestPhases(3);
      expect(slowest).toHaveLength(3);
      expect(slowest[0].name).toBe('bundleLoad');
      expect(slowest[0].duration).toBe(850);
      expect(slowest[1].name).toBe('nativeModules');
      expect(slowest[2].name).toBe('apiCalls');
    });

    it('should get critical bottlenecks only', async () => {
      const metrics = await StartupMetrics.create({
        sessionId: 'test',
        appVersion: '2.5.0',
        startupType: 'cold',
        device: { platform: 'ios', model: 'iPhone 14 Pro' },
        timing: { total: 2500 },
        phases: {},
        bottlenecks: [
          {
            phase: 'bundleLoad',
            duration: 850,
            severity: 'critical',
          },
          {
            phase: 'nativeModules',
            duration: 420,
            severity: 'high',
          },
          {
            phase: 'apiCalls',
            duration: 200,
            severity: 'low',
          },
        ],
      });

      const critical = metrics.getCriticalBottlenecks();
      expect(critical).toHaveLength(2); // Only critical and high
      expect(['critical', 'high']).toContain(critical[0].severity);
      expect(['critical', 'high']).toContain(critical[1].severity);
    });
  });
});
