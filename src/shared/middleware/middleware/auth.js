const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../../../modules/auth/models/User');
const config = require('../../config/config/env.config');
const logger = require('../../config/config/logger.config');

// In-memory token blacklist for revoked tokens
const tokenBlacklist = new Set();

// Session tracking for concurrent session limits
const userSessions = new Map();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt without proper Bearer token', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url
      });
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      logger.warn('Attempt to use revoked token', {
        ip: req.ip,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex').substring(0, 16)
      });
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify JWT with enhanced options
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: 'healthcare-api',
      maxAge: config.jwt.expiresIn,
      clockTolerance: 30 // Allow 30 seconds clock skew
    });

    // Additional token validation
    if (!decoded.userId || !decoded.iat) {
      logger.warn('Invalid token structure', {
        ip: req.ip,
        tokenFields: Object.keys(decoded)
      });
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Check token age (prevent very old tokens)
    const tokenAge = Date.now() - (decoded.iat * 1000);
    const maxTokenAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxTokenAge) {
      logger.warn('Token too old', {
        ip: req.ip,
        userId: decoded.userId,
        tokenAge: Math.floor(tokenAge / 1000 / 60) // minutes
      });
      return res.status(401).json({ error: 'Token expired due to age' });
    }

    // Fetch full user object with security checks
    const user = await User.findById(decoded.userId)
      .select('-password -__v')
      .lean(); // Use lean for better performance
      
    if (!user) {
      logger.warn('Authentication with non-existent user', {
        ip: req.ip,
        userId: decoded.userId
      });
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is active
    if (user.status && user.status !== 'active') {
      logger.warn('Authentication attempt by inactive user', {
        ip: req.ip,
        userId: user._id,
        userStatus: user.status
      });
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Check for concurrent sessions (if enabled)
    if (config.security && config.security.maxConcurrentSessions) {
      const userId = user._id.toString();
      const sessions = userSessions.get(userId) || new Set();
      
      if (sessions.size >= config.security.maxConcurrentSessions && !sessions.has(token)) {
        logger.warn('Concurrent session limit exceeded', {
          ip: req.ip,
          userId,
          currentSessions: sessions.size
        });
        return res.status(401).json({ 
          error: 'Maximum concurrent sessions exceeded',
          maxSessions: config.security.maxConcurrentSessions
        });
      }
      
      // Add current session
      sessions.add(token);
      userSessions.set(userId, sessions);
    }

    // Add security context to request
    req.user = user;
    req.token = token;
    req.sessionInfo = {
      tokenHash: crypto.createHash('sha256').update(token).digest('hex').substring(0, 16),
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Log successful authentication for audit
    logger.info('Successful authentication', {
      userId: user._id,
      userRole: user.role,
      ip: req.ip,
      tokenHash: req.sessionInfo.tokenHash,
      url: req.url
    });

    next();
  } catch (error) {
    // Enhanced error handling with specific error types
    let errorMessage = 'Authentication failed';
    let statusCode = 401;

    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
      logger.info('Token expired', {
        ip: req.ip,
        expiredAt: error.expiredAt,
        url: req.url
      });
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token';
      logger.warn('Invalid JWT token', {
        ip: req.ip,
        error: error.message,
        url: req.url
      });
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token not active yet';
      logger.warn('Premature token usage', {
        ip: req.ip,
        notBefore: error.date,
        url: req.url
      });
    } else {
      logger.error('Authentication error', {
        ip: req.ip,
        error: error.message,
        stack: error.stack,
        url: req.url
      });
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
};

// Enhanced role-based authorization
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adminRoles = ['full_access', 'admin_billing', 'super_admin'];
  
  if (!adminRoles.includes(req.user.role)) {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user._id,
      userRole: req.user.role,
      ip: req.ip,
      url: req.url
    });
    return res.status(403).json({ 
      error: 'Admin access required',
      requiredRoles: adminRoles,
      currentRole: req.user.role
    });
  }

  logger.info('Admin access granted', {
    userId: req.user._id,
    userRole: req.user.role,
    ip: req.ip,
    url: req.url
  });

  next();
};

// Enhanced role-based authorization with permission checks
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user role is in allowed roles
    const hasRole = allowedRoles.includes(req.user.role);
    
    // Handle special role mappings
    const roleMapping = {
      'admin': ['full_access', 'admin_billing', 'super_admin'],
      'staff': ['staff', 'full_access', 'admin_billing', 'super_admin'],
      'practitioner': ['practitioner', 'staff', 'full_access', 'admin_billing', 'super_admin'],
      'patient': ['patient', 'practitioner', 'staff', 'full_access', 'admin_billing', 'super_admin']
    };

    let isAuthorized = hasRole;

    // Check role hierarchy
    for (const allowedRole of allowedRoles) {
      if (roleMapping[allowedRole] && roleMapping[allowedRole].includes(req.user.role)) {
        isAuthorized = true;
        break;
      }
    }

    if (!isAuthorized) {
      logger.warn('Insufficient permissions', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        ip: req.ip,
        url: req.url
      });
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        currentRole: req.user.role
      });
    }

    logger.debug('Access authorized', {
      userId: req.user._id,
      userRole: req.user.role,
      url: req.url
    });

    next();
  };
};

// Permission-based authorization for fine-grained control
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has specific permission
    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      logger.warn('Missing required permission', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredPermission: permission,
        userPermissions,
        ip: req.ip,
        url: req.url
      });
      
      return res.status(403).json({
        error: 'Missing required permission',
        requiredPermission: permission
      });
    }

    next();
  };
};

// Session management functions
const revokeToken = (token) => {
  tokenBlacklist.add(token);
  
  // Clean up old tokens (implement basic cleanup)
  if (tokenBlacklist.size > 10000) {
    const tokensArray = Array.from(tokenBlacklist);
    tokenBlacklist.clear();
    // Keep only the most recent 5000 tokens
    tokensArray.slice(-5000).forEach(t => tokenBlacklist.add(t));
  }

  logger.info('Token revoked', {
    tokenHash: crypto.createHash('sha256').update(token).digest('hex').substring(0, 16)
  });
};

const revokeAllUserTokens = async (userId) => {
  // Remove all sessions for user
  const sessions = userSessions.get(userId.toString()) || new Set();
  sessions.forEach(token => tokenBlacklist.add(token));
  userSessions.delete(userId.toString());

  logger.info('All user tokens revoked', { userId });
};

const getActiveSessions = (userId) => {
  return Array.from(userSessions.get(userId.toString()) || new Set()).map(token => ({
    tokenHash: crypto.createHash('sha256').update(token).digest('hex').substring(0, 16),
    createdAt: new Date() // In production, store this information properly
  }));
};

// Security middleware for sensitive operations
const requireRecentAuth = (maxAgeMinutes = 30) => {
  return (req, res, next) => {
    if (!req.sessionInfo) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const tokenAge = Date.now() - req.sessionInfo.issuedAt.getTime();
    const maxAge = maxAgeMinutes * 60 * 1000;

    if (tokenAge > maxAge) {
      return res.status(401).json({
        error: 'Recent authentication required',
        message: `This operation requires authentication within the last ${maxAgeMinutes} minutes`,
        maxAgeMinutes
      });
    }

    next();
  };
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Let auth middleware handle this
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize user request history
    if (!userRequests.has(userId)) {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    
    // Remove old requests
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    userRequests.set(userId, recentRequests);

    if (recentRequests.length >= maxRequests) {
      logger.warn('User rate limit exceeded', {
        userId,
        requestCount: recentRequests.length,
        ip: req.ip,
        url: req.url
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${Math.floor(windowMs / 60000)} minutes`,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    userRequests.set(userId, recentRequests);

    next();
  };
};

// Create aliases for backward compatibility
const protect = authMiddleware;
const authenticate = authMiddleware;

module.exports = {
  authMiddleware,
  adminOnly,
  protect, // Alias for authMiddleware
  authenticate, // Alias for authMiddleware
  authorize, // Enhanced role-based authorization
  requirePermission, // Permission-based authorization
  requireRecentAuth, // Recent authentication requirement
  userRateLimit, // Per-user rate limiting
  revokeToken, // Token revocation
  revokeAllUserTokens, // Revoke all user sessions
  getActiveSessions, // Get user's active sessions
  tokenBlacklist, // Export for cleanup tasks
  userSessions, // Export for monitoring
};
