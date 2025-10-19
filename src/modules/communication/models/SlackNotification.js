const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const slackNotificationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    workspace: {
      teamId: {
        type: String,
        required: true,
      },
      teamName: {
        type: String,
        required: true,
      },
      botToken: {
        type: String,
        required: true,
      },
      botUserId: {
        type: String,
      },
      appId: {
        type: String,
      },
      scopes: [
        {
          type: String,
        },
      ],
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'unauthorized'],
      default: 'connected',
      index: true,
    },
    channels: [
      {
        channelId: {
          type: String,
          required: true,
        },
        channelName: {
          type: String,
          required: true,
        },
        isPrivate: {
          type: Boolean,
          default: false,
        },
        purpose: {
          type: String,
        },
        memberCount: {
          type: Number,
          default: 0,
        },
        notifications: {
          appointmentReminders: { type: Boolean, default: false },
          appointmentCancellations: { type: Boolean, default: false },
          newPatients: { type: Boolean, default: false },
          taskAssignments: { type: Boolean, default: false },
          taskCompletions: { type: Boolean, default: false },
          paymentReceived: { type: Boolean, default: false },
          systemAlerts: { type: Boolean, default: false },
          emergencies: { type: Boolean, default: false },
        },
      },
    ],
    users: [
      {
        slackUserId: {
          type: String,
          required: true,
        },
        slackUsername: {
          type: String,
        },
        realName: {
          type: String,
        },
        email: {
          type: String,
        },
        expoJaneUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        isBot: {
          type: Boolean,
          default: false,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        notifications: {
          enabled: { type: Boolean, default: true },
          appointmentReminders: { type: Boolean, default: true },
          taskAssignments: { type: Boolean, default: true },
          mentions: { type: Boolean, default: true },
        },
      },
    ],
    messages: [
      {
        messageId: {
          type: String,
          required: true,
          unique: true,
        },
        channelId: {
          type: String,
          required: true,
        },
        channelName: {
          type: String,
        },
        text: {
          type: String,
          required: true,
        },
        blocks: {
          type: mongoose.Schema.Types.Mixed,
          default: [],
        },
        attachments: [
          {
            type: mongoose.Schema.Types.Mixed,
          },
        ],
        messageType: {
          type: String,
          enum: [
            'appointment_reminder',
            'appointment_created',
            'appointment_cancelled',
            'new_patient',
            'task_assigned',
            'task_completed',
            'payment_received',
            'system_alert',
            'emergency',
            'custom',
          ],
          default: 'custom',
        },
        sentBy: {
          type: String,
          enum: ['bot', 'user'],
          default: 'bot',
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        threadTs: {
          type: String,
        },
        reactions: [
          {
            emoji: String,
            count: Number,
            users: [String],
          },
        ],
        metadata: {
          appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
          patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
          taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
          paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
        },
        deliveryStatus: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'deleted'],
          default: 'pending',
        },
        errorMessage: {
          type: String,
        },
      },
    ],
    slashCommands: [
      {
        command: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        allowedChannels: [
          {
            type: String,
          },
        ],
        allowedUsers: [
          {
            type: String,
          },
        ],
        usageCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    interactiveActions: [
      {
        actionId: {
          type: String,
          required: true,
        },
        actionType: {
          type: String,
          enum: ['button', 'select', 'datepicker', 'timepicker', 'overflow'],
          required: true,
        },
        label: {
          type: String,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        triggerCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    webhooks: [
      {
        webhookId: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        events: [
          {
            type: String,
          },
        ],
        enabled: {
          type: Boolean,
          default: true,
        },
        triggeredCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    notificationRules: [
      {
        ruleId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        eventType: {
          type: String,
          enum: [
            'appointment.created',
            'appointment.updated',
            'appointment.cancelled',
            'patient.created',
            'task.assigned',
            'task.completed',
            'payment.received',
            'system.alert',
            'emergency.alert',
          ],
          required: true,
        },
        channelId: {
          type: String,
          required: true,
        },
        conditions: [
          {
            field: String,
            operator: String,
            value: mongoose.Schema.Types.Mixed,
          },
        ],
        messageTemplate: {
          type: String,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        priority: {
          type: String,
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal',
        },
        triggerCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    stats: {
      totalMessagesSent: {
        type: Number,
        default: 0,
      },
      totalMessagesReceived: {
        type: Number,
        default: 0,
      },
      totalCommandsExecuted: {
        type: Number,
        default: 0,
      },
      totalInteractions: {
        type: Number,
        default: 0,
      },
      totalNotificationsSent: {
        type: Number,
        default: 0,
      },
      failedMessages: {
        type: Number,
        default: 0,
      },
    },
    rateLimits: {
      messagesPerMinute: {
        type: Number,
        default: 60,
      },
      messagesPerHour: {
        type: Number,
        default: 3600,
      },
      currentMinuteCount: {
        type: Number,
        default: 0,
      },
      currentHourCount: {
        type: Number,
        default: 0,
      },
      lastResetMinute: {
        type: Date,
        default: Date.now,
      },
      lastResetHour: {
        type: Date,
        default: Date.now,
      },
    },
    lastSyncedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disconnectedAt: {
      type: Date,
    },
    disconnectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disconnectReason: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
// DUPLICATE INDEX - Auto-commented by deduplication tool
// slackNotificationSchema.index({ organization: 1, status: 1 });
slackNotificationSchema.index({ 'workspace.teamId': 1 });
slackNotificationSchema.index({ 'messages.messageId': 1 });
slackNotificationSchema.index({ 'messages.channelId': 1 });
slackNotificationSchema.index({ 'messages.sentAt': -1 });

// Virtual: Is Connected
slackNotificationSchema.virtual('isConnected').get(function () {
  return this.status === 'connected';
});

// Virtual: Average Messages Per Day
slackNotificationSchema.virtual('avgMessagesPerDay').get(function () {
  if (!this.createdAt) return 0;
  const daysSinceCreation = Math.max(
    1,
    Math.ceil((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  return Math.round(this.stats.totalMessagesSent / daysSinceCreation);
});

// Virtual: Success Rate
slackNotificationSchema.virtual('messageSuccessRate').get(function () {
  if (this.stats.totalMessagesSent === 0) return 100;
  const successfulMessages = this.stats.totalMessagesSent - this.stats.failedMessages;
  return ((successfulMessages / this.stats.totalMessagesSent) * 100).toFixed(2);
});

// Instance method: Send Message
slackNotificationSchema.methods.sendMessage = async function (messageData) {
  const message = {
    messageId:
      messageData.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    channelId: messageData.channelId,
    channelName: messageData.channelName,
    text: messageData.text,
    blocks: messageData.blocks || [],
    attachments: messageData.attachments || [],
    messageType: messageData.messageType || 'custom',
    sentBy: messageData.sentBy || 'bot',
    threadTs: messageData.threadTs,
    metadata: messageData.metadata || {},
    deliveryStatus: 'sent',
    sentAt: new Date(),
  };

  this.messages.push(message);
  this.stats.totalMessagesSent += 1;

  // Check rate limits
  this.checkAndUpdateRateLimits();

  return this.save();
};

// Instance method: Add Channel
slackNotificationSchema.methods.addChannel = function (channelData) {
  const existingIndex = this.channels.findIndex((c) => c.channelId === channelData.channelId);

  if (existingIndex !== -1) {
    // Update existing channel
    this.channels[existingIndex] = {
      ...this.channels[existingIndex].toObject(),
      ...channelData,
    };
  } else {
    // Add new channel
    this.channels.push({
      channelId: channelData.channelId,
      channelName: channelData.channelName,
      isPrivate: channelData.isPrivate || false,
      purpose: channelData.purpose,
      memberCount: channelData.memberCount || 0,
      notifications: channelData.notifications || {},
    });
  }

  return this.save();
};

// Instance method: Add User
slackNotificationSchema.methods.addUser = function (userData) {
  const existingIndex = this.users.findIndex((u) => u.slackUserId === userData.slackUserId);

  if (existingIndex !== -1) {
    // Update existing user
    this.users[existingIndex] = {
      ...this.users[existingIndex].toObject(),
      ...userData,
    };
  } else {
    // Add new user
    this.users.push({
      slackUserId: userData.slackUserId,
      slackUsername: userData.slackUsername,
      realName: userData.realName,
      email: userData.email,
      expoJaneUserId: userData.expoJaneUserId,
      isBot: userData.isBot || false,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      notifications: userData.notifications || {},
    });
  }

  return this.save();
};

// Instance method: Add Notification Rule
slackNotificationSchema.methods.addNotificationRule = function (ruleData) {
  const existingIndex = this.notificationRules.findIndex((r) => r.ruleId === ruleData.ruleId);

  if (existingIndex !== -1) {
    throw new Error('Notification rule already exists');
  }

  this.notificationRules.push({
    ruleId: ruleData.ruleId,
    name: ruleData.name,
    eventType: ruleData.eventType,
    channelId: ruleData.channelId,
    conditions: ruleData.conditions || [],
    messageTemplate: ruleData.messageTemplate,
    enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
    priority: ruleData.priority || 'normal',
    triggerCount: 0,
  });

  return this.save();
};

// Instance method: Update Notification Rule
slackNotificationSchema.methods.updateNotificationRule = function (ruleId, updates) {
  const rule = this.notificationRules.find((r) => r.ruleId === ruleId);

  if (!rule) {
    throw new Error('Notification rule not found');
  }

  Object.assign(rule, updates);
  return this.save();
};

// Instance method: Delete Notification Rule
slackNotificationSchema.methods.deleteNotificationRule = function (ruleId) {
  this.notificationRules = this.notificationRules.filter((r) => r.ruleId !== ruleId);
  return this.save();
};

// Instance method: Increment Rule Trigger Count
slackNotificationSchema.methods.incrementRuleTrigger = function (ruleId) {
  const rule = this.notificationRules.find((r) => r.ruleId === ruleId);

  if (rule) {
    rule.triggerCount += 1;
    this.stats.totalNotificationsSent += 1;
  }

  return this.save();
};

// Instance method: Add Slash Command
slackNotificationSchema.methods.addSlashCommand = function (commandData) {
  const existingIndex = this.slashCommands.findIndex((c) => c.command === commandData.command);

  if (existingIndex !== -1) {
    throw new Error('Slash command already exists');
  }

  this.slashCommands.push({
    command: commandData.command,
    description: commandData.description,
    enabled: commandData.enabled !== undefined ? commandData.enabled : true,
    allowedChannels: commandData.allowedChannels || [],
    allowedUsers: commandData.allowedUsers || [],
    usageCount: 0,
  });

  return this.save();
};

// Instance method: Increment Command Usage
slackNotificationSchema.methods.incrementCommandUsage = function (command) {
  const cmd = this.slashCommands.find((c) => c.command === command);

  if (cmd) {
    cmd.usageCount += 1;
    this.stats.totalCommandsExecuted += 1;
  }

  return this.save();
};

// Instance method: Check and Update Rate Limits
slackNotificationSchema.methods.checkAndUpdateRateLimits = function () {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  const oneHourAgo = new Date(now.getTime() - 3600000);

  // Reset minute counter if needed
  if (this.rateLimits.lastResetMinute < oneMinuteAgo) {
    this.rateLimits.currentMinuteCount = 0;
    this.rateLimits.lastResetMinute = now;
  }

  // Reset hour counter if needed
  if (this.rateLimits.lastResetHour < oneHourAgo) {
    this.rateLimits.currentHourCount = 0;
    this.rateLimits.lastResetHour = now;
  }

  // Increment counters
  this.rateLimits.currentMinuteCount += 1;
  this.rateLimits.currentHourCount += 1;

  return {
    withinLimits:
      this.rateLimits.currentMinuteCount <= this.rateLimits.messagesPerMinute &&
      this.rateLimits.currentHourCount <= this.rateLimits.messagesPerHour,
    minuteRemaining: this.rateLimits.messagesPerMinute - this.rateLimits.currentMinuteCount,
    hourRemaining: this.rateLimits.messagesPerHour - this.rateLimits.currentHourCount,
  };
};

// Instance method: Disconnect from Slack
slackNotificationSchema.methods.disconnect = function (userId, reason) {
  this.status = 'disconnected';
  this.disconnectedAt = new Date();
  this.disconnectedBy = userId;
  this.disconnectReason = reason || 'User initiated disconnect';

  return this.save();
};

// Instance method: Mark Message as Failed
slackNotificationSchema.methods.markMessageFailed = function (messageId, errorMessage) {
  const message = this.messages.find((m) => m.messageId === messageId);

  if (message) {
    message.deliveryStatus = 'failed';
    message.errorMessage = errorMessage;
    this.stats.failedMessages += 1;
  }

  return this.save();
};

// Static method: Get connection by organization
slackNotificationSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Static method: Get messages by channel
slackNotificationSchema.statics.getMessagesByChannel = async function (
  organizationId,
  channelId,
  limit = 50
) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return [];

  return connection.messages
    .filter((m) => m.channelId === channelId)
    .sort((a, b) => b.sentAt - a.sentAt)
    .slice(0, limit);
};

// Static method: Get notification rules by event type
slackNotificationSchema.statics.getRulesByEventType = async function (organizationId, eventType) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return [];

  return connection.notificationRules.filter((r) => r.eventType === eventType && r.enabled);
};

// Static method: Get overall statistics
slackNotificationSchema.statics.getOverallStats = async function (organizationId) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return null;

  return {
    totalMessagesSent: connection.stats.totalMessagesSent,
    totalMessagesReceived: connection.stats.totalMessagesReceived,
    totalCommandsExecuted: connection.stats.totalCommandsExecuted,
    totalInteractions: connection.stats.totalInteractions,
    totalNotificationsSent: connection.stats.totalNotificationsSent,
    failedMessages: connection.stats.failedMessages,
    avgMessagesPerDay: connection.avgMessagesPerDay,
    messageSuccessRate: connection.messageSuccessRate,
    totalChannels: connection.channels.length,
    totalUsers: connection.users.length,
    totalRules: connection.notificationRules.length,
  };
};

// Enable virtuals in JSON
slackNotificationSchema.set('toJSON', { virtuals: true });
slackNotificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SlackNotification', slackNotificationSchema);
