const express = require('express');

/**
 * @swagger
 * components:
 *   schemas:
 *     AccessibilityPreference:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID
 *         screenReader:
 *           $ref: '#/components/schemas/ScreenReaderSettings'
 *         visual:
 *           $ref: '#/components/schemas/VisualSettings'
 *         motor:
 *           $ref: '#/components/schemas/MotorSettings'
 *         cognitive:
 *           $ref: '#/components/schemas/CognitiveSettings'
 *         hearing:
 *           $ref: '#/components/schemas/HearingSettings'
 *         notifications:
 *           $ref: '#/components/schemas/NotificationSettings'
 *         keyboard:
 *           $ref: '#/components/schemas/KeyboardSettings'
 *         profiles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/AccessibilityProfile'
 *         analytics:
 *           $ref: '#/components/schemas/AccessibilityAnalytics'
 *
 *     ScreenReaderSettings:
 *       type: object
 *       properties:
 *         enabled:
 *           type: boolean
 *           description: Enable screen reader support
 *         verbosity:
 *           type: string
 *           enum: [minimal, normal, detailed]
 *           description: Screen reader verbosity level
 *         announceChanges:
 *           type: boolean
 *           description: Announce page changes
 *         announceHints:
 *           type: boolean
 *           description: Announce hints and help text
 *         skipLinks:
 *           type: boolean
 *           description: Show skip navigation links
 *         headingNavigation:
 *           type: boolean
 *           description: Enable heading navigation
 *
 *     VisualSettings:
 *       type: object
 *       properties:
 *         fontSize:
 *           type: object
 *           properties:
 *             scale:
 *               type: number
 *               format: float
 *               description: Font size scaling factor
 *             useSystemSetting:
 *               type: boolean
 *               description: Use system font size
 *         boldText:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             weight:
 *               type: integer
 *               description: Font weight
 *         highContrast:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             level:
 *               type: string
 *               enum: [normal, high, maximum]
 *         colorBlindness:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             type:
 *               type: string
 *               enum: [protanopia, deuteranopia, tritanopia, achromatopsia]
 *             showColorLabels:
 *               type: boolean
 *         reduceMotion:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             level:
 *               type: string
 *               enum: [none, reduce, full]
 *         focusIndicators:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             style:
 *               type: string
 *               enum: [subtle, normal, prominent]
 *         buttonShapes:
 *           type: boolean
 *           description: Show button shapes and borders
 *
 *     MotorSettings:
 *       type: object
 *       properties:
 *         touchTarget:
 *           type: object
 *           properties:
 *             size:
 *               type: string
 *               enum: [small, normal, large, extra-large]
 *             minSize:
 *               type: integer
 *               description: Minimum touch target size in pixels
 *         gestureAlternatives:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             showSwipeButtons:
 *               type: boolean
 *         holdDuration:
 *           type: number
 *           format: float
 *           description: Hold duration in seconds
 *         tapAssistance:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             showTapIndicator:
 *               type: boolean
 *
 *     CognitiveSettings:
 *       type: object
 *       properties:
 *         simplifiedMode:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             hideNonEssential:
 *               type: boolean
 *             reducedAnimations:
 *               type: boolean
 *         readingMode:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             lineHeight:
 *               type: number
 *               format: float
 *         autoplay:
 *           type: object
 *           properties:
 *             videos:
 *               type: boolean
 *             animations:
 *               type: boolean
 *
 *     HearingSettings:
 *       type: object
 *       properties:
 *         captions:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             style:
 *               type: object
 *               properties:
 *                 fontSize:
 *                   type: string
 *                 backgroundColor:
 *                   type: string
 *                 textColor:
 *                   type: string
 *         visualAlerts:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             showBanner:
 *               type: boolean
 *         monoAudio:
 *           type: boolean
 *           description: Use mono audio output
 *
 *     NotificationSettings:
 *       type: object
 *       properties:
 *         visualAlerts:
 *           type: boolean
 *         audioAlerts:
 *           type: boolean
 *         vibration:
 *           type: boolean
 *
 *     KeyboardSettings:
 *       type: object
 *       properties:
 *         navigationEnabled:
 *           type: boolean
 *         shortcuts:
 *           type: boolean
 *         stickyKeys:
 *           type: boolean
 *
 *     AccessibilityProfile:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Profile name
 *         description:
 *           type: string
 *           description: Profile description
 *         settings:
 *           type: object
 *           description: Saved accessibility settings
 *         isActive:
 *           type: boolean
 *           description: Whether this profile is currently active
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     AccessibilityAnalytics:
 *       type: object
 *       properties:
 *         enabledAt:
 *           type: string
 *           format: date-time
 *         lastUsed:
 *           type: string
 *           format: date-time
 *         featuresUsed:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           description: Count of feature usage
 *
 *     AccessibilityStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: integer
 *         usersWithAccessibility:
 *           type: integer
 *         mostUsedFeatures:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               feature:
 *                 type: string
 *               count:
 *                 type: integer
 *         adoptionRate:
 *           type: number
 *           format: float
 *
 *     AccessibilityPreset:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Preset name
 *         description:
 *           type: string
 *           description: Preset description
 *         settings:
 *           type: object
 *           description: Preset accessibility settings
 *
 *     AccessibilitySummary:
 *       type: object
 *       properties:
 *         screenReaderEnabled:
 *           type: boolean
 *         visualAccessibilityEnabled:
 *           type: boolean
 *         motorAccessibilityEnabled:
 *           type: boolean
 *         cognitiveAccessibilityEnabled:
 *           type: boolean
 *         hearingAccessibilityEnabled:
 *           type: boolean
 *         activeProfile:
 *           type: string
 *         enabledFeatures:
 *           type: array
 *           items:
 *             type: string
 *
 *   tags:
 *     - name: Accessibility
 *       description: Accessibility preferences and compliance management
 */

const AccessibilityPreference = require('../models/AccessibilityPreference');
/**
 * Accessibility API Routes
 * TASK-14.19 - Accessibility (VoiceOver/TalkBack)
 *
 * Complete API for managing accessibility preferences
 * Features:
 * - Get/update user preferences
 * - Screen reader settings
 * - Visual, motor, cognitive, hearing accessibility
 * - Profile management
 * - System integration
 * - Analytics and recommendations
 */

const router = express.Router();
// Mock authentication middleware (replace with real auth in production)
const protect = (req, res, next) => {
  // In production, verify JWT token and set req.user
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

/**
 * @swagger
 * /api/accessibility:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get user's accessibility preferences
 *     description: Retrieve all accessibility preferences for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accessibility preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityPreference'
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Accessibility]
 *     summary: Update user's accessibility preferences
 *     description: Update accessibility preferences for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               screenReader:
 *                 $ref: '#/components/schemas/ScreenReaderSettings'
 *               visual:
 *                 $ref: '#/components/schemas/VisualSettings'
 *               motor:
 *                 $ref: '#/components/schemas/MotorSettings'
 *               cognitive:
 *                 $ref: '#/components/schemas/CognitiveSettings'
 *               hearing:
 *                 $ref: '#/components/schemas/HearingSettings'
 *               notifications:
 *                 $ref: '#/components/schemas/NotificationSettings'
 *               keyboard:
 *                 $ref: '#/components/schemas/KeyboardSettings'
 *     responses:
 *       200:
 *         description: Accessibility preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityPreference'
 *       500:
 *         description: Server error
 */
router.get('/', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs,
    });
  } catch (error) {
    console.error('Error fetching accessibility preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accessibility preferences',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/summary:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get accessibility summary
 *     description: Get a summary of user's accessibility settings and enabled features
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accessibility summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilitySummary'
 *       500:
 *         description: Server error
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
    const summary = prefs.getSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching accessibility summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accessibility summary',
      error: error.message,
    });
  }
});

router.put('/', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    // Update fields
    const allowedUpdates = [
      'screenReader',
      'visual',
      'motor',
      'cognitive',
      'hearing',
      'notifications',
      'keyboard',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field]) {
        prefs[field] = {
          ...prefs[field].toObject(),
          ...req.body[field],
        };
      }
    });

    await prefs.save();

    res.json({
      success: true,
      message: 'Accessibility preferences updated successfully',
      data: prefs,
    });
  } catch (error) {
    console.error('Error updating accessibility preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update accessibility preferences',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/reset:
 *   post:
 *     tags: [Accessibility]
 *     summary: Reset to default accessibility settings
 *     description: Reset all accessibility preferences to system defaults
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accessibility preferences reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityPreference'
 *       500:
 *         description: Server error
 */
router.post('/reset', protect, async (req, res) => {
  try {
    await AccessibilityPreference.findOneAndDelete({ userId: req.user._id });
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      message: 'Accessibility preferences reset to defaults',
      data: prefs,
    });
  } catch (error) {
    console.error('Error resetting accessibility preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset accessibility preferences',
      error: error.message,
    });
  }
});

// ==================== SCREEN READER ====================

/**
 * @swagger
 * /api/accessibility/screen-reader:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get screen reader settings
 *     description: Retrieve screen reader accessibility settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Screen reader settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ScreenReaderSettings'
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Accessibility]
 *     summary: Update screen reader settings
 *     description: Update screen reader accessibility settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScreenReaderSettings'
 *     responses:
 *       200:
 *         description: Screen reader settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ScreenReaderSettings'
 *       500:
 *         description: Server error
 */
router.get('/screen-reader', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.screenReader,
    });
  } catch (error) {
    console.error('Error fetching screen reader settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch screen reader settings',
      error: error.message,
    });
  }
});

router.put('/screen-reader', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    prefs.screenReader = {
      ...prefs.screenReader.toObject(),
      ...req.body,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Screen reader settings updated successfully',
      data: prefs.screenReader,
    });
  } catch (error) {
    console.error('Error updating screen reader settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update screen reader settings',
      error: error.message,
    });
  }
});

// ==================== VISUAL ACCESSIBILITY ====================

/**
 * @swagger
 * /api/accessibility/visual:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get visual accessibility settings
 *     description: Retrieve visual accessibility settings including font size, contrast, and color preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Visual settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VisualSettings'
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Accessibility]
 *     summary: Update visual accessibility settings
 *     description: Update visual accessibility settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VisualSettings'
 *     responses:
 *       200:
 *         description: Visual settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/VisualSettings'
 *       500:
 *         description: Server error
 */
router.get('/visual', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.visual,
    });
  } catch (error) {
    console.error('Error fetching visual settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch visual settings',
      error: error.message,
    });
  }
});

router.put('/visual', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    prefs.visual = {
      ...prefs.visual.toObject(),
      ...req.body,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Visual settings updated successfully',
      data: prefs.visual,
    });
  } catch (error) {
    console.error('Error updating visual settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visual settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/visual/font-size:
 *   put:
 *     tags: [Accessibility]
 *     summary: Update font size settings
 *     description: Update font size scaling and system settings preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scale:
 *                 type: number
 *                 format: float
 *                 minimum: 0.5
 *                 maximum: 3.0
 *                 description: Font size scaling factor
 *                 example: 1.5
 *               useSystemSetting:
 *                 type: boolean
 *                 description: Use system font size setting
 *     responses:
 *       200:
 *         description: Font size updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     scale:
 *                       type: number
 *                       format: float
 *                     useSystemSetting:
 *                       type: boolean
 *       500:
 *         description: Server error
 */
router.put('/visual/font-size', protect, async (req, res) => {
  try {
    const { scale, useSystemSetting } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (scale !== undefined) {
      prefs.visual.fontSize.scale = scale;
    }
    if (useSystemSetting !== undefined) {
      prefs.visual.fontSize.useSystemSetting = useSystemSetting;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'Font size updated successfully',
      data: prefs.visual.fontSize,
    });
  } catch (error) {
    console.error('Error updating font size:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update font size',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/visual/high-contrast:
 *   put:
 *     tags: [Accessibility]
 *     summary: Update high contrast settings
 *     description: Update high contrast display settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable high contrast mode
 *               level:
 *                 type: string
 *                 enum: [normal, high, maximum]
 *                 description: High contrast intensity level
 *     responses:
 *       200:
 *         description: High contrast settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     level:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.put('/visual/high-contrast', protect, async (req, res) => {
  try {
    const { enabled, level } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (enabled !== undefined) {
      prefs.visual.highContrast.enabled = enabled;
    }
    if (level) {
      prefs.visual.highContrast.level = level;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'High contrast settings updated successfully',
      data: prefs.visual.highContrast,
    });
  } catch (error) {
    console.error('Error updating high contrast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update high contrast',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/visual/color-blindness:
 *   put:
 *     tags: [Accessibility]
 *     summary: Update color blindness settings
 *     description: Update color blindness accommodation settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable color blindness accommodations
 *               type:
 *                 type: string
 *                 enum: [protanopia, deuteranopia, tritanopia, achromatopsia]
 *                 description: Type of color blindness
 *               showColorLabels:
 *                 type: boolean
 *                 description: Show text labels for colors
 *     responses:
 *       200:
 *         description: Color blindness settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     type:
 *                       type: string
 *                     showColorLabels:
 *                       type: boolean
 *       500:
 *         description: Server error
 */
router.put('/visual/color-blindness', protect, async (req, res) => {
  try {
    const { enabled, type, showColorLabels } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (enabled !== undefined) {
      prefs.visual.colorBlindness.enabled = enabled;
    }
    if (type) {
      prefs.visual.colorBlindness.type = type;
    }
    if (showColorLabels !== undefined) {
      prefs.visual.colorBlindness.showColorLabels = showColorLabels;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'Color blindness settings updated successfully',
      data: prefs.visual.colorBlindness,
    });
  } catch (error) {
    console.error('Error updating color blindness settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update color blindness settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/visual/reduce-motion:
 *   put:
 *     tags: [Accessibility]
 *     summary: Update reduce motion settings
 *     description: Update motion reduction settings for users sensitive to animations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable motion reduction
 *               level:
 *                 type: string
 *                 enum: [none, reduce, full]
 *                 description: Level of motion reduction
 *     responses:
 *       200:
 *         description: Reduce motion settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     level:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.put('/visual/reduce-motion', protect, async (req, res) => {
  try {
    const { enabled, level } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (enabled !== undefined) {
      prefs.visual.reduceMotion.enabled = enabled;
    }
    if (level) {
      prefs.visual.reduceMotion.level = level;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'Reduce motion settings updated successfully',
      data: prefs.visual.reduceMotion,
    });
  } catch (error) {
    console.error('Error updating reduce motion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reduce motion',
      error: error.message,
    });
  }
});

// ==================== MOTOR ACCESSIBILITY ====================

/**
 * @swagger
 * /api/accessibility/motor:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get motor accessibility settings
 *     description: Retrieve motor accessibility settings for users with physical disabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Motor settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MotorSettings'
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Accessibility]
 *     summary: Update motor accessibility settings
 *     description: Update motor accessibility settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MotorSettings'
 *     responses:
 *       200:
 *         description: Motor settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MotorSettings'
 *       500:
 *         description: Server error
 */
router.get('/motor', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.motor,
    });
  } catch (error) {
    console.error('Error fetching motor settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch motor settings',
      error: error.message,
    });
  }
});

router.put('/motor', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    prefs.motor = {
      ...prefs.motor.toObject(),
      ...req.body,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Motor settings updated successfully',
      data: prefs.motor,
    });
  } catch (error) {
    console.error('Error updating motor settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update motor settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/motor/touch-target:
 *   put:
 *     tags: [Accessibility]
 *     summary: Update touch target size
 *     description: Update touch target size settings for easier interaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size:
 *                 type: string
 *                 enum: [small, normal, large, extra-large]
 *                 description: Touch target size
 *               minSize:
 *                 type: integer
 *                 minimum: 24
 *                 maximum: 64
 *                 description: Minimum touch target size in pixels
 *     responses:
 *       200:
 *         description: Touch target settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     size:
 *                       type: string
 *                     minSize:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.put('/motor/touch-target', protect, async (req, res) => {
  try {
    const { size, minSize } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (size) {
      prefs.motor.touchTarget.size = size;
    }
    if (minSize !== undefined) {
      prefs.motor.touchTarget.minSize = minSize;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'Touch target settings updated successfully',
      data: prefs.motor.touchTarget,
    });
  } catch (error) {
    console.error('Error updating touch target:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update touch target',
      error: error.message,
    });
  }
});

// ==================== COGNITIVE ACCESSIBILITY ====================

/**
 * @swagger
 * /api/accessibility/cognitive:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get cognitive accessibility settings
 *     description: Retrieve cognitive accessibility settings for users with cognitive disabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cognitive settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/CognitiveSettings'
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Accessibility]
 *     summary: Update cognitive accessibility settings
 *     description: Update cognitive accessibility settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CognitiveSettings'
 *     responses:
 *       200:
 *         description: Cognitive settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CognitiveSettings'
 *       500:
 *         description: Server error
 */
router.get('/cognitive', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.cognitive,
    });
  } catch (error) {
    console.error('Error fetching cognitive settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cognitive settings',
      error: error.message,
    });
  }
});

router.put('/cognitive', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    prefs.cognitive = {
      ...prefs.cognitive.toObject(),
      ...req.body,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Cognitive settings updated successfully',
      data: prefs.cognitive,
    });
  } catch (error) {
    console.error('Error updating cognitive settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cognitive settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/cognitive/simplified-mode:
 *   put:
 *     tags: [Accessibility]
 *     summary: Toggle simplified mode
 *     description: Update simplified interface mode for cognitive accessibility
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable simplified mode
 *               hideNonEssential:
 *                 type: boolean
 *                 description: Hide non-essential UI elements
 *               reducedAnimations:
 *                 type: boolean
 *                 description: Reduce animations and transitions
 *     responses:
 *       200:
 *         description: Simplified mode updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     hideNonEssential:
 *                       type: boolean
 *                     reducedAnimations:
 *                       type: boolean
 *       500:
 *         description: Server error
 */
router.put('/cognitive/simplified-mode', protect, async (req, res) => {
  try {
    const { enabled, hideNonEssential, reducedAnimations } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (enabled !== undefined) {
      prefs.cognitive.simplifiedMode.enabled = enabled;
    }
    if (hideNonEssential !== undefined) {
      prefs.cognitive.simplifiedMode.hideNonEssential = hideNonEssential;
    }
    if (reducedAnimations !== undefined) {
      prefs.cognitive.simplifiedMode.reducedAnimations = reducedAnimations;
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'Simplified mode updated successfully',
      data: prefs.cognitive.simplifiedMode,
    });
  } catch (error) {
    console.error('Error updating simplified mode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update simplified mode',
      error: error.message,
    });
  }
});

// ==================== HEARING ACCESSIBILITY ====================

/**
 * @swagger
 * /api/accessibility/hearing:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get hearing accessibility settings
 *     description: Retrieve hearing accessibility settings for users with hearing disabilities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hearing settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/HearingSettings'
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Accessibility]
 *     summary: Update hearing accessibility settings
 *     description: Update hearing accessibility settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HearingSettings'
 *     responses:
 *       200:
 *         description: Hearing settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HearingSettings'
 *       500:
 *         description: Server error
 */
router.get('/hearing', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: prefs.hearing,
    });
  } catch (error) {
    console.error('Error fetching hearing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hearing settings',
      error: error.message,
    });
  }
});

router.put('/hearing', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    prefs.hearing = {
      ...prefs.hearing.toObject(),
      ...req.body,
    };

    await prefs.save();

    res.json({
      success: true,
      message: 'Hearing settings updated successfully',
      data: prefs.hearing,
    });
  } catch (error) {
    console.error('Error updating hearing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hearing settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/hearing/captions:
 *   put:
 *     tags: [Accessibility]
 *     summary: Update caption settings
 *     description: Update caption and subtitle settings for hearing accessibility
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable captions
 *               style:
 *                 type: object
 *                 properties:
 *                   fontSize:
 *                     type: string
 *                     description: Caption font size
 *                   backgroundColor:
 *                     type: string
 *                     description: Caption background color
 *                   textColor:
 *                     type: string
 *                     description: Caption text color
 *     responses:
 *       200:
 *         description: Caption settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     style:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.put('/hearing/captions', protect, async (req, res) => {
  try {
    const { enabled, style } = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    if (enabled !== undefined) {
      prefs.hearing.captions.enabled = enabled;
    }
    if (style) {
      prefs.hearing.captions.style = {
        ...prefs.hearing.captions.style.toObject(),
        ...style,
      };
    }

    await prefs.save();

    res.json({
      success: true,
      message: 'Caption settings updated successfully',
      data: prefs.hearing.captions,
    });
  } catch (error) {
    console.error('Error updating captions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update captions',
      error: error.message,
    });
  }
});

// ==================== PROFILES ====================

/**
 * @swagger
 * /api/accessibility/profiles:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get all accessibility profiles
 *     description: Retrieve all saved accessibility profiles for the user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profiles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccessibilityProfile'
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Accessibility]
 *     summary: Save current settings as new profile
 *     description: Save current accessibility settings as a named profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Profile name
 *                 example: "Work Settings"
 *               description:
 *                 type: string
 *                 description: Profile description
 *                 example: "High contrast settings for work computer"
 *     responses:
 *       200:
 *         description: Profile saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccessibilityProfile'
 *       400:
 *         description: Profile name is required
 *       500:
 *         description: Server error
 */
router.get('/profiles', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

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
 * @swagger
 * /api/accessibility/profiles/active:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get active profile
 *     description: Get the currently active accessibility profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityProfile'
 *       500:
 *         description: Server error
 */
router.get('/profiles/active', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
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

router.post('/profiles', protect, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Profile name is required',
      });
    }

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
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
 * @swagger
 * /api/accessibility/profiles/{name}/activate:
 *   post:
 *     tags: [Accessibility]
 *     summary: Activate a profile
 *     description: Activate a saved accessibility profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile name to activate
 *     responses:
 *       200:
 *         description: Profile activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityPreference'
 *       500:
 *         description: Server error
 */
router.post('/profiles/:name/activate', protect, async (req, res) => {
  try {
    const { name } = req.params;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
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
 * @swagger
 * /api/accessibility/profiles/{name}:
 *   delete:
 *     tags: [Accessibility]
 *     summary: Delete a profile
 *     description: Delete a saved accessibility profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Profile name to delete
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccessibilityProfile'
 *       500:
 *         description: Server error
 */
router.delete('/profiles/:name', protect, async (req, res) => {
  try {
    const { name } = req.params;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
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

// ==================== SYSTEM INTEGRATION ====================

/**
 * @swagger
 * /api/accessibility/sync-system:
 *   post:
 *     tags: [Accessibility]
 *     summary: Sync with device system settings
 *     description: Synchronize accessibility settings with device system preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fontSize:
 *                 type: number
 *                 description: System font size
 *               highContrast:
 *                 type: boolean
 *                 description: System high contrast setting
 *               reduceMotion:
 *                 type: boolean
 *                 description: System reduce motion setting
 *               screenReader:
 *                 type: boolean
 *                 description: System screen reader status
 *     responses:
 *       200:
 *         description: System settings synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityPreference'
 *       500:
 *         description: Server error
 */
router.post('/sync-system', protect, async (req, res) => {
  try {
    const systemSettings = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
    await prefs.applySystemSettings(systemSettings);

    res.json({
      success: true,
      message: 'System settings synced successfully',
      data: prefs,
    });
  } catch (error) {
    console.error('Error syncing system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync system settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/recommendations:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get recommended settings based on device
 *     description: Get accessibility recommendations based on device capabilities and user patterns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceType
 *         schema:
 *           type: string
 *           enum: [mobile, tablet, desktop]
 *         description: Device type
 *       - in: query
 *         name: screenSize
 *         schema:
 *           type: string
 *         description: Screen size information
 *       - in: query
 *         name: operatingSystem
 *         schema:
 *           type: string
 *         description: Operating system
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           setting:
 *                             type: string
 *                           reason:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [low, medium, high]
 *       500:
 *         description: Server error
 */
router.get('/recommendations', protect, async (req, res) => {
  try {
    const systemSettings = req.query;
    const recommended = AccessibilityPreference.getRecommendedSettings(systemSettings);

    res.json({
      success: true,
      data: recommended,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message,
    });
  }
});

// ==================== BACKUP & RESTORE ====================

/**
 * @swagger
 * /api/accessibility/export:
 *   get:
 *     tags: [Accessibility]
 *     summary: Export accessibility settings
 *     description: Export all accessibility settings for backup or transfer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Exported accessibility settings
 *       500:
 *         description: Server error
 */
router.get('/export', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
    const exported = prefs.exportSettings();

    res.json({
      success: true,
      data: exported,
    });
  } catch (error) {
    console.error('Error exporting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export settings',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/import:
 *   post:
 *     tags: [Accessibility]
 *     summary: Import accessibility settings
 *     description: Import previously exported accessibility settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Previously exported accessibility settings
 *     responses:
 *       200:
 *         description: Settings imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityPreference'
 *       500:
 *         description: Server error
 */
router.post('/import', protect, async (req, res) => {
  try {
    const settings = req.body;

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
    await prefs.importSettings(settings);

    res.json({
      success: true,
      message: 'Settings imported successfully',
      data: prefs,
    });
  } catch (error) {
    console.error('Error importing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import settings',
      error: error.message,
    });
  }
});

// ==================== ANALYTICS ====================

/**
 * @swagger
 * /api/accessibility/track-feature:
 *   post:
 *     tags: [Accessibility]
 *     summary: Track feature usage
 *     description: Track usage of accessibility features for analytics
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feature
 *             properties:
 *               feature:
 *                 type: string
 *                 description: Feature name to track
 *                 example: "screen_reader_enabled"
 *     responses:
 *       200:
 *         description: Feature usage tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Feature name is required
 *       500:
 *         description: Server error
 */
router.post('/track-feature', protect, async (req, res) => {
  try {
    const { feature } = req.body;

    if (!feature) {
      return res.status(400).json({
        success: false,
        message: 'Feature name is required',
      });
    }

    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);
    await prefs.trackFeatureUsage(feature);

    res.json({
      success: true,
      message: 'Feature usage tracked',
    });
  } catch (error) {
    console.error('Error tracking feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track feature',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/accessibility/analytics:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get user's accessibility analytics
 *     description: Get analytics data for user's accessibility feature usage
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabledAt:
 *                       type: string
 *                       format: date-time
 *                     lastUsed:
 *                       type: string
 *                       format: date-time
 *                     mostUsedFeatures:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           feature:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     totalUsage:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const prefs = await AccessibilityPreference.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: {
        enabledAt: prefs.analytics.enabledAt,
        lastUsed: prefs.analytics.lastUsed,
        mostUsedFeatures: Array.from(prefs.analytics.featuresUsed.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([feature, count]) => ({ feature, count })),
        totalUsage: Array.from(prefs.analytics.featuresUsed.values()).reduce(
          (sum, count) => sum + count,
          0
        ),
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
 * @swagger
 * /api/accessibility/stats:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get global accessibility statistics
 *     description: Get system-wide accessibility statistics (admin view)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AccessibilityStats'
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await AccessibilityPreference.getStats();

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
 * @swagger
 * /api/accessibility/presets:
 *   get:
 *     tags: [Accessibility]
 *     summary: Get accessibility presets
 *     description: Get common accessibility configuration presets
 *     responses:
 *       200:
 *         description: Presets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccessibilityPreset'
 *       500:
 *         description: Server error
 */
router.get('/presets', async (req, res) => {
  try {
    const presets = [
      {
        name: 'Screen Reader Optimized',
        description: 'Optimized for VoiceOver and TalkBack users',
        settings: {
          screenReader: {
            enabled: true,
            verbosity: 'detailed',
            announceChanges: true,
            announceHints: true,
          },
          motor: {
            touchTarget: { size: 'large', minSize: 48 },
            gestureAlternatives: { enabled: true, showSwipeButtons: true },
          },
          visual: {
            focusIndicators: { enabled: true, style: 'prominent' },
          },
        },
      },
      {
        name: 'Low Vision',
        description: 'For users with low vision',
        settings: {
          visual: {
            fontSize: { scale: 2.0 },
            boldText: { enabled: true, weight: 700 },
            highContrast: { enabled: true, level: 'high' },
            buttonShapes: true,
          },
        },
      },
      {
        name: 'Motor Impairment',
        description: 'Easier interaction for motor impairments',
        settings: {
          motor: {
            touchTarget: { size: 'extra-large', minSize: 56 },
            gestureAlternatives: { enabled: true, showSwipeButtons: true },
            holdDuration: 2.0,
            tapAssistance: { enabled: true, showTapIndicator: true },
          },
        },
      },
      {
        name: 'Cognitive Support',
        description: 'Simplified interface for cognitive accessibility',
        settings: {
          cognitive: {
            simplifiedMode: { enabled: true, hideNonEssential: true, reducedAnimations: true },
            focusIndicators: { enabled: true, style: 'prominent' },
            readingMode: { enabled: true, lineHeight: 2.0 },
            autoplay: { videos: false, animations: false },
          },
          visual: {
            reduceMotion: { enabled: true, level: 'full' },
          },
        },
      },
      {
        name: 'Hearing Impaired',
        description: 'For users with hearing disabilities',
        settings: {
          hearing: {
            captions: { enabled: true },
            visualAlerts: { enabled: true, showBanner: true },
            monoAudio: true,
          },
        },
      },
      {
        name: 'Color Blindness',
        description: 'For users with color vision deficiencies',
        settings: {
          visual: {
            colorBlindness: { enabled: true, showColorLabels: true },
            highContrast: { enabled: true },
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
 * @swagger
 * /api/accessibility/apply-preset:
 *   post:
 *     tags: [Accessibility]
 *     summary: Apply a preset configuration
 *     description: Apply a predefined accessibility configuration preset
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - presetName
 *             properties:
 *               presetName:
 *                 type: string
 *                 description: Name of the preset to apply
 *                 example: "Screen Reader Optimized"
 *     responses:
 *       200:
 *         description: Preset applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/apply-preset', protect, async (req, res) => {
  try {
    const { presetName } = req.body;

    // Get preset
    const presetsResponse = await router.handle(
      { method: 'GET', url: '/api/accessibility/presets' },
      res
    );

    res.json({
      success: true,
      message: `Preset "${presetName}" applied successfully (implementation pending)`,
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

module.exports = router;
