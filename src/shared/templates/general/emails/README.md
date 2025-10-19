# Email Templates Documentation

This directory contains all email templates for the ExpoJane application, including authentication, notifications, and system emails.

## Overview

The email system uses:
- **Template Engine**: Custom template engine with variable interpolation
- **Email Service**: Nodemailer with support for SMTP, SendGrid, and AWS SES
- **Templates**: Professional, responsive HTML email templates

## Directory Structure

```
templates/emails/
├── auth/                    # Authentication-related emails
│   ├── password-reset.html
│   ├── password-reset-success.html
│   ├── welcome.html
│   └── email-verification.html
├── notifications/           # User notifications
└── README.md
```

## Email Templates

### 1. Password Reset (`auth/password-reset.html`)

**Purpose**: Send password reset link and token to users

**Trigger**: User requests password reset via forgot password form

**Variables**:
- `user.firstName` - User's first name
- `user.email` - User's email address
- `resetUrl` - Password reset URL with token
- `resetToken` - 6-digit reset code
- `expiresAt` - Expiration date/time
- `expiresInMinutes` - Minutes until expiration
- `supportUrl` - Support page URL
- `appName` - Application name
- `companyAddress` - Company address

**Usage**:
```javascript
const emailService = getEmailService();
await emailService.sendPasswordResetEmail(user, resetToken, expiresAt);
```

### 2. Password Reset Success (`auth/password-reset-success.html`)

**Purpose**: Confirm successful password reset

**Trigger**: User successfully resets their password

**Variables**:
- `user.firstName` - User's first name
- `user.email` - User's email address
- `resetDate` - Date/time of reset
- `ipAddress` - IP address of request
- `device` - Device information
- `location` - Geographic location
- `loginUrl` - Login page URL
- `supportUrl` - Support page URL

**Usage**:
```javascript
const emailService = getEmailService();
await emailService.sendPasswordResetSuccessEmail(user, ipAddress, device, location);
```

### 3. Welcome Email (`auth/welcome.html`)

**Purpose**: Welcome new users to the platform

**Trigger**: User successfully registers

**Variables**:
- `user.firstName` - User's first name
- `loginUrl` - Login page URL
- `appName` - Application name
- `supportUrl` - Support page URL

**Usage**:
```javascript
const emailService = getEmailService();
await emailService.sendWelcomeEmail(user);
```

### 4. Email Verification (`auth/email-verification.html`)

**Purpose**: Verify user email address

**Trigger**: User registers or requests new verification

**Variables**:
- `user.firstName` - User's first name
- `verificationUrl` - Verification URL with token
- `verificationCode` - 6-digit verification code
- `expiresInMinutes` - Minutes until expiration
- `appName` - Application name
- `supportUrl` - Support page URL

**Usage**:
```javascript
const emailService = getEmailService();
await emailService.sendEmailVerification(user, verificationCode, expiresAt);
```

## Email Service Setup

### Environment Variables

Add these to your `.env` file:

```env
# Email Provider (smtp, sendgrid, ses)
EMAIL_PROVIDER=smtp

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SendGrid Configuration (if using SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key

# AWS SES Configuration (if using SES)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Email Settings
EMAIL_FROM_NAME=ExpoJane
EMAIL_FROM_ADDRESS=noreply@expojane.com
SUPPORT_EMAIL=support@expojane.com

# Application Settings
APP_NAME=ExpoJane
APP_URL=http://localhost:8081
COMPANY_ADDRESS=123 Healthcare St, Medical City, MC 12345

# Token Expiration
PASSWORD_RESET_EXPIRY_MINUTES=60
EMAIL_VERIFICATION_EXPIRY_MINUTES=1440
```

### Gmail Setup

For Gmail SMTP:

1. Enable 2-Factor Authentication
2. Generate an App Password:
   - Go to Google Account → Security
   - Select "2-Step Verification"
   - Select "App passwords"
   - Generate password for "Mail"
3. Use the generated password in `SMTP_PASS`

### SendGrid Setup

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Set `EMAIL_PROVIDER=sendgrid`
4. Set `SENDGRID_API_KEY=your-key`

### AWS SES Setup

1. Set up AWS SES in your region
2. Verify sender email/domain
3. Set `EMAIL_PROVIDER=ses`
4. Configure AWS credentials

## Using the Email Service

### Basic Usage

```javascript
const { getEmailService } = require('./services/emailService');

// Get the email service instance
const emailService = getEmailService();

// Send password reset
await emailService.sendPasswordResetEmail(user, token, expiresAt);

// Send welcome email
await emailService.sendWelcomeEmail(user);

// Send custom email
await emailService.sendEmail(
  'user@example.com',
  'Subject',
  '<h1>HTML Content</h1>',
  'Plain text content'
);
```

### Template Usage

```javascript
// Send using template
await emailService.sendTemplateEmail(
  'user@example.com',
  'auth/welcome',
  { user: { firstName: 'John' } },
  'Welcome to {{appName}}!'
);
```

### Creating Custom Templates

1. Create HTML file in appropriate directory
2. Use `{{variable}}` syntax for interpolation
3. Support nested variables: `{{user.name}}`
4. Include common variables: `{{appName}}`, `{{supportUrl}}`

Example:
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Hello {{user.firstName}},</h1>
  <p>Welcome to {{appName}}!</p>
</body>
</html>
```

## Testing Emails

### Development Mode

Use a test email service like:
- [Mailtrap](https://mailtrap.io)
- [Ethereal Email](https://ethereal.email)

Update `.env`:
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

### Test Script

```javascript
const { getEmailService } = require('./services/emailService');

async function testEmail() {
  const emailService = getEmailService();

  // Verify connection
  const isConnected = await emailService.verifyConnection();
  console.log('Email service connected:', isConnected);

  // Send test email
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
  };

  await emailService.sendWelcomeEmail(testUser);
  console.log('Test email sent!');
}

testEmail();
```

## Password Reset Flow

### Complete Flow

1. **Request Reset**
   ```
   POST /api/auth/forgot-password
   { "email": "user@example.com" }
   ```

2. **User receives email** with:
   - Reset link: `http://app.com/reset-password?token=abc123`
   - Reset code: `ABC123`
   - Expiration time

3. **User clicks link or enters code**
   ```
   POST /api/auth/reset-password
   { "token": "abc123", "password": "newpassword" }
   ```

4. **User receives confirmation email**

### Security Features

- Tokens are hashed before storage (SHA-256)
- Tokens expire after 60 minutes (configurable)
- One-time use tokens
- Email enumeration protection
- IP address logging
- Device fingerprinting

## Email Verification Flow

### Complete Flow

1. **User registers**
   - Verification email sent automatically

2. **User receives email** with:
   - Verification link
   - Verification code
   - Expiration time (24 hours)

3. **User verifies**
   ```
   POST /api/auth/verify-email
   { "token": "verification-token" }
   ```

4. **User account verified**

## Template Customization

### Styling Guidelines

- Mobile-responsive design
- Inline CSS for email client compatibility
- Maximum width: 600px
- Safe fonts: Arial, Helvetica, sans-serif
- Color scheme: Brand colors

### Variable Interpolation

Supports:
- Simple: `{{variable}}`
- Nested: `{{user.firstName}}`
- Common variables automatically included

### Best Practices

1. **Subject Lines**
   - Keep under 50 characters
   - Make actionable
   - Include brand name

2. **Content**
   - Clear call-to-action
   - Concise copy
   - Mobile-friendly buttons
   - Plain text alternative

3. **Security**
   - Display expiration times
   - Include security warnings
   - Show activity details

4. **Branding**
   - Consistent design
   - Logo placement
   - Footer information

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials
2. Verify email service connection
3. Check firewall/port access
4. Review server logs

### Emails in Spam

1. Set up SPF records
2. Configure DKIM
3. Set up DMARC
4. Use authenticated service (SendGrid/SES)

### Template Not Found

1. Check file path
2. Verify file extension (.html)
3. Check template name in code

## API Endpoints

### Authentication Endpoints

```
POST /api/auth/register          - Register new user
POST /api/auth/login             - Login user
POST /api/auth/forgot-password   - Request password reset
POST /api/auth/reset-password    - Reset password with token
POST /api/auth/verify-email      - Verify email address
POST /api/auth/change-password   - Change password (authenticated)
GET  /api/auth/me                - Get current user
```

## Dependencies

```json
{
  "nodemailer": "^6.9.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0",
  "dotenv": "^16.0.0"
}
```

Optional:
- `@aws-sdk/client-ses` - For AWS SES
- `@sendgrid/mail` - For SendGrid (alternative)

## Support

For issues with:
- **Email Templates**: Check template syntax and variables
- **Email Service**: Verify SMTP/provider configuration
- **Delivery Issues**: Check spam folders and DNS records

## Future Enhancements

- [ ] Email template preview tool
- [ ] A/B testing for emails
- [ ] Email analytics tracking
- [ ] Multi-language support
- [ ] Rich text editor for templates
- [ ] Scheduled email sending
- [ ] Email queue management
