const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const RichNotification = require('../models/RichNotification');
/* eslint-env jest */
/**
 * Rich Notifications API Tests
 * TASK-14.7 - Rich Notifications with Actions
 *
 * Comprehensive test suite for rich notification management
 */

// eslint-disable-next-line no-unused-vars
describe('Rich Notifications API', () => {
  let userId;
  let organizationId;
  let notificationId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
    userId = new mongoose.Types.ObjectId();
    organizationId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    // Clean up and close connection
    await RichNotification.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await RichNotification.deleteMany({});
  });

  // ============================================
  // NOTIFICATION CREATION TESTS
  // ============================================

  describe('POST /api/rich-notifications', () => {
    it('should create a basic rich notification', async () => {
      const notificationData = {
        userId,
        title: 'Appointment Reminder',
        body: 'Your appointment with Dr. Smith is tomorrow at 2:00 PM',
        type: 'appointment_reminder',
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/rich-notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send(notificationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(notificationData.title);
      expect(response.body.data.type).toBe('appointment_reminder');

      notificationId = response.body.data._id;
    });

    it('should create notification with actions', async () => {
      const notificationData = {
        userId,
        title: 'Check-in Ready',
        body: 'You can now check in for your appointment',
        type: 'check_in_ready',
        actions: [
          {
            id: 'checkin',
            title: 'Check In',
            type: 'navigate',
            navigation: {
              screen: 'CheckIn',
              params: { appointmentId: '123' },
            },
          },
          {
            id: 'dismiss',
            title: 'Later',
            type: 'dismiss',
          },
        ],
      };

      const response = await request(app)
        .post('/api/rich-notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send(notificationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.actions).toHaveLength(2);
      expect(response.body.data.actions[0].title).toBe('Check In');
    });

    it('should create notification with media', async () => {
      const notificationData = {
        userId,
        title: 'New Message',
        body: 'You have a new message from your provider',
        type: 'message',
        media: {
          type: 'image',
          url: 'https://example.com/image.jpg',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          alt: 'Message preview',
        },
      };

      const response = await request(app)
        .post('/api/rich-notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send(notificationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.media.type).toBe('image');
      expect(response.body.data.media.url).toBeDefined();
    });

    it('should create notification with progress indicator', async () => {
      const notificationData = {
        userId,
        title: 'Uploading Document',
        body: 'Please wait while we upload your document',
        type: 'system',
        progress: {
          enabled: true,
          current: 25,
          max: 100,
          label: 'Uploading...',
        },
      };

      const response = await request(app)
        .post('/api/rich-notifications')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send(notificationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.enabled).toBe(true);
      expect(response.body.data.progress.current).toBe(25);
    });
  });

  // ============================================
  // NOTIFICATION RETRIEVAL TESTS
  // ============================================

  describe('GET /api/rich-notifications', () => {
    beforeEach(async () => {
      await RichNotification.create([
        {
          userId,
          title: 'Notification 1',
          body: 'Body 1',
          type: 'appointment_reminder',
          priority: 'high',
        },
        {
          userId,
          title: 'Notification 2',
          body: 'Body 2',
          type: 'message',
          priority: 'normal',
          read: true,
        },
        {
          userId,
          title: 'Notification 3',
          body: 'Body 3',
          type: 'payment_due',
          priority: 'urgent',
          dismissed: true,
        },
      ]);
    });

    it('should get all notifications', async () => {
      const response = await request(app)
        .get('/api/rich-notifications')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.data).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/rich-notifications?type=message')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].type).toBe('message');
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/rich-notifications?priority=urgent')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].priority).toBe('urgent');
    });

    it('should filter by read status', async () => {
      const response = await request(app)
        .get('/api/rich-notifications?read=false')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((n) => !n.read)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/rich-notifications?limit=2&page=1')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.pages).toBe(2);
    });
  });

  describe('GET /api/rich-notifications/active', () => {
    beforeEach(async () => {
      await RichNotification.create([
        {
          userId,
          title: 'Active 1',
          body: 'Body',
          type: 'message',
          dismissed: false,
        },
        {
          userId,
          title: 'Active 2',
          body: 'Body',
          type: 'message',
          dismissed: false,
        },
        {
          userId,
          title: 'Dismissed',
          body: 'Body',
          type: 'message',
          dismissed: true,
        },
      ]);
    });

    it('should get only active notifications', async () => {
      const response = await request(app)
        .get('/api/rich-notifications/active')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data.every((n) => !n.dismissed)).toBe(true);
    });
  });

  describe('GET /api/rich-notifications/unread-count', () => {
    beforeEach(async () => {
      await RichNotification.create([
        { userId, title: 'N1', body: 'B', type: 'message', read: false },
        { userId, title: 'N2', body: 'B', type: 'message', read: false },
        { userId, title: 'N3', body: 'B', type: 'message', read: true },
      ]);
    });

    it('should get unread count', async () => {
      const response = await request(app)
        .get('/api/rich-notifications/unread-count')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('GET /api/rich-notifications/:id', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Test Notification',
        body: 'Test Body',
        type: 'message',
      });
      notificationId = notification._id.toString();
    });

    it('should get specific notification', async () => {
      const response = await request(app)
        .get(`/api/rich-notifications/${notificationId}`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(notificationId);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/rich-notifications/${fakeId}`)
        .set('x-user-id', userId.toString())
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // NOTIFICATION INTERACTION TESTS
  // ============================================

  describe('POST /api/rich-notifications/:id/read', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Unread',
        body: 'Body',
        type: 'message',
        read: false,
      });
      notificationId = notification._id.toString();
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/read`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.read).toBe(true);
      expect(response.body.data.readAt).toBeDefined();
    });
  });

  describe('POST /api/rich-notifications/mark-all-read', () => {
    beforeEach(async () => {
      await RichNotification.create([
        { userId, title: 'N1', body: 'B', type: 'message', read: false },
        { userId, title: 'N2', body: 'B', type: 'message', read: false },
      ]);
    });

    it('should mark all as read', async () => {
      const response = await request(app)
        .post('/api/rich-notifications/mark-all-read')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(2);
    });
  });

  describe('POST /api/rich-notifications/:id/dismiss', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Dismissible',
        body: 'Body',
        type: 'message',
      });
      notificationId = notification._id.toString();
    });

    it('should dismiss notification', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/dismiss`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dismissed).toBe(true);
      expect(response.body.data.dismissedAt).toBeDefined();
    });
  });

  describe('POST /api/rich-notifications/bulk-dismiss', () => {
    let ids;

    beforeEach(async () => {
      const n1 = await RichNotification.create({
        userId,
        title: 'N1',
        body: 'B',
        type: 'message',
      });
      const n2 = await RichNotification.create({
        userId,
        title: 'N2',
        body: 'B',
        type: 'message',
      });
      ids = [n1._id.toString(), n2._id.toString()];
    });

    it('should dismiss multiple notifications', async () => {
      const response = await request(app)
        .post('/api/rich-notifications/bulk-dismiss')
        .set('x-user-id', userId.toString())
        .send({ notificationIds: ids })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(2);
    });

    it('should fail without notificationIds array', async () => {
      const response = await request(app)
        .post('/api/rich-notifications/bulk-dismiss')
        .set('x-user-id', userId.toString())
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/rich-notifications/:id/snooze', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Snoozable',
        body: 'Body',
        type: 'message',
      });
      notificationId = notification._id.toString();
    });

    it('should snooze notification', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/snooze`)
        .set('x-user-id', userId.toString())
        .send({ durationMinutes: 30 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('snoozedUntil');
    });

    it('should use default snooze duration', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/snooze`)
        .set('x-user-id', userId.toString())
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('60 minutes');
    });
  });

  describe('POST /api/rich-notifications/:id/unsnooze', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Snoozed',
        body: 'Body',
        type: 'message',
        snoozed: true,
        snoozedUntil: new Date(Date.now() + 60 * 60 * 1000),
      });
      notificationId = notification._id.toString();
    });

    it('should unsnooze notification', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/unsnooze`)
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.snoozed).toBe(false);
    });
  });

  // ============================================
  // ACTION EXECUTION TESTS
  // ============================================

  describe('POST /api/rich-notifications/:id/actions/:actionId', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Quick Reply',
        body: 'Reply to this message',
        type: 'message',
        actions: [
          {
            id: 'reply',
            title: 'Reply',
            type: 'textInput',
            input: {
              placeholder: 'Type your reply...',
              multiline: true,
            },
          },
          {
            id: 'dismiss',
            title: 'Dismiss',
            type: 'dismiss',
          },
        ],
      });
      notificationId = notification._id.toString();
    });

    it('should execute action with text input', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/actions/reply`)
        .set('x-user-id', userId.toString())
        .send({
          responseType: 'text_input',
          responseData: { text: 'Thank you!' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.actionResponses).toHaveLength(1);
      expect(response.body.data.notification.actionResponses[0].responseData.text).toBe(
        'Thank you!'
      );
    });

    it('should auto-dismiss if configured', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/actions/dismiss`)
        .set('x-user-id', userId.toString())
        .send({ responseType: 'clicked' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.dismissed).toBe(true);
    });

    it('should fail with invalid action ID', async () => {
      const response = await request(app)
        .post(`/api/rich-notifications/${notificationId}/actions/invalid`)
        .set('x-user-id', userId.toString())
        .send({ responseType: 'clicked' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // PROGRESS UPDATE TESTS
  // ============================================

  describe('PUT /api/rich-notifications/:id/progress', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Upload Progress',
        body: 'Uploading...',
        type: 'system',
        progress: {
          enabled: true,
          current: 0,
          max: 100,
        },
      });
      notificationId = notification._id.toString();
    });

    it('should update progress', async () => {
      const response = await request(app)
        .put(`/api/rich-notifications/${notificationId}/progress`)
        .set('x-user-id', userId.toString())
        .send({ current: 50 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.current).toBe(50);
    });

    it('should fail without current value', async () => {
      const response = await request(app)
        .put(`/api/rich-notifications/${notificationId}/progress`)
        .set('x-user-id', userId.toString())
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // GROUPING TESTS
  // ============================================

  describe('GET /api/rich-notifications/group/:groupId', () => {
    beforeEach(async () => {
      await RichNotification.create([
        {
          userId,
          title: 'Message 1',
          body: 'Body',
          type: 'message',
          group: { id: 'group1', sortOrder: 1 },
        },
        {
          userId,
          title: 'Message 2',
          body: 'Body',
          type: 'message',
          group: { id: 'group1', sortOrder: 2 },
        },
        {
          userId,
          title: 'Message 3',
          body: 'Body',
          type: 'message',
          group: { id: 'group2', sortOrder: 1 },
        },
      ]);
    });

    it('should get notifications by group', async () => {
      const response = await request(app)
        .get('/api/rich-notifications/group/group1')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data.every((n) => n.group.id === 'group1')).toBe(true);
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('GET /api/rich-notifications/analytics/summary', () => {
    beforeEach(async () => {
      await RichNotification.create([
        {
          userId,
          title: 'N1',
          body: 'B',
          type: 'message',
          read: true,
          sentAt: new Date(),
          analytics: {
            impressions: 1,
            clicks: 1,
          },
        },
        {
          userId,
          title: 'N2',
          body: 'B',
          type: 'message',
          read: false,
          sentAt: new Date(),
          analytics: {
            impressions: 1,
            clicks: 0,
          },
        },
      ]);
    });

    it('should get analytics summary', async () => {
      const response = await request(app)
        .get('/api/rich-notifications/analytics/summary')
        .set('x-user-id', userId.toString())
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('sent');
      expect(response.body.data).toHaveProperty('read');
      expect(response.body.data).toHaveProperty('readRate');
      expect(response.body.data).toHaveProperty('clickRate');
    });
  });

  // ============================================
  // DELIVERY STATUS TESTS
  // ============================================

  describe('PUT /api/rich-notifications/:id/delivery-status', () => {
    beforeEach(async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Test',
        body: 'Body',
        type: 'message',
        channels: ['push', 'email'],
      });
      notificationId = notification._id.toString();
    });

    it('should update delivery status', async () => {
      const response = await request(app)
        .put(`/api/rich-notifications/${notificationId}/delivery-status`)
        .set('x-user-id', userId.toString())
        .send({
          channel: 'push',
          status: 'delivered',
          metadata: { messageId: 'fcm-123' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.push.status).toBe('delivered');
      expect(response.body.data.push.messageId).toBe('fcm-123');
    });

    it('should fail without required fields', async () => {
      const response = await request(app)
        .put(`/api/rich-notifications/${notificationId}/delivery-status`)
        .set('x-user-id', userId.toString())
        .send({ channel: 'push' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('RichNotification Model Methods', () => {
    it('should check if notification has actions', async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Test',
        body: 'Body',
        type: 'message',
        actions: [{ id: 'a1', title: 'Action', type: 'default' }],
      });

      expect(notification.hasActions).toBe(true);
    });

    it('should check if notification has media', async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Test',
        body: 'Body',
        type: 'message',
        media: {
          type: 'image',
          url: 'http://example.com/image.jpg',
        },
      });

      expect(notification.hasMedia).toBe(true);
    });

    it('should determine if notification should be sent', async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Test',
        body: 'Body',
        type: 'message',
        dismissed: false,
        snoozed: false,
      });

      expect(notification.shouldSend).toBe(true);
    });

    it('should not send if dismissed', async () => {
      const notification = await RichNotification.create({
        userId,
        title: 'Test',
        body: 'Body',
        type: 'message',
        dismissed: true,
      });

      expect(notification.shouldSend).toBe(false);
    });
  });
});
