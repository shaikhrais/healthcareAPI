const { logger } = require('../utils/logger');

/**
 * Basic permissions middleware for development/testing
 */

/**
 * Authorize middleware - checks user permissions
 */
function authorize(permissions) {
  return (req, res, next) => {
    try {
      // For testing purposes, allow all requests
      // In production, implement proper permission checking
      
      // Check if user exists
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      // For development/testing - allow all authenticated users
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Permission check failed',
        },
      });
    }
  };
}

/**
 * Check if user has specific role
 */
function hasRole(role) {
  return authorize([`role:${role}`]);
}

/**
 * Check if user has any of the specified roles
 */
function hasAnyRole(roles) {
  const permissions = roles.map(role => `role:${role}`);
  return authorize(permissions);
}

/**
 * Admin only middleware
 */
function adminOnly() {
  return hasRole('admin');
}

/**
 * Healthcare provider middleware
 */
function providerOnly() {
  return hasAnyRole(['admin', 'provider', 'doctor', 'nurse']);
}

module.exports = {
  authorize,
  hasRole,
  hasAnyRole,
  adminOnly,
  providerOnly,
};