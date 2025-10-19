const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const HapticPreference = require('../models/HapticPreference');
/* eslint-env jest */
/**
 * Haptic Feedback API Tests
 * TASK-14.20 - Haptic Feedback
 *
 * Test suite for haptic feedback preferences and settings
 * Coverage:
 * - User preferences CRUD
 * - Master controls (toggle, intensity)
 * - Interaction-specific settings
 * - Context-aware settings (quiet hours, battery saver, focus mode)
 * - Profile management
 * - Custom patterns
 * - Analytics and testing
 */

// eslint-disable-next-line no-unused-vars
const TEST_USER_ID = '507f1f77bcf86cd799439011';

describe('Haptic Feedback API Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
    }
  });

  beforeEach(async () => {
    await HapticPreference.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ==================== BASIC CRUD ====================

  describe('GET /api/haptics', () => {
    it('should get or create user preferences', async () => {
      const response = await request(app).get('/api/haptics').set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('masterIntensity');
      expect(response.body.data).toHaveProperty('interactions');
    });

    it('should return existing preferences if already created', async () => {
      await HapticPreference.create({
        userId: TEST_USER_ID,
        enabled: false,
        masterIntensity: 0.5,
      });

      const response = await request(app).get('/api/haptics').set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.masterIntensity).toBe(0.5);
    });
  });

  describe('GET /api/haptics/summary', () => {
    it('should return usage summary', async () => {
      const response = await request(app)
        .get('/api/haptics/summary')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('totalTriggers');
      expect(response.body.data).toHaveProperty('effectiveIntensity');
    });
  });

  describe('PUT /api/haptics', () => {
    it('should update preferences', async () => {
      const response = await request(app).put('/api/haptics').set('x-user-id', TEST_USER_ID).send({
        enabled: true,
        masterIntensity: 0.8,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.masterIntensity).toBe(0.8);
    });
  });

  describe('POST /api/haptics/reset', () => {
    it('should reset preferences to defaults', async () => {
      await HapticPreference.create({
        userId: TEST_USER_ID,
        enabled: false,
        masterIntensity: 0.3,
      });

      const response = await request(app).post('/api/haptics/reset').set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.masterIntensity).toBe(0.75);
    });
  });

  // ==================== MASTER CONTROLS ====================

  describe('PUT /api/haptics/toggle', () => {
    it('should toggle haptics on', async () => {
      const response = await request(app)
        .put('/api/haptics/toggle')
        .set('x-user-id', TEST_USER_ID)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
    });

    it('should toggle haptics off', async () => {
      const response = await request(app)
        .put('/api/haptics/toggle')
        .set('x-user-id', TEST_USER_ID)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
    });

    it('should return error if enabled field is missing', async () => {
      const response = await request(app)
        .put('/api/haptics/toggle')
        .set('x-user-id', TEST_USER_ID)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/haptics/master-intensity', () => {
    it('should update master intensity', async () => {
      const response = await request(app)
        .put('/api/haptics/master-intensity')
        .set('x-user-id', TEST_USER_ID)
        .send({ intensity: 0.9 });

      expect(response.status).toBe(200);
      expect(response.body.data.masterIntensity).toBe(0.9);
    });

    it('should reject intensity out of range', async () => {
      const response = await request(app)
        .put('/api/haptics/master-intensity')
        .set('x-user-id', TEST_USER_ID)
        .send({ intensity: 1.5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ==================== INTERACTIONS ====================

  describe('Interaction Settings', () => {
    it('should get all interactions', async () => {
      const response = await request(app)
        .get('/api/haptics/interactions')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('buttonPress');
      expect(response.body.data).toHaveProperty('switchToggle');
    });

    it('should get specific interaction', async () => {
      const response = await request(app)
        .get('/api/haptics/interactions/buttonPress')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('intensity');
    });

    it('should update interaction settings', async () => {
      const response = await request(app)
        .put('/api/haptics/interactions/buttonPress')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          type: 'heavy',
          intensity: 0.9,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('heavy');
      expect(response.body.data.intensity).toBe(0.9);
    });

    it('should return 404 for invalid interaction type', async () => {
      const response = await request(app)
        .get('/api/haptics/interactions/invalidType')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/haptics/test/:type', () => {
    it('should return test configuration', async () => {
      const response = await request(app)
        .post('/api/haptics/test/buttonPress')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('type');
      expect(response.body.data).toHaveProperty('intensity');
      expect(response.body.data).toHaveProperty('enabled');
    });

    it('should track trigger', async () => {
      await request(app).post('/api/haptics/test/buttonPress').set('x-user-id', TEST_USER_ID);

      const prefs = await HapticPreference.findOne({ userId: TEST_USER_ID });
      expect(prefs.analytics.totalTriggers).toBeGreaterThan(0);
    });
  });

  // ==================== CONTEXTUAL SETTINGS ====================

  describe('Contextual Settings', () => {
    it('should get contextual settings', async () => {
      const response = await request(app)
        .get('/api/haptics/contextual')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('quietHours');
      expect(response.body.data).toHaveProperty('batterySaver');
      expect(response.body.data).toHaveProperty('focusMode');
    });

    it('should update quiet hours', async () => {
      const response = await request(app)
        .put('/api/haptics/contextual/quiet-hours')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          startTime: '23:00',
          endTime: '08:00',
          intensity: 0.2,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.startTime).toBe('23:00');
    });

    it('should update battery saver', async () => {
      const response = await request(app)
        .put('/api/haptics/contextual/battery-saver')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          threshold: 15,
          behavior: 'reduce',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.threshold).toBe(15);
    });

    it('should update focus mode', async () => {
      const response = await request(app)
        .put('/api/haptics/contextual/focus-mode')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          allowedTypes: ['errorAlert', 'warningAlert'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.allowedTypes).toContain('errorAlert');
    });

    it('should update accessibility mode', async () => {
      const response = await request(app)
        .put('/api/haptics/contextual/accessibility-mode')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          enhancedIntensity: 1.8,
          alwaysVibrate: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enhancedIntensity).toBe(1.8);
    });
  });

  // ==================== PROFILES ====================

  describe('Profile Management', () => {
    it('should get all profiles', async () => {
      const response = await request(app)
        .get('/api/haptics/profiles')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should save current settings as profile', async () => {
      const response = await request(app)
        .post('/api/haptics/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({
          name: 'Gaming',
          description: 'Strong haptics for gaming',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should require profile name', async () => {
      const response = await request(app)
        .post('/api/haptics/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({ description: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should get active profile', async () => {
      const response = await request(app)
        .get('/api/haptics/profiles/active')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
    });

    it('should activate a profile', async () => {
      await request(app)
        .post('/api/haptics/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({ name: 'Test Profile', description: 'Test' });

      const response = await request(app)
        .post('/api/haptics/profiles/Test Profile/activate')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
    });

    it('should delete a profile', async () => {
      await request(app)
        .post('/api/haptics/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({ name: 'Delete Me', description: 'Test' });

      const response = await request(app)
        .delete('/api/haptics/profiles/Delete Me')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
    });
  });

  // ==================== CUSTOM PATTERNS ====================

  describe('Custom Patterns', () => {
    it('should get custom patterns', async () => {
      const response = await request(app)
        .get('/api/haptics/patterns')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should create custom pattern', async () => {
      const response = await request(app)
        .post('/api/haptics/patterns')
        .set('x-user-id', TEST_USER_ID)
        .send({
          name: 'Custom Pulse',
          description: 'Custom pulsing pattern',
          pattern: 'custom',
          customDurations: [100, 50, 100, 50, 200],
          intensity: 0.8,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should require pattern name', async () => {
      const response = await request(app)
        .post('/api/haptics/patterns')
        .set('x-user-id', TEST_USER_ID)
        .send({ description: 'Test' });

      expect(response.status).toBe(400);
    });

    it('should delete custom pattern', async () => {
      await request(app)
        .post('/api/haptics/patterns')
        .set('x-user-id', TEST_USER_ID)
        .send({ name: 'Delete Me', intensity: 0.5 });

      const response = await request(app)
        .delete('/api/haptics/patterns/Delete Me')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
    });
  });

  // ==================== ANALYTICS ====================

  describe('Analytics', () => {
    it('should track haptic trigger', async () => {
      const response = await request(app)
        .post('/api/haptics/track')
        .set('x-user-id', TEST_USER_ID)
        .send({
          interactionType: 'buttonPress',
          intensity: 0.8,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require interactionType', async () => {
      const response = await request(app)
        .post('/api/haptics/track')
        .set('x-user-id', TEST_USER_ID)
        .send({ intensity: 0.8 });

      expect(response.status).toBe(400);
    });

    it('should get user analytics', async () => {
      // Track some interactions
      await request(app)
        .post('/api/haptics/track')
        .set('x-user-id', TEST_USER_ID)
        .send({ interactionType: 'buttonPress', intensity: 0.8 });

      const response = await request(app)
        .get('/api/haptics/analytics')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalTriggers');
      expect(response.body.data).toHaveProperty('topInteractions');
    });

    it('should get global stats', async () => {
      await HapticPreference.create({
        userId: TEST_USER_ID,
        enabled: true,
        masterIntensity: 0.8,
      });

      const response = await request(app).get('/api/haptics/stats');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('enabledUsers');
    });
  });

  // ==================== PRESETS ====================

  describe('Presets', () => {
    it('should get haptic presets', async () => {
      const response = await request(app).get('/api/haptics/presets');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include common presets', async () => {
      const response = await request(app).get('/api/haptics/presets');

      const presetNames = response.body.data.map((p) => p.name);
      expect(presetNames).toContain('Gentle');
      expect(presetNames).toContain('Standard');
      expect(presetNames).toContain('Strong');
      expect(presetNames).toContain('Battery Saver');
    });

    it('presets should have required fields', async () => {
      const response = await request(app).get('/api/haptics/presets');

      const preset = response.body.data[0];
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('description');
      expect(preset).toHaveProperty('settings');
    });
  });

  // ==================== DEVICE CAPABILITIES ====================

  describe('Device Registration', () => {
    it('should register device capabilities', async () => {
      const response = await request(app)
        .post('/api/haptics/register-device')
        .set('x-user-id', TEST_USER_ID)
        .send({
          platform: 'ios',
          hasTapticEngine: true,
          supportsHapticFeedback: true,
          apiVersion: 15,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.platform).toBe('ios');
      expect(response.body.data.hasTapticEngine).toBe(true);
    });
  });

  // ==================== MODEL METHODS ====================

  describe('Model Methods', () => {
    it('should get or create preferences', async () => {
      const prefs = await HapticPreference.getOrCreate(TEST_USER_ID);
      expect(prefs).toBeTruthy();
      expect(prefs.userId.toString()).toBe(TEST_USER_ID);
    });

    it('should check if haptic should trigger', async () => {
      const prefs = await HapticPreference.create({
        userId: TEST_USER_ID,
        enabled: true,
        interactions: {
          buttonPress: { enabled: true },
        },
      });

      expect(prefs.shouldTrigger('buttonPress')).toBe(true);
    });

    it('should respect focus mode', async () => {
      const prefs = await HapticPreference.create({
        userId: TEST_USER_ID,
        enabled: true,
        contextual: {
          focusMode: {
            enabled: true,
            allowedTypes: ['errorAlert'],
          },
        },
      });

      expect(prefs.shouldTrigger('errorAlert')).toBe(true);
      expect(prefs.shouldTrigger('buttonPress')).toBe(false);
    });

    it('should get haptic config', async () => {
      const prefs = await HapticPreference.create({
        userId: TEST_USER_ID,
        interactions: {
          buttonPress: { enabled: true, type: 'medium', intensity: 0.8 },
        },
      });

      const config = prefs.getHapticConfig('buttonPress');
      expect(config.type).toBe('medium');
      expect(config.intensity).toBeGreaterThan(0);
    });

    it('should track triggers', async () => {
      const prefs = await HapticPreference.create({ userId: TEST_USER_ID });

      await prefs.trackTrigger('buttonPress', 0.8);

      expect(prefs.analytics.totalTriggers).toBe(1);
      expect(prefs.analytics.triggersByType.get('buttonPress')).toBe(1);
    });

    it('should calculate usage summary', async () => {
      const prefs = await HapticPreference.create({
        userId: TEST_USER_ID,
        enabled: true,
      });

      const summary = prefs.getUsageSummary();
      expect(summary).toHaveProperty('enabled');
      expect(summary).toHaveProperty('totalTriggers');
      expect(summary).toHaveProperty('effectiveIntensity');
    });
  });
});
