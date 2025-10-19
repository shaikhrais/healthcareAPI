const path = require('path');
const nodemailer = require('nodemailer');

const EmailTemplateEngine = require('../../utils/utils/emailTemplateEngine');
/**
 * Email Service
 *
 * Handles sending emails using various providers (Nodemailer, SendGrid, etc.)
 */

class EmailService {
  constructor() {
    this.templateEngine = new EmailTemplateEngine(
      path.join(__dirname, '..', 'templates', 'emails')
    );

    // Initialize email transporter
    this.transporter = this.createTransporter();

    // Default sender
    this.defaultFrom = {
      name: process.env.EMAIL_FROM_NAME || 'ExpoJane',
      email: process.env.EMAIL_FROM_ADDRESS || 'noreply@expojane.com',
    };

    // Application settings
    this.appName = process.env.APP_NAME || 'ExpoJane';
    this.appUrl = process.env.APP_URL || 'http://localhost:8081';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@expojane.com';
    this.supportUrl = `${this.appUrl}/support`;
    this.companyAddress =
      process.env.COMPANY_ADDRESS || '123 Healthcare St, Medical City, MC 12345';
  }

  /**
   * Create email transporter based on environment
   */
  createTransporter() {
    const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

    if (emailProvider === 'sendgrid') {
      // SendGrid configuration
      return nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    }
    if (emailProvider === 'ses') {
      // AWS SES configuration
      const aws = require('@aws-sdk/client-ses');
      return nodemailer.createTransport({
        SES: { ses: new aws.SES(), aws },
      });
    }
    // Default SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Get common template variables
   */
  getCommonVariables() {
    return {
      appName: this.appName,
      appUrl: this.appUrl,
      supportUrl: this.supportUrl,
      supportEmail: this.supportEmail,
      companyAddress: this.companyAddress,
      currentYear: new Date().getFullYear(),
    };
  }

  /**
   * Send a raw email
   */
  async sendEmail(to, subject, html, text = null) {
    const mailOptions = {
      from: `${this.defaultFrom.name} <${this.defaultFrom.email}>`,
      to,
      subject,
      html,
      text: text || this.templateEngine.htmlToText(html),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('Error sending email:', err);
      throw err;
    }
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(to, templateName, templateData, subject) {
    const data = {
      ...this.getCommonVariables(),
      ...templateData,
    };

    const email = await this.templateEngine.createEmail(templateName, data, subject);
    return await this.sendEmail(to, email.subject, email.html, email.text);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken, expiresAt) {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
    const expiresInMinutes = process.env.PASSWORD_RESET_EXPIRY_MINUTES || 60;

    const templateData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      resetToken,
      resetUrl,
      expiresAt: new Date(expiresAt).toLocaleString(),
      expiresInMinutes,
    };

    return await this.sendTemplateEmail(
      user.email,
      'auth/password-reset',
      templateData,
      'Reset Your Password - {{appName}}'
    );
  }

  /**
   * Send password reset success confirmation
   */
  async sendPasswordResetSuccessEmail(user, ipAddress, device, location) {
    const loginUrl = `${this.appUrl}/login`;

    const templateData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      resetDate: new Date().toLocaleString(),
      ipAddress: ipAddress || 'Unknown',
      device: device || 'Unknown',
      location: location || 'Unknown',
      loginUrl,
    };

    return await this.sendTemplateEmail(
      user.email,
      'auth/password-reset-success',
      templateData,
      'Password Reset Successful - {{appName}}'
    );
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    const loginUrl = `${this.appUrl}/login`;

    const templateData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      loginUrl,
    };

    return await this.sendTemplateEmail(
      user.email,
      'auth/welcome',
      templateData,
      'Welcome to {{appName}}!'
    );
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(user, verificationCode, expiresAt) {
    const verificationUrl = `${this.appUrl}/verify-email?code=${verificationCode}`;
    const expiresInMinutes = process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || 60;

    const templateData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      verificationCode,
      verificationUrl,
      expiresAt: new Date(expiresAt).toLocaleString(),
      expiresInMinutes,
    };

    return await this.sendTemplateEmail(
      user.email,
      'auth/email-verification',
      templateData,
      'Verify Your Email - {{appName}}'
    );
  }

  /**
   * Verify transporter configuration
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready to send emails');
      return true;
    } catch (err) {
      console.error('Email service verification failed:', err);
      return false;
    }
  }
}

// Singleton instance
let emailServiceInstance = null;

function getEmailService() {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

module.exports = { EmailService, getEmailService };
