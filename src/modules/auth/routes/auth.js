const express = require('express');

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Session = require('../models/Session');
const { getEmailService } = require('../../../shared/services/services/emailService');
const { getSMSService } = require('../services/smsService');
const SessionManager = require('../../../shared/utils/utils/sessionManager');
const router = express.Router();

// Rate limiting
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');

// Rate limiters for different auth operations
const authLimiter = rateLimiterMiddleware('auth_login', 5, 15);
const passwordResetLimiter = rateLimiterMiddleware('general', 3, 60);
const emailVerificationLimiter = rateLimiterMiddleware('general', 5, 60);
const strictLimiter = rateLimiterMiddleware('general', 10, 60);

// Mock middleware for IP protection (can be implemented later)
const ipBlockMiddleware = (req, res, next) => next();
const bruteForceProtection = (req, res, next) => next();
const recordFailedAuth = (req, res, next) => next();

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const PASSWORD_RESET_EXPIRY =
  parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || '60', 10) * 60 * 1000;
const EMAIL_VERIFICATION_EXPIRY =
  parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '1440', 10) * 60 * 1000;

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegistration:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@healthcare.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           example: "SecurePassword123!"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         phone:
 *           type: string
 *           example: "+1234567890"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *         role:
 *           type: string
 *           enum: [patient, provider, admin, staff]
 *           example: "patient"
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@healthcare.com"
 *         password:
 *           type: string
 *           example: "SecurePassword123!"
 *         rememberMe:
 *           type: boolean
 *           example: false
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         refreshToken:
 *           type: string
 *           example: "rt_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           $ref: '#/components/schemas/User'
 *         expiresIn:
 *           type: number
 *           example: 3600
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@healthcare.com"
 *         firstName:
 *           type: string
 *           example: "John"
 *         lastName:
 *           type: string
 *           example: "Doe"
 *         role:
 *           type: string
 *           example: "patient"
 *         isActive:
 *           type: boolean
 *           example: true
 *         isEmailVerified:
 *           type: boolean
 *           example: true
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with email verification
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration successful. Please check your email for verification."
 *                 userId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Register
router.post(
  '/register',
  authLimiter,
  ipBlockMiddleware,
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'practitioner_limited',
      });

      await user.save();

      // Generate token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user credentials and return JWT token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Account disabled or email not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Login
router.post(
  '/login',
  authLimiter,
  ipBlockMiddleware,
  bruteForceProtection,
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        await recordFailedAuth(req, 'invalid_user');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        await recordFailedAuth(req, 'invalid_password');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      // Create session
      try {
        await SessionManager.createSession(user._id, token, req, {
          sessionType: 'web',
          expiryDays: 7,
        });
      } catch (sessionErr) {
        console.error('Error creating session:', sessionErr);
        // Continue without session tracking
      }

      res.json({
        message: 'Login successful',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, ipBlockMiddleware, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Please provide an email address' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };

    if (!user) {
      return res.json(successResponse);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set expiry
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

    await user.save();

    // Send reset email
    try {
      const emailService = getEmailService();
      await emailService.sendPasswordResetEmail(user, resetToken, user.resetPasswordExpires);
    } catch (emailErr) {
      console.error('Error sending password reset email:', emailErr);
      // Clear reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json({
        error: 'Error sending password reset email. Please try again later.',
      });
    }

    res.json(successResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error processing password reset request' });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', passwordResetLimiter, ipBlockMiddleware, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Please provide token and new password' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Hash the token from URL
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Get request metadata for email
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const device = userAgent.substring(0, 100);

    // Send confirmation email
    try {
      const emailService = getEmailService();
      await emailService.sendPasswordResetSuccessEmail(user, ipAddress, device, 'Unknown');
    } catch (emailErr) {
      console.error('Error sending password reset success email:', emailErr);
      // Don't fail the reset if email fails
    }

    // Generate new JWT
    const newToken = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Password reset successful',
      token: newToken,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error resetting password' });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', emailVerificationLimiter, ipBlockMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Please provide verification token' });
    }

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error verifying email' });
  }
});

/**
 * @route   POST /api/auth/send-phone-verification
 * @desc    Send phone verification SMS
 * @access  Public
 */
router.post('/send-phone-verification', emailVerificationLimiter, ipBlockMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Please provide a phone number' });
    }

    const smsService = getSMSService();
    
    // Validate and format phone number
    if (!smsService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    const formattedPhone = smsService.formatPhoneNumber(phone);
    
    // Check if user exists with this phone number
    const existingUser = await User.findOne({ phone: formattedPhone });

    // Generate verification code
    const verificationCode = smsService.generateVerificationCode();
    const hashedCode = smsService.hashVerificationCode(verificationCode);
    
    // Set expiry time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store verification code
    if (existingUser) {
      // Update existing user's verification code
      existingUser.phoneVerificationCode = hashedCode;
      existingUser.phoneVerificationExpires = expiresAt;
      await existingUser.save();
    } else {
      // For registration flow, temporarily store verification
      // In production, you might want a separate PhoneVerification model
      console.log(`Temporary phone verification for ${formattedPhone}: ${verificationCode}`);
    }

    // Send SMS
    try {
      await smsService.sendVerificationSMS(formattedPhone, verificationCode);
    } catch (smsErr) {
      console.error('Error sending SMS:', smsErr);
      return res.status(500).json({
        error: 'Error sending verification SMS. Please try again later.',
      });
    }

    res.json({
      message: 'Verification code sent successfully',
      phone: formattedPhone,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('Send phone verification error:', error);
    res.status(500).json({ error: 'Server error sending verification code' });
  }
});

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Verify phone number with SMS code
 * @access  Public
 */
router.post('/verify-phone', emailVerificationLimiter, ipBlockMiddleware, async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Please provide phone number and verification code' });
    }

    const smsService = getSMSService();
    const formattedPhone = smsService.formatPhoneNumber(phone);
    
    // Hash the provided code
    const hashedCode = smsService.hashVerificationCode(code);

    // Find user with valid verification code
    const user = await User.findOne({ 
      phone: formattedPhone,
      phoneVerificationCode: hashedCode,
      phoneVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Update user
    user.phoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Phone verified successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ error: 'Server error verifying phone' });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (requires current password)
 * @access  Private
 */
router.post('/change-password', strictLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide current and new password' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error changing password' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout and revoke current session
 * @access  Private
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Validate and revoke session
    const validation = await SessionManager.validateSession(token);

    if (validation.valid && validation.session) {
      await validation.session.revoke('user_logout');
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error logging out' });
  }
});

/**
 * @route   GET /api/auth/sessions
 * @desc    Get all active sessions for current user
 * @access  Private
 */
router.get('/sessions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const tokenHash = SessionManager.hashToken(token);

    // Get all active sessions
    const sessions = await SessionManager.getActiveSessions(decoded.userId);

    // Format sessions for display
    const formattedSessions = sessions.map((session) => {
      const info = SessionManager.formatSessionInfo(session);
      info.isCurrent = session.tokenHash === tokenHash;
      return info;
    });

    res.json({
      sessions: formattedSessions,
      total: formattedSessions.length,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error fetching sessions' });
  }
});

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', strictLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { sessionId } = req.params;

    // Get the session to verify ownership
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify user owns this session
    if (session.user.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'Not authorized to revoke this session' });
    }

    // Revoke the session
    await SessionManager.revokeSession(sessionId, 'user_revoked', decoded.userId);

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Server error revoking session' });
  }
});

/**
 * @route   DELETE /api/auth/sessions/other
 * @desc    Revoke all sessions except current
 * @access  Private
 */
router.delete('/sessions/other/all', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Revoke all other sessions
    const count = await SessionManager.revokeOtherSessions(decoded.userId, token, 'user_revoked');

    res.json({
      message: `${count} session(s) revoked successfully`,
      count,
    });
  } catch (error) {
    console.error('Revoke other sessions error:', error);
    res.status(500).json({ error: 'Server error revoking sessions' });
  }
});

/**
 * @route   DELETE /api/auth/sessions/all
 * @desc    Revoke all sessions (including current)
 * @access  Private
 */
router.delete('/sessions/all', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Revoke all sessions
    const count = await SessionManager.revokeAllUserSessions(
      decoded.userId,
      'user_revoked',
      decoded.userId
    );

    res.json({
      message: `All sessions revoked successfully (${count} session(s))`,
      count,
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({ error: 'Server error revoking sessions' });
  }
});

/**
 * @route   GET /api/auth/sessions/stats
 * @desc    Get session statistics for current user
 * @access  Private
 */
router.get('/sessions/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Get session stats
    const stats = await SessionManager.getSessionStats(decoded.userId);

    res.json(stats);
  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({ error: 'Server error fetching session stats' });
  }
});

module.exports = router;
