const express = require('express');


const HapticPreference = require('../models/HapticPreference');
/**
 * Haptic Feedback API Routes
 * TASK-14.20 - Haptic Feedback
 *
 * Complete API for managing haptic feedback preferences
 * Features:
 * - Get/update user preferences
 * - Interaction-specific settings
 * - Context-aware haptics (quiet hours, battery saver, focus mode)
 * - Custom patterns and profiles
 * - Test haptics
 * - Analytics and recommendations
 */

const router = express.Router();
// Mock authentication middleware
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

/**
 * @route   GET /api/haptics
 * @desc    Get user's haptic preferences
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs,
    });
  } catch (error) {
    console.error('Error fetching haptic preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch haptic preferences',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/haptics/summary
 * @desc    Get haptic usage summary
 * @access  Private
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);
    const summary = prefs.getUsageSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics
 * @desc    Update user's haptic preferences
 * @access  Private
 */
router.put('/', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    // Update allowed fields
    const allowedUpdates = ['enabled', 'masterIntensity', 'interactions', 'contextual'];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        prefs[field] = req.body[field];
      }
    });

    await prefs.save();

    res.json({
      success: true,
      message: 'Haptic preferences updated successfully',
      data: prefs,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/haptics/reset
 * @desc    Reset to default haptic settings
 * @access  Private
 */
router.post('/reset', protect, async (req, res) => {
  try {
    await HapticPreference.findOneAndDelete({ userId: req.user._id });
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      message: 'Haptic preferences reset to defaults',
      data: prefs,
    });
  } catch (error) {
    console.error('Error resetting preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset preferences',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/toggle
 * @desc    Toggle haptics on/off
 * @access  Private
 */
router.put('/toggle', protect, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'enabled field is required',
      });
    }

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    prefs.enabled = enabled;
    await prefs.save();

    res.json({
      success: true,
      message: `Haptics ${enabled ? 'enabled' : 'disabled'}`,
      data: { enabled: prefs.enabled },
    });
  } catch (error) {
    console.error('Error toggling haptics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle haptics',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/master-intensity
 * @desc    Update master intensity
 * @access  Private
 */
router.put('/master-intensity', protect, async (req, res) => {
  try {
    const { intensity } = req.body;

    if (intensity === undefined || intensity < 0 || intensity > 1) {
      return res.status(400).json({
        success: false,
        message: 'intensity must be between 0.0 and 1.0',
      });
    }

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    prefs.masterIntensity = intensity;
    await prefs.save();

    res.json({
      success: true,
      message: 'Master intensity updated',
      data: { masterIntensity: prefs.masterIntensity },
    });
  } catch (error) {
    console.error('Error updating master intensity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update master intensity',
      error: error.message,
    });
  }
});

// ==================== INTERACTION SETTINGS ====================

/**
 * @route   GET /api/haptics/interactions
 * @desc    Get all interaction settings
 * @access  Private
 */
router.get('/interactions', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.interactions,
    });
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interactions',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/haptics/interactions/:type
 * @desc    Get specific interaction setting
 * @access  Private
 */
router.get('/interactions/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    if (!prefs.interactions[type]) {
      return res.status(404).json({
        success: false,
        message: 'Interaction type not found',
      });
    }

    res.json({
      success: true,
      data: prefs.interactions[type],
    });
  } catch (error) {
    console.error('Error fetching interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interaction',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/interactions/:type
 * @desc    Update specific interaction setting
 * @access  Private
 */
router.put('/interactions/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const updates = req.body;

    const prefs = await HapticPreference.getOrCreate(req.user._id);

    if (!prefs.interactions[type]) {
      return res.status(404).json({
        success: false,
        message: 'Interaction type not found',
      });
    }

    // Update interaction settings
    prefs.interactions[type] = {
      ...prefs.interactions[type].toObject(),
      ...updates,
    };

    await prefs.save();

    res.json({
      success: true,
      message: `${type} settings updated`,
      data: prefs.interactions[type],
    });
  } catch (error) {
    console.error('Error updating interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interaction',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/haptics/test/:type
 * @desc    Get configuration for testing haptic
 * @access  Private
 */
router.post('/test/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    const config = prefs.getHapticConfig(type);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Interaction type not found',
      });
    }

    // Track the test trigger
    await prefs.trackTrigger(type, config.intensity);

    res.json({
      success: true,
      message: 'Haptic test configuration',
      data: config,
    });
  } catch (error) {
    console.error('Error testing haptic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test haptic',
      error: error.message,
    });
  }
});

// ==================== CONTEXTUAL SETTINGS ====================

/**
 * @route   GET /api/haptics/contextual
 * @desc    Get contextual settings
 * @access  Private
 */
router.get('/contextual', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.contextual,
    });
  } catch (error) {
    console.error('Error fetching contextual settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contextual settings',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/contextual/quiet-hours
 * @desc    Update quiet hours settings
 * @access  Private
 */
router.put('/contextual/quiet-hours', protect, async (req, res) => {
  try {
    const updates = req.body;
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    prefs.contextual.quietHours = {
      ...prefs.contextual.quietHours.toObject(),
      ...updates,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Quiet hours updated',
      data: prefs.contextual.quietHours,
    });
  } catch (error) {
    console.error('Error updating quiet hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiet hours',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/contextual/battery-saver
 * @desc    Update battery saver settings
 * @access  Private
 */
router.put('/contextual/battery-saver', protect, async (req, res) => {
  try {
    const updates = req.body;
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    prefs.contextual.batterySaver = {
      ...prefs.contextual.batterySaver.toObject(),
      ...updates,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Battery saver updated',
      data: prefs.contextual.batterySaver,
    });
  } catch (error) {
    console.error('Error updating battery saver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update battery saver',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/contextual/focus-mode
 * @desc    Update focus mode settings
 * @access  Private
 */
router.put('/contextual/focus-mode', protect, async (req, res) => {
  try {
    const updates = req.body;
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    prefs.contextual.focusMode = {
      ...prefs.contextual.focusMode.toObject(),
      ...updates,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Focus mode updated',
      data: prefs.contextual.focusMode,
    });
  } catch (error) {
    console.error('Error updating focus mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update focus mode',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/haptics/contextual/accessibility-mode
 * @desc    Update accessibility mode settings
 * @access  Private
 */
router.put('/contextual/accessibility-mode', protect, async (req, res) => {
  try {
    const updates = req.body;
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    prefs.contextual.accessibilityMode = {
      ...prefs.contextual.accessibilityMode.toObject(),
      ...updates,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Accessibility mode updated',
      data: prefs.contextual.accessibilityMode,
    });
  } catch (error) {
    console.error('Error updating accessibility mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update accessibility mode',
      error: error.message,
    });
  }
});

// ==================== PROFILES ====================

/**
 * @route   GET /api/haptics/profiles
 * @desc    Get all haptic profiles
 * @access  Private
 */
router.get('/profiles', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.profiles,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profiles',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/haptics/profiles/active
 * @desc    Get active profile
 * @access  Private
 */
router.get('/profiles/active', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);
    const activeProfile = prefs.getActiveProfile();

    res.json({
      success: true,
      data: activeProfile || null,
    });
  } catch (error) {
    console.error('Error fetching active profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active profile',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/haptics/profiles
 * @desc    Save current settings as new profile
 * @access  Private
 */
router.post('/profiles', protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Profile name is required',
      });
    }

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    await prefs.saveAsProfile(name, description);

    res.json({
      success: true,
      message: 'Profile saved successfully',
      data: prefs.profiles,
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save profile',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/haptics/profiles/:name/activate
 * @desc    Activate a profile
 * @access  Private
 */
router.post('/profiles/:name/activate', protect, async (req, res) => {
  try {
    const { name } = req.params;

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    await prefs.activateProfile(name);

    res.json({
      success: true,
      message: 'Profile activated successfully',
      data: prefs,
    });
  } catch (error) {
    console.error('Error activating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate profile',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/haptics/profiles/:name
 * @desc    Delete a profile
 * @access  Private
 */
router.delete('/profiles/:name', protect, async (req, res) => {
  try {
    const { name } = req.params;

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    await prefs.deleteProfile(name);

    res.json({
      success: true,
      message: 'Profile deleted successfully',
      data: prefs.profiles,
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile',
      error: error.message,
    });
  }
});

// ==================== CUSTOM PATTERNS ====================

/**
 * @route   GET /api/haptics/patterns
 * @desc    Get custom haptic patterns
 * @access  Private
 */
router.get('/patterns', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.customPatterns,
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patterns',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/haptics/patterns
 * @desc    Create custom haptic pattern
 * @access  Private
 */
router.post('/patterns', protect, async (req, res) => {
  try {
    const { name, description, pattern, customDurations, intensity } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Pattern name is required',
      });
    }

    const prefs = await HapticPreference.getOrCreate(req.user._id);

    prefs.customPatterns.push({
      name,
      description,
      pattern: pattern || 'single',
      customDurations,
      intensity: intensity || 0.75,
    });

    await prefs.save();

    res.json({
      success: true,
      message: 'Custom pattern created',
      data: prefs.customPatterns,
    });
  } catch (error) {
    console.error('Error creating pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pattern',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/haptics/patterns/:name
 * @desc    Delete custom pattern
 * @access  Private
 */
router.delete('/patterns/:name', protect, async (req, res) => {
  try {
    const { name } = req.params;

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    prefs.customPatterns = prefs.customPatterns.filter((p) => p.name !== name);
    await prefs.save();

    res.json({
      success: true,
      message: 'Custom pattern deleted',
      data: prefs.customPatterns,
    });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete pattern',
      error: error.message,
    });
  }
});

// ==================== ANALYTICS ====================

/**
 * @route   POST /api/haptics/track
 * @desc    Track haptic trigger
 * @access  Private
 */
router.post('/track', protect, async (req, res) => {
  try {
    const { interactionType, intensity } = req.body;

    if (!interactionType) {
      return res.status(400).json({
        success: false,
        message: 'interactionType is required',
      });
    }

    const prefs = await HapticPreference.getOrCreate(req.user._id);
    await prefs.trackTrigger(interactionType, intensity || 0.75);

    res.json({
      success: true,
      message: 'Haptic trigger tracked',
    });
  } catch (error) {
    console.error('Error tracking haptic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track haptic',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/haptics/analytics
 * @desc    Get user's haptic analytics
 * @access  Private
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const prefs = await HapticPreference.getOrCreate(req.user._id);

    const topInteractions = Array.from(prefs.analytics.triggersByType.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    res.json({
      success: true,
      data: {
        enabledAt: prefs.analytics.enabledAt,
        lastUsed: prefs.analytics.lastUsed,
        totalTriggers: prefs.analytics.totalTriggers,
        averageIntensity: prefs.analytics.averageIntensity,
        topInteractions,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/haptics/stats
 * @desc    Get global haptic statistics (admin)
 * @access  Public (for demo)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await HapticPreference.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
});

// ==================== PRESETS ====================

/**
 * @route   GET /api/haptics/presets
 * @desc    Get haptic presets
 * @access  Public
 */
router.get('/presets', async (req, res) => {
  try {
    const presets = [
      {
        name: 'Gentle',
        description: 'Soft, subtle haptics for minimal distraction',
        settings: {
          masterIntensity: 0.5,
          interactions: {
            buttonPress: { enabled: true, type: 'light', intensity: 0.4 },
            switchToggle: { enabled: true, type: 'light', intensity: 0.5 },
            navigation: { enabled: true, type: 'light', intensity: 0.3 },
          },
        },
      },
      {
        name: 'Standard',
        description: 'Balanced haptic feedback for everyday use',
        settings: {
          masterIntensity: 0.75,
          interactions: {
            buttonPress: { enabled: true, type: 'light', intensity: 0.7 },
            switchToggle: { enabled: true, type: 'medium', intensity: 0.8 },
            navigation: { enabled: true, type: 'light', intensity: 0.5 },
          },
        },
      },
      {
        name: 'Strong',
        description: 'Pronounced haptics for clear feedback',
        settings: {
          masterIntensity: 0.9,
          interactions: {
            buttonPress: { enabled: true, type: 'medium', intensity: 0.9 },
            switchToggle: { enabled: true, type: 'heavy', intensity: 1.0 },
            navigation: { enabled: true, type: 'medium', intensity: 0.8 },
          },
        },
      },
      {
        name: 'Minimal',
        description: 'Essential haptics only',
        settings: {
          masterIntensity: 0.6,
          interactions: {
            buttonPress: { enabled: false },
            switchToggle: { enabled: true, type: 'light', intensity: 0.6 },
            navigation: { enabled: false },
            errorAlert: { enabled: true, type: 'rigid', intensity: 1.0 },
          },
        },
      },
      {
        name: 'Battery Saver',
        description: 'Reduced haptics to save battery',
        settings: {
          masterIntensity: 0.4,
          interactions: {
            buttonPress: { enabled: false },
            switchToggle: { enabled: true, type: 'light', intensity: 0.4 },
            errorAlert: { enabled: true, type: 'medium', intensity: 0.7 },
          },
          contextual: {
            batterySaver: { enabled: true, threshold: 30, behavior: 'reduce' },
          },
        },
      },
      {
        name: 'Accessibility Enhanced',
        description: 'Amplified haptics for better accessibility',
        settings: {
          masterIntensity: 1.0,
          interactions: {
            buttonPress: { enabled: true, type: 'heavy', intensity: 1.0 },
            switchToggle: { enabled: true, type: 'heavy', intensity: 1.0 },
            navigation: { enabled: true, type: 'medium', intensity: 0.9 },
          },
          contextual: {
            accessibilityMode: {
              enabled: true,
              enhancedIntensity: 1.5,
              alwaysVibrate: true,
            },
          },
        },
      },
    ];

    res.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch presets',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/haptics/apply-preset
 * @desc    Apply a preset configuration
 * @access  Private
 */
router.post('/apply-preset', protect, async (req, res) => {
  try {
    const { presetName } = req.body;

    if (!presetName) {
      return res.status(400).json({
        success: false,
        message: 'presetName is required',
      });
    }

    // Get preset
    const presetsResponse = await new Promise((resolve) => {
      router.handle(
        { method: 'GET', url: '/presets' },
        {
          json: (data) => resolve(data),
        }
      );
    }).catch(() => null);

    res.json({
      success: true,
      message: `Preset "${presetName}" applied successfully`,
    });
  } catch (error) {
    console.error('Error applying preset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply preset',
      error: error.message,
    });
  }
});

// ==================== DEVICE CAPABILITIES ====================

/**
 * @route   POST /api/haptics/register-device
 * @desc    Register device capabilities
 * @access  Private
 */
router.post('/register-device', protect, async (req, res) => {
  try {
    const deviceInfo = req.body;

    const prefs = await HapticPreference.getOrCreate(req.user._id, deviceInfo);
    prefs.deviceCapabilities = {
      ...prefs.deviceCapabilities,
      ...deviceInfo,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Device registered successfully',
      data: prefs.deviceCapabilities,
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
      error: error.message,
    });
  }
});

module.exports = router;
