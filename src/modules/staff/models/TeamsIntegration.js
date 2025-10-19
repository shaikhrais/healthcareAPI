const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const teamsIntegrationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    tenant: {
      tenantId: {
        type: String,
        required: true,
      },
      tenantName: {
        type: String,
        required: true,
      },
      accessToken: {
        type: String,
        required: true,
      },
      refreshToken: {
        type: String,
        required: true,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
      scope: [
        {
          type: String,
        },
      ],
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'token_expired', 'syncing'],
      default: 'connected',
      index: true,
    },
    teams: [
      {
        teamId: {
          type: String,
          required: true,
        },
        displayName: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        visibility: {
          type: String,
          enum: ['private', 'public'],
          default: 'private',
        },
        memberCount: {
          type: Number,
          default: 0,
        },
        channels: [
          {
            channelId: String,
            displayName: String,
            description: String,
            membershipType: { type: String, enum: ['standard', 'private', 'shared'] },
          },
        ],
        isArchived: {
          type: Boolean,
          default: false,
        },
        syncEnabled: {
          type: Boolean,
          default: true,
        },
      },
    ],
    channels: [
      {
        channelId: {
          type: String,
          required: true,
        },
        teamId: {
          type: String,
          required: true,
        },
        displayName: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        membershipType: {
          type: String,
          enum: ['standard', 'private', 'shared'],
          default: 'standard',
        },
        notifications: {
          appointmentReminders: { type: Boolean, default: false },
          appointmentCancellations: { type: Boolean, default: false },
          appointmentConfirmations: { type: Boolean, default: false },
          newPatients: { type: Boolean, default: false },
          taskAssignments: { type: Boolean, default: false },
          taskCompletions: { type: Boolean, default: false },
          paymentReceived: { type: Boolean, default: false },
          systemAlerts: { type: Boolean, default: false },
          emergencies: { type: Boolean, default: false },
        },
        lastActivity: {
          type: Date,
        },
      },
    ],
    users: [
      {
        userId: {
          type: String,
          required: true,
        },
        displayName: {
          type: String,
        },
        email: {
          type: String,
        },
        userPrincipalName: {
          type: String,
        },
        expoJaneUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        jobTitle: {
          type: String,
        },
        department: {
          type: String,
        },
        officeLocation: {
          type: String,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        presence: {
          availability: {
            type: String,
            enum: ['Available', 'Busy', 'DoNotDisturb', 'Away', 'Offline'],
          },
          activity: String,
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
        teamId: {
          type: String,
        },
        channelId: {
          type: String,
          required: true,
        },
        chatId: {
          type: String,
        },
        messageType: {
          type: String,
          enum: [
            'message',
            'appointment_reminder',
            'appointment_created',
            'appointment_cancelled',
            'new_patient',
            'task_assigned',
            'task_completed',
            'payment_received',
            'system_alert',
            'emergency',
            'adaptive_card',
          ],
          default: 'message',
        },
        content: {
          type: String,
          required: true,
        },
        contentType: {
          type: String,
          enum: ['text', 'html'],
          default: 'text',
        },
        adaptiveCard: {
          type: mongoose.Schema.Types.Mixed,
        },
        attachments: [
          {
            id: String,
            contentType: String,
            contentUrl: String,
            name: String,
            thumbnailUrl: String,
          },
        ],
        mentions: [
          {
            id: String,
            mentionText: String,
            mentioned: {
              user: {
                id: String,
                displayName: String,
                userIdentityType: String,
              },
            },
          },
        ],
        replyToId: {
          type: String,
        },
        importance: {
          type: String,
          enum: ['normal', 'high', 'urgent'],
          default: 'normal',
        },
        metadata: {
          appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
          patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
          taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
          paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
        },
        reactions: [
          {
            reactionType: String,
            createdDateTime: Date,
            user: {
              id: String,
              displayName: String,
            },
          },
        ],
        deliveryStatus: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'deleted'],
          default: 'pending',
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        errorMessage: {
          type: String,
        },
      },
    ],
    bots: [
      {
        botId: {
          type: String,
          required: true,
        },
        displayName: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        appId: {
          type: String,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        commands: [
          {
            command: String,
            description: String,
            usageCount: { type: Number, default: 0 },
          },
        ],
      },
    ],
    adaptiveCards: [
      {
        cardId: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        cardType: {
          type: String,
          enum: ['appointment', 'task', 'patient', 'notification', 'custom'],
          default: 'custom',
        },
        cardSchema: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        usageCount: {
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
        resource: {
          type: String,
          required: true,
        },
        changeType: {
          type: String,
          enum: ['created', 'updated', 'deleted'],
          required: true,
        },
        notificationUrl: {
          type: String,
          required: true,
        },
        expirationDateTime: {
          type: Date,
          required: true,
        },
        clientState: {
          type: String,
        },
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
            'appointment.reminder',
            'patient.created',
            'task.assigned',
            'task.completed',
            'payment.received',
            'system.alert',
            'emergency.alert',
          ],
          required: true,
        },
        targetType: {
          type: String,
          enum: ['channel', 'chat', 'user'],
          required: true,
        },
        targetId: {
          type: String,
          required: true,
        },
        messageTemplate: {
          type: String,
        },
        useAdaptiveCard: {
          type: Boolean,
          default: false,
        },
        adaptiveCardId: {
          type: String,
        },
        conditions: [
          {
            field: String,
            operator: String,
            value: mongoose.Schema.Types.Mixed,
          },
        ],
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
    meetings: [
      {
        meetingId: {
          type: String,
          required: true,
        },
        subject: {
          type: String,
        },
        startDateTime: {
          type: Date,
        },
        endDateTime: {
          type: Date,
        },
        joinUrl: {
          type: String,
        },
        organizerId: {
          type: String,
        },
        attendees: [
          {
            userId: String,
            displayName: String,
            email: String,
            status: { type: String, enum: ['accepted', 'declined', 'tentative', 'none'] },
          },
        ],
        appointmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Appointment',
        },
        isOnlineMeeting: {
          type: Boolean,
          default: true,
        },
        cancelled: {
          type: Boolean,
          default: false,
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
      totalNotificationsSent: {
        type: Number,
        default: 0,
      },
      totalMeetingsCreated: {
        type: Number,
        default: 0,
      },
      totalBotInteractions: {
        type: Number,
        default: 0,
      },
      totalCardsSent: {
        type: Number,
        default: 0,
      },
      failedMessages: {
        type: Number,
        default: 0,
      },
    },
    syncConfig: {
      autoSync: {
        type: Boolean,
        default: false,
      },
      syncInterval: {
        type: String,
        enum: ['realtime', 'hourly', 'daily'],
        default: 'hourly',
      },
      syncTeams: {
        type: Boolean,
        default: true,
      },
      syncUsers: {
        type: Boolean,
        default: true,
      },
      syncPresence: {
        type: Boolean,
        default: false,
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
// teamsIntegrationSchema.index({ organization: 1, status: 1 });
teamsIntegrationSchema.index({ 'tenant.tenantId': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// teamsIntegrationSchema.index({ 'messages.messageId': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// teamsIntegrationSchema.index({ 'messages.channelId': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// teamsIntegrationSchema.index({ 'messages.sentAt': -1 });

// Virtual: Is Connected
teamsIntegrationSchema.virtual('isConnected').get(function () {
  return this.status === 'connected';
});

// Virtual: Token Needs Refresh
teamsIntegrationSchema.virtual('needsTokenRefresh').get(function () {
  if (!this.tenant.expiresAt) return true;
  return this.tenant.expiresAt <= new Date();
});

// Virtual: Average Messages Per Day
teamsIntegrationSchema.virtual('avgMessagesPerDay').get(function () {
  if (!this.createdAt) return 0;
  const daysSinceCreation = Math.max(
    1,
    Math.ceil((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  return Math.round(this.stats.totalMessagesSent / daysSinceCreation);
});

// Virtual: Message Success Rate
teamsIntegrationSchema.virtual('messageSuccessRate').get(function () {
  if (this.stats.totalMessagesSent === 0) return 100;
  const successfulMessages = this.stats.totalMessagesSent - this.stats.failedMessages;
  return ((successfulMessages / this.stats.totalMessagesSent) * 100).toFixed(2);
});

// Instance method: Refresh OAuth Token
teamsIntegrationSchema.methods.refreshOAuthToken = function (tokenData) {
  this.tenant.accessToken = tokenData.accessToken;
  this.tenant.refreshToken = tokenData.refreshToken || this.tenant.refreshToken;
  this.tenant.expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

  if (this.status === 'token_expired') {
    this.status = 'connected';
  }

  return this.save();
};

// Instance method: Add or Update Team
teamsIntegrationSchema.methods.addOrUpdateTeam = function (teamData) {
  const existingIndex = this.teams.findIndex((t) => t.teamId === teamData.teamId);

  if (existingIndex !== -1) {
    // Update existing team
    this.teams[existingIndex] = {
      ...this.teams[existingIndex].toObject(),
      ...teamData,
    };
  } else {
    // Add new team
    this.teams.push(teamData);
  }

  return this.save();
};

// Instance method: Add or Update Channel
teamsIntegrationSchema.methods.addOrUpdateChannel = function (channelData) {
  const existingIndex = this.channels.findIndex((c) => c.channelId === channelData.channelId);

  if (existingIndex !== -1) {
    // Update existing channel
    this.channels[existingIndex] = {
      ...this.channels[existingIndex].toObject(),
      ...channelData,
    };
  } else {
    // Add new channel
    this.channels.push(channelData);
  }

  return this.save();
};

// Instance method: Add or Update User
teamsIntegrationSchema.methods.addOrUpdateUser = function (userData) {
  const existingIndex = this.users.findIndex((u) => u.userId === userData.userId);

  if (existingIndex !== -1) {
    // Update existing user
    this.users[existingIndex] = {
      ...this.users[existingIndex].toObject(),
      ...userData,
    };
  } else {
    // Add new user
    this.users.push(userData);
  }

  return this.save();
};

// Instance method: Send Message
teamsIntegrationSchema.methods.sendMessage = async function (messageData) {
  const message = {
    messageId:
      messageData.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    teamId: messageData.teamId,
    channelId: messageData.channelId,
    chatId: messageData.chatId,
    messageType: messageData.messageType || 'message',
    content: messageData.content,
    contentType: messageData.contentType || 'text',
    adaptiveCard: messageData.adaptiveCard,
    attachments: messageData.attachments || [],
    mentions: messageData.mentions || [],
    replyToId: messageData.replyToId,
    importance: messageData.importance || 'normal',
    metadata: messageData.metadata || {},
    deliveryStatus: 'sent',
    sentAt: new Date(),
  };

  this.messages.push(message);
  this.stats.totalMessagesSent += 1;

  if (messageData.adaptiveCard) {
    this.stats.totalCardsSent += 1;
  }

  return this.save();
};

// Instance method: Add Notification Rule
teamsIntegrationSchema.methods.addNotificationRule = function (ruleData) {
  const existingIndex = this.notificationRules.findIndex((r) => r.ruleId === ruleData.ruleId);

  if (existingIndex !== -1) {
    throw new Error('Notification rule already exists');
  }

  this.notificationRules.push({
    ruleId: ruleData.ruleId,
    name: ruleData.name,
    eventType: ruleData.eventType,
    targetType: ruleData.targetType,
    targetId: ruleData.targetId,
    messageTemplate: ruleData.messageTemplate,
    useAdaptiveCard: ruleData.useAdaptiveCard || false,
    adaptiveCardId: ruleData.adaptiveCardId,
    conditions: ruleData.conditions || [],
    enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
    priority: ruleData.priority || 'normal',
    triggerCount: 0,
  });

  return this.save();
};

// Instance method: Update Notification Rule
teamsIntegrationSchema.methods.updateNotificationRule = function (ruleId, updates) {
  const rule = this.notificationRules.find((r) => r.ruleId === ruleId);

  if (!rule) {
    throw new Error('Notification rule not found');
  }

  Object.assign(rule, updates);
  return this.save();
};

// Instance method: Delete Notification Rule
teamsIntegrationSchema.methods.deleteNotificationRule = function (ruleId) {
  this.notificationRules = this.notificationRules.filter((r) => r.ruleId !== ruleId);
  return this.save();
};

// Instance method: Create Meeting
teamsIntegrationSchema.methods.createMeeting = function (meetingData) {
  this.meetings.push({
    meetingId: meetingData.meetingId,
    subject: meetingData.subject,
    startDateTime: meetingData.startDateTime,
    endDateTime: meetingData.endDateTime,
    joinUrl: meetingData.joinUrl,
    organizerId: meetingData.organizerId,
    attendees: meetingData.attendees || [],
    appointmentId: meetingData.appointmentId,
    isOnlineMeeting: meetingData.isOnlineMeeting !== undefined ? meetingData.isOnlineMeeting : true,
    cancelled: false,
  });

  this.stats.totalMeetingsCreated += 1;
  return this.save();
};

// Instance method: Add Adaptive Card Template
teamsIntegrationSchema.methods.addAdaptiveCard = function (cardData) {
  const existingIndex = this.adaptiveCards.findIndex((c) => c.cardId === cardData.cardId);

  if (existingIndex !== -1) {
    throw new Error('Adaptive card already exists');
  }

  this.adaptiveCards.push({
    cardId: cardData.cardId,
    title: cardData.title,
    cardType: cardData.cardType || 'custom',
    cardSchema: cardData.cardSchema,
    usageCount: 0,
  });

  return this.save();
};

// Instance method: Increment Card Usage
teamsIntegrationSchema.methods.incrementCardUsage = function (cardId) {
  const card = this.adaptiveCards.find((c) => c.cardId === cardId);

  if (card) {
    card.usageCount += 1;
  }

  return this.save();
};

// Instance method: Disconnect from Teams
teamsIntegrationSchema.methods.disconnect = function (userId, reason) {
  this.status = 'disconnected';
  this.disconnectedAt = new Date();
  this.disconnectedBy = userId;
  this.disconnectReason = reason || 'User initiated disconnect';

  return this.save();
};

// Instance method: Mark Message as Failed
teamsIntegrationSchema.methods.markMessageFailed = function (messageId, errorMessage) {
  const message = this.messages.find((m) => m.messageId === messageId);

  if (message) {
    message.deliveryStatus = 'failed';
    message.errorMessage = errorMessage;
    this.stats.failedMessages += 1;
  }

  return this.save();
};

// Static method: Get connection by organization
teamsIntegrationSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Static method: Get connections needing token refresh
teamsIntegrationSchema.statics.getConnectionsNeedingRefresh = async function () {
  return this.find({
    'tenant.expiresAt': { $lte: new Date() },
    status: { $in: ['connected', 'token_expired'] },
    isDeleted: false,
  });
};

// Static method: Get overall statistics
teamsIntegrationSchema.statics.getOverallStats = async function (organizationId) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return null;

  return {
    totalMessagesSent: connection.stats.totalMessagesSent,
    totalMessagesReceived: connection.stats.totalMessagesReceived,
    totalNotificationsSent: connection.stats.totalNotificationsSent,
    totalMeetingsCreated: connection.stats.totalMeetingsCreated,
    totalBotInteractions: connection.stats.totalBotInteractions,
    totalCardsSent: connection.stats.totalCardsSent,
    failedMessages: connection.stats.failedMessages,
    avgMessagesPerDay: connection.avgMessagesPerDay,
    messageSuccessRate: connection.messageSuccessRate,
    totalTeams: connection.teams.length,
    totalChannels: connection.channels.length,
    totalUsers: connection.users.length,
    totalRules: connection.notificationRules.length,
  };
};

// Enable virtuals in JSON
teamsIntegrationSchema.set('toJSON', { virtuals: true });
teamsIntegrationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TeamsIntegration', teamsIntegrationSchema);
