/**
 * SMS Service for Phone Verification
 * Supports Twilio integration for sending verification codes
 */

const crypto = require('crypto');

class SMSService {
  constructor() {
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize Twilio client if credentials are available
    if (this.twilioAccountSid && this.twilioAuthToken) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(this.twilioAccountSid, this.twilioAuthToken);
        console.log('✅ Twilio SMS service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Twilio:', error.message);
        this.twilioClient = null;
      }
    } else {
      console.log('⚠️ Twilio credentials not found, using mock SMS service');
      this.twilioClient = null;
    }
  }

  /**
   * Send verification SMS
   */
  async sendVerificationSMS(phoneNumber, verificationCode) {
    const message = `Your healthcare verification code is: ${verificationCode}. This code expires in 10 minutes.`;
    
    try {
      if (this.twilioClient && this.isProduction) {
        // Send real SMS in production
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: phoneNumber
        });
        
        console.log(`✅ SMS sent successfully. SID: ${result.sid}`);
        return {
          success: true,
          messageId: result.sid,
          provider: 'twilio'
        };
      } else {
        // Mock SMS in development
        console.log(`📱 MOCK SMS to ${phoneNumber}: ${message}`);
        return {
          success: true,
          messageId: 'mock_' + crypto.randomBytes(8).toString('hex'),
          provider: 'mock'
        };
      }
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSMS(phoneNumber, resetCode) {
    const message = `Your healthcare password reset code is: ${resetCode}. This code expires in 60 minutes.`;
    
    try {
      if (this.twilioClient && this.isProduction) {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: phoneNumber
        });
        
        return {
          success: true,
          messageId: result.sid,
          provider: 'twilio'
        };
      } else {
        console.log(`📱 MOCK RESET SMS to ${phoneNumber}: ${message}`);
        return {
          success: true,
          messageId: 'mock_reset_' + crypto.randomBytes(8).toString('hex'),
          provider: 'mock'
        };
      }
    } catch (error) {
      console.error('❌ Password reset SMS failed:', error);
      throw new Error(`Failed to send password reset SMS: ${error.message}`);
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Basic international format validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Format phone number for storage
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if not present and number doesn't start with it
    if (!cleaned.startsWith('+')) {
      // Assume North American number if no country code
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }

  /**
   * Generate verification code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash verification code for storage
   */
  hashVerificationCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Check if SMS service is available
   */
  isAvailable() {
    return this.twilioClient !== null || !this.isProduction;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      provider: this.twilioClient ? 'twilio' : 'mock',
      production: this.isProduction,
      configured: Boolean(this.twilioAccountSid && this.twilioAuthToken)
    };
  }
}

// Create singleton instance
let smsServiceInstance = null;

/**
 * Get SMS service instance
 */
function getSMSService() {
  if (!smsServiceInstance) {
    smsServiceInstance = new SMSService();
  }
  return smsServiceInstance;
}

module.exports = {
  SMSService,
  getSMSService
};