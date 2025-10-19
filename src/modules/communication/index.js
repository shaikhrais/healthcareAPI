/**
 * Communication Module
 * Handles all communication features including push notifications
 * 
 * Features:
 * - Mobile push notifications (iOS, Android, Web)
 * - Device management and preferences
 * - Notification scheduling and analytics
 * - Multi-platform delivery with FCM, APNS, Web Push
 * - Rich media and action button support
 */

const express = require('express');
const mongoose = require('mongoose');

// Import module components
const pushNotificationsRoutes = require('./routes/pushNotificationsRoutes');
const PushNotification = require('./models/PushNotification');
const Device = require('./models/Device');
const pushNotificationService = require('./services/pushNotificationService');

/**
 * Initialize communication module
 */
const initializeCommunication = async () => {
  try {
    console.log('Initializing Communication module...');
    
    // Ensure database indexes are created
    await PushNotification.createIndexes();
    await Device.createIndexes();
    
    // Initialize push notification service
    await pushNotificationService.initialize();
    
    // Start scheduled notification processor
    setInterval(async () => {
      try {
        await pushNotificationService.processScheduledNotifications();
      } catch (error) {
        console.error('Scheduled notification processing error:', error);
      }
    }, 60000); // Check every minute
    
    // Start device cleanup (daily)
    setInterval(async () => {
      try {
        await Device.cleanupInactive(90); // Clean devices inactive for 90+ days
        console.log('Device cleanup completed');
      } catch (error) {
        console.error('Device cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
    
    console.log('Communication module initialized successfully');
    
    return {
      routes: pushNotificationsRoutes,
      models: { PushNotification, Device },
      services: { pushNotificationService },
    };
  } catch (error) {
    console.error('Failed to initialize Communication module:', error);
    throw error;
  }
};

/**
 * Communication module configuration
 */
const communicationConfig = {
  // Supported platforms
  supportedPlatforms: ['ios', 'android', 'web'],
  
  // Supported notification categories
  notificationCategories: [
    'appointment',
    'medication', 
    'health_alert',
    'test_result',
    'general',
    'emergency',
    'reminder',
    'marketing',
    'system'
  ],
  
  // Priority levels
  priorityLevels: ['low', 'normal', 'high', 'critical'],
  
  // Rate limiting
  rateLimits: {
    deviceRegister: 10, // per hour
    notificationSend: 100, // per hour
    bulkSend: 5, // per hour
    scheduleNotification: 50, // per hour
    test: 10, // per hour
  },
  
  // Push notification settings
  pushSettings: {
    batchSize: 500,
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    timeToLive: 86400, // 24 hours
    maxActionsPerNotification: 3,
    maxTitleLength: 100,
    maxMessageLength: 500,
  },
  
  // Cleanup settings
  cleanup: {
    inactiveDeviceDays: 90,
    oldNotificationDays: 365,
  },
};

/**
 * Get module health status
 */
const getModuleStatus = async () => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check push notification service status
    const pushStatus = pushNotificationService.getStatus();
    
    // Get recent activity stats
    const recentNotifications = await PushNotification.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24 hours
    });
    
    const activeDevices = await Device.countDocuments({
      isActive: true,
      lastActivity: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // last 7 days
    });
    
    return {
      status: 'healthy',
      database: dbStatus,
      pushService: pushStatus,
      recentNotifications,
      activeDevices,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
};

/**
 * Helper functions for other modules
 */
const communicationHelpers = {
  /**
   * Send appointment reminder notification
   */
  sendAppointmentReminder: async (userId, appointmentData) => {
    return await pushNotificationService.sendToUser(userId, {
      title: 'Appointment Reminder',
      message: `Your appointment with ${appointmentData.doctor} is scheduled for ${appointmentData.time}`,
      category: 'appointment',
      priority: 'high',
      data: {
        appointmentId: appointmentData.id,
        type: 'reminder'
      },
      actions: [
        {
          id: 'confirm',
          title: 'Confirm',
          action: 'custom',
          data: { action: 'confirm_appointment' }
        },
        {
          id: 'reschedule',
          title: 'Reschedule',
          action: 'open_url',
          url: `/appointments/${appointmentData.id}/reschedule`
        }
      ]
    });
  },

  /**
   * Send medication reminder notification
   */
  sendMedicationReminder: async (userId, medicationData) => {
    return await pushNotificationService.sendToUser(userId, {
      title: 'Medication Reminder',
      message: `Time to take your ${medicationData.name} (${medicationData.dosage})`,
      category: 'medication',
      priority: 'high',
      data: {
        medicationId: medicationData.id,
        type: 'reminder'
      },
      actions: [
        {
          id: 'taken',
          title: 'Mark as Taken',
          action: 'custom',
          data: { action: 'mark_medication_taken' }
        },
        {
          id: 'skip',
          title: 'Skip',
          action: 'custom',
          data: { action: 'skip_medication' }
        }
      ]
    });
  },

  /**
   * Send test result notification
   */
  sendTestResultNotification: async (userId, testData) => {
    return await pushNotificationService.sendToUser(userId, {
      title: 'Test Results Available',
      message: `Your ${testData.testName} results are now available`,
      category: 'test_result',
      priority: 'high',
      data: {
        testId: testData.id,
        type: 'result_available'
      },
      actions: [
        {
          id: 'view',
          title: 'View Results',
          action: 'open_url',
          url: `/test-results/${testData.id}`
        }
      ]
    });
  },

  /**
   * Send health alert notification
   */
  sendHealthAlert: async (userId, alertData) => {
    return await pushNotificationService.sendToUser(userId, {
      title: alertData.title || 'Health Alert',
      message: alertData.message,
      category: 'health_alert',
      priority: alertData.priority || 'high',
      data: {
        alertId: alertData.id,
        type: 'health_alert',
        severity: alertData.severity
      }
    });
  },

  /**
   * Send emergency notification
   */
  sendEmergencyNotification: async (userId, emergencyData) => {
    return await pushNotificationService.sendToUser(userId, {
      title: 'EMERGENCY ALERT',
      message: emergencyData.message,
      category: 'emergency',
      priority: 'critical',
      data: {
        emergencyId: emergencyData.id,
        type: 'emergency',
        location: emergencyData.location
      },
      settings: {
        sound: 'emergency',
        vibrate: true,
        lights: true,
        timeToLive: 3600 // 1 hour for emergency
      }
    });
  }
};

/**
 * Cleanup function for module shutdown
 */
const cleanup = async () => {
  try {
    console.log('Cleaning up Communication module...');
    
    // Clean up push notification service
    await pushNotificationService.cleanup();
    
    console.log('Communication module cleanup completed');
  } catch (error) {
    console.error('Error during Communication module cleanup:', error);
  }
};

module.exports = {
  initialize: initializeCommunication,
  routes: pushNotificationsRoutes,
  models: { PushNotification, Device },
  services: { pushNotificationService },
  helpers: communicationHelpers,
  config: communicationConfig,
  getStatus: getModuleStatus,
  cleanup,
};