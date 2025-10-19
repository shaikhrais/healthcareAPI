/**
 * Rate Limiter Middleware for Auth Module
 * Provides specific rate limiting for authentication operations
 */

const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');

// Export pre-configured rate limiters for auth operations
module.exports = {
  // Standard auth rate limiters
  login: rateLimiterMiddleware('auth_login', 5, 15),
  register: rateLimiterMiddleware('auth_register', 3, 60),
  
  // MFA rate limiters
  mfaSetup: rateLimiterMiddleware('general', 5, 60),
  mfaVerify: rateLimiterMiddleware('general', 10, 15),
  
  // Biometric rate limiters
  biometricRegister: rateLimiterMiddleware('biometric_register', 10, 60),
  biometricAuth: rateLimiterMiddleware('biometric_auth', 50, 60),
  
  // Password reset rate limiters  
  passwordReset: rateLimiterMiddleware('general', 3, 60),
  
  // General rate limiter
  general: rateLimiterMiddleware('general', 10, 60),
  strict: rateLimiterMiddleware('general', 5, 60)
};