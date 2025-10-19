/**
 * IP Throttle Middleware for Auth Module
 * Provides IP-based throttling and blocking capabilities
 */

class IPThrottle {
  constructor() {
    this.ipAttempts = new Map();
    this.ipBlocks = new Map();
    this.maxAttempts = 10;
    this.blockDuration = 15 * 60 * 1000; // 15 minutes
    this.windowDuration = 60 * 1000; // 1 minute
  }

  /**
   * Check if IP should be throttled
   */
  shouldThrottle(ip) {
    const now = Date.now();
    
    // Check if IP is currently blocked
    if (this.ipBlocks.has(ip)) {
      const blockTime = this.ipBlocks.get(ip);
      if (now - blockTime < this.blockDuration) {
        return { blocked: true, timeLeft: this.blockDuration - (now - blockTime) };
      } else {
        // Block expired, remove it
        this.ipBlocks.delete(ip);
        this.ipAttempts.delete(ip);
      }
    }

    // Check attempt count in current window
    if (this.ipAttempts.has(ip)) {
      const attempts = this.ipAttempts.get(ip);
      const validAttempts = attempts.filter(time => now - time < this.windowDuration);
      
      if (validAttempts.length >= this.maxAttempts) {
        // Block the IP
        this.ipBlocks.set(ip, now);
        return { blocked: true, timeLeft: this.blockDuration };
      }
      
      // Update with valid attempts
      this.ipAttempts.set(ip, validAttempts);
    }

    return { blocked: false };
  }

  /**
   * Record an attempt from IP
   */
  recordAttempt(ip) {
    const now = Date.now();
    
    if (!this.ipAttempts.has(ip)) {
      this.ipAttempts.set(ip, []);
    }
    
    const attempts = this.ipAttempts.get(ip);
    attempts.push(now);
    
    // Keep only attempts within the window
    const validAttempts = attempts.filter(time => now - time < this.windowDuration);
    this.ipAttempts.set(ip, validAttempts);
  }

  /**
   * Clear attempts for IP (on successful operation)
   */
  clearAttempts(ip) {
    this.ipAttempts.delete(ip);
  }

  /**
   * Get middleware function
   */
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
      const throttleResult = this.shouldThrottle(ip);
      
      if (throttleResult.blocked) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests from this IP',
          message: 'IP temporarily blocked due to excessive requests',
          retryAfter: Math.ceil(throttleResult.timeLeft / 1000)
        });
      }
      
      // Record this attempt
      this.recordAttempt(ip);
      
      // Add IP info to request for later use
      req.clientIP = ip;
      req.ipThrottle = this;
      
      next();
    };
  }
}

// Create singleton instance
const ipThrottleInstance = new IPThrottle();

module.exports = {
  IPThrottle,
  middleware: ipThrottleInstance.middleware(),
  clearAttempts: (ip) => ipThrottleInstance.clearAttempts(ip),
  recordAttempt: (ip) => ipThrottleInstance.recordAttempt(ip)
};