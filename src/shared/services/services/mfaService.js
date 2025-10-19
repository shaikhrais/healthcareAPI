const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const MFADevice = require('../models/MFADevice');
const User = require('../models/User');

class MFAService {
  /**
   * Generate TOTP setup for user
   */
  static async setupTOTP(userId, deviceName = 'Authenticator App') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `ExpoJane (${user.email})`,
        issuer: 'ExpoJane Healthcare',
        length: 32
      });

      // Create QR code URL
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      // Create MFA device record
      const device = new MFADevice({
        user: userId,
        deviceType: 'totp',
        name: deviceName,
        secret: secret.base32,
        qrCodeUrl: qrCodeUrl,
        isActive: false, // Will be activated after verification
        isVerified: false
      });

      await device.save();

      return {
        deviceId: device._id,
        secret: secret.base32,
        qrCodeUrl: qrCodeUrl,
        manualEntryKey: secret.base32,
        setupUri: secret.otpauth_url
      };
    } catch (error) {
      throw new Error(`Failed to setup TOTP: ${error.message}`);
    }
  }

  /**
   * Verify TOTP token and activate device
   */
  static async verifyTOTP(deviceId, token, window = 1) {
    try {
      const device = await MFADevice.findById(deviceId).select('+secret');
      if (!device || device.deviceType !== 'totp') {
        throw new Error('Invalid TOTP device');
      }

      const verified = speakeasy.totp.verify({
        secret: device.secret,
        encoding: 'base32',
        token: token,
        window: window
      });

      if (!verified) {
        return { success: false, message: 'Invalid verification code' };
      }

      // Activate and verify device
      device.isActive = true;
      device.isVerified = true;
      device.recordUsage();
      await device.save();

      // Generate backup codes
      const backupCodes = device.generateBackupCodes();
      await device.save();

      return {
        success: true,
        message: 'TOTP device activated successfully',
        backupCodes: backupCodes
      };
    } catch (error) {
      throw new Error(`Failed to verify TOTP: ${error.message}`);
    }
  }

  /**
   * Setup SMS MFA
   */
  static async setupSMS(userId, phoneNumber, deviceName = 'Phone SMS') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Invalid phone number');
      }

      const device = new MFADevice({
        user: userId,
        deviceType: 'sms',
        name: deviceName,
        target: `+1${cleanPhone}`, // Assuming US format
        isActive: false,
        isVerified: false
      });

      await device.save();

      // Generate verification code
      const code = crypto.randomInt(100000, 999999).toString();
      
      // In a real implementation, send SMS here
      // await smsService.sendVerificationCode(device.target, code);
      
      // For demo, we'll store the code temporarily (in real app, use Redis/cache)
      device.verificationCode = code;
      device.verificationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await device.save();

      return {
        deviceId: device._id,
        maskedPhone: device.maskedTarget,
        message: 'Verification code sent via SMS'
      };
    } catch (error) {
      throw new Error(`Failed to setup SMS: ${error.message}`);
    }
  }

  /**
   * Verify SMS code and activate device
   */
  static async verifySMS(deviceId, code) {
    try {
      const device = await MFADevice.findById(deviceId);
      if (!device || device.deviceType !== 'sms') {
        throw new Error('Invalid SMS device');
      }

      // In real implementation, verify against sent code
      // For demo, check stored code
      if (device.verificationCode !== code) {
        return { success: false, message: 'Invalid verification code' };
      }

      if (new Date() > device.verificationExpiry) {
        return { success: false, message: 'Verification code expired' };
      }

      // Activate device
      device.isActive = true;
      device.isVerified = true;
      device.verificationCode = undefined;
      device.verificationExpiry = undefined;
      device.recordUsage();
      await device.save();

      // Generate backup codes
      const backupCodes = device.generateBackupCodes();
      await device.save();

      return {
        success: true,
        message: 'SMS device activated successfully',
        backupCodes: backupCodes
      };
    } catch (error) {
      throw new Error(`Failed to verify SMS: ${error.message}`);
    }
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMFA(userId, token, deviceType = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let device;
      
      if (deviceType) {
        // Try specific device type
        device = await MFADevice.findOne({
          user: userId,
          deviceType: deviceType,
          isActive: true,
          isVerified: true
        }).select('+secret +backupCodes');
      } else {
        // Try primary device
        device = await MFADevice.getPrimaryDevice(userId);
        if (device) {
          device = await MFADevice.findById(device._id).select('+secret +backupCodes');
        }
      }

      if (!device) {
        throw new Error('No active MFA device found');
      }

      let verified = false;
      let usedBackupCode = false;

      // Try different verification methods based on device type
      if (device.deviceType === 'totp') {
        verified = speakeasy.totp.verify({
          secret: device.secret,
          encoding: 'base32',
          token: token,
          window: 1
        });
      } else if (device.deviceType === 'sms') {
        // In real implementation, verify SMS code
        verified = token === device.lastSentCode; // Demo logic
      }

      // If primary verification fails, try backup codes
      if (!verified && token.length === 8) {
        verified = device.verifyBackupCode(token);
        usedBackupCode = verified;
      }

      if (verified) {
        device.recordUsage();
        await device.save();

        return {
          success: true,
          message: usedBackupCode ? 'Backup code verified' : 'MFA verified successfully',
          usedBackupCode: usedBackupCode,
          remainingBackupCodes: usedBackupCode ? 
            device.backupCodes.filter(bc => !bc.used).length : null
        };
      }

      return {
        success: false,
        message: 'Invalid MFA code'
      };
    } catch (error) {
      throw new Error(`MFA verification failed: ${error.message}`);
    }
  }

  /**
   * Get user's MFA devices
   */
  static async getUserMFADevices(userId) {
    try {
      const devices = await MFADevice.getUserDevices(userId);
      
      return devices.map(device => ({
        id: device._id,
        name: device.name,
        type: device.deviceType,
        maskedTarget: device.maskedTarget,
        isActive: device.isActive,
        isVerified: device.isVerified,
        lastUsed: device.lastUsed,
        useCount: device.useCount,
        createdAt: device.createdAt
      }));
    } catch (error) {
      throw new Error(`Failed to get MFA devices: ${error.message}`);
    }
  }

  /**
   * Disable MFA device
   */
  static async disableDevice(userId, deviceId) {
    try {
      const device = await MFADevice.findOne({
        _id: deviceId,
        user: userId
      });

      if (!device) {
        throw new Error('MFA device not found');
      }

      device.isActive = false;
      await device.save();

      return {
        success: true,
        message: 'MFA device disabled successfully'
      };
    } catch (error) {
      throw new Error(`Failed to disable device: ${error.message}`);
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId, deviceId) {
    try {
      const device = await MFADevice.findOne({
        _id: deviceId,
        user: userId,
        isActive: true,
        isVerified: true
      });

      if (!device) {
        throw new Error('MFA device not found or not active');
      }

      const backupCodes = device.generateBackupCodes();
      await device.save();

      return {
        success: true,
        backupCodes: backupCodes,
        message: 'New backup codes generated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to generate backup codes: ${error.message}`);
    }
  }

  /**
   * Check if user requires MFA
   */
  static async requiresMFA(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // Check if MFA is required for this user's role
      const mfaRequiredRoles = ['admin', 'super_admin', 'full_access'];
      const roleRequiresMFA = mfaRequiredRoles.includes(user.role);

      // Check if user has MFA enabled
      const hasMFA = await MFADevice.hasMFAEnabled(userId);

      return {
        required: roleRequiresMFA,
        enabled: hasMFA,
        shouldEnforce: roleRequiresMFA && hasMFA
      };
    } catch (error) {
      throw new Error(`Failed to check MFA requirements: ${error.message}`);
    }
  }

  /**
   * Send SMS verification code (placeholder for real SMS service)
   */
  static async sendSMSCode(userId, deviceId) {
    try {
      const device = await MFADevice.findOne({
        _id: deviceId,
        user: userId,
        deviceType: 'sms',
        isActive: true,
        isVerified: true
      });

      if (!device) {
        throw new Error('SMS device not found');
      }

      const code = crypto.randomInt(100000, 999999).toString();
      
      // In real implementation:
      // await smsService.sendCode(device.target, code);
      
      // Store code temporarily (use Redis in production)
      device.lastSentCode = code;
      device.codeSentAt = new Date();
      await device.save();

      return {
        success: true,
        message: `Verification code sent to ${device.maskedTarget}`,
        expiresIn: 300 // 5 minutes
      };
    } catch (error) {
      throw new Error(`Failed to send SMS code: ${error.message}`);
    }
  }
}

module.exports = MFAService;