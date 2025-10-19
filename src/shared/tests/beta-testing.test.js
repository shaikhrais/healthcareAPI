const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const BetaProgram = require('../models/BetaProgram');
/* eslint-env jest */
/**
 * Beta Testing API Tests
 * TASK-14.22 - Beta Testing (TestFlight/Play Beta)
 *
 * Comprehensive test suite for beta program management
 */

// eslint-disable-next-line no-unused-vars
describe('Beta Testing API', () => {
  let userId;
  let programId;
  let testerId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up and close connection
    await BetaProgram.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await BetaProgram.deleteMany({});
  });

  // ============================================
  // BETA PROGRAM MANAGEMENT TESTS
  // ============================================

  describe('POST /api/beta-testing/programs', () => {
    it('should create a new beta program', async () => {
      const programData = {
        name: 'ExpoJane Beta v2.5.0',
        description: 'Testing new appointment features',
        version: '2.5.0',
        buildNumber: '125',
        platform: 'ios',
        status: 'planning',
        distribution: {
          ios: {
            testFlightUrl: 'https://testflight.apple.com/join/abc123',
            publicLink: true,
            maxTesters: 100,
          },
        },
        goals: ['Test appointment booking', 'Validate payment flow'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };

      const response = await request(app)
        .post('/api/beta-testing/programs')
        .set('x-user-id', userId.toString())
        .send(programData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.name).toBe(programData.name);
      expect(response.body.data.distribution.ios.maxTesters).toBe(100);

      programId = response.body.data._id;
    });

    it('should fail with invalid platform', async () => {
      const programData = {
        name: 'Test Program',
        version: '1.0.0',
        platform: 'invalid_platform',
      };

      const response = await request(app)
        .post('/api/beta-testing/programs')
        .set('x-user-id', userId.toString())
        .send(programData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/beta-testing/programs', () => {
    beforeEach(async () => {
      await BetaProgram.create([
        {
          name: 'iOS Beta v2.5.0',
          version: '2.5.0',
          buildNumber: '125',
          platform: 'ios',
          status: 'active',
          distribution: { ios: { maxTesters: 100 } },
          createdBy: userId,
        },
        {
          name: 'Android Beta v2.5.0',
          version: '2.5.0',
          buildNumber: '125',
          platform: 'android',
          status: 'planning',
          distribution: { android: { track: 'internal' } },
          createdBy: userId,
        },
      ]);
    });

    it('should get all beta programs', async () => {
      const response = await request(app)
        .get('/api/beta-testing/programs')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by platform', async () => {
      const response = await request(app)
        .get('/api/beta-testing/programs?platform=ios')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].platform).toBe('ios');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/beta-testing/programs?status=active')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');
    });
  });

  describe('GET /api/beta-testing/programs/active', () => {
    beforeEach(async () => {
      await BetaProgram.create([
        {
          name: 'Active Program',
          version: '2.5.0',
          buildNumber: '125',
          platform: 'ios',
          status: 'active',
          distribution: { ios: { maxTesters: 100 } },
          createdBy: userId,
        },
        {
          name: 'Completed Program',
          version: '2.4.0',
          buildNumber: '120',
          platform: 'android',
          status: 'completed',
          distribution: { android: { track: 'internal' } },
          createdBy: userId,
        },
      ]);
    });

    it('should get only active programs', async () => {
      const response = await request(app)
        .get('/api/beta-testing/programs/active')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');
    });
  });

  describe('PUT /api/beta-testing/programs/:id', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'planning',
        distribution: { ios: { maxTesters: 50 } },
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should update beta program', async () => {
      const updates = {
        name: 'Updated Program Name',
        distribution: {
          ios: {
            maxTesters: 150,
          },
        },
      };

      const response = await request(app)
        .put(`/api/beta-testing/programs/${programId}`)
        .set('x-user-id', userId.toString())
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.distribution.ios.maxTesters).toBe(150);
    });
  });

  describe('POST /api/beta-testing/programs/:id/activate', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'planning',
        distribution: { ios: { maxTesters: 50 } },
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should activate beta program', async () => {
      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/activate`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.startDate).toBeDefined();
    });
  });

  // ============================================
  // TESTER MANAGEMENT TESTS
  // ============================================

  describe('POST /api/beta-testing/programs/:id/testers/invite', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: {
          ios: {
            testFlightUrl: 'https://testflight.apple.com/join/abc123',
            maxTesters: 100,
            currentTesters: 0,
          },
        },
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should invite a tester', async () => {
      const testerData = {
        email: 'tester@example.com',
        name: 'John Tester',
        platform: 'ios',
        group: 'internal',
      };

      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/testers/invite`)
        .set('x-user-id', userId.toString())
        .send(testerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testers).toHaveLength(1);
      expect(response.body.data.testers[0].email).toBe(testerData.email);
      expect(response.body.data.testers[0].status).toBe('invited');
    });

    it('should fail if max testers reached', async () => {
      // Create program at capacity
      await BetaProgram.findByIdAndUpdate(programId, {
        'distribution.ios.maxTesters': 1,
        'distribution.ios.currentTesters': 1,
        testers: [
          {
            userId: new mongoose.Types.ObjectId(),
            email: 'existing@example.com',
            status: 'active',
          },
        ],
      });

      const testerData = {
        email: 'new@example.com',
        name: 'New Tester',
        platform: 'ios',
      };

      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/testers/invite`)
        .set('x-user-id', userId.toString())
        .send(testerData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum testers');
    });
  });

  describe('POST /api/beta-testing/programs/:id/testers/:testerId/accept', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        testers: [
          {
            userId: new mongoose.Types.ObjectId(),
            email: 'tester@example.com',
            name: 'John Tester',
            status: 'invited',
            platform: 'ios',
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
      testerId = program.testers[0]._id.toString();
    });

    it('should accept invitation', async () => {
      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/testers/${testerId}/accept`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('accepted');
    });
  });

  describe('POST /api/beta-testing/programs/:id/testers/:testerId/activate', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        testers: [
          {
            userId: new mongoose.Types.ObjectId(),
            email: 'tester@example.com',
            name: 'John Tester',
            status: 'accepted',
            platform: 'ios',
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
      testerId = program.testers[0]._id.toString();
    });

    it('should activate tester', async () => {
      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/testers/${testerId}/activate`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.activatedAt).toBeDefined();
    });
  });

  describe('GET /api/beta-testing/programs/:id/testers', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        testers: [
          {
            userId: new mongoose.Types.ObjectId(),
            email: 'active@example.com',
            status: 'active',
            platform: 'ios',
          },
          {
            userId: new mongoose.Types.ObjectId(),
            email: 'invited@example.com',
            status: 'invited',
            platform: 'ios',
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should get all testers', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/testers`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/testers?status=active`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');
    });
  });

  // ============================================
  // FEEDBACK TESTS
  // ============================================

  describe('POST /api/beta-testing/programs/:id/feedback', () => {
    beforeEach(async () => {
      const testerUserId = new mongoose.Types.ObjectId();
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        testers: [
          {
            userId: testerUserId,
            email: 'tester@example.com',
            status: 'active',
            platform: 'ios',
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
      userId = testerUserId; // Switch to tester
    });

    it('should submit bug report', async () => {
      const feedbackData = {
        type: 'bug',
        severity: 'high',
        title: 'Crash on appointment booking',
        description: 'App crashes when selecting date',
        stepsToReproduce: ['1. Open app', '2. Click appointments', '3. Select date'],
        device: {
          model: 'iPhone 14 Pro',
          os: 'iOS 17.0',
        },
      };

      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/feedback`)
        .set('x-user-id', userId.toString())
        .send(feedbackData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback).toHaveLength(1);
      expect(response.body.data.feedback[0].type).toBe('bug');
      expect(response.body.data.feedback[0].severity).toBe('high');
    });

    it('should submit feature request', async () => {
      const feedbackData = {
        type: 'feature_request',
        severity: 'low',
        title: 'Add dark mode',
        description: 'Would love to see dark mode support',
      };

      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/feedback`)
        .set('x-user-id', userId.toString())
        .send(feedbackData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback[0].type).toBe('feature_request');
    });
  });

  describe('GET /api/beta-testing/programs/:id/feedback', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        feedback: [
          {
            type: 'bug',
            severity: 'critical',
            title: 'Critical Bug',
            status: 'open',
          },
          {
            type: 'feature_request',
            severity: 'low',
            title: 'Feature Request',
            status: 'in_review',
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should get all feedback', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/feedback`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/feedback?type=bug`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('bug');
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/feedback?severity=critical`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].severity).toBe('critical');
    });
  });

  // ============================================
  // CRASH REPORTING TESTS
  // ============================================

  describe('POST /api/beta-testing/programs/:id/crashes', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should report a crash', async () => {
      const crashData = {
        crashId: 'crash-' + Date.now(),
        message: 'Uncaught exception in MainNavigator',
        stackTrace: 'at MainNavigator.render (MainNavigator.js:42)\nat ...',
        device: {
          model: 'iPhone 14 Pro',
          os: 'iOS 17.0',
        },
        appState: 'foreground',
        memoryUsage: 250,
      };

      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/crashes`)
        .set('x-user-id', userId.toString())
        .send(crashData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.crashes).toHaveLength(1);
      expect(response.body.data.crashes[0].crashId).toBe(crashData.crashId);
    });
  });

  describe('GET /api/beta-testing/programs/:id/crashes', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        crashes: [
          {
            crashId: 'crash-1',
            message: 'Crash 1',
            severity: 'critical',
            status: 'open',
            affectedUsers: 5,
          },
          {
            crashId: 'crash-2',
            message: 'Crash 2',
            severity: 'medium',
            status: 'fixed',
            affectedUsers: 2,
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should get all crashes', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/crashes`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/crashes?severity=critical`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].severity).toBe('critical');
    });
  });

  // ============================================
  // FEATURE FLAGS TESTS
  // ============================================

  describe('POST /api/beta-testing/programs/:id/feature-flags', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should create a feature flag', async () => {
      const flagData = {
        name: 'new_payment_flow',
        description: 'New payment processing',
        enabled: true,
        rolloutPercentage: 50,
      };

      const response = await request(app)
        .post(`/api/beta-testing/programs/${programId}/feature-flags`)
        .set('x-user-id', userId.toString())
        .send(flagData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.featureFlags).toHaveLength(1);
      expect(response.body.data.featureFlags[0].name).toBe(flagData.name);
      expect(response.body.data.featureFlags[0].rolloutPercentage).toBe(50);
    });
  });

  describe('GET /api/beta-testing/programs/:id/feature-flags', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        featureFlags: [
          {
            name: 'feature_a',
            enabled: true,
            rolloutPercentage: 100,
          },
          {
            name: 'feature_b',
            enabled: false,
            rolloutPercentage: 0,
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should get all feature flags', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/feature-flags`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter enabled flags', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/feature-flags?enabled=true`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].enabled).toBe(true);
    });
  });

  describe('GET /api/beta-testing/programs/:id/feature-flags/:flagId/check', () => {
    let flagId;

    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        featureFlags: [
          {
            name: 'test_feature',
            enabled: true,
            rolloutPercentage: 100,
          },
        ],
        createdBy: userId,
      });
      programId = program._id.toString();
      flagId = program.featureFlags[0]._id.toString();
    });

    it('should check if feature is enabled for user', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/feature-flags/${flagId}/check`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('GET /api/beta-testing/programs/:id/analytics', () => {
    beforeEach(async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: {
          ios: {
            maxTesters: 100,
            currentTesters: 50,
          },
        },
        testers: Array(50)
          .fill(null)
          .map(() => ({
            userId: new mongoose.Types.ObjectId(),
            email: 'tester@example.com',
            status: 'active',
            platform: 'ios',
          })),
        feedback: [
          { type: 'bug', severity: 'high', status: 'open' },
          { type: 'bug', severity: 'low', status: 'resolved' },
        ],
        crashes: [{ crashId: 'crash-1', severity: 'critical', affectedUsers: 5 }],
        createdBy: userId,
      });
      programId = program._id.toString();
    });

    it('should get program analytics', async () => {
      const response = await request(app)
        .get(`/api/beta-testing/programs/${programId}/analytics`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTesters');
      expect(response.body.data).toHaveProperty('totalFeedback');
      expect(response.body.data).toHaveProperty('totalCrashes');
      expect(response.body.data.totalTesters).toBe(50);
      expect(response.body.data.totalFeedback).toBe(2);
      expect(response.body.data.totalCrashes).toBe(1);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('BetaProgram Model Methods', () => {
    it('should check if feature is enabled for user', async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        featureFlags: [
          {
            name: 'test_feature',
            enabled: true,
            rolloutPercentage: 100,
          },
        ],
        createdBy: userId,
      });

      const isEnabled = program.isFeatureEnabled('test_feature', userId);
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should return false for disabled feature', async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        featureFlags: [
          {
            name: 'test_feature',
            enabled: false,
            rolloutPercentage: 0,
          },
        ],
        createdBy: userId,
      });

      const isEnabled = program.isFeatureEnabled('test_feature', userId);
      expect(isEnabled).toBe(false);
    });

    it('should return false for non-existent feature', async () => {
      const program = await BetaProgram.create({
        name: 'Test Program',
        version: '1.0.0',
        buildNumber: '100',
        platform: 'ios',
        status: 'active',
        distribution: { ios: { maxTesters: 100 } },
        featureFlags: [],
        createdBy: userId,
      });

      const isEnabled = program.isFeatureEnabled('non_existent', userId);
      expect(isEnabled).toBe(false);
    });
  });
});
