const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const AccessibilityPreference = require('../models/AccessibilityPreference');
/* eslint-env jest */
/**
 * Accessibility API Tests
 * TASK-14.19 - Accessibility (VoiceOver/TalkBack)
 *
 * Test suite for accessibility preferences and settings
 * Coverage:
 * - User preferences CRUD
 * - Screen reader settings
 * - Visual, motor, cognitive, hearing accessibility
 * - Profile management
 * - System integration
 * - Analytics and recommendations
 */

// eslint-disable-next-line no-unused-vars
const TEST_USER_ID = '507f1f77bcf86cd799439011';

describe('Accessibility API Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    await AccessibilityPreference.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // ==================== BASIC CRUD ====================

  describe('GET /api/accessibility', () => {
    it('should get or create user preferences', async () => {
      const response = await request(app).get('/api/accessibility').set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('screenReader');
      expect(response.body.data).toHaveProperty('visual');
      expect(response.body.data).toHaveProperty('motor');
      expect(response.body.data).toHaveProperty('cognitive');
      expect(response.body.data).toHaveProperty('hearing');
    });

    it('should return existing preferences if already created', async () => {
      // Create preferences
      await AccessibilityPreference.create({
        userId: TEST_USER_ID,
        screenReader: { enabled: true },
      });

      const response = await request(app).get('/api/accessibility').set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.data.screenReader.enabled).toBe(true);
    });
  });

  describe('GET /api/accessibility/summary', () => {
    it('should return accessibility summary', async () => {
      const response = await request(app)
        .get('/api/accessibility/summary')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('screenReader');
      expect(response.body.data).toHaveProperty('visual');
      expect(response.body.data).toHaveProperty('motor');
      expect(response.body.data).toHaveProperty('cognitive');
      expect(response.body.data).toHaveProperty('hearing');
      expect(response.body.data).toHaveProperty('activeFeatures');
    });
  });

  describe('PUT /api/accessibility', () => {
    it('should update accessibility preferences', async () => {
      const response = await request(app)
        .put('/api/accessibility')
        .set('x-user-id', TEST_USER_ID)
        .send({
          screenReader: { enabled: true, verbosity: 'detailed' },
          visual: { fontSize: { scale: 1.5 } },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.screenReader.enabled).toBe(true);
      expect(response.body.data.screenReader.verbosity).toBe('detailed');
    });
  });

  describe('POST /api/accessibility/reset', () => {
    it('should reset preferences to defaults', async () => {
      // Create custom preferences
      await AccessibilityPreference.create({
        userId: TEST_USER_ID,
        screenReader: { enabled: true, verbosity: 'detailed' },
      });

      const response = await request(app)
        .post('/api/accessibility/reset')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.screenReader.enabled).toBe(false);
      expect(response.body.data.screenReader.verbosity).toBe('moderate');
    });
  });

  // ==================== SCREEN READER ====================

  describe('Screen Reader Settings', () => {
    it('should get screen reader settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/screen-reader')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body.data).toHaveProperty('verbosity');
    });

    it('should update screen reader settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/screen-reader')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          verbosity: 'detailed',
          announceChanges: true,
          announceHints: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.verbosity).toBe('detailed');
      expect(response.body.data.announceHints).toBe(false);
    });
  });

  // ==================== VISUAL ACCESSIBILITY ====================

  describe('Visual Accessibility Settings', () => {
    it('should get visual settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/visual')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fontSize');
      expect(response.body.data).toHaveProperty('highContrast');
    });

    it('should update visual settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/visual')
        .set('x-user-id', TEST_USER_ID)
        .send({
          fontSize: { scale: 2.0 },
          boldText: { enabled: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.fontSize.scale).toBe(2.0);
      expect(response.body.data.boldText.enabled).toBe(true);
    });

    it('should update font size', async () => {
      const response = await request(app)
        .put('/api/accessibility/visual/font-size')
        .set('x-user-id', TEST_USER_ID)
        .send({ scale: 1.8, useSystemSetting: false });

      expect(response.status).toBe(200);
      expect(response.body.data.scale).toBe(1.8);
      expect(response.body.data.useSystemSetting).toBe(false);
    });

    it('should update high contrast settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/visual/high-contrast')
        .set('x-user-id', TEST_USER_ID)
        .send({ enabled: true, level: 'high' });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.level).toBe('high');
    });

    it('should update color blindness settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/visual/color-blindness')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          type: 'protanopia',
          showColorLabels: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.type).toBe('protanopia');
      expect(response.body.data.showColorLabels).toBe(true);
    });

    it('should update reduce motion settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/visual/reduce-motion')
        .set('x-user-id', TEST_USER_ID)
        .send({ enabled: true, level: 'full' });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.level).toBe('full');
    });
  });

  // ==================== MOTOR ACCESSIBILITY ====================

  describe('Motor Accessibility Settings', () => {
    it('should get motor settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/motor')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('touchTarget');
      expect(response.body.data).toHaveProperty('gestureAlternatives');
    });

    it('should update motor settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/motor')
        .set('x-user-id', TEST_USER_ID)
        .send({
          touchTarget: { size: 'extra-large', minSize: 56 },
          holdDuration: 2.5,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.touchTarget.size).toBe('extra-large');
      expect(response.body.data.holdDuration).toBe(2.5);
    });

    it('should update touch target settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/motor/touch-target')
        .set('x-user-id', TEST_USER_ID)
        .send({ size: 'large', minSize: 48 });

      expect(response.status).toBe(200);
      expect(response.body.data.size).toBe('large');
      expect(response.body.data.minSize).toBe(48);
    });
  });

  // ==================== COGNITIVE ACCESSIBILITY ====================

  describe('Cognitive Accessibility Settings', () => {
    it('should get cognitive settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/cognitive')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('simplifiedMode');
      expect(response.body.data).toHaveProperty('focusIndicators');
    });

    it('should update cognitive settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/cognitive')
        .set('x-user-id', TEST_USER_ID)
        .send({
          simplifiedMode: { enabled: true, hideNonEssential: true },
          autoplay: { videos: false, animations: false },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.simplifiedMode.enabled).toBe(true);
      expect(response.body.data.autoplay.videos).toBe(false);
    });

    it('should update simplified mode', async () => {
      const response = await request(app)
        .put('/api/accessibility/cognitive/simplified-mode')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          hideNonEssential: true,
          reducedAnimations: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.hideNonEssential).toBe(true);
      expect(response.body.data.reducedAnimations).toBe(true);
    });
  });

  // ==================== HEARING ACCESSIBILITY ====================

  describe('Hearing Accessibility Settings', () => {
    it('should get hearing settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/hearing')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('captions');
      expect(response.body.data).toHaveProperty('visualAlerts');
    });

    it('should update hearing settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/hearing')
        .set('x-user-id', TEST_USER_ID)
        .send({
          captions: { enabled: true },
          monoAudio: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.captions.enabled).toBe(true);
      expect(response.body.data.monoAudio).toBe(true);
    });

    it('should update caption settings', async () => {
      const response = await request(app)
        .put('/api/accessibility/hearing/captions')
        .set('x-user-id', TEST_USER_ID)
        .send({
          enabled: true,
          style: { fontSize: 18, backgroundColor: 'rgba(0,0,0,0.9)' },
        });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.style.fontSize).toBe(18);
    });
  });

  // ==================== PROFILES ====================

  describe('Profile Management', () => {
    it('should get all profiles', async () => {
      const response = await request(app)
        .get('/api/accessibility/profiles')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should save current settings as profile', async () => {
      const response = await request(app)
        .post('/api/accessibility/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({
          name: 'Work Setup',
          description: 'Settings for work environment',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Work Setup');
    });

    it('should return error if profile name is missing', async () => {
      const response = await request(app)
        .post('/api/accessibility/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({ description: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should activate a profile', async () => {
      // First create a profile
      await request(app)
        .post('/api/accessibility/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({ name: 'Test Profile', description: 'Test' });

      // Then activate it
      const response = await request(app)
        .post('/api/accessibility/profiles/Test Profile/activate')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get active profile', async () => {
      const response = await request(app)
        .get('/api/accessibility/profiles/active')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should delete a profile', async () => {
      // First create a profile
      await request(app)
        .post('/api/accessibility/profiles')
        .set('x-user-id', TEST_USER_ID)
        .send({ name: 'Delete Me', description: 'Test' });

      // Then delete it
      const response = await request(app)
        .delete('/api/accessibility/profiles/Delete Me')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ==================== SYSTEM INTEGRATION ====================

  describe('System Integration', () => {
    it('should sync system settings', async () => {
      const response = await request(app)
        .post('/api/accessibility/sync-system')
        .set('x-user-id', TEST_USER_ID)
        .send({
          voiceOverEnabled: true,
          reduceMotionEnabled: true,
          boldTextEnabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.device.voiceOverEnabled).toBe(true);
      expect(response.body.data.screenReader.enabled).toBe(true);
    });

    it('should get recommendations based on system settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/recommendations')
        .query({ voiceOverEnabled: 'true', reduceMotionEnabled: 'true' })
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('screenReader');
    });
  });

  // ==================== BACKUP & RESTORE ====================

  describe('Backup & Restore', () => {
    it('should export settings', async () => {
      const response = await request(app)
        .get('/api/accessibility/export')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('screenReader');
      expect(response.body.data).toHaveProperty('exportedAt');
    });

    it('should import settings', async () => {
      const settings = {
        screenReader: { enabled: true, verbosity: 'detailed' },
        visual: { fontSize: { scale: 2.0 } },
      };

      const response = await request(app)
        .post('/api/accessibility/import')
        .set('x-user-id', TEST_USER_ID)
        .send(settings);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.screenReader.enabled).toBe(true);
    });
  });

  // ==================== ANALYTICS ====================

  describe('Analytics', () => {
    it('should track feature usage', async () => {
      const response = await request(app)
        .post('/api/accessibility/track-feature')
        .set('x-user-id', TEST_USER_ID)
        .send({ feature: 'screenReader' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return error if feature name is missing', async () => {
      const response = await request(app)
        .post('/api/accessibility/track-feature')
        .set('x-user-id', TEST_USER_ID)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should get user analytics', async () => {
      // Track some features first
      await request(app)
        .post('/api/accessibility/track-feature')
        .set('x-user-id', TEST_USER_ID)
        .send({ feature: 'screenReader' });

      const response = await request(app)
        .get('/api/accessibility/analytics')
        .set('x-user-id', TEST_USER_ID);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('mostUsedFeatures');
      expect(response.body.data).toHaveProperty('totalUsage');
    });

    it('should get global statistics', async () => {
      // Create some test preferences
      await AccessibilityPreference.create({
        userId: TEST_USER_ID,
        screenReader: { enabled: true },
        visual: { highContrast: { enabled: true } },
      });

      const response = await request(app).get('/api/accessibility/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('screenReaderUsers');
      expect(response.body.data).toHaveProperty('highContrastUsers');
    });
  });

  // ==================== PRESETS ====================

  describe('Presets', () => {
    it('should get accessibility presets', async () => {
      const response = await request(app).get('/api/accessibility/presets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const preset = response.body.data[0];
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('description');
      expect(preset).toHaveProperty('settings');
    });

    it('should include common presets', async () => {
      const response = await request(app).get('/api/accessibility/presets');

      const presetNames = response.body.data.map((p) => p.name);
      expect(presetNames).toContain('Screen Reader Optimized');
      expect(presetNames).toContain('Low Vision');
      expect(presetNames).toContain('Motor Impairment');
      expect(presetNames).toContain('Cognitive Support');
      expect(presetNames).toContain('Hearing Impaired');
      expect(presetNames).toContain('Color Blindness');
    });
  });

  // ==================== MODEL METHODS ====================

  describe('Model Methods', () => {
    it('should get or create preferences', async () => {
      const prefs = await AccessibilityPreference.getOrCreate(TEST_USER_ID);
      expect(prefs).toBeTruthy();
      expect(prefs.userId.toString()).toBe(TEST_USER_ID);
    });

    it('should calculate accessibility summary', async () => {
      const prefs = await AccessibilityPreference.create({
        userId: TEST_USER_ID,
        screenReader: { enabled: true },
        visual: { boldText: { enabled: true } },
      });

      const summary = prefs.getSummary();
      expect(summary.screenReader).toBe(true);
      expect(summary.visual).toBe(true);
    });

    it('should export and import settings', async () => {
      const prefs = await AccessibilityPreference.create({
        userId: TEST_USER_ID,
        screenReader: { enabled: true, verbosity: 'detailed' },
      });

      const exported = prefs.exportSettings();
      expect(exported).toHaveProperty('screenReader');
      expect(exported).toHaveProperty('exportedAt');

      const newPrefs = await AccessibilityPreference.create({
        userId: '507f1f77bcf86cd799439012',
      });
      await newPrefs.importSettings(exported);

      expect(newPrefs.screenReader.enabled).toBe(true);
      expect(newPrefs.screenReader.verbosity).toBe('detailed');
    });

    it('should apply system settings', async () => {
      const prefs = await AccessibilityPreference.create({ userId: TEST_USER_ID });

      await prefs.applySystemSettings({
        voiceOverEnabled: true,
        reduceMotionEnabled: true,
        boldTextEnabled: true,
      });

      expect(prefs.device.voiceOverEnabled).toBe(true);
      expect(prefs.screenReader.enabled).toBe(true);
      expect(prefs.screenReader.type).toBe('voiceover');
      expect(prefs.visual.reduceMotion.enabled).toBe(true);
      expect(prefs.visual.boldText.enabled).toBe(true);
    });
  });
});
