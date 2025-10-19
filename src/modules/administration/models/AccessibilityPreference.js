const mongoose = require('mongoose');

/**
 * AccessibilityPreference Model
 * TASK-14.19 - Accessibility (VoiceOver/TalkBack)
 *
 * Manages user accessibility preferences and settings
 * Features:
 * - VoiceOver/TalkBack optimization
 * - Screen reader settings
 * - Visual accessibility (font size, contrast, color blindness)
 * - Motor accessibility (gesture alternatives, tap targets)
 * - Cognitive accessibility (simplified mode, focus indicators)
 * - Hearing accessibility (captions, visual alerts)
 */

// eslint-disable-next-line no-unused-vars

const accessibilityPreferenceSchema = new mongoose.Schema(
  {
    // User Reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Screen Reader Settings
    screenReader: {
      enabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ['voiceover', 'talkback', 'other', 'unknown'],
        default: 'unknown',
      },
      verbosity: {
        type: String,
        enum: ['minimal', 'moderate', 'detailed'],
        default: 'moderate',
      },
      announceChanges: {
        type: Boolean,
        default: true, // Announce dynamic content changes
      },
      announceHints: {
        type: Boolean,
        default: true, // Read accessibility hints
      },
      speakingRate: {
        type: Number,
        min: 0.5,
        max: 2.0,
        default: 1.0,
      },
    },

    // Visual Accessibility
    visual: {
      // Font Size
      fontSize: {
        scale: {
          type: Number,
          min: 0.5,
          max: 3.0,
          default: 1.0,
        },
        useSystemSetting: {
          type: Boolean,
          default: true,
        },
      },

      // Contrast
      highContrast: {
        enabled: {
          type: Boolean,
          default: false,
        },
        level: {
          type: String,
          enum: ['standard', 'medium', 'high'],
          default: 'standard',
        },
      },

      // Color Blindness Support
      colorBlindness: {
        enabled: {
          type: Boolean,
          default: false,
        },
        type: {
          type: String,
          enum: ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'monochromacy'],
          default: 'none',
        },
        showColorLabels: {
          type: Boolean,
          default: false, // Show text labels for colors
        },
      },

      // Dark Mode
      darkMode: {
        type: String,
        enum: ['system', 'light', 'dark'],
        default: 'system',
      },

      // Bold Text
      boldText: {
        enabled: {
          type: Boolean,
          default: false,
        },
        weight: {
          type: Number,
          min: 400,
          max: 900,
          default: 600,
        },
      },

      // Reduce Transparency
      reduceTransparency: {
        type: Boolean,
        default: false,
      },

      // Reduce Motion
      reduceMotion: {
        enabled: {
          type: Boolean,
          default: false,
        },
        level: {
          type: String,
          enum: ['none', 'partial', 'full'],
          default: 'none',
        },
      },

      // Button Shapes
      buttonShapes: {
        type: Boolean,
        default: false, // Show explicit button borders
      },

      // On/Off Labels
      onOffLabels: {
        type: Boolean,
        default: false, // Show text labels on switches
      },
    },

    // Motor Accessibility
    motor: {
      // Touch Accommodations
      touchTarget: {
        size: {
          type: String,
          enum: ['standard', 'large', 'extra-large'],
          default: 'standard',
        },
        minSize: {
          type: Number,
          default: 44, // Minimum touch target size in pixels
        },
      },

      // Gesture Alternatives
      gestureAlternatives: {
        enabled: {
          type: Boolean,
          default: false,
        },
        showSwipeButtons: {
          type: Boolean,
          default: false, // Replace swipe with button
        },
        disableDoubleTap: {
          type: Boolean,
          default: false,
        },
        disableLongPress: {
          type: Boolean,
          default: false,
        },
      },

      // Hold Duration
      holdDuration: {
        type: Number,
        min: 0.5,
        max: 4.0,
        default: 1.0, // Seconds
      },

      // Tap Assistance
      tapAssistance: {
        enabled: {
          type: Boolean,
          default: false,
        },
        showTapIndicator: {
          type: Boolean,
          default: false,
        },
      },

      // Shake to Undo
      shakeToUndo: {
        type: Boolean,
        default: true,
      },

      // Reachability
      reachability: {
        enabled: {
          type: Boolean,
          default: false,
        },
        side: {
          type: String,
          enum: ['left', 'right', 'both'],
          default: 'right',
        },
      },
    },

    // Cognitive Accessibility
    cognitive: {
      // Simplified Mode
      simplifiedMode: {
        enabled: {
          type: Boolean,
          default: false,
        },
        hideNonEssential: {
          type: Boolean,
          default: false,
        },
        reducedAnimations: {
          type: Boolean,
          default: false,
        },
      },

      // Focus Indicators
      focusIndicators: {
        enabled: {
          type: Boolean,
          default: true,
        },
        style: {
          type: String,
          enum: ['subtle', 'standard', 'prominent'],
          default: 'standard',
        },
        color: {
          type: String,
          default: '#007AFF',
        },
      },

      // Reading Mode
      readingMode: {
        enabled: {
          type: Boolean,
          default: false,
        },
        lineHeight: {
          type: Number,
          min: 1.0,
          max: 3.0,
          default: 1.5,
        },
        letterSpacing: {
          type: Number,
          min: 0,
          max: 5,
          default: 0,
        },
        wordSpacing: {
          type: Number,
          min: 0,
          max: 5,
          default: 0,
        },
      },

      // Guided Access
      guidedAccess: {
        enabled: {
          type: Boolean,
          default: false,
        },
        limitedAreas: [String], // Screen areas user can interact with
        timeLimit: Number, // Minutes
      },

      // Autoplay Settings
      autoplay: {
        videos: {
          type: Boolean,
          default: true,
        },
        animations: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Hearing Accessibility
    hearing: {
      // Captions
      captions: {
        enabled: {
          type: Boolean,
          default: false,
        },
        style: {
          fontSize: {
            type: Number,
            default: 16,
          },
          backgroundColor: {
            type: String,
            default: 'rgba(0,0,0,0.8)',
          },
          textColor: {
            type: String,
            default: '#FFFFFF',
          },
        },
      },

      // Visual Alerts
      visualAlerts: {
        enabled: {
          type: Boolean,
          default: false,
        },
        flashScreen: {
          type: Boolean,
          default: false,
        },
        showBanner: {
          type: Boolean,
          default: true,
        },
      },

      // Mono Audio
      monoAudio: {
        type: Boolean,
        default: false,
      },

      // Audio Balance
      audioBalance: {
        type: Number,
        min: -1.0, // Full left
        max: 1.0, // Full right
        default: 0.0, // Center
      },
    },

    // Notification Preferences
    notifications: {
      // Screen Reader Announcements
      announceNotifications: {
        type: Boolean,
        default: true,
      },

      // Notification Grouping
      groupSimilar: {
        type: Boolean,
        default: true,
      },

      // Critical Alerts
      criticalAlertsOnly: {
        type: Boolean,
        default: false,
      },
    },

    // Keyboard Navigation
    keyboard: {
      enabled: {
        type: Boolean,
        default: false,
      },
      tabOrder: {
        type: String,
        enum: ['default', 'custom'],
        default: 'default',
      },
      shortcuts: {
        enabled: {
          type: Boolean,
          default: true,
        },
        custom: {
          type: Map,
          of: String, // Key: action, Value: key combination
          default: {},
        },
      },
    },

    // Device Features
    device: {
      // Auto-detected from AccessibilityInfo API
      voiceOverEnabled: {
        type: Boolean,
        default: false,
      },
      talkBackEnabled: {
        type: Boolean,
        default: false,
      },
      switchControlEnabled: {
        type: Boolean,
        default: false,
      },
      invertColorsEnabled: {
        type: Boolean,
        default: false,
      },
      grayscaleEnabled: {
        type: Boolean,
        default: false,
      },
    },

    // Profile & Quick Access
    profiles: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        settings: {
          type: mongoose.Schema.Types.Mixed,
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

    // Analytics
    analytics: {
      enabledAt: Date,
      lastUsed: Date,
      featuresUsed: {
        type: Map,
        of: Number, // Feature name -> usage count
        default: {},
      },
    },

    // Organization-specific
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

accessibilityPreferenceSchema.index({ 'screenReader.enabled': 1 });
accessibilityPreferenceSchema.index({ 'visual.highContrast.enabled': 1 });
accessibilityPreferenceSchema.index({ 'device.voiceOverEnabled': 1 });
accessibilityPreferenceSchema.index({ 'device.talkBackEnabled': 1 });

// ==================== VIRTUAL FIELDS ====================

accessibilityPreferenceSchema.virtual('isScreenReaderActive').get(function () {
  return this.device.voiceOverEnabled || this.device.talkBackEnabled || this.screenReader.enabled;
});

accessibilityPreferenceSchema.virtual('hasVisualAssistance').get(function () {
  return (
    this.visual.highContrast.enabled ||
    this.visual.boldText.enabled ||
    this.visual.fontSize.scale !== 1.0 ||
    this.visual.colorBlindness.enabled
  );
});

accessibilityPreferenceSchema.virtual('hasMotorAssistance').get(function () {
  return (
    this.motor.gestureAlternatives.enabled ||
    this.motor.tapAssistance.enabled ||
    this.motor.touchTarget.size !== 'standard'
  );
});

// ==================== INSTANCE METHODS ====================

/**
 * Get active profile
 */
accessibilityPreferenceSchema.methods.getActiveProfile = function () {
  return this.profiles.find((p) => p.isActive);
};

/**
 * Activate profile
 */
accessibilityPreferenceSchema.methods.activateProfile = async function (profileName) {
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
accessibilityPreferenceSchema.methods.saveAsProfile = async function (name, description) {
  // Remove existing profile with same name
  this.profiles = this.profiles.filter((p) => p.name !== name);

  // Create new profile
  this.profiles.push({
    name,
    description,
    settings: {
      screenReader: this.screenReader,
      visual: this.visual,
      motor: this.motor,
      cognitive: this.cognitive,
      hearing: this.hearing,
      notifications: this.notifications,
      keyboard: this.keyboard,
    },
    isActive: false,
  });

  return this.save();
};

/**
 * Delete profile
 */
accessibilityPreferenceSchema.methods.deleteProfile = async function (profileName) {
  this.profiles = this.profiles.filter((p) => p.name !== profileName);
  return this.save();
};

/**
 * Track feature usage
 */
accessibilityPreferenceSchema.methods.trackFeatureUsage = async function (featureName) {
  const currentCount = this.analytics.featuresUsed.get(featureName) || 0;
  this.analytics.featuresUsed.set(featureName, currentCount + 1);
  this.analytics.lastUsed = new Date();
  return this.save();
};

/**
 * Get accessibility summary
 */
accessibilityPreferenceSchema.methods.getSummary = function () {
  return {
    screenReader: this.isScreenReaderActive,
    visual: this.hasVisualAssistance,
    motor: this.hasMotorAssistance,
    cognitive: this.cognitive.simplifiedMode.enabled,
    hearing: this.hearing.captions.enabled || this.hearing.visualAlerts.enabled,
    activeFeatures: Array.from(this.analytics.featuresUsed.keys()).filter(
      (feature) => this.analytics.featuresUsed.get(feature) > 0
    ),
  };
};

/**
 * Apply system settings
 */
accessibilityPreferenceSchema.methods.applySystemSettings = async function (systemSettings) {
  // Update device features from system
  if (systemSettings.voiceOverEnabled !== undefined) {
    this.device.voiceOverEnabled = systemSettings.voiceOverEnabled;
    if (systemSettings.voiceOverEnabled) {
      this.screenReader.enabled = true;
      this.screenReader.type = 'voiceover';
    }
  }

  if (systemSettings.talkBackEnabled !== undefined) {
    this.device.talkBackEnabled = systemSettings.talkBackEnabled;
    if (systemSettings.talkBackEnabled) {
      this.screenReader.enabled = true;
      this.screenReader.type = 'talkback';
    }
  }

  if (systemSettings.switchControlEnabled !== undefined) {
    this.device.switchControlEnabled = systemSettings.switchControlEnabled;
  }

  if (systemSettings.invertColorsEnabled !== undefined) {
    this.device.invertColorsEnabled = systemSettings.invertColorsEnabled;
  }

  if (systemSettings.grayscaleEnabled !== undefined) {
    this.device.grayscaleEnabled = systemSettings.grayscaleEnabled;
  }

  // Apply reduce motion from system
  if (systemSettings.reduceMotionEnabled !== undefined) {
    this.visual.reduceMotion.enabled = systemSettings.reduceMotionEnabled;
    this.visual.reduceMotion.level = systemSettings.reduceMotionEnabled ? 'full' : 'none';
  }

  // Apply bold text from system
  if (systemSettings.boldTextEnabled !== undefined) {
    this.visual.boldText.enabled = systemSettings.boldTextEnabled;
  }

  return this.save();
};

/**
 * Export settings for backup
 */
accessibilityPreferenceSchema.methods.exportSettings = function () {
  return {
    screenReader: this.screenReader,
    visual: this.visual,
    motor: this.motor,
    cognitive: this.cognitive,
    hearing: this.hearing,
    notifications: this.notifications,
    keyboard: this.keyboard,
    profiles: this.profiles,
    exportedAt: new Date().toISOString(),
  };
};

/**
 * Import settings from backup
 */
accessibilityPreferenceSchema.methods.importSettings = async function (settings) {
  if (settings.screenReader) this.screenReader = settings.screenReader;
  if (settings.visual) this.visual = settings.visual;
  if (settings.motor) this.motor = settings.motor;
  if (settings.cognitive) this.cognitive = settings.cognitive;
  if (settings.hearing) this.hearing = settings.hearing;
  if (settings.notifications) this.notifications = settings.notifications;
  if (settings.keyboard) this.keyboard = settings.keyboard;
  if (settings.profiles) this.profiles = settings.profiles;

  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get or create preferences for user
 */
accessibilityPreferenceSchema.statics.getOrCreate = async function (userId) {
  let prefs = await this.findOne({ userId });

  if (!prefs) {
    prefs = await this.create({ userId });
  }

  return prefs;
};

/**
 * Get statistics
 */
accessibilityPreferenceSchema.statics.getStats = async function () {
  const all = await this.find();
  const total = all.length;

  return {
    total,
    screenReaderUsers: all.filter((p) => p.isScreenReaderActive).length,
    visualAssistanceUsers: all.filter((p) => p.hasVisualAssistance).length,
    motorAssistanceUsers: all.filter((p) => p.hasMotorAssistance).length,
    cognitiveAssistanceUsers: all.filter((p) => p.cognitive.simplifiedMode.enabled).length,
    hearingAssistanceUsers: all.filter(
      (p) => p.hearing.captions.enabled || p.hearing.visualAlerts.enabled
    ).length,
    highContrastUsers: all.filter((p) => p.visual.highContrast.enabled).length,
    reduceMotionUsers: all.filter((p) => p.visual.reduceMotion.enabled).length,
    colorBlindnessUsers: all.filter((p) => p.visual.colorBlindness.enabled).length,
    mostUsedFeatures: await this.getMostUsedFeatures(),
  };
};

/**
 * Get most used features
 */
accessibilityPreferenceSchema.statics.getMostUsedFeatures = async function () {
  const all = await this.find();
  const featureUsage = {};

  all.forEach((pref) => {
    pref.analytics.featuresUsed.forEach((count, feature) => {
      featureUsage[feature] = (featureUsage[feature] || 0) + count;
    });
  });

  return Object.entries(featureUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([feature, count]) => ({ feature, count }));
};

/**
 * Get recommended settings based on device
 */
accessibilityPreferenceSchema.statics.getRecommendedSettings = function (systemSettings) {
  const recommended = {};

  if (systemSettings.voiceOverEnabled || systemSettings.talkBackEnabled) {
    recommended.screenReader = {
      enabled: true,
      verbosity: 'detailed',
      announceChanges: true,
      announceHints: true,
    };
    recommended.motor = {
      touchTarget: { size: 'large', minSize: 48 },
      gestureAlternatives: { enabled: true, showSwipeButtons: true },
    };
  }

  if (systemSettings.reduceMotionEnabled) {
    recommended.visual = {
      reduceMotion: { enabled: true, level: 'full' },
    };
    recommended.cognitive = {
      simplifiedMode: { enabled: true, reducedAnimations: true },
      autoplay: { videos: false, animations: false },
    };
  }

  if (systemSettings.boldTextEnabled) {
    recommended.visual = {
      ...(recommended.visual || {}),
      boldText: { enabled: true, weight: 700 },
    };
  }

  if (systemSettings.invertColorsEnabled) {
    recommended.visual = {
      ...(recommended.visual || {}),
      highContrast: { enabled: true, level: 'high' },
    };
  }

  return recommended;
};

module.exports = mongoose.model('AccessibilityPreference', accessibilityPreferenceSchema);
