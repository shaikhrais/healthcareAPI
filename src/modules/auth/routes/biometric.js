/**
 * Biometric Authentication Routes
 * Handle Face ID, Touch ID, and fingerprint authentication for mobile devices
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');

const User = require('../models/User');
const BiometricDevice = require('../models/BiometricDevice');
const { auth: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for biometric operations
const {
  biometricRegister: authLimiter,
  strict: strictLimiter,
} = require('../middleware/rateLimiter');

// IP throttling
const { middleware: ipBlockMiddleware } = require('../middleware/ipThrottle');

// Mock middleware for missing functions
const recordFailedAuth = (req, res, next) => next();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const BIOMETRIC_TOKEN_EXPIRY = parseInt(process.env.BIOMETRIC_TOKEN_EXPIRY_HOURS || '24', 10) * 60 * 60 * 1000;

/**
 * @route   POST /api/auth/biometric/register
 * @desc    Register biometric authentication for device
 * @access  Private
 */
router.post(
  '/register',
  authMiddleware,
  authLimiter,
  [
    body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('biometricType')
      .isIn(['face_id', 'touch_id', 'fingerprint', 'voice_print'])
      .withMessage('Valid biometric type required'),
    body('publicKey').isString().notEmpty().withMessage('Public key is required'),
    body('biometricData').isString().notEmpty().withMessage('Biometric data is required'),
    body('deviceInfo').isObject().withMessage('Device info is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId, biometricType, publicKey, biometricData, deviceInfo } = req.body;
      const userId = req.user.id;

      // Check if biometric already registered for this device
      const existingBiometric = await BiometricDevice.findOne({
        user: userId,
        deviceId,
        biometricType,
        isActive: true,
      });

      if (existingBiometric) {
        return res.status(400).json({
          error: 'Biometric authentication already registered for this device',
        });
      }

      // Generate biometric token
      const biometricToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(biometricToken).digest('hex');

      // Create biometric device record
      const biometricDevice = new BiometricDevice({
        user: userId,
        deviceId,
        biometricType,
        publicKey,
        biometricDataHash: crypto.createHash('sha256').update(biometricData).digest('hex'),
        biometricTokenHash: hashedToken,
        deviceInfo,
        registeredAt: new Date(),
        lastUsed: new Date(),
        isActive: true,
      });

      await biometricDevice.save();

      // Generate registration challenge for client verification
      const challenge = crypto.randomBytes(32).toString('base64');
      
      res.json({
        success: true,
        message: 'Biometric authentication registered successfully',
        biometricId: biometricDevice._id,
        challenge, // Client should sign this with their private key
        expiresIn: '24 hours',
      });
    } catch (error) {
      console.error('Biometric registration error:', error);
      res.status(500).json({
        error: 'Failed to register biometric authentication',
        message: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/auth/biometric/authenticate
 * @desc    Authenticate using biometric data
 * @access  Public
 */
router.post(
  '/authenticate',
  authLimiter,
  ipBlockMiddleware,
  [
    body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('biometricType')
      .isIn(['face_id', 'touch_id', 'fingerprint', 'voice_print'])
      .withMessage('Valid biometric type required'),
    body('biometricData').isString().notEmpty().withMessage('Biometric data is required'),
    body('signature').isString().notEmpty().withMessage('Signature is required'),
    body('challenge').isString().notEmpty().withMessage('Challenge is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId, biometricType, biometricData, signature, challenge } = req.body;

      // Find the registered biometric device
      const biometricDevice = await BiometricDevice.findOne({
        deviceId,
        biometricType,
        isActive: true,
      }).populate('user');

      if (!biometricDevice) {
        await recordFailedAuth(req, 'biometric_not_found');
        return res.status(401).json({
          error: 'Biometric authentication not found or inactive',
        });
      }

      // Verify biometric data matches registered data
      const providedDataHash = crypto.createHash('sha256').update(biometricData).digest('hex');
      
      if (providedDataHash !== biometricDevice.biometricDataHash) {
        await recordFailedAuth(req, 'biometric_mismatch');
        biometricDevice.failedAttempts += 1;
        
        if (biometricDevice.failedAttempts >= 5) {
          biometricDevice.isActive = false;
          biometricDevice.suspendedAt = new Date();
          biometricDevice.suspensionReason = 'Too many failed attempts';
        }
        
        await biometricDevice.save();
        
        return res.status(401).json({
          error: 'Biometric authentication failed',
        });
      }

      // Verify signature (in production, implement proper cryptographic verification)
      // This is a simplified version
      const expectedSignature = crypto
        .createHmac('sha256', biometricDevice.publicKey)
        .update(challenge)
        .digest('hex');

      if (signature !== expectedSignature) {
        await recordFailedAuth(req, 'invalid_signature');
        return res.status(401).json({
          error: 'Invalid signature',
        });
      }

      // Check for too many recent failed attempts
      if (biometricDevice.failedAttempts >= 3) {
        const lastAttempt = biometricDevice.lastFailedAttempt;
        const timeSinceLastAttempt = Date.now() - (lastAttempt ? lastAttempt.getTime() : 0);
        
        if (timeSinceLastAttempt < 5 * 60 * 1000) { // 5 minutes
          return res.status(429).json({
            error: 'Too many failed attempts. Please try again later.',
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: biometricDevice.user._id, 
          role: biometricDevice.user.role,
          authMethod: 'biometric',
          deviceId,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update device usage
      biometricDevice.lastUsed = new Date();
      biometricDevice.usageCount += 1;
      biometricDevice.failedAttempts = 0; // Reset failed attempts on success
      biometricDevice.lastFailedAttempt = undefined;
      await biometricDevice.save();

      res.json({
        success: true,
        message: 'Biometric authentication successful',
        token,
        user: biometricDevice.user.toJSON(),
        biometricType,
        deviceId,
      });
    } catch (error) {
      console.error('Biometric authentication error:', error);
      res.status(500).json({
        error: 'Biometric authentication failed',
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/auth/biometric/devices
 * @desc    Get user's registered biometric devices
 * @access  Private
 */
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const devices = await BiometricDevice.find({
      user: userId,
      isActive: true,
    }).select('-biometricDataHash -biometricTokenHash -publicKey');

    res.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('Get biometric devices error:', error);
    res.status(500).json({
      error: 'Failed to get biometric devices',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/auth/biometric/devices/:deviceId
 * @desc    Remove biometric authentication for device
 * @access  Private
 */
router.delete(
  '/devices/:deviceId',
  authMiddleware,
  strictLimiter,
  [param('deviceId').isString().notEmpty().withMessage('Device ID is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId } = req.params;
      const userId = req.user.id;

      const result = await BiometricDevice.updateMany(
        {
          user: userId,
          deviceId,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: 'User requested removal',
          },
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({
          error: 'No active biometric devices found for this device ID',
        });
      }

      res.json({
        success: true,
        message: 'Biometric authentication removed successfully',
        removedDevices: result.modifiedCount,
      });
    } catch (error) {
      console.error('Remove biometric device error:', error);
      res.status(500).json({
        error: 'Failed to remove biometric authentication',
        message: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/auth/biometric/devices/:deviceId/reactivate
 * @desc    Reactivate suspended biometric device
 * @access  Private
 */
router.post(
  '/devices/:deviceId/reactivate',
  authMiddleware,
  strictLimiter,
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('biometricData').isString().notEmpty().withMessage('Biometric data is required for reactivation'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId } = req.params;
      const { biometricData } = req.body;
      const userId = req.user.id;

      const biometricDevice = await BiometricDevice.findOne({
        user: userId,
        deviceId,
        isActive: false,
      });

      if (!biometricDevice) {
        return res.status(404).json({
          error: 'Suspended biometric device not found',
        });
      }

      // Verify biometric data
      const providedDataHash = crypto.createHash('sha256').update(biometricData).digest('hex');
      
      if (providedDataHash !== biometricDevice.biometricDataHash) {
        return res.status(401).json({
          error: 'Biometric verification failed',
        });
      }

      // Reactivate device
      biometricDevice.isActive = true;
      biometricDevice.failedAttempts = 0;
      biometricDevice.suspendedAt = undefined;
      biometricDevice.suspensionReason = undefined;
      biometricDevice.reactivatedAt = new Date();
      await biometricDevice.save();

      res.json({
        success: true,
        message: 'Biometric device reactivated successfully',
      });
    } catch (error) {
      console.error('Reactivate biometric device error:', error);
      res.status(500).json({
        error: 'Failed to reactivate biometric device',
        message: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/auth/biometric/challenge
 * @desc    Generate authentication challenge for biometric login
 * @access  Public
 */
router.post(
  '/challenge',
  authLimiter,
  [
    body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('biometricType')
      .isIn(['face_id', 'touch_id', 'fingerprint', 'voice_print'])
      .withMessage('Valid biometric type required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { deviceId, biometricType } = req.body;

      // Check if device is registered
      const biometricDevice = await BiometricDevice.findOne({
        deviceId,
        biometricType,
        isActive: true,
      });

      if (!biometricDevice) {
        return res.status(404).json({
          error: 'Biometric device not found or inactive',
        });
      }

      // Generate challenge
      const challenge = crypto.randomBytes(32).toString('base64');
      const challengeExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store challenge temporarily (in production, use Redis)
      biometricDevice.currentChallenge = challenge;
      biometricDevice.challengeExpiry = challengeExpiry;
      await biometricDevice.save();

      res.json({
        success: true,
        challenge,
        expiresIn: '5 minutes',
      });
    } catch (error) {
      console.error('Generate biometric challenge error:', error);
      res.status(500).json({
        error: 'Failed to generate authentication challenge',
        message: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/auth/biometric/stats
 * @desc    Get biometric authentication statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await BiometricDevice.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$biometricType',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
          totalUsage: { $sum: '$usageCount' },
          lastUsed: { $max: '$lastUsed' },
        },
      },
    ]);

    const totalDevices = await BiometricDevice.countDocuments({ user: userId });
    const activeDevices = await BiometricDevice.countDocuments({ user: userId, isActive: true });

    res.json({
      success: true,
      stats: {
        totalDevices,
        activeDevices,
        byType: stats,
      },
    });
  } catch (error) {
    console.error('Get biometric stats error:', error);
    res.status(500).json({
      error: 'Failed to get biometric statistics',
      message: error.message,
    });
  }
});

module.exports = router;