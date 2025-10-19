
const Notification = require('../models/Notification');
const User = require('../models/User');
const Patient = require('../models/Patient');
// This service will integrate with push notification providers
// For now, implementing the core structure with database storage
// TODO: Integrate with Firebase Cloud Messaging (FCM) or OneSignal

class NotificationService {
  /**
   * Send a notification to a user
   */
  async sendNotification(userId, notificationData) {
    try {
      const notification = await Notification.create({
        userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        priority: notificationData.priority || 'normal',
        data: notificationData.data || {},
        channels: notificationData.channels || ['in_app'],
      });

      // Send via enabled channels
      if (notificationData.channels?.includes('push')) {
        await this.sendPushNotification(userId, notification);
      }

      if (notificationData.channels?.includes('email')) {
        await this.sendEmailNotification(userId, notification);
      }

      if (notificationData.channels?.includes('sms')) {
        await this.sendSMSNotification(userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Notification error:', error);
      throw error;
    }
  }

  /**
   * Send push notification via FCM/OneSignal
   */
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.pushToken) {
        console.log(`No push token for user ${userId}`);
        return;
      }

      // TODO: Integrate with FCM or OneSignal
      // For now, just log
      console.log(`[PUSH] To: ${user.email}, Title: ${notification.title}`);

      // Example FCM implementation (when integrated):
      /*
      const admin = require('firebase-admin');

      const message = {
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: notification.data,
        token: user.pushToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent push notification:', response);
      */

      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.push': 'sent', sentAt: new Date() },
      });
    } catch (error) {
      console.error('Push notification error:', error);
      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.push': 'failed' },
      });
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, notification) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.email) {
        console.log(`No email for user ${userId}`);
        return;
      }

      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log(`[EMAIL] To: ${user.email}, Subject: ${notification.title}`);

      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.email': 'sent' },
      });
    } catch (error) {
      console.error('Email notification error:', error);
      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.email': 'failed' },
      });
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, notification) {
    try {
      const user = await User.findById(userId);

      if (!user || !user.phoneNumber) {
        console.log(`No phone number for user ${userId}`);
        return;
      }

      // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`[SMS] To: ${user.phoneNumber}, Message: ${notification.message}`);

      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.sms': 'sent' },
      });
    } catch (error) {
      console.error('SMS notification error:', error);
      await Notification.findByIdAndUpdate(notification._id, {
        $set: { 'deliveryStatus.sms': 'failed' },
      });
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(appointmentId, appointment) {
    try {
      const patient = await Patient.findById(appointment.patientId);
      const practitioner = await User.findById(appointment.practitionerId);

      const appointmentDate = new Date(appointment.date);
      const formattedDate = appointmentDate.toLocaleDateString();
      const formattedTime = appointment.time;

      // Send to patient if they have a user account
      if (patient.userId) {
        await this.sendNotification(patient.userId, {
          title: 'Appointment Reminder',
          message: `You have an appointment with Dr. ${practitioner.lastName} on ${formattedDate} at ${formattedTime}`,
          type: 'appointment_reminder',
          priority: 'high',
          data: {
            appointmentId: appointmentId.toString(),
            practitionerId: appointment.practitionerId.toString(),
            date: appointment.date,
            time: appointment.time,
          },
          channels: ['push', 'email', 'sms'],
        });
      }

      return true;
    } catch (error) {
      console.error('Appointment reminder error:', error);
      throw error;
    }
  }

  /**
   * Send check-in notification to practitioner
   */
  async sendCheckInNotification(practitionerId, patient, checkIn) {
    try {
      await this.sendNotification(practitionerId, {
        title: 'Patient Checked In',
        message: `${patient.firstName} ${patient.lastName} has checked in and is waiting`,
        type: 'check_in',
        priority: 'normal',
        data: {
          checkInId: checkIn._id.toString(),
          patientId: patient._id.toString(),
          estimatedWaitTime: checkIn.estimatedWaitTime,
        },
        channels: ['push', 'in_app'],
      });
    } catch (error) {
      console.error('Check-in notification error:', error);
    }
  }

  /**
   * Send room ready notification to patient
   */
  async sendRoomReadyNotification(patientUserId, roomNumber) {
    try {
      if (!patientUserId) return;

      await this.sendNotification(patientUserId, {
        title: 'Room Ready',
        message: `Please proceed to Room ${roomNumber}`,
        type: 'room_ready',
        priority: 'high',
        data: { roomNumber },
        channels: ['push', 'in_app'],
      });
    } catch (error) {
      console.error('Room ready notification error:', error);
    }
  }

  /**
   * Send patient ready notification to practitioner
   */
  async sendPatientReadyNotification(practitionerId, patient, roomNumber) {
    try {
      await this.sendNotification(practitionerId, {
        title: 'Patient Ready',
        message: `${patient.firstName} ${patient.lastName} is ready in Room ${roomNumber}`,
        type: 'patient_ready',
        priority: 'high',
        data: {
          patientId: patient._id.toString(),
          roomNumber,
        },
        channels: ['push', 'in_app'],
      });
    } catch (error) {
      console.error('Patient ready notification error:', error);
    }
  }

  /**
   * Send concerning vitals alert
   */
  async sendConcerningVitalsAlert(practitionerId, patient, vitals) {
    try {
      await this.sendNotification(practitionerId, {
        title: 'Alert: Concerning Vitals',
        message: `${patient.firstName} ${patient.lastName} has concerning vital signs`,
        type: 'vitals_alert',
        priority: 'urgent',
        data: {
          patientId: patient._id.toString(),
          vitals,
        },
        channels: ['push', 'in_app', 'sms'],
      });
    } catch (error) {
      console.error('Vitals alert error:', error);
    }
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignedNotification(userId, task) {
    try {
      await this.sendNotification(userId, {
        title: 'New Task Assigned',
        message: task.title,
        type: 'task_assigned',
        priority: task.priority || 'normal',
        data: {
          taskId: task._id.toString(),
          dueDate: task.dueDate,
        },
        channels: ['push', 'in_app'],
      });
    } catch (error) {
      console.error('Task notification error:', error);
    }
  }

  /**
   * Send task due soon reminder
   */
  async sendTaskDueReminderNotification(userId, task) {
    try {
      await this.sendNotification(userId, {
        title: 'Task Due Soon',
        message: `"${task.title}" is due soon`,
        type: 'task_reminder',
        priority: 'high',
        data: {
          taskId: task._id.toString(),
          dueDate: task.dueDate,
        },
        channels: ['push', 'in_app'],
      });
    } catch (error) {
      console.error('Task reminder error:', error);
    }
  }

  /**
   * Send schedule change notification
   */
  async sendScheduleChangeNotification(userId, appointment, changeType) {
    try {
      const messages = {
        updated: 'Your appointment has been updated',
        cancelled: 'Your appointment has been cancelled',
        rescheduled: 'Your appointment has been rescheduled',
      };

      await this.sendNotification(userId, {
        title: 'Schedule Change',
        message: messages[changeType] || 'Your appointment has changed',
        type: 'schedule_change',
        priority: 'high',
        data: {
          appointmentId: appointment._id.toString(),
          changeType,
          date: appointment.date,
          time: appointment.time,
        },
        channels: ['push', 'email', 'sms'],
      });
    } catch (error) {
      console.error('Schedule change notification error:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { $set: { read: true, readAt: new Date() } },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true, readAt: new Date() } }
      );

      return true;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        read: false,
      });

      return count;
    } catch (error) {
      console.error('Unread count error:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type = null } = options;

      const query = { userId };

      if (unreadOnly) {
        query.read = false;
      }

      if (type) {
        query.type = type;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.setDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true,
      });

      console.log(`Deleted ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Schedule appointment reminders
   * This should be run by a cron job
   */
  async sendScheduledReminders() {
    try {
      const Appointment = require('../models/Appointment');

      // Find appointments in next 24 hours that haven't been reminded
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointments = await Appointment.find({
        date: {
          $gte: new Date(),
          $lte: tomorrow,
        },
        status: { $in: ['scheduled', 'confirmed'] },
        reminderSent: { $ne: true },
      })
        .populate('patientId')
        .populate('practitionerId');

      for (const appointment of appointments) {
        await this.sendAppointmentReminder(appointment._id, appointment);

        // Mark as reminded
        await Appointment.findByIdAndUpdate(appointment._id, {
          reminderSent: true,
        });
      }

      console.log(`Sent ${appointments.length} appointment reminders`);
      return appointments.length;
    } catch (error) {
      console.error('Scheduled reminders error:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
