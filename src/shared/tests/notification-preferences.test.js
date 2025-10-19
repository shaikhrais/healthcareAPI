const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const NotificationPreferences = require('../models/NotificationPreferences');
/* eslint-env jest */
/**
 * Notification Preferences API Tests
 * TASK-14.6 - Push Notification Preferences
 *
 * Comprehensive test suite for notification preferences management
 */

// eslint-disable-next-line no-unused-vars
describe('Notification Preferences API', () => {
  let userId;
  let preferencesId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
    userId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up and close connection
    await NotificationPreferences.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await NotificationPreferences.deleteMany({});
  });

  // ============================================
  // PREFERENCES MANAGEMENT TESTS
  // ============================================

  describe('GET /api/notification-preferences', () => {
    it('should create and return default preferences if none exist', async () => {
      const response = await request(app)
        .get('/api/notification-preferences')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.userId.toString()).toBe(userId.toString());
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.categories).toBeDefined();
    });

    it('should return existing preferences', async () => {
      await NotificationPreferences.create({
        userId,
        enabled: false,
      });

      const response = await request(app)
        .get('/api/notification-preferences')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });
  });

  describe('PUT /api/notification-preferences', () => {
    it('should update preferences', async () => {
      const updates = {
        enabled: false,
        'sound.enabled': false,
        'vibration.enabled': false,
      };

      const response = await request(app)
        .put('/api/notification-preferences')
        .set('x-user-id', userId.toString())
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });

    it('should create preferences if none exist', async () => {
      const newPrefs = {
        enabled: true,
        'categories.appointments.enabled': true,
      };

      const response = await request(app)
        .put('/api/notification-preferences')
        .set('x-user-id', userId.toString())
        .send(newPrefs)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
    });
  });

  // ============================================
  // DEVICE MANAGEMENT TESTS
  // ============================================

  describe('POST /api/notification-preferences/devices', () => {
    it('should register a new device', async () => {
      const deviceData = {
        deviceId: 'device-123',
        platform: 'ios',
        token: 'apns-token-abc123',
        deviceName: "John's iPhone",
        deviceModel: 'iPhone 14 Pro',
        osVersion: '17.0',
        appVersion: '2.5.0',
      };

      const response = await request(app)
        .post('/api/notification-preferences/devices')
        .set('x-user-id', userId.toString())
        .send(deviceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(1);
      expect(response.body.data.devices[0].deviceId).toBe('device-123');
      expect(response.body.data.devices[0].platform).toBe('ios');
      expect(response.body.data.devices[0].tokenType).toBe('apns');
    });

    it('should update existing device token', async () => {
      // Register device first
      await request(app)
        .post('/api/notification-preferences/devices')
        .set('x-user-id', userId.toString())
        .send({
          deviceId: 'device-123',
          platform: 'android',
          token: 'old-token',
        });

      // Update with new token
      const response = await request(app)
        .post('/api/notification-preferences/devices')
        .set('x-user-id', userId.toString())
        .send({
          deviceId: 'device-123',
          platform: 'android',
          token: 'new-token',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(1);
      expect(response.body.data.devices[0].token).toBe('new-token');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/devices')
        .set('x-user-id', userId.toString())
        .send({ deviceId: 'device-123' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notification-preferences/devices', () => {
    beforeEach(async () => {
      const prefs = await NotificationPreferences.create({ userId });
      await prefs.registerDevice({
        deviceId: 'device-1',
        platform: 'ios',
        token: 'token-1',
      });
      await prefs.registerDevice({
        deviceId: 'device-2',
        platform: 'android',
        token: 'token-2',
      });
    });

    it('should get all registered devices', async () => {
      const response = await request(app)
        .get('/api/notification-preferences/devices')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('DELETE /api/notification-preferences/devices/:deviceId', () => {
    beforeEach(async () => {
      const prefs = await NotificationPreferences.create({ userId });
      await prefs.registerDevice({
        deviceId: 'device-123',
        platform: 'ios',
        token: 'token-123',
      });
    });

    it('should unregister a device', async () => {
      const response = await request(app)
        .delete('/api/notification-preferences/devices/device-123')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices[0].active).toBe(false);
    });
  });

  // ============================================
  // CATEGORY PREFERENCES TESTS
  // ============================================

  describe('PUT /api/notification-preferences/categories/:category', () => {
    it('should update specific category', async () => {
      const updates = {
        enabled: false,
        channels: {
          push: false,
          email: true,
          sms: false,
        },
      };

      const response = await request(app)
        .put('/api/notification-preferences/categories/appointments')
        .set('x-user-id', userId.toString())
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.channels.push).toBe(false);
    });

    it('should fail with invalid category', async () => {
      const response = await request(app)
        .put('/api/notification-preferences/categories/invalid_category')
        .set('x-user-id', userId.toString())
        .send({ enabled: false })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/notification-preferences/categories', () => {
    it('should get all category preferences', async () => {
      const response = await request(app)
        .get('/api/notification-preferences/categories')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('appointments');
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('billing');
      expect(response.body.data).toHaveProperty('medical');
    });
  });

  // ============================================
  // QUIET HOURS TESTS
  // ============================================

  describe('PUT /api/notification-preferences/quiet-hours', () => {
    it('should update quiet hours', async () => {
      const quietHours = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'America/New_York',
        allowUrgent: true,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      };

      const response = await request(app)
        .put('/api/notification-preferences/quiet-hours')
        .set('x-user-id', userId.toString())
        .send(quietHours)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.startTime).toBe('22:00');
      expect(response.body.data.endTime).toBe('08:00');
      expect(response.body.data.daysOfWeek).toHaveLength(5);
    });
  });

  describe('GET /api/notification-preferences/quiet-hours', () => {
    it('should get quiet hours settings', async () => {
      const response = await request(app)
        .get('/api/notification-preferences/quiet-hours')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('isInQuietHours');
    });
  });

  // ============================================
  // PAUSE/RESUME TESTS
  // ============================================

  describe('POST /api/notification-preferences/pause', () => {
    it('should pause notifications', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/pause')
        .set('x-user-id', userId.toString())
        .send({ durationMinutes: 60 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pausedUntil');
    });

    it('should fail without duration', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/pause')
        .set('x-user-id', userId.toString())
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/notification-preferences/resume', () => {
    beforeEach(async () => {
      const prefs = await NotificationPreferences.create({ userId });
      await prefs.pauseNotifications(60);
    });

    it('should resume notifications', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/resume')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pausedUntil).toBeNull();
    });
  });

  // ============================================
  // SOUND & VIBRATION TESTS
  // ============================================

  describe('PUT /api/notification-preferences/sound', () => {
    it('should update sound preferences', async () => {
      const soundPrefs = {
        enabled: false,
        soundName: 'custom',
      };

      const response = await request(app)
        .put('/api/notification-preferences/sound')
        .set('x-user-id', userId.toString())
        .send(soundPrefs)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.soundName).toBe('custom');
    });
  });

  describe('PUT /api/notification-preferences/vibration', () => {
    it('should update vibration preferences', async () => {
      const vibrationPrefs = {
        enabled: true,
        pattern: 'double',
      };

      const response = await request(app)
        .put('/api/notification-preferences/vibration')
        .set('x-user-id', userId.toString())
        .send(vibrationPrefs)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.pattern).toBe('double');
    });
  });

  describe('PUT /api/notification-preferences/badge', () => {
    it('should update badge preferences', async () => {
      const badgePrefs = {
        enabled: true,
        showCount: false,
        includeCategories: ['appointments', 'messages'],
      };

      const response = await request(app)
        .put('/api/notification-preferences/badge')
        .set('x-user-id', userId.toString())
        .send(badgePrefs)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.showCount).toBe(false);
      expect(response.body.data.includeCategories).toHaveLength(2);
    });
  });

  // ============================================
  // PRIORITY FILTER TESTS
  // ============================================

  describe('PUT /api/notification-preferences/priority-filter', () => {
    it('should update priority filter', async () => {
      const filterPrefs = {
        enabled: true,
        minPriority: 'high',
      };

      const response = await request(app)
        .put('/api/notification-preferences/priority-filter')
        .set('x-user-id', userId.toString())
        .send(filterPrefs)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.minPriority).toBe('high');
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('GET /api/notification-preferences/stats', () => {
    it('should return empty stats for new user', async () => {
      const response = await request(app)
        .get('/api/notification-preferences/stats')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSent).toBe(0);
      expect(response.body.data.totalDelivered).toBe(0);
      expect(response.body.data.deliveryRate).toBe(0);
    });

    it('should calculate rates correctly', async () => {
      const prefs = await NotificationPreferences.create({
        userId,
        stats: {
          totalSent: 100,
          totalDelivered: 95,
          totalRead: 80,
          totalClicked: 40,
        },
      });

      const response = await request(app)
        .get('/api/notification-preferences/stats')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSent).toBe(100);
      expect(response.body.data.deliveryRate).toBe(95); // 95/100 * 100
      expect(response.body.data.readRate).toBe(84.2); // 80/95 * 100
      expect(response.body.data.clickRate).toBe(50); // 40/80 * 100
    });
  });

  // ============================================
  // TEST NOTIFICATION TESTS
  // ============================================

  describe('POST /api/notification-preferences/test', () => {
    it('should fail if no devices registered', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/test')
        .set('x-user-id', userId.toString())
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No active devices');
    });

    it('should return device tokens for test', async () => {
      const prefs = await NotificationPreferences.create({ userId });
      await prefs.registerDevice({
        deviceId: 'device-1',
        platform: 'ios',
        token: 'token-1',
      });
      await prefs.registerDevice({
        deviceId: 'device-2',
        platform: 'android',
        token: 'token-2',
      });

      const response = await request(app)
        .post('/api/notification-preferences/test')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceCount).toBe(2);
      expect(response.body.data.tokens).toHaveLength(2);
    });
  });

  // ============================================
  // CHECK NOTIFICATION TESTS
  // ============================================

  describe('POST /api/notification-preferences/check', () => {
    it('should check if notification should be sent', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/check')
        .set('x-user-id', userId.toString())
        .send({
          notificationType: 'appointment_reminder',
          priority: 'high',
          channel: 'push',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('shouldSend');
      expect(response.body.data).toHaveProperty('reason');
    });

    it('should block notification if category disabled', async () => {
      const prefs = await NotificationPreferences.create({ userId });
      prefs.categories.appointments.enabled = false;
      await prefs.save();

      const response = await request(app)
        .post('/api/notification-preferences/check')
        .set('x-user-id', userId.toString())
        .send({
          notificationType: 'appointment_reminder',
          priority: 'normal',
          channel: 'push',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shouldSend).toBe(false);
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/check')
        .set('x-user-id', userId.toString())
        .send({ notificationType: 'appointment_reminder' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // RESET TESTS
  // ============================================

  describe('POST /api/notification-preferences/reset', () => {
    it('should reset preferences to default', async () => {
      const prefs = await NotificationPreferences.create({
        userId,
        enabled: false,
        'categories.appointments.enabled': false,
      });

      const response = await request(app)
        .post('/api/notification-preferences/reset')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.categories.appointments.enabled).toBe(true);
    });
  });

  // ============================================
  // ADMIN TESTS
  // ============================================

  describe('GET /api/notification-preferences/admin/stats', () => {
    beforeEach(async () => {
      await NotificationPreferences.create([
        {
          userId: new mongoose.Types.ObjectId(),
          enabled: true,
          devices: [
            { deviceId: 'd1', platform: 'ios', token: 't1', active: true },
            { deviceId: 'd2', platform: 'android', token: 't2', active: false },
          ],
          stats: { totalSent: 100, totalDelivered: 95, totalRead: 80 },
        },
        {
          userId: new mongoose.Types.ObjectId(),
          enabled: false,
          devices: [{ deviceId: 'd3', platform: 'ios', token: 't3', active: true }],
          stats: { totalSent: 50, totalDelivered: 48, totalRead: 40 },
        },
      ]);
    });

    it('should get global statistics', async () => {
      const response = await request(app)
        .get('/api/notification-preferences/admin/stats')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalUsers).toBe(2);
      expect(response.body.data.enabledUsers).toBe(1);
      expect(response.body.data.totalDevices).toBe(3);
      expect(response.body.data.activeDevices).toBe(2);
      expect(response.body.data.totalNotificationsSent).toBe(150);
    });
  });

  describe('POST /api/notification-preferences/admin/cleanup', () => {
    it('should cleanup inactive devices', async () => {
      const response = await request(app)
        .post('/api/notification-preferences/admin/cleanup')
        .set('x-user-id', userId.toString())
        .send({ daysInactive: 90 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('modifiedCount');
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('NotificationPreferences Model Methods', () => {
    it('should check if in quiet hours', async () => {
      const prefs = await NotificationPreferences.create({
        userId,
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '08:00',
          daysOfWeek: [],
        },
      });

      const { isInQuietHours } = prefs;
      expect(typeof isInQuietHours).toBe('boolean');
    });

    it('should determine if notification should be sent', async () => {
      const prefs = await NotificationPreferences.create({
        userId,
        enabled: true,
        categories: {
          appointments: {
            enabled: true,
            channels: {
              push: true,
              email: true,
              sms: false,
            },
          },
        },
      });

      const shouldSend = prefs.shouldSendNotification('appointment_reminder', 'high', 'push');
      expect(shouldSend).toBe(true);

      const shouldNotSend = prefs.shouldSendNotification('appointment_reminder', 'high', 'sms');
      expect(shouldNotSend).toBe(false);
    });

    it('should get active tokens', async () => {
      const prefs = await NotificationPreferences.create({ userId });
      await prefs.registerDevice({
        deviceId: 'd1',
        platform: 'ios',
        token: 't1',
      });
      await prefs.registerDevice({
        deviceId: 'd2',
        platform: 'android',
        token: 't2',
      });
      await prefs.unregisterDevice('d2');

      const tokens = prefs.getActiveTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].platform).toBe('ios');
    });

    it('should get active tokens by platform', async () => {
      const prefs = await NotificationPreferences.create({ userId });
      await prefs.registerDevice({
        deviceId: 'd1',
        platform: 'ios',
        token: 't1',
      });
      await prefs.registerDevice({
        deviceId: 'd2',
        platform: 'android',
        token: 't2',
      });

      const iosTokens = prefs.getActiveTokens('ios');
      expect(iosTokens).toHaveLength(1);
      expect(iosTokens[0].platform).toBe('ios');
    });
  });
});
