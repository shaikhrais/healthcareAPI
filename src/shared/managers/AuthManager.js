/**
 * AuthManager
 * Token issuing, verification, MFA, and permissions checks.
 */
const jwt = require('jsonwebtoken');
const { ConfigManager } = require('./index');

const AuthManager = {
  issueToken(payload, options = {}) {
    return jwt.sign(payload, ConfigManager.jwtSecret, {
      expiresIn: ConfigManager.jwtExpiresIn,
      ...options,
    });
  },
  verifyToken(token) {
    try {
      return jwt.verify(token, ConfigManager.jwtSecret);
    } catch (err) {
      return null;
    }
  },
  // Placeholder for MFA and permissions
  checkPermission(user, permission) {
    return user?.permissions?.includes(permission);
  },
};

module.exports = AuthManager;