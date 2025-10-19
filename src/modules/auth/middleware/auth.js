/**
 * Authentication Middleware
 * JWT token verification and user authorization
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

/**
 * Verify JWT token and authenticate user
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account has been deactivated.'
      });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

/**
 * Authorization middleware for role-based access
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasPermission = allowedRoles.some(role => 
      userRoles.includes(role) || userRoles.includes('admin')
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token provided, but populates req.user if valid token exists
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }
    
    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

/**
 * MFA verification middleware
 */
const requireMFA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    // Check if user has MFA enabled
    const MFAService = require('../services/mfaService');
    const mfaService = MFAService.getMFAService();
    const hasMFA = await mfaService.hasMFAEnabled(req.user._id);

    if (hasMFA && !req.user.mfaVerified) {
      return res.status(401).json({
        success: false,
        error: 'MFA verification required.',
        mfaRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('MFA middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification error'
    });
  }
};

module.exports = {
  auth,
  authorize,
  optionalAuth,
  requireMFA
};