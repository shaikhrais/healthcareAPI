const mongoose = require('mongoose');

/**
 * HapticPreference Model
 * TASK-14.20 - Haptic Feedback
 *
 * Manages user haptic feedback preferences and settings
 * Features:
 * - Global haptic enable/disable
 * - Intensity control per interaction type
 * - Context-aware haptic patterns
 * - Custom haptic profiles
 * - Battery-saving modes
 * - Accessibility integration
 * - Platform-specific haptic types (iOS Taptic Engine, Android Vibration)
 */

// eslint-disable-next-line no-unused-vars

const hapticPreferenceSchema = new mongoose.Schema(
  {
    // User Reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Global Settings
    enabled: {
      type: Boolean,
      default: true,
    },

    // Master Intensity (0.0 - 1.0)
    masterIntensity: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.75,
    },

    // Interaction-Specific Settings
    interactions: {
      // UI Interactions
      buttonPress: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium', 'heavy', 'rigid', 'soft', 'selection'],
          default: 'light',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.7,
        },
      },

      switchToggle: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium', 'heavy', 'selection'],
          default: 'medium',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.8,
        },
      },

      sliderChange: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['selection', 'light', 'none'],
          default: 'selection',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.5,
        },
        frequency: {
          type: String,
          enum: ['always', 'milestones', 'none'],
          default: 'milestones', // Only at 25%, 50%, 75%, 100%
        },
      },

      pickerScroll: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['selection', 'light'],
          default: 'selection',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.6,
        },
      },

      textInput: {
        enabled: {
          type: Boolean,
          default: false,
        },
        type: {
          type: String,
          enum: ['selection', 'light', 'none'],
          default: 'light',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.4,
        },
      },

      // Navigation
      navigation: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium'],
          default: 'light',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.5,
        },
      },

      swipeGesture: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium', 'soft'],
          default: 'soft',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.6,
        },
      },

      pullToRefresh: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium', 'heavy'],
          default: 'medium',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.7,
        },
      },

      // Notifications & Alerts
      notificationReceived: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium', 'heavy', 'soft'],
          default: 'medium',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.8,
        },
        pattern: {
          type: String,
          enum: ['single', 'double', 'triple', 'pulse'],
          default: 'single',
        },
      },

      errorAlert: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['rigid', 'heavy', 'medium'],
          default: 'rigid',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 1.0,
        },
        pattern: {
          type: String,
          enum: ['single', 'double', 'triple', 'warning'],
          default: 'double',
        },
      },

      successFeedback: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'medium', 'soft'],
          default: 'soft',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.8,
        },
        pattern: {
          type: String,
          enum: ['single', 'double', 'success'],
          default: 'success',
        },
      },

      warningAlert: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['medium', 'heavy', 'rigid'],
          default: 'medium',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.9,
        },
        pattern: {
          type: String,
          enum: ['single', 'double', 'warning'],
          default: 'warning',
        },
      },

      // App-Specific Actions
      appointmentBooked: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['soft', 'medium', 'light'],
          default: 'soft',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.8,
        },
        pattern: {
          type: String,
          enum: ['success', 'double', 'single'],
          default: 'success',
        },
      },

      appointmentReminder: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['medium', 'heavy', 'light'],
          default: 'medium',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.85,
        },
        pattern: {
          type: String,
          enum: ['single', 'double', 'pulse'],
          default: 'double',
        },
      },

      messageReceived: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['light', 'soft', 'medium'],
          default: 'soft',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.7,
        },
        pattern: {
          type: String,
          enum: ['single', 'double'],
          default: 'single',
        },
      },

      // Gaming/Gamification
      achievementUnlocked: {
        enabled: {
          type: Boolean,
          default: true,
        },
        type: {
          type: String,
          enum: ['soft', 'medium', 'heavy'],
          default: 'medium',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.9,
        },
        pattern: {
          type: String,
          enum: ['success', 'triple', 'celebration'],
          default: 'celebration',
        },
      },
    },

    // Context-Aware Settings
    contextual: {
      // Reduce haptics during specific times
      quietHours: {
        enabled: {
          type: Boolean,
          default: false,
        },
        startTime: {
          type: String, // "22:00"
          default: '22:00',
        },
        endTime: {
          type: String, // "07:00"
          default: '07:00',
        },
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.3, // Reduced intensity during quiet hours
        },
      },

      // Battery Saving
      batterySaver: {
        enabled: {
          type: Boolean,
          default: true,
        },
        threshold: {
          type: Number,
          min: 0,
          max: 100,
          default: 20, // Enable when battery < 20%
        },
        behavior: {
          type: String,
          enum: ['disable', 'reduce', 'essential-only'],
          default: 'reduce',
        },
        reducedIntensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.4,
        },
      },

      // Focus Mode
      focusMode: {
        enabled: {
          type: Boolean,
          default: false,
        },
        allowedTypes: {
          type: [String],
          default: ['errorAlert', 'appointmentReminder'], // Only critical haptics
        },
      },

      // Accessibility Integration
      accessibilityMode: {
        enabled: {
          type: Boolean,
          default: false,
        },
        enhancedIntensity: {
          type: Number,
          min: 1.0,
          max: 2.0,
          default: 1.5, // Multiplier for accessibility
        },
        alwaysVibrate: {
          type: Boolean,
          default: true, // Ensure haptics always fire
        },
      },
    },

    // Custom Patterns
    customPatterns: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        pattern: {
          type: String,
          enum: [
            'single',
            'double',
            'triple',
            'pulse',
            'success',
            'warning',
            'celebration',
            'custom',
          ],
          default: 'single',
        },
        customDurations: [Number], // For custom patterns: [100, 50, 100, 50, 200]
        intensity: {
          type: Number,
          min: 0.0,
          max: 1.0,
          default: 0.75,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Profiles
    profiles: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        settings: {
          type: mongoose.Schema.Types.Mixed, // Complete haptic settings
        },
        isActive: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Device Capabilities
    deviceCapabilities: {
      platform: {
        type: String,
        enum: ['ios', 'android', 'unknown'],
        default: 'unknown',
      },
      hasTapticEngine: {
        type: Boolean,
        default: false,
      },
      supportsHapticFeedback: {
        type: Boolean,
        default: true,
      },
      apiVersion: Number,
    },

    // Analytics
    analytics: {
      enabledAt: Date,
      lastUsed: Date,
      totalTriggers: {
        type: Number,
        default: 0,
      },
      triggersByType: {
        type: Map,
        of: Number,
        default: {},
      },
      averageIntensity: Number,
    },

    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

hapticPreferenceSchema.index({ enabled: 1 });
hapticPreferenceSchema.index({ 'deviceCapabilities.platform': 1 });

// ==================== VIRTUAL FIELDS ====================

hapticPreferenceSchema.virtual('isQuietHoursActive').get(function () {
  if (!this.contextual.quietHours.enabled) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const start = this.contextual.quietHours.startTime;
  const end = this.contextual.quietHours.endTime;

  // Handle overnight periods (e.g., 22:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }
  return currentTime >= start && currentTime <= end;
});

hapticPreferenceSchema.virtual('effectiveIntensity').get(function () {
  let intensity = this.masterIntensity;

  // Apply quiet hours reduction
  if (this.isQuietHoursActive) {
    intensity = Math.min(intensity, this.contextual.quietHours.intensity);
  }

  // Apply accessibility enhancement
  if (this.contextual.accessibilityMode.enabled) {
    intensity *= this.contextual.accessibilityMode.enhancedIntensity;
  }

  return Math.min(intensity, 1.0);
});

// ==================== INSTANCE METHODS ====================

/**
 * Check if haptic should trigger for interaction type
 */
hapticPreferenceSchema.methods.shouldTrigger = function (interactionType) {
  if (!this.enabled) return false;

  // Check focus mode
  if (this.contextual.focusMode.enabled) {
    if (!this.contextual.focusMode.allowedTypes.includes(interactionType)) {
      return false;
    }
  }

  // Check if specific interaction is enabled
  if (this.interactions[interactionType]) {
    return this.interactions[interactionType].enabled;
  }

  return true;
};

/**
 * Get haptic configuration for interaction
 */
hapticPreferenceSchema.methods.getHapticConfig = function (interactionType) {
  const interaction = this.interactions[interactionType];
  if (!interaction) {
    return null;
  }

  const config = {
    type: interaction.type,
    intensity: (interaction.intensity || 0.75) * this.effectiveIntensity,
    pattern: interaction.pattern || 'single',
    enabled: this.shouldTrigger(interactionType),
  };

  return config;
};

/**
 * Track haptic trigger
 */
hapticPreferenceSchema.methods.trackTrigger = async function (interactionType, intensity) {
  this.analytics.totalTriggers += 1;
  this.analytics.lastUsed = new Date();

  const currentCount = this.analytics.triggersByType.get(interactionType) || 0;
  this.analytics.triggersByType.set(interactionType, currentCount + 1);

  // Update average intensity
  if (this.analytics.averageIntensity) {
    this.analytics.averageIntensity =
      (this.analytics.averageIntensity * (this.analytics.totalTriggers - 1) + intensity) /
      this.analytics.totalTriggers;
  } else {
    this.analytics.averageIntensity = intensity;
  }

  return this.save();
};

/**
 * Get active profile
 */
hapticPreferenceSchema.methods.getActiveProfile = function () {
  return this.profiles.find((p) => p.isActive);
};

/**
 * Activate profile
 */
hapticPreferenceSchema.methods.activateProfile = async function (profileName) {
  // Deactivate all profiles
  this.profiles.forEach((p) => (p.isActive = false));

  // Find and activate requested profile
  const profile = this.profiles.find((p) => p.name === profileName);
  if (!profile) {
    throw new Error('Profile not found');
  }

  profile.isActive = true;

  // Apply profile settings
  if (profile.settings) {
    Object.assign(this, profile.settings);
  }

  return this.save();
};

/**
 * Save current settings as profile
 */
hapticPreferenceSchema.methods.saveAsProfile = async function (name, description) {
  // Remove existing profile with same name
  this.profiles = this.profiles.filter((p) => p.name !== name);

  // Create new profile
  this.profiles.push({
    name,
    description,
    settings: {
      enabled: this.enabled,
      masterIntensity: this.masterIntensity,
      interactions: this.interactions,
      contextual: this.contextual,
    },
    isActive: false,
  });

  return this.save();
};

/**
 * Delete profile
 */
hapticPreferenceSchema.methods.deleteProfile = async function (profileName) {
  this.profiles = this.profiles.filter((p) => p.name !== profileName);
  return this.save();
};

/**
 * Get usage summary
 */
hapticPreferenceSchema.methods.getUsageSummary = function () {
  const topInteractions = Array.from(this.analytics.triggersByType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    enabled: this.enabled,
    totalTriggers: this.analytics.totalTriggers,
    averageIntensity: this.analytics.averageIntensity,
    topInteractions,
    lastUsed: this.analytics.lastUsed,
    quietHoursActive: this.isQuietHoursActive,
    effectiveIntensity: this.effectiveIntensity,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get or create preferences for user
 */
hapticPreferenceSchema.statics.getOrCreate = async function (userId, deviceInfo = {}) {
  let prefs = await this.findOne({ userId });

  if (!prefs) {
    prefs = await this.create({
      userId,
      deviceCapabilities: deviceInfo,
    });
  }

  return prefs;
};

/**
 * Get statistics
 */
hapticPreferenceSchema.statics.getStats = async function () {
  const all = await this.find();
  const total = all.length;

  const enabledUsers = all.filter((p) => p.enabled).length;
  const avgIntensity = all.reduce((sum, p) => sum + p.masterIntensity, 0) / total || 0;

  // Aggregate interaction usage
  const interactionUsage = {};
  all.forEach((pref) => {
    pref.analytics.triggersByType.forEach((count, type) => {
      interactionUsage[type] = (interactionUsage[type] || 0) + count;
    });
  });

  const topInteractions = Object.entries(interactionUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }));

  return {
    total,
    enabledUsers,
    disabledUsers: total - enabledUsers,
    averageIntensity: avgIntensity,
    topInteractions,
    platformBreakdown: {
      ios: all.filter((p) => p.deviceCapabilities.platform === 'ios').length,
      android: all.filter((p) => p.deviceCapabilities.platform === 'android').length,
    },
  };
};

module.exports = mongoose.model('HapticPreference', hapticPreferenceSchema);
