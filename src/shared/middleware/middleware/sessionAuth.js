const jwt = require('jsonwebtoken');

const SessionManager = require('../utils/sessionManager');
/**
 * Session Authentication Middleware
 *
 * Validates JWT token and checks if session is active
 */

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

/**
 * Middleware to validate session along with JWT
 */
const sessionAuthMiddleware = async (req, res, next) => {
  try {
    // Extract token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN',
      });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    // Validate session
    const validation = await SessionManager.validateSession(token);

    if (!validation.valid) {
      return res.status(401).json({
        error: validation.error || 'Invalid session',
        code: 'INVALID_SESSION',
      });
    }

    // Attach user and session info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };

    req.session = validation.session;

    next();
  } catch (error) {
    console.error('Session auth middleware error:', error);
    return res.status(500).json({
      error: 'Server error during authentication',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Optional session validation (doesn't fail if session not found)
 */
const optionalSessionAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const validation = await SessionManager.validateSession(token);

      if (validation.valid) {
        req.user = {
          userId: decoded.userId,
          role: decoded.role,
          email: decoded.email,
        };
        req.session = validation.session;
      }
    } catch (err) {
      // Continue without session
    }

    next();
  } catch (error) {
    console.error('Optional session auth error:', error);
    next();
  }
};

module.exports = {
  sessionAuthMiddleware,
  optionalSessionAuth,
};
