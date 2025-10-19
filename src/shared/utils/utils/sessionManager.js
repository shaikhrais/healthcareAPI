const crypto = require('crypto');

const Session = require('../../../modules/auth/models/Session');
/**
 * Session Manager Utility
 *
 * Handles session creation, validation, and device fingerprinting
 */

class SessionManager {
  /**
   * Parse device information from user agent
   */
  static parseDeviceInfo(userAgent) {
    if (!userAgent) {
      return {
        userAgent: 'Unknown',
        browser: 'Unknown',
        os: 'Unknown',
        device: 'Unknown',
        platform: 'Unknown',
      };
    }

    // Simple user agent parsing (consider using a library like 'ua-parser-js' for production)
    const deviceInfo = {
      userAgent,
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      platform: 'web',
    };

    // Detect browser
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';
    else if (userAgent.includes('Opera')) deviceInfo.browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac OS')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (
      userAgent.includes('iOS') ||
      userAgent.includes('iPhone') ||
      userAgent.includes('iPad')
    ) {
      deviceInfo.os = 'iOS';
    }

    // Detect device type
    if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
    else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
    else deviceInfo.device = 'Desktop';

    // Detect platform
    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Android') ||
      userAgent.includes('iOS')
    ) {
      deviceInfo.platform = 'mobile';
    }

    return deviceInfo;
  }

  /**
   * Extract IP address from request
   */
  static getIpAddress(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      'Unknown'
    );
  }

  /**
   * Hash a token for secure storage
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new session
   */
  static async createSession(userId, token, req, options = {}) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'];
    const deviceInfo = this.parseDeviceInfo(userAgent);

    // Hash the token for secure storage
    const tokenHash = this.hashToken(token);

    const sessionData = {
      ipAddress,
      deviceInfo,
      location: options.location || {},
      sessionType: options.sessionType || 'web',
      expiryDays: options.expiryDays || 7,
    };

    const session = await Session.createSession(userId, token, tokenHash, sessionData);

    return session;
  }

  /**
   * Validate a session token
   */
  static async validateSession(token) {
    if (!token) {
      return { valid: false, error: 'No token provided' };
    }

    const tokenHash = this.hashToken(token);
    const session = await Session.findByTokenHash(tokenHash);

    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    if (!session.isActive) {
      return { valid: false, error: 'Session has been revoked' };
    }

    if (session.isExpired()) {
      await session.revoke('expired');
      return { valid: false, error: 'Session has expired' };
    }

    // Update last activity
    await session.updateActivity();

    return {
      valid: true,
      session,
      userId: session.user,
    };
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionId, reason, revokedBy) {
    const session = await Session.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.isActive) {
      throw new Error('Session already revoked');
    }

    await session.revoke(reason, revokedBy);

    return session;
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId, reason, revokedBy) {
    const count = await Session.revokeAllUserSessions(userId, reason, revokedBy);
    return count;
  }

  /**
   * Revoke all sessions except the current one
   */
  static async revokeOtherSessions(userId, currentToken, reason) {
    const tokenHash = this.hashToken(currentToken);
    const count = await Session.revokeOtherSessions(userId, tokenHash, reason);
    return count;
  }

  /**
   * Get active sessions for a user
   */
  static async getActiveSessions(userId) {
    return await Session.getActiveSessions(userId);
  }

  /**
   * Get session statistics
   */
  static async getSessionStats(userId) {
    return await Session.getUserSessionStats(userId);
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  static async cleanupExpiredSessions() {
    const count = await Session.cleanupExpired();
    console.log(`Cleaned up ${count} expired sessions`);
    return count;
  }

  /**
   * Get detailed session info for display
   */
  static formatSessionInfo(session) {
    return {
      id: session._id,
      device: session.deviceInfo?.device || 'Unknown',
      browser: session.deviceInfo?.browser || 'Unknown',
      os: session.deviceInfo?.os || 'Unknown',
      ipAddress: session.ipAddress,
      location: session.location?.city
        ? `${session.location.city}, ${session.location.country}`
        : 'Unknown',
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: false, // Will be set by caller
    };
  }
}

module.exports = SessionManager;
