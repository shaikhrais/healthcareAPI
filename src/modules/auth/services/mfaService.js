/**
 * Multi-Factor Authentication (MFA) Service
 * Handles MFA device management and verification
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const MFADevice = require('../models/MFADevice');

class MFAService {
  /**
   * Generate TOTP secret for a user
   */
  generateTOTPSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: `HealthCare API (${userEmail})`,
      issuer: 'HealthCare Management',
      length: 32
    });
    
    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code: ' + error.message);
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps of variance
    });
  }

  /**
   * Generate backup codes for MFA
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    try {
      const device = await MFADevice.findOne({
        userId: userId,
        type: 'backup_codes',
        isActive: true
      });

      if (!device || !device.backupCodes.includes(code)) {
        return false;
      }

      // Remove used backup code
      device.backupCodes = device.backupCodes.filter(c => c !== code);
      await device.save();

      return true;
    } catch (error) {
      console.error('Backup code verification error:', error);
      return false;
    }
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(userId, type, secret, verificationCode) {
    try {
      // Verify the setup with a test code
      if (type === 'totp' && !this.verifyTOTP(verificationCode, secret)) {
        throw new Error('Invalid verification code');
      }

      const mfaDevice = new MFADevice({
        userId: userId,
        type: type,
        secret: secret,
        isActive: true,
        backupCodes: type === 'totp' ? this.generateBackupCodes() : undefined
      });

      await mfaDevice.save();
      return mfaDevice;
    } catch (error) {
      throw new Error('Failed to enable MFA: ' + error.message);
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId, deviceId) {
    try {
      const device = await MFADevice.findOne({
        _id: deviceId,
        userId: userId
      });

      if (!device) {
        throw new Error('MFA device not found');
      }

      device.isActive = false;
      await device.save();

      return true;
    } catch (error) {
      throw new Error('Failed to disable MFA: ' + error.message);
    }
  }

  /**
   * Get user's MFA devices
   */
  async getUserMFADevices(userId) {
    try {
      return await MFADevice.find({
        userId: userId,
        isActive: true
      }).select('-secret -backupCodes');
    } catch (error) {
      throw new Error('Failed to get MFA devices: ' + error.message);
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async hasMFAEnabled(userId) {
    try {
      const count = await MFADevice.countDocuments({
        userId: userId,
        isActive: true
      });
      return count > 0;
    } catch (error) {
      console.error('MFA check error:', error);
      return false;
    }
  }
}

// Singleton instance
let mfaServiceInstance = null;

function getMFAService() {
  if (!mfaServiceInstance) {
    mfaServiceInstance = new MFAService();
  }
  return mfaServiceInstance;
}

module.exports = {
  MFAService,
  getMFAService
};