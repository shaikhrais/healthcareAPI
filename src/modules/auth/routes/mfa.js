const express = require('express');
const router = express.Router();
const MFAService = require('../services/mfaService');
const { auth, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for MFA operations
const mfaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many MFA attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 verification attempts per windowMs
  message: 'Too many verification attempts, please wait before trying again.',
});

// @route   POST /api/mfa/setup/totp
// @desc    Setup TOTP (Time-based One-Time Password) for user
// @access  Private
router.post('/setup/totp', auth, mfaRateLimit, async (req, res) => {
  try {
    const { deviceName } = req.body;
    
    const result = await MFAService.setupTOTP(
      req.user.id, 
      deviceName || 'Authenticator App'
    );
    
    res.json({
      success: true,
      message: 'TOTP setup initiated. Scan QR code with authenticator app.',
      data: result
    });
  } catch (error) {
    console.error('TOTP setup error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to setup TOTP'
    });
  }
});

// @route   POST /api/mfa/setup/sms
// @desc    Setup SMS MFA for user
// @access  Private
router.post('/setup/sms', auth, mfaRateLimit, async (req, res) => {
  try {
    const { phoneNumber, deviceName } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const result = await MFAService.setupSMS(
      req.user.id, 
      phoneNumber, 
      deviceName || 'Phone SMS'
    );
    
    res.json({
      success: true,
      message: 'SMS MFA setup initiated. Check your phone for verification code.',
      data: result
    });
  } catch (error) {
    console.error('SMS setup error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to setup SMS MFA'
    });
  }
});

// @route   POST /api/mfa/verify/setup
// @desc    Verify MFA device during setup
// @access  Private
router.post('/verify/setup', auth, verifyRateLimit, async (req, res) => {
  try {
    const { deviceId, code, deviceType } = req.body;
    
    if (!deviceId || !code) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and verification code are required'
      });
    }
    
    let result;
    
    if (deviceType === 'totp') {
      result = await MFAService.verifyTOTP(deviceId, code);
    } else if (deviceType === 'sms') {
      result = await MFAService.verifySMS(deviceId, code);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid device type'
      });
    }
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        backupCodes: result.backupCodes
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify MFA device'
    });
  }
});

// @route   POST /api/mfa/verify/login
// @desc    Verify MFA code during login
// @access  Public (called during login process)
router.post('/verify/login', verifyRateLimit, async (req, res) => {
  try {
    const { userId, code, deviceType } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'User ID and MFA code are required'
      });
    }
    
    const result = await MFAService.verifyMFA(userId, code, deviceType);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        usedBackupCode: result.usedBackupCode,
        remainingBackupCodes: result.remainingBackupCodes
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('MFA login verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'MFA verification failed'
    });
  }
});

// @route   GET /api/mfa/devices
// @desc    Get user's MFA devices
// @access  Private
router.get('/devices', auth, async (req, res) => {
  try {
    const devices = await MFAService.getUserMFADevices(req.user.id);
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    console.error('Get MFA devices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get MFA devices'
    });
  }
});

// @route   POST /api/mfa/devices/:deviceId/disable
// @desc    Disable MFA device
// @access  Private
router.post('/devices/:deviceId/disable', auth, async (req, res) => {
  try {
    const result = await MFAService.disableDevice(req.user.id, req.params.deviceId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Disable MFA device error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to disable MFA device'
    });
  }
});

// @route   POST /api/mfa/devices/:deviceId/backup-codes
// @desc    Generate new backup codes
// @access  Private
router.post('/devices/:deviceId/backup-codes', auth, async (req, res) => {
  try {
    const result = await MFAService.generateNewBackupCodes(req.user.id, req.params.deviceId);
    
    res.json({
      success: true,
      message: result.message,
      backupCodes: result.backupCodes
    });
  } catch (error) {
    console.error('Generate backup codes error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate backup codes'
    });
  }
});

// @route   GET /api/mfa/requirements
// @desc    Check MFA requirements for current user
// @access  Private
router.get('/requirements', auth, async (req, res) => {
  try {
    const requirements = await MFAService.requiresMFA(req.user.id);
    
    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('MFA requirements check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check MFA requirements'
    });
  }
});

// @route   POST /api/mfa/send-sms
// @desc    Send SMS verification code to active SMS device
// @access  Private
router.post('/send-sms', auth, mfaRateLimit, async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }
    
    const result = await MFAService.sendSMSCode(req.user.id, deviceId);
    
    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('Send SMS code error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send SMS code'
    });
  }
});

// @route   GET /api/mfa/status
// @desc    Get MFA status for current user
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const [devices, requirements] = await Promise.all([
      MFAService.getUserMFADevices(req.user.id),
      MFAService.requiresMFA(req.user.id)
    ]);
    
    const activeDevices = devices.filter(d => d.isActive && d.isVerified);
    const hasMFA = activeDevices.length > 0;
    
    res.json({
      success: true,
      data: {
        hasMFA,
        totalDevices: devices.length,
        activeDevices: activeDevices.length,
        deviceTypes: [...new Set(activeDevices.map(d => d.type))],
        isRequired: requirements.required,
        isEnforced: requirements.shouldEnforce,
        lastMFAUsed: activeDevices.length > 0 ? 
          Math.max(...activeDevices.map(d => new Date(d.lastUsed || 0).getTime())) : null
      }
    });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get MFA status'
    });
  }
});

module.exports = router;