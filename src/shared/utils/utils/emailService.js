const nodemailer = require('nodemailer');

/**
 * Email Service for sending notifications
 * Uses nodemailer with support for multiple email providers
 */

// Email configuration from environment variables
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, sendgrid, etc.
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM || 'noreply@jane-app.com',
};

// Create transporter
let transporter = null;

function createTransporter() {
  if (transporter) return transporter;

  // For development/testing, use Ethereal email (fake SMTP service)
  if (process.env.NODE_ENV === 'development' && !EMAIL_CONFIG.auth.user) {
    console.log('📧 Email service running in TEST mode (no real emails sent)');
    return null; // Return null, emails will be logged instead
  }

  try {
    transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: EMAIL_CONFIG.auth,
    });

    console.log('✅ Email service initialized successfully');
    return transporter;
  } catch (error) {
    console.error('❌ Error initializing email service:', error.message);
    return null;
  }
}

/**
 * Send new device login alert email
 */
async function sendNewDeviceAlert(user, device) {
  const transporter = createTransporter();

  const subject = '🔔 New Device Login Detected - Jane App';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #00C1CA; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; }
        .alert-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .device-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 4px; border: 1px solid #e0e0e0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .info-label { font-weight: bold; color: #666; }
        .info-value { color: #333; }
        .button { display: inline-block; background-color: #00C1CA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Security Alert</h1>
        </div>
        <div class="content">
          <h2>New Device Login Detected</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>

          <div class="alert-box">
            <strong>⚠️ We detected a login from a new device</strong><br>
            If this was you, you can safely ignore this email. If you don't recognize this device, please secure your account immediately.
          </div>

          <div class="device-info">
            <h3>Device Information</h3>
            <div class="info-row">
              <span class="info-label">Device Type:</span>
              <span class="info-value">${device.deviceType || 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Device Name:</span>
              <span class="info-value">${device.deviceName || 'Unknown Device'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Browser:</span>
              <span class="info-value">${device.browser || 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Platform:</span>
              <span class="info-value">${device.platform || 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">IP Address:</span>
              <span class="info-value">${device.ipAddress || 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Location:</span>
              <span class="info-value">${device.location ? `${device.location.city}, ${device.location.region}, ${device.location.country}` : 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Login Time:</span>
              <span class="info-value">${new Date().toLocaleString()}</span>
            </div>
          </div>

          <h3>What should I do?</h3>
          <ul>
            <li><strong>If this was you:</strong> No action needed. Your device is now registered.</li>
            <li><strong>If this wasn't you:</strong> Change your password immediately and review your security settings.</li>
          </ul>

          <center>
            <a href="${process.env.APP_URL || 'http://localhost:8081'}/settings/security" class="button">
              Review Security Settings
            </a>
          </center>

          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            This is an automated security notification from Jane App. We send this email whenever we detect a login from a new device to help protect your account.
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Jane App. All rights reserved.</p>
          <p>This email was sent to ${user.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
New Device Login Detected - Jane App

Hello ${user.firstName} ${user.lastName},

We detected a login from a new device to your Jane App account.

Device Information:
- Device Type: ${device.deviceType || 'Unknown'}
- Device Name: ${device.deviceName || 'Unknown Device'}
- Browser: ${device.browser || 'Unknown'}
- Platform: ${device.platform || 'Unknown'}
- IP Address: ${device.ipAddress || 'Unknown'}
- Location: ${device.location ? `${device.location.city}, ${device.location.region}, ${device.location.country}` : 'Unknown'}
- Login Time: ${new Date().toLocaleString()}

What should I do?
- If this was you: No action needed. Your device is now registered.
- If this wasn't you: Change your password immediately and review your security settings.

This is an automated security notification to help protect your account.

© ${new Date().getFullYear()} Jane App. All rights reserved.
  `;

  const mailOptions = {
    from: EMAIL_CONFIG.from,
    to: user.email,
    subject,
    text,
    html,
  };

  try {
    if (!transporter) {
      // In test/dev mode without email config, just log
      console.log('📧 [TEST MODE] Email would be sent:');
      console.log('To:', user.email);
      console.log('Subject:', subject);
      console.log('Device:', device.deviceName);
      console.log('Location:', device.location?.city || 'Unknown');
      return { success: true, testMode: true };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ New device alert email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending new device alert email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(user, resetToken) {
  const transporter = createTransporter();

  const resetUrl = `${process.env.APP_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}`;

  const subject = 'Password Reset Request - Jane App';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.firstName},</p>
        <p>You requested to reset your password for your Jane App account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #00C1CA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} Jane App. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request - Jane App

Hello ${user.firstName},

You requested to reset your password for your Jane App account.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email and your password will remain unchanged.

© ${new Date().getFullYear()} Jane App. All rights reserved.
  `;

  const mailOptions = {
    from: EMAIL_CONFIG.from,
    to: user.email,
    subject,
    text,
    html,
  };

  try {
    if (!transporter) {
      console.log('📧 [TEST MODE] Password reset email would be sent to:', user.email);
      return { success: true, testMode: true };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new users
 */
async function sendWelcomeEmail(user) {
  const transporter = createTransporter();

  const subject = 'Welcome to Jane App! 🎉';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #00C1CA; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Welcome to Jane App! 🎉</h1>
        </div>
        <div style="background-color: white; padding: 20px; border: 1px solid #e0e0e0;">
          <p>Hello ${user.firstName},</p>
          <p>Welcome to Jane App - your healthcare practice management solution!</p>
          <p>We're excited to have you on board. Your account has been successfully created.</p>

          <h3>Getting Started:</h3>
          <ul>
            <li>Complete your profile in Settings</li>
            <li>Set up your schedule and availability</li>
            <li>Start managing appointments and patients</li>
            <li>Explore the dashboard and features</li>
          </ul>

          <center>
            <a href="${process.env.APP_URL || 'http://localhost:8081'}" style="display: inline-block; background-color: #00C1CA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">
              Get Started
            </a>
          </center>

          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} Jane App. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Jane App!

Hello ${user.firstName},

Welcome to Jane App - your healthcare practice management solution!

We're excited to have you on board. Your account has been successfully created.

Getting Started:
- Complete your profile in Settings
- Set up your schedule and availability
- Start managing appointments and patients
- Explore the dashboard and features

Visit: ${process.env.APP_URL || 'http://localhost:8081'}

If you have any questions, feel free to reach out to our support team.

© ${new Date().getFullYear()} Jane App. All rights reserved.
  `;

  const mailOptions = {
    from: EMAIL_CONFIG.from,
    to: user.email,
    subject,
    text,
    html,
  };

  try {
    if (!transporter) {
      console.log('📧 [TEST MODE] Welcome email would be sent to:', user.email);
      return { success: true, testMode: true };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNewDeviceAlert,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
