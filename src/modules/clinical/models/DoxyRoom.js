const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Doxy.me Room Model
 * TASK-15.10 - Doxy.me Integration
 *
 * Manages Doxy.me virtual waiting rooms and telehealth sessions
 * Features:
 * - Virtual waiting room management
 * - Room URL generation
 * - Session tracking
 * - Recording management
 * - Participant management
 * - Screen sharing and chat logs
 * - Session analytics
 * - Waiting room queue management
 * - Auto-join links
 * - Provider availability status
 */

// eslint-disable-next-line no-unused-vars

const doxyRoomSchema = new mongoose.Schema(
  {
    // Room Information
    roomName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    displayName: {
      type: String,
      required: true,
    },

    roomUrl: {
      type: String,
      required: true,
      unique: true,
    },

    // Associated Appointment
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },

    // Provider Information
    provider: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      name: String,
      title: String,
      credentials: String,
      avatarUrl: String,
      doxyUsername: String, // Provider's Doxy.me username
    },

    // Patient Information
    patient: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },
      name: String,
      email: String,
      phone: String,
      dateOfBirth: Date,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Room Type
    roomType: {
      type: String,
      enum: ['standard', 'group', 'clinic', 'waiting_room'],
      default: 'standard',
    },

    // Session Information
    session: {
      status: {
        type: String,
        enum: [
          'scheduled', // Session scheduled but not started
          'waiting', // Patient in waiting room
          'in_progress', // Session active
          'completed', // Session ended normally
          'cancelled', // Session cancelled
          'no_show', // Patient didn't show up
          'technical_issue', // Technical problems
        ],
        default: 'scheduled',
        index: true,
      },

      scheduledStart: {
        type: Date,
        required: true,
        index: true,
      },

      scheduledEnd: Date,

      actualStart: Date,
      actualEnd: Date,

      duration: Number, // Actual duration in minutes

      // Waiting Room
      patientJoinedWaitingRoom: Date,
      providerNotifiedAt: Date,
      waitingRoomDuration: Number, // Minutes in waiting room

      // Auto-join settings
      autoJoinEnabled: {
        type: Boolean,
        default: false,
      },

      autoJoinTime: Date, // When to allow auto-join
    },

    // Participants
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        name: String,
        role: {
          type: String,
          enum: ['provider', 'patient', 'assistant', 'family', 'observer'],
        },
        joinedAt: Date,
        leftAt: Date,
        duration: Number,
        connectionQuality: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor'],
        },
        deviceInfo: {
          type: String,
          browser: String,
          os: String,
        },
      },
    ],

    // Room Settings
    settings: {
      // Recording
      recordingEnabled: {
        type: Boolean,
        default: false,
      },
      recordingConsent: {
        provider: {
          consented: Boolean,
          consentedAt: Date,
        },
        patient: {
          consented: Boolean,
          consentedAt: Date,
        },
      },

      // Features
      chatEnabled: {
        type: Boolean,
        default: true,
      },
      screenShareEnabled: {
        type: Boolean,
        default: true,
      },
      waitingRoomEnabled: {
        type: Boolean,
        default: true,
      },

      // Notifications
      notifyProviderOnJoin: {
        type: Boolean,
        default: true,
      },
      notifyPatientBeforeStart: {
        type: Boolean,
        default: true,
      },
      reminderMinutesBefore: {
        type: Number,
        default: 15,
      },

      // Security
      requirePassword: {
        type: Boolean,
        default: false,
      },
      password: String,

      knockToEnter: {
        type: Boolean,
        default: true,
      },

      lockRoom: {
        type: Boolean,
        default: false,
      },
    },

    // Recording Information
    recording: {
      isRecorded: {
        type: Boolean,
        default: false,
      },
      recordingId: String,
      recordingUrl: String,
      recordingDuration: Number,
      recordingSize: Number, // Bytes
      recordingStarted: Date,
      recordingStopped: Date,
      recordingStatus: {
        type: String,
        enum: ['recording', 'processing', 'ready', 'failed', 'deleted'],
      },
      storageLocation: String,
      retentionUntil: Date,
    },

    // Chat Logs
    chatMessages: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        senderName: String,
        senderRole: {
          type: String,
          enum: ['provider', 'patient', 'system'],
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ['text', 'system', 'file', 'image'],
          default: 'text',
        },
        fileUrl: String,
      },
    ],

    // Technical Details
    technical: {
      // Connection Quality
      connectionQuality: {
        provider: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor', 'unknown'],
          default: 'unknown',
        },
        patient: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor', 'unknown'],
          default: 'unknown',
        },
      },

      // Bandwidth
      bandwidth: {
        provider: {
          upload: Number,
          download: Number,
        },
        patient: {
          upload: Number,
          download: Number,
        },
      },

      // Issues
      technicalIssues: [
        {
          timestamp: Date,
          issue: String,
          severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
          },
          resolved: Boolean,
          resolvedAt: Date,
        },
      ],

      // Browser/Device Info
      devices: {
        provider: {
          browser: String,
          browserVersion: String,
          os: String,
          osVersion: String,
          device: String,
        },
        patient: {
          browser: String,
          browserVersion: String,
          os: String,
          osVersion: String,
          device: String,
        },
      },
    },

    // Session Notes
    notes: [
      {
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ['clinical', 'technical', 'administrative'],
          default: 'clinical',
        },
      },
    ],

    // Billing Information
    billing: {
      billingCode: String, // CPT code for telehealth
      duration: Number,
      billingNotes: String,
      insuranceCovered: Boolean,
      copay: Number,
      billedAmount: Number,
      billingStatus: {
        type: String,
        enum: ['pending', 'submitted', 'paid', 'rejected'],
        default: 'pending',
      },
    },

    // Compliance & Documentation
    compliance: {
      // HIPAA
      hipaaConsent: {
        obtained: Boolean,
        obtainedAt: Date,
        documentUrl: String,
      },

      // State Licensing
      providerStateLicense: String,
      patientState: String,
      crossStateTelehealth: Boolean,

      // Consent for Treatment
      treatmentConsent: {
        obtained: Boolean,
        obtainedAt: Date,
        documentUrl: String,
      },

      // Documentation
      clinicalNoteCompleted: Boolean,
      clinicalNoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClinicalNote',
      },
    },

    // Follow-up
    followUp: {
      required: Boolean,
      scheduledAppointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
      notes: String,
      dueDate: Date,
    },

    // Analytics
    analytics: {
      totalParticipants: {
        type: Number,
        default: 0,
      },
      averageConnectionQuality: String,
      chatMessageCount: {
        type: Number,
        default: 0,
      },
      screenShareDuration: Number,
      technicalIssueCount: {
        type: Number,
        default: 0,
      },
      patientSatisfactionScore: Number, // 1-5
      providerNotes: String,
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

doxyRoomSchema.index({ 'provider.userId': 1, 'session.scheduledStart': -1 });
doxyRoomSchema.index({ 'patient.userId': 1, 'session.scheduledStart': -1 });
doxyRoomSchema.index({ 'session.status': 1, 'session.scheduledStart': 1 });
doxyRoomSchema.index({ organization: 1, 'session.scheduledStart': -1 });
doxyRoomSchema.index({ appointment: 1 });
doxyRoomSchema.index({ roomName: 1, isDeleted: 1 });

// ==================== VIRTUAL FIELDS ====================

doxyRoomSchema.virtual('isActive').get(function () {
  return this.session.status === 'in_progress';
});

doxyRoomSchema.virtual('isUpcoming').get(function () {
  return this.session.status === 'scheduled' && new Date(this.session.scheduledStart) > new Date();
});

doxyRoomSchema.virtual('isPast').get(function () {
  return ['completed', 'cancelled', 'no_show'].includes(this.session.status);
});

doxyRoomSchema.virtual('canJoin').get(function () {
  const now = new Date();
  const scheduledStart = new Date(this.session.scheduledStart);
  const fifteenMinsBefore = new Date(scheduledStart.getTime() - 15 * 60 * 1000);

  return this.session.status === 'scheduled' && now >= fifteenMinsBefore;
});

// ==================== INSTANCE METHODS ====================

/**
 * Generate room URL
 */
doxyRoomSchema.methods.generateRoomUrl = function (baseUrl = 'https://doxy.me') {
  return `${baseUrl}/${this.provider.doxyUsername || this.roomName}`;
};

/**
 * Generate patient join URL
 */
doxyRoomSchema.methods.getPatientJoinUrl = function () {
  const url = this.generateRoomUrl();
  if (this.settings.requirePassword) {
    return `${url}?password=${this.settings.password}`;
  }
  return url;
};

/**
 * Start session
 */
doxyRoomSchema.methods.startSession = async function () {
  this.session.status = 'in_progress';
  this.session.actualStart = new Date();

  // Calculate waiting room duration if patient joined waiting room
  if (this.session.patientJoinedWaitingRoom) {
    const waitTime =
      (this.session.actualStart - this.session.patientJoinedWaitingRoom) / (1000 * 60);
    this.session.waitingRoomDuration = Math.round(waitTime);
  }

  return this.save();
};

/**
 * End session
 */
doxyRoomSchema.methods.endSession = async function () {
  this.session.status = 'completed';
  this.session.actualEnd = new Date();

  // Calculate actual duration
  if (this.session.actualStart) {
    const duration = (this.session.actualEnd - this.session.actualStart) / (1000 * 60);
    this.session.duration = Math.round(duration);
    this.billing.duration = Math.round(duration);
  }

  return this.save();
};

/**
 * Cancel session
 */
doxyRoomSchema.methods.cancelSession = async function (reason) {
  this.session.status = 'cancelled';

  if (reason) {
    this.notes.push({
      content: `Session cancelled: ${reason}`,
      type: 'administrative',
    });
  }

  return this.save();
};

/**
 * Mark as no-show
 */
doxyRoomSchema.methods.markNoShow = async function () {
  this.session.status = 'no_show';
  return this.save();
};

/**
 * Patient joins waiting room
 */
doxyRoomSchema.methods.patientJoinWaitingRoom = async function () {
  this.session.status = 'waiting';
  this.session.patientJoinedWaitingRoom = new Date();
  return this.save();
};

/**
 * Add participant
 */
doxyRoomSchema.methods.addParticipant = function (participantData) {
  this.participants.push({
    ...participantData,
    joinedAt: new Date(),
  });
  this.analytics.totalParticipants = this.participants.length;
  return this.save();
};

/**
 * Remove participant
 */
doxyRoomSchema.methods.removeParticipant = function (userId) {
  const participant = this.participants.find(
    (p) => p.userId.toString() === userId.toString() && !p.leftAt
  );

  if (participant) {
    participant.leftAt = new Date();
    if (participant.joinedAt) {
      const duration = (participant.leftAt - participant.joinedAt) / (1000 * 60);
      participant.duration = Math.round(duration);
    }
  }

  return this.save();
};

/**
 * Add chat message
 */
doxyRoomSchema.methods.addChatMessage = function (messageData) {
  this.chatMessages.push({
    ...messageData,
    timestamp: new Date(),
  });
  this.analytics.chatMessageCount = this.chatMessages.length;
  return this.save();
};

/**
 * Start recording
 */
doxyRoomSchema.methods.startRecording = async function () {
  if (!this.settings.recordingEnabled) {
    throw new Error('Recording is not enabled for this session');
  }

  if (
    !this.settings.recordingConsent.provider.consented ||
    !this.settings.recordingConsent.patient.consented
  ) {
    throw new Error('Recording consent not obtained from all parties');
  }

  this.recording.isRecorded = true;
  this.recording.recordingStarted = new Date();
  this.recording.recordingStatus = 'recording';
  this.recording.recordingId = crypto.randomBytes(16).toString('hex');

  return this.save();
};

/**
 * Stop recording
 */
doxyRoomSchema.methods.stopRecording = async function () {
  this.recording.recordingStopped = new Date();
  this.recording.recordingStatus = 'processing';

  if (this.recording.recordingStarted) {
    const duration =
      (this.recording.recordingStopped - this.recording.recordingStarted) / (1000 * 60);
    this.recording.recordingDuration = Math.round(duration);
  }

  return this.save();
};

/**
 * Add technical issue
 */
doxyRoomSchema.methods.reportTechnicalIssue = function (issueData) {
  this.technical.technicalIssues.push({
    timestamp: new Date(),
    ...issueData,
  });
  this.analytics.technicalIssueCount = this.technical.technicalIssues.length;
  return this.save();
};

/**
 * Update connection quality
 */
doxyRoomSchema.methods.updateConnectionQuality = function (role, quality) {
  if (role === 'provider') {
    this.technical.connectionQuality.provider = quality;
  } else if (role === 'patient') {
    this.technical.connectionQuality.patient = quality;
  }
  return this.save();
};

/**
 * Get session summary
 */
doxyRoomSchema.methods.getSessionSummary = function () {
  return {
    roomName: this.roomName,
    displayName: this.displayName,
    provider: this.provider.name,
    patient: this.patient.name,
    status: this.session.status,
    scheduledStart: this.session.scheduledStart,
    actualStart: this.session.actualStart,
    actualEnd: this.session.actualEnd,
    duration: this.session.duration,
    waitingRoomDuration: this.session.waitingRoomDuration,
    participantCount: this.analytics.totalParticipants,
    chatMessageCount: this.analytics.chatMessageCount,
    technicalIssueCount: this.analytics.technicalIssueCount,
    wasRecorded: this.recording.isRecorded,
    patientSatisfactionScore: this.analytics.patientSatisfactionScore,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique room name
 */
doxyRoomSchema.statics.generateRoomName = async function (providerId) {
  let roomName;
  let exists = true;

  while (exists) {
    const randomStr = crypto.randomBytes(4).toString('hex');
    roomName = `room-${providerId.toString().substring(0, 8)}-${randomStr}`;
    exists = await this.exists({ roomName });
  }

  return roomName;
};

/**
 * Create Doxy.me room
 */
doxyRoomSchema.statics.createRoom = async function (roomData) {
  const roomName = await this.generateRoomName(roomData.provider.userId);
  const roomUrl = `https://doxy.me/${roomData.provider.doxyUsername || roomName}`;

  return this.create({
    roomName,
    roomUrl,
    ...roomData,
  });
};

/**
 * Get upcoming sessions for provider
 */
doxyRoomSchema.statics.getUpcomingForProvider = async function (providerId, limit = 10) {
  return this.find({
    'provider.userId': providerId,
    'session.status': 'scheduled',
    'session.scheduledStart': { $gte: new Date() },
    isDeleted: false,
  })
    .sort({ 'session.scheduledStart': 1 })
    .limit(limit);
};

/**
 * Get upcoming sessions for patient
 */
doxyRoomSchema.statics.getUpcomingForPatient = async function (patientId, limit = 10) {
  return this.find({
    'patient.userId': patientId,
    'session.status': 'scheduled',
    'session.scheduledStart': { $gte: new Date() },
    isDeleted: false,
  })
    .sort({ 'session.scheduledStart': 1 })
    .limit(limit);
};

/**
 * Get active sessions
 */
doxyRoomSchema.statics.getActiveSessions = async function (organizationId) {
  return this.find({
    organization: organizationId,
    'session.status': { $in: ['waiting', 'in_progress'] },
    isDeleted: false,
  }).sort({ 'session.actualStart': -1 });
};

/**
 * Get sessions by date range
 */
doxyRoomSchema.statics.getByDateRange = async function (organizationId, startDate, endDate) {
  return this.find({
    organization: organizationId,
    'session.scheduledStart': {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  }).sort({ 'session.scheduledStart': 1 });
};

/**
 * Get waiting room queue
 */
doxyRoomSchema.statics.getWaitingRoomQueue = async function (providerId) {
  return this.find({
    'provider.userId': providerId,
    'session.status': 'waiting',
    isDeleted: false,
  }).sort({ 'session.patientJoinedWaitingRoom': 1 });
};

/**
 * Get session analytics
 */
doxyRoomSchema.statics.getAnalytics = async function (organizationId, dateRange) {
  const { startDate, endDate } = dateRange;

  const sessions = await this.find({
    organization: organizationId,
    'session.scheduledStart': {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.session.status === 'completed').length;
  const cancelledSessions = sessions.filter((s) => s.session.status === 'cancelled').length;
  const noShowSessions = sessions.filter((s) => s.session.status === 'no_show').length;

  const avgDuration =
    sessions.filter((s) => s.session.duration).reduce((sum, s) => sum + s.session.duration, 0) /
    (completedSessions || 1);

  const avgWaitingTime =
    sessions
      .filter((s) => s.session.waitingRoomDuration)
      .reduce((sum, s) => sum + s.session.waitingRoomDuration, 0) / (completedSessions || 1);

  const technicalIssues = sessions.reduce((sum, s) => sum + s.analytics.technicalIssueCount, 0);

  const avgSatisfaction =
    sessions
      .filter((s) => s.analytics.patientSatisfactionScore)
      .reduce((sum, s) => sum + s.analytics.patientSatisfactionScore, 0) / (completedSessions || 1);

  return {
    totalSessions,
    completedSessions,
    cancelledSessions,
    noShowSessions,
    completionRate: ((completedSessions / totalSessions) * 100).toFixed(1),
    noShowRate: ((noShowSessions / totalSessions) * 100).toFixed(1),
    avgDuration: Math.round(avgDuration),
    avgWaitingTime: Math.round(avgWaitingTime),
    totalTechnicalIssues: technicalIssues,
    avgPatientSatisfaction: avgSatisfaction.toFixed(1),
  };
};

/**
 * Cleanup old sessions
 */
doxyRoomSchema.statics.cleanupOldSessions = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return this.updateMany(
    {
      'session.scheduledStart': { $lt: cutoffDate },
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    }
  );
};

// ==================== PRE-SAVE HOOKS ====================

doxyRoomSchema.pre('save', function (next) {
  // Auto-calculate analytics
  if (this.participants.length > 0) {
    this.analytics.totalParticipants = this.participants.length;
  }

  if (this.chatMessages.length > 0) {
    this.analytics.chatMessageCount = this.chatMessages.length;
  }

  if (this.technical.technicalIssues.length > 0) {
    this.analytics.technicalIssueCount = this.technical.technicalIssues.length;
  }

  // Set recording retention
  if (this.recording.isRecorded && !this.recording.retentionUntil) {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 7); // 7 years for HIPAA
    this.recording.retentionUntil = retentionDate;
  }

  next();
});

module.exports = mongoose.model('DoxyRoom', doxyRoomSchema);
