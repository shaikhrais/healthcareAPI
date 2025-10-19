
const IpBlock = require('../models/IpBlock');
/**
 * IP Throttling Middleware
 *
 * Monitors and blocks suspicious IP addresses
 */

/**
 * Extract IP address from request
 */
function getIpAddress(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * IP blocking middleware
 * Checks if IP is blocked before allowing request
 */
const ipBlockMiddleware = async (req, res, next) => {
  try {
    const ipAddress = getIpAddress(req);

    // Skip for localhost in development
    if (
      process.env.NODE_ENV === 'development' &&
      (ipAddress === '127.0.0.1' || ipAddress === '::1')
    ) {
      return next();
    }

    // Check if IP is blocked
    const blockStatus = await IpBlock.isIpBlocked(ipAddress);

    if (blockStatus.blocked) {
      // Log the blocked attempt
      await IpBlock.recordViolation(
        ipAddress,
        'blocked_access_attempt',
        req.path,
        req.headers['user-agent']
      );

      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been blocked due to suspicious activity.',
        reason: blockStatus.reason,
        expiresAt: blockStatus.isPermanent ? null : blockStatus.expiresAt,
        contact: 'support@expojane.com',
      });
    }

    // Attach IP info to request
    req.ipAddress = ipAddress;
    req.ipStatus = blockStatus;

    next();
  } catch (error) {
    console.error('IP block middleware error:', error);
    // Don't block on error, but log it
    next();
  }
};

/**
 * Record failed authentication attempt
 */
const recordFailedAuth = async (req, reason = 'failed_auth') => {
  try {
    const ipAddress = getIpAddress(req);
    await IpBlock.recordViolation(ipAddress, reason, req.path, req.headers['user-agent']);
  } catch (error) {
    console.error('Error recording failed auth:', error);
  }
};

/**
 * Record suspicious activity
 */
const recordSuspiciousActivity = async (req, reason, details = {}) => {
  try {
    const ipAddress = getIpAddress(req);
    const block = await IpBlock.recordViolation(
      ipAddress,
      reason,
      req.path,
      req.headers['user-agent']
    );

    // Add evidence if provided
    if (details && block) {
      block.evidence.push({
        timestamp: new Date(),
        description: reason,
        data: details,
      });
      await block.save();
    }

    return block;
  } catch (error) {
    console.error('Error recording suspicious activity:', error);
  }
};

/**
 * Middleware to detect and block brute force attempts
 */
const bruteForceProtection = (options = {}) => {
  const maxAttempts = options.maxAttempts || 5;
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes

  return async (req, res, next) => {
    try {
      const ipAddress = getIpAddress(req);

      // Check recent violations
      const block = await IpBlock.findOne({ ipAddress });

      if (block) {
        const recentViolations = block.violations.violationHistory.filter((v) => {
          return Date.now() - new Date(v.timestamp).getTime() < windowMs;
        });

        if (recentViolations.length >= maxAttempts) {
          // Block the IP
          await IpBlock.blockIp(ipAddress, 'brute_force', {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            notes: `Automatic block due to ${recentViolations.length} attempts in ${windowMs / 1000}s`,
          });

          return res.status(403).json({
            error: 'Access denied',
            message: 'Too many failed attempts. Your IP has been temporarily blocked.',
            retryAfter: '24 hours',
          });
        }
      }

      next();
    } catch (error) {
      console.error('Brute force protection error:', error);
      next();
    }
  };
};

/**
 * Middleware to throttle requests from warned/throttled IPs
 */
const throttleMiddleware = async (req, res, next) => {
  try {
    const ipAddress = getIpAddress(req);
    const block = await IpBlock.findOne({ ipAddress });

    if (!block) {
      return next();
    }

    // Throttle based on status
    if (block.status === 'throttled') {
      // Add delay for throttled IPs
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }

    next();
  } catch (error) {
    console.error('Throttle middleware error:', error);
    next();
  }
};

/**
 * Middleware to detect malicious payloads
 */
const maliciousPayloadDetection = (req, res, next) => {
  try {
    const ipAddress = getIpAddress(req);

    // Check for common attack patterns
    const suspiciousPatterns = [
      /<script[^>]*>.*<\/script>/gi, // XSS
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi, // SQL Injection
      /\.\.\//gi, // Path traversal
      /(\%3C)|(<)|(\%3E)|(>)/gi, // HTML injection
      /javascript:/gi, // JavaScript execution
      /on\w+\s*=/gi, // Event handlers
    ];

    const checkPayload = (obj) => {
      if (typeof obj === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj)) {
            return true;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (checkPayload(obj[key])) {
            return true;
          }
        }
      }
      return false;
    };

    // Check body, query, and params
    const hasMaliciousPayload =
      checkPayload(req.body) || checkPayload(req.query) || checkPayload(req.params);

    if (hasMaliciousPayload) {
      // Record and block immediately
      IpBlock.blockIp(ipAddress, 'malicious_payload', {
        permanent: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        notes: 'Automatic block due to malicious payload detection',
        evidence: {
          timestamp: new Date(),
          description: 'Malicious payload detected',
          data: {
            path: req.path,
            method: req.method,
            body: req.body,
            query: req.query,
          },
        },
      }).catch((err) => console.error('Error blocking IP:', err));

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Malicious content detected',
      });
    }

    next();
  } catch (error) {
    console.error('Malicious payload detection error:', error);
    next();
  }
};

/**
 * Request rate tracker
 * Tracks requests per IP for monitoring
 */
const requestTracker = async (req, res, next) => {
  try {
    const ipAddress = getIpAddress(req);

    // Update request count
    await IpBlock.findOneAndUpdate(
      { ipAddress },
      {
        $inc: { requestCount: 1 },
        $set: { lastRequest: new Date() },
      },
      { upsert: false }
    );

    next();
  } catch (error) {
    console.error('Request tracker error:', error);
    next();
  }
};

module.exports = {
  ipBlockMiddleware,
  bruteForceProtection,
  throttleMiddleware,
  maliciousPayloadDetection,
  requestTracker,
  recordFailedAuth,
  recordSuspiciousActivity,
  getIpAddress,
};
