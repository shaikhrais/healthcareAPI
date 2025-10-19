const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const AppSizeMetrics = require('../models/AppSizeMetrics');
/* eslint-env jest */
/**
 * App Size Optimization API Tests
 * TASK-14.23 - App Size Optimization
 *
 * Comprehensive test suite for app size tracking and optimization
 */

// eslint-disable-next-line no-unused-vars
describe('App Size Optimization API', () => {
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
    await AppSizeMetrics.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await AppSizeMetrics.deleteMany({});
  });

  // ============================================
  // METRICS RECORDING TESTS
  // ============================================

  describe('POST /api/app-size', () => {
    it('should record app size metrics', async () => {
      const metricsData = {
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 45 * 1024 * 1024, // 45MB
          installSize: 120 * 1024 * 1024, // 120MB
          ipaSize: 48 * 1024 * 1024, // 48MB
          appThinning: {
            universal: 48 * 1024 * 1024,
            iphone: 40 * 1024 * 1024,
            ipad: 42 * 1024 * 1024,
          },
        },
        breakdown: {
          code: {
            javascript: 12 * 1024 * 1024,
            native: 15 * 1024 * 1024,
            total: 27 * 1024 * 1024,
          },
          assets: {
            images: 18 * 1024 * 1024,
            fonts: 2 * 1024 * 1024,
            videos: 8 * 1024 * 1024,
            audio: 3 * 1024 * 1024,
            total: 31 * 1024 * 1024,
          },
        },
        device: {
          model: 'iPhone 14 Pro',
          osVersion: 'iOS 17.0',
        },
      };

      const response = await request(app).post('/api/app-size').send(metricsData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.version).toBe(metricsData.version);
      expect(response.body.data.sizes.downloadSize).toBe(metricsData.sizes.downloadSize);

      metricsId = response.body.data._id;
    });

    it('should fail with invalid platform', async () => {
      const metricsData = {
        version: '2.5.0',
        platform: 'invalid',
        sizes: {
          downloadSize: 50 * 1024 * 1024,
        },
      };

      const response = await request(app).post('/api/app-size').send(metricsData).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/app-size', () => {
    beforeEach(async () => {
      await AppSizeMetrics.create([
        {
          version: '2.5.0',
          buildNumber: '125',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 45 * 1024 * 1024,
            installSize: 120 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 27 * 1024 * 1024 },
            assets: { total: 31 * 1024 * 1024 },
          },
        },
        {
          version: '2.5.0',
          buildNumber: '125',
          platform: 'android',
          buildType: 'release',
          sizes: {
            downloadSize: 35 * 1024 * 1024,
            installSize: 90 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 20 * 1024 * 1024 },
            assets: { total: 25 * 1024 * 1024 },
          },
        },
      ]);
    });

    it('should get all metrics', async () => {
      const response = await request(app)
        .get('/api/app-size')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/app-size?platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].platform).toBe('ios');
    });

    it('should filter by version', async () => {
      const response = await request(app)
        .get('/api/app-size?version=2.5.0')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/app-size?limit=1')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/app-size/:id', () => {
    beforeEach(async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 45 * 1024 * 1024,
          installSize: 120 * 1024 * 1024,
        },
        breakdown: {
          code: { total: 27 * 1024 * 1024 },
          assets: { total: 31 * 1024 * 1024 },
        },
      });
      metricsId = metrics._id.toString();
    });

    it('should get specific metrics', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(metricsId);
    });

    it('should return 404 for non-existent metrics', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/app-size/${fakeId}`)
        .set('x-user-id', userId.toString())
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // ANALYSIS TESTS
  // ============================================

  describe('GET /api/app-size/:id/breakdown', () => {
    beforeEach(async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 45 * 1024 * 1024,
        },
        breakdown: {
          code: {
            javascript: 12 * 1024 * 1024,
            native: 15 * 1024 * 1024,
            total: 27 * 1024 * 1024,
          },
          assets: {
            images: 18 * 1024 * 1024,
            fonts: 2 * 1024 * 1024,
            videos: 8 * 1024 * 1024,
            audio: 3 * 1024 * 1024,
            total: 31 * 1024 * 1024,
          },
          libraries: {
            node_modules: 10 * 1024 * 1024,
            native_modules: 5 * 1024 * 1024,
            total: 15 * 1024 * 1024,
          },
        },
      });
      metricsId = metrics._id.toString();
    });

    it('should get size breakdown', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/breakdown`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('code');
      expect(response.body.data).toHaveProperty('assets');
      expect(response.body.data).toHaveProperty('libraries');
      expect(response.body.data.code.total).toBe(27 * 1024 * 1024);
    });
  });

  describe('GET /api/app-size/:id/opportunities', () => {
    beforeEach(async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 45 * 1024 * 1024,
        },
        breakdown: {
          code: { total: 27 * 1024 * 1024 },
          assets: { total: 31 * 1024 * 1024 },
        },
        optimizations: [
          {
            type: 'compress_images',
            description: 'Compress images to WebP format',
            estimatedSavings: 8 * 1024 * 1024,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'lazy_load_modules',
            description: 'Lazy load video player',
            estimatedSavings: 5 * 1024 * 1024,
            priority: 'medium',
            implemented: false,
          },
        ],
      });
      metricsId = metrics._id.toString();
    });

    it('should get optimization opportunities', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/opportunities`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].type).toBe('compress_images');
      expect(response.body.data[0].estimatedSavings).toBe(8 * 1024 * 1024);
    });

    it('should limit opportunities', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/opportunities?limit=1`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/app-size/:id/potential', () => {
    beforeEach(async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 45 * 1024 * 1024,
        },
        breakdown: {
          code: { total: 27 * 1024 * 1024 },
          assets: { total: 31 * 1024 * 1024 },
        },
        optimizations: [
          {
            type: 'compress_images',
            estimatedSavings: 8 * 1024 * 1024,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'lazy_load_modules',
            estimatedSavings: 5 * 1024 * 1024,
            priority: 'medium',
            implemented: false,
          },
        ],
      });
      metricsId = metrics._id.toString();
    });

    it('should calculate potential size reduction', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/potential`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('potential');
      expect(response.body.data).toHaveProperty('reduction');
      expect(response.body.data.reduction.mb).toBe(13); // 8 + 5 MB
    });
  });

  // ============================================
  // COMPARISON TESTS
  // ============================================

  describe('GET /api/app-size/compare', () => {
    beforeEach(async () => {
      await AppSizeMetrics.create([
        {
          version: '2.5.0',
          buildNumber: '125',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 45 * 1024 * 1024,
            installSize: 120 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 27 * 1024 * 1024 },
            assets: { total: 31 * 1024 * 1024 },
          },
        },
        {
          version: '2.4.0',
          buildNumber: '120',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 50 * 1024 * 1024,
            installSize: 130 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 28 * 1024 * 1024 },
            assets: { total: 35 * 1024 * 1024 },
          },
        },
      ]);
    });

    it('should compare two versions', async () => {
      const response = await request(app)
        .get('/api/app-size/compare?version1=2.5.0&version2=2.4.0&platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('version1');
      expect(response.body.data).toHaveProperty('version2');
      expect(response.body.data).toHaveProperty('difference');
      expect(response.body.data.difference.downloadSize).toBe(-5 * 1024 * 1024); // 5MB smaller
    });

    it('should fail without required parameters', async () => {
      const response = await request(app)
        .get('/api/app-size/compare?version1=2.5.0')
        .set('x-user-id', userId.toString())
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // TREND ANALYSIS TESTS
  // ============================================

  describe('GET /api/app-size/trend', () => {
    beforeEach(async () => {
      const now = new Date();
      await AppSizeMetrics.create([
        {
          version: '2.3.0',
          buildNumber: '115',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 55 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 30 * 1024 * 1024 },
            assets: { total: 40 * 1024 * 1024 },
          },
          timestamp: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        },
        {
          version: '2.4.0',
          buildNumber: '120',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 50 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 28 * 1024 * 1024 },
            assets: { total: 35 * 1024 * 1024 },
          },
          timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        {
          version: '2.5.0',
          buildNumber: '125',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 45 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 27 * 1024 * 1024 },
            assets: { total: 31 * 1024 * 1024 },
          },
          timestamp: now,
        },
      ]);
    });

    it('should get size trend', async () => {
      const response = await request(app)
        .get('/api/app-size/trend?platform=ios&days=90')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('version');
      expect(response.body.data[0]).toHaveProperty('downloadSize');
      expect(response.body.data[0]).toHaveProperty('timestamp');
    });

    it('should require platform parameter', async () => {
      const response = await request(app)
        .get('/api/app-size/trend')
        .set('x-user-id', userId.toString())
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('GET /api/app-size/stats', () => {
    beforeEach(async () => {
      await AppSizeMetrics.create([
        {
          version: '2.5.0',
          buildNumber: '125',
          platform: 'ios',
          buildType: 'release',
          sizes: {
            downloadSize: 45 * 1024 * 1024,
            installSize: 120 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 27 * 1024 * 1024 },
            assets: { total: 31 * 1024 * 1024 },
          },
        },
        {
          version: '2.5.0',
          buildNumber: '125',
          platform: 'android',
          buildType: 'release',
          sizes: {
            downloadSize: 35 * 1024 * 1024,
            installSize: 90 * 1024 * 1024,
          },
          breakdown: {
            code: { total: 20 * 1024 * 1024 },
            assets: { total: 25 * 1024 * 1024 },
          },
        },
      ]);
    });

    it('should get app size statistics', async () => {
      const response = await request(app)
        .get('/api/app-size/stats')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('averageDownloadSize');
      expect(response.body.data).toHaveProperty('averageInstallSize');
      expect(response.body.data).toHaveProperty('byPlatform');
      expect(response.body.data.count).toBe(2);
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/app-size/stats?platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.byPlatform.ios).toBe(1);
      expect(response.body.data.byPlatform.android).toBeUndefined();
    });
  });

  // ============================================
  // ASSET ANALYSIS TESTS
  // ============================================

  describe('GET /api/app-size/:id/assets', () => {
    beforeEach(async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 45 * 1024 * 1024,
        },
        breakdown: {
          assets: {
            images: 18 * 1024 * 1024,
            fonts: 2 * 1024 * 1024,
            videos: 8 * 1024 * 1024,
            audio: 3 * 1024 * 1024,
            total: 31 * 1024 * 1024,
          },
        },
        assetDetails: [
          {
            name: 'hero-image.png',
            type: 'image',
            size: 5 * 1024 * 1024,
            path: '/assets/images/hero-image.png',
            compressed: false,
          },
          {
            name: 'background-video.mp4',
            type: 'video',
            size: 8 * 1024 * 1024,
            path: '/assets/videos/background-video.mp4',
            compressed: true,
          },
        ],
      });
      metricsId = metrics._id.toString();
    });

    it('should get asset details', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/assets`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('size');
    });

    it('should filter by asset type', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/assets?type=image`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('image');
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get(`/api/app-size/${metricsId}/assets?limit=1`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  // ============================================
  // STORE COMPLIANCE TESTS
  // ============================================

  describe('GET /api/app-size/:id/compliance', () => {
    it('should check iOS App Store compliance (under limit)', async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 180 * 1024 * 1024, // 180MB - under 200MB OTA limit
          installSize: 3.5 * 1024 * 1024 * 1024, // 3.5GB - under 4GB limit
        },
        breakdown: {
          code: { total: 27 * 1024 * 1024 },
          assets: { total: 31 * 1024 * 1024 },
        },
      });
      metricsId = metrics._id.toString();

      const response = await request(app)
        .get(`/api/app-size/${metricsId}/compliance`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('compliant');
      expect(response.body.data.compliant).toBe(true);
    });

    it('should check Android Play Store compliance (over APK limit)', async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'android',
        buildType: 'release',
        sizes: {
          downloadSize: 200 * 1024 * 1024, // 200MB
          apkSize: 160 * 1024 * 1024, // 160MB - over 150MB limit
        },
        breakdown: {
          code: { total: 80 * 1024 * 1024 },
          assets: { total: 120 * 1024 * 1024 },
        },
      });
      metricsId = metrics._id.toString();

      const response = await request(app)
        .get(`/api/app-size/${metricsId}/compliance`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.compliant).toBe(false);
      expect(response.body.data.warnings.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('AppSizeMetrics Model Methods', () => {
    it('should calculate potential savings correctly', async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 50 * 1024 * 1024,
        },
        breakdown: {
          code: { total: 27 * 1024 * 1024 },
          assets: { total: 31 * 1024 * 1024 },
        },
        optimizations: [
          {
            type: 'compress_images',
            estimatedSavings: 10 * 1024 * 1024,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'lazy_load_modules',
            estimatedSavings: 5 * 1024 * 1024,
            priority: 'medium',
            implemented: true, // Already implemented
          },
        ],
      });

      const potential = metrics.calculatePotentialSavings();
      expect(potential.totalSavings).toBe(10 * 1024 * 1024); // Only unimplemented
    });

    it('should get top optimization opportunities', async () => {
      const metrics = await AppSizeMetrics.create({
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        buildType: 'release',
        sizes: {
          downloadSize: 50 * 1024 * 1024,
        },
        breakdown: {
          code: { total: 27 * 1024 * 1024 },
          assets: { total: 31 * 1024 * 1024 },
        },
        optimizations: [
          {
            type: 'compress_images',
            estimatedSavings: 10 * 1024 * 1024,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'lazy_load_modules',
            estimatedSavings: 15 * 1024 * 1024,
            priority: 'high',
            implemented: false,
          },
          {
            type: 'tree_shake_dependencies',
            estimatedSavings: 3 * 1024 * 1024,
            priority: 'low',
            implemented: false,
          },
        ],
      });

      const opportunities = metrics.getTopOpportunities(2);
      expect(opportunities).toHaveLength(2);
      expect(opportunities[0].estimatedSavings).toBe(15 * 1024 * 1024); // Highest first
      expect(opportunities[1].estimatedSavings).toBe(10 * 1024 * 1024);
    });
  });
});
