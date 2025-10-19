/**
 * Push Notification Service
 * Handles sending push notifications across multiple platforms
 */

const admin = require('firebase-admin');
const webpush = require('web-push');
const PushNotification = require('../models/PushNotification');
const Device = require('../models/Device');

class PushNotificationService {
  constructor() {
    this.fcm = null;
    this.webpushInitialized = false;
    this.apnsInitialized = false;
    
    this.initialize();
  }

  /**
   * Initialize push notification services
   */
  async initialize() {
    try {
      // Initialize Firebase Admin SDK for FCM
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          
          // Validate required Firebase service account fields
          if (serviceAccount.private_key && serviceAccount.client_email && serviceAccount.project_id) {
            if (!admin.apps.length) {
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
              });
            }
            
            this.fcm = admin.messaging();
            console.log('✅ Firebase Cloud Messaging initialized');
          } else {
            console.log('⚠️ Firebase service account missing required fields - FCM disabled in development');
          }
        } catch (firebaseError) {
          console.log('⚠️ Firebase configuration invalid - FCM disabled in development:', firebaseError.message);
        }
      } else {
        console.log('⚠️ FIREBASE_SERVICE_ACCOUNT not configured - FCM disabled in development');
      }

      // Initialize Web Push
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:support@healthcare.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        this.webpushInitialized = true;
        console.log('✅ Web Push initialized');
      }

      console.log('✅ Push Notification Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Push Notification Service:', error);
    }
  }

  /**
   * Send push notification to a user
   */
  async sendToUser(userId, notificationData) {
    try {
      const {
        title,
        message,
        category = 'general',
        priority = 'normal',
        data = {},
        actions = [],
        media = null,
        scheduledFor = null,
        settings = {}
      } = notificationData;

      // Get eligible devices for this notification
      const devices = await Device.getEligibleForNotification(userId, category, priority);
      
      if (devices.length === 0) {
        console.log(`No eligible devices found for user ${userId}`);
        return { success: false, message: 'No eligible devices' };
      }

      // Create notification record
      const notification = new PushNotification({
        user: userId,
        title,
        message,
        category,
        priority,
        data: new Map(Object.entries(data)),
        actions,
        media,
        scheduledFor,
        settings: {
          badge: 1,
          sound: 'default',
          vibrate: true,
          lights: true,
          timeToLive: 86400,
          ...settings
        },
        devices: devices.map(device => ({
          deviceId: device.deviceId,
          platform: device.platform,
          pushToken: device.getActivePushToken(this.getProviderForPlatform(device.platform)),
          status: 'pending'
        })).filter(d => d.pushToken), // Only include devices with valid tokens
        status: scheduledFor ? 'pending' : 'pending'
      });

      await notification.save();

      // If scheduled for later, don't send now
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        return {
          success: true,
          notificationId: notification._id,
          message: 'Notification scheduled',
          deviceCount: notification.devices.length
        };
      }

      // Send immediately
      const results = await this.deliverNotification(notification);
      
      return {
        success: true,
        notificationId: notification._id,
        results,
        deviceCount: notification.devices.length
      };
    } catch (error) {
      console.error('Send to user error:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds, notificationData) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendToUser(userId, notificationData);
        results.push({ userId, ...result });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Send notification to specific devices
   */
  async sendToDevices(deviceIds, notificationData) {
    try {
      const devices = await Device.find({
        deviceId: { $in: deviceIds },
        isActive: true
      });

      if (devices.length === 0) {
        return { success: false, message: 'No active devices found' };
      }

      const {
        title,
        message,
        category = 'general',
        priority = 'normal',
        data = {},
        actions = [],
        media = null,
        settings = {}
      } = notificationData;

      // Create notification record
      const notification = new PushNotification({
        user: devices[0].user, // Use first device's user
        title,
        message,
        category,
        priority,
        data: new Map(Object.entries(data)),
        actions,
        media,
        settings: {
          badge: 1,
          sound: 'default',
          vibrate: true,
          lights: true,
          timeToLive: 86400,
          ...settings
        },
        devices: devices.map(device => ({
          deviceId: device.deviceId,
          platform: device.platform,
          pushToken: device.getActivePushToken(this.getProviderForPlatform(device.platform)),
          status: 'pending'
        })).filter(d => d.pushToken),
        status: 'pending'
      });

      await notification.save();

      const results = await this.deliverNotification(notification);
      
      return {
        success: true,
        notificationId: notification._id,
        results
      };
    } catch (error) {
      console.error('Send to devices error:', error);
      throw error;
    }
  }

  /**
   * Deliver notification to all target devices
   */
  async deliverNotification(notification) {
    const results = [];
    
    for (const deviceInfo of notification.devices) {
      try {
        let result;
        
        switch (deviceInfo.platform) {
          case 'android':
            result = await this.sendFCM(deviceInfo, notification);
            break;
          case 'ios':
            result = await this.sendAPNS(deviceInfo, notification);
            break;
          case 'web':
            result = await this.sendWebPush(deviceInfo, notification);
            break;
          default:
            result = { success: false, error: 'Unsupported platform' };
        }
        
        // Update device status
        await notification.addDeliveryResult(
          deviceInfo.deviceId,
          result.success ? 'delivered' : 'failed',
          result.error
        );
        
        // Update device stats
        const device = await Device.findOne({ deviceId: deviceInfo.deviceId });
        if (device) {
          await device.recordNotificationInteraction('received');
        }
        
        results.push({
          deviceId: deviceInfo.deviceId,
          platform: deviceInfo.platform,
          ...result
        });
      } catch (error) {
        console.error(`Delivery error for device ${deviceInfo.deviceId}:`, error);
        
        await notification.addDeliveryResult(
          deviceInfo.deviceId,
          'failed',
          error.message
        );
        
        results.push({
          deviceId: deviceInfo.deviceId,
          platform: deviceInfo.platform,
          success: false,
          error: error.message
        });
      }
    }
    
    // Update notification status
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
    
    return results;
  }

  /**
   * Send FCM notification (Android)
   */
  async sendFCM(deviceInfo, notification) {
    if (!this.fcm) {
      throw new Error('FCM not initialized');
    }

    const message = {
      token: deviceInfo.pushToken,
      notification: {
        title: notification.title,
        body: notification.message
      },
      data: Object.fromEntries(notification.data),
      android: {
        priority: this.mapPriorityToFCM(notification.priority),
        notification: {
          sound: notification.settings.sound,
          vibrate_timings: notification.settings.vibrate ? ['1000ms', '500ms'] : [],
          visibility: notification.priority === 'critical' ? 'public' : 'private',
          notification_count: notification.settings.badge
        },
        ttl: notification.settings.timeToLive * 1000
      }
    };

    if (notification.media && notification.media.url) {
      message.android.notification.image = notification.media.url;
    }

    if (notification.actions && notification.actions.length > 0) {
      message.android.notification.click_action = 'FLUTTER_NOTIFICATION_CLICK';
    }

    try {
      const response = await this.fcm.send(message);
      return { success: true, messageId: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send APNS notification (iOS)
   */
  async sendAPNS(deviceInfo, notification) {
    if (!this.fcm) {
      throw new Error('FCM not initialized (using FCM for iOS too)');
    }

    const message = {
      token: deviceInfo.pushToken,
      notification: {
        title: notification.title,
        body: notification.message
      },
      data: Object.fromEntries(notification.data),
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.message
            },
            badge: notification.settings.badge,
            sound: notification.settings.sound,
            'content-available': 1
          }
        },
        headers: {
          'apns-priority': notification.priority === 'critical' ? '10' : '5',
          'apns-expiration': Math.floor(Date.now() / 1000) + notification.settings.timeToLive
        }
      }
    };

    if (notification.media && notification.media.url) {
      message.apns.payload.aps['mutable-content'] = 1;
      message.data.image_url = notification.media.url;
    }

    if (notification.actions && notification.actions.length > 0) {
      message.apns.payload.aps.category = 'ACTION_CATEGORY';
    }

    try {
      const response = await this.fcm.send(message);
      return { success: true, messageId: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Web Push notification
   */
  async sendWebPush(deviceInfo, notification) {
    if (!this.webpushInitialized) {
      throw new Error('Web Push not initialized');
    }

    const payload = {
      title: notification.title,
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: Object.fromEntries(notification.data),
      actions: notification.actions.map(action => ({
        action: action.id,
        title: action.title,
        icon: action.icon
      })),
      timestamp: Date.now(),
      requireInteraction: notification.priority === 'critical',
      silent: notification.priority === 'low'
    };

    if (notification.media && notification.media.url) {
      payload.image = notification.media.url;
    }

    try {
      const response = await webpush.sendNotification(
        deviceInfo.pushToken,
        JSON.stringify(payload),
        {
          TTL: notification.settings.timeToLive,
          urgency: this.mapPriorityToWebPush(notification.priority)
        }
      );
      
      return { success: true, response: response.statusCode };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications() {
    try {
      const pendingNotifications = await PushNotification.getPendingForDelivery();
      
      for (const notification of pendingNotifications) {
        try {
          await this.deliverNotification(notification);
          console.log(`Delivered scheduled notification ${notification._id}`);
        } catch (error) {
          console.error(`Failed to deliver scheduled notification ${notification._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Process scheduled notifications error:', error);
    }
  }

  /**
   * Send bulk notifications with batching
   */
  async sendBulk(notifications) {
    const batchSize = 500;
    const results = [];
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (notif) => {
        try {
          if (notif.userIds) {
            return await this.sendToUsers(notif.userIds, notif.data);
          } else if (notif.deviceIds) {
            return await this.sendToDevices(notif.deviceIds, notif.data);
          } else {
            throw new Error('Either userIds or deviceIds must be specified');
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Get notification statistics
   */
  async getStatistics(userId, days = 30) {
    const analytics = await PushNotification.getAnalytics(userId, days);
    
    const summary = {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalClicked: 0,
      deliveryRate: 0,
      readRate: 0,
      clickRate: 0,
      categories: {}
    };
    
    analytics.forEach(stat => {
      summary.totalSent += stat.total;
      summary.totalDelivered += stat.delivered;
      summary.totalRead += stat.read;
      summary.totalClicked += stat.clicked;
      
      summary.categories[stat._id] = {
        total: stat.total,
        sent: stat.sent,
        delivered: stat.delivered,
        read: stat.read,
        clicked: stat.clicked,
        deliveryRate: stat.sent > 0 ? (stat.delivered / stat.sent * 100).toFixed(2) : 0,
        readRate: stat.delivered > 0 ? (stat.read / stat.delivered * 100).toFixed(2) : 0,
        clickRate: stat.read > 0 ? (stat.clicked / stat.read * 100).toFixed(2) : 0
      };
    });
    
    if (summary.totalSent > 0) {
      summary.deliveryRate = (summary.totalDelivered / summary.totalSent * 100).toFixed(2);
    }
    
    if (summary.totalDelivered > 0) {
      summary.readRate = (summary.totalRead / summary.totalDelivered * 100).toFixed(2);
    }
    
    if (summary.totalRead > 0) {
      summary.clickRate = (summary.totalClicked / summary.totalRead * 100).toFixed(2);
    }
    
    return summary;
  }

  /**
   * Helper methods
   */
  getProviderForPlatform(platform) {
    switch (platform) {
      case 'android': return 'fcm';
      case 'ios': return 'fcm'; // Using FCM for both platforms
      case 'web': return 'web_push';
      default: return null;
    }
  }

  mapPriorityToFCM(priority) {
    switch (priority) {
      case 'critical': return 'high';
      case 'high': return 'high';
      case 'normal': return 'normal';
      case 'low': return 'normal';
      default: return 'normal';
    }
  }

  mapPriorityToWebPush(priority) {
    switch (priority) {
      case 'critical': return 'high';
      case 'high': return 'high';
      case 'normal': return 'normal';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    console.log('Push Notification Service cleanup completed');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      fcm: !!this.fcm,
      webpush: this.webpushInitialized,
      apns: this.apnsInitialized
    };
  }
}

module.exports = new PushNotificationService();