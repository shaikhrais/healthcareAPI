
const AccessLog = require('../models/AccessLog');
const Device = require('../models/Device');
const DeviceFingerprintService = require('../services/deviceFingerprint.service');
/**
 * Access Tracking Middleware
 * Logs all access attempts with device info, location, and referral source
 */

/**
 * Track access middleware
 */
const trackAccess = async (req, res, next) => {
  const startTime = Date.now();

  // Capture response for logging
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    // Log access after response is sent (non-blocking)
    if (req.user) {
      setImmediate(() => logAccess(req, res, startTime, data).catch(console.error));
    }

    return res.send(data);
  };

  next();
};

/**
 * Log access to database
 */
async function logAccess(req, res, startTime, responseData) {
  try {
    // Parse device information
    const clientData = req.body.deviceInfo || req.query.deviceInfo || {};
    const deviceInfo = DeviceFingerprintService.parseDeviceInfo(req, clientData);

    // Get location from IP
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    const location = await DeviceFingerprintService.getLocationFromIP(ip);

    // Parse referral source
    const referralSource = DeviceFingerprintService.parseReferralSource(req);

    // Get user's previous devices
    const userDevices = await Device.find({ userId: req.user._id })
      .select('deviceId location lastSeen')
      .lean();

    // Calculate risk score
    const { riskScore, riskFactors, isNewDevice } = DeviceFingerprintService.calculateRiskScore(
      deviceInfo,
      userDevices,
      location
    );

    // Check if device is trusted
    const isTrustedDevice = DeviceFingerprintService.isDeviceTrusted(
      deviceInfo.deviceId,
      userDevices
    );

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Create access log
    const accessLog = new AccessLog({
      userId: req.user._id,
      accessType: determineAccessType(req),
      endpoint: req.originalUrl || req.url,
      method: req.method,
      statusCode: res.statusCode,
      deviceInfo,
      location,
      referralSource,
      security: {
        isSecure: req.secure || req.protocol === 'https',
        isTrustedDevice,
        isNewDevice,
        riskScore,
        riskFactors,
        authMethod: req.authMethod || 'token',
        mfaUsed: req.mfaUsed || false,
        sessionId: req.sessionID || req.headers['x-session-id'],
      },
      performance: {
        responseTime,
        requestSize: JSON.stringify(req.body || {}).length,
        responseSize: typeof responseData === 'string' ? responseData.length : 0,
      },
      flagged: riskScore >= 70,
      flagReason: riskScore >= 70 ? `High risk score: ${riskScore}` : null,
    });

    await accessLog.save();

    // Update or create device record
    await Device.findOneAndUpdate(
      { userId: req.user._id, deviceId: deviceInfo.deviceId },
      {
        $set: {
          deviceInfo,
          location,
          lastSeen: new Date(),
          lastIP: ip,
          trusted: isTrustedDevice,
        },
        $inc: { accessCount: 1 },
      },
      { upsert: true, new: true }
    );

    // Alert on high-risk access
    if (riskScore >= 80) {
      // TODO: Send alert notification
      console.warn(`High-risk access detected for user ${req.user._id}: Risk score ${riskScore}`);
    }
  } catch (error) {
    console.error('Error logging access:', error);
    // Don't throw - logging should not break the request
  }
}

/**
 * Determine access type from request
 */
function determineAccessType(req) {
  const path = req.path.toLowerCase();

  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (req.method === 'GET' && !path.includes('/api/')) return 'page_view';
  if (path.includes('/api/')) return 'api_call';

  return 'action';
}

/**
 * Get access analytics for user
 */
const getAccessAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const days = parseInt(req.query.days, 10) || 30;

    // Verify user has permission
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [stats, devices, recentAccesses] = await Promise.all([
      AccessLog.getUserStats(userId, days),
      Device.find({ userId }).sort({ lastSeen: -1 }).limit(10),
      AccessLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('-deviceInfo.userAgent -metadata'),
    ]);

    res.json({
      stats: stats[0] || {
        totalAccesses: 0,
        uniqueDevices: [],
        uniqueIPs: [],
        avgRiskScore: 0,
        flaggedAccesses: 0,
      },
      devices,
      recentAccesses,
    });
  } catch (error) {
    console.error('Error getting access analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Get social media analytics (admin only)
 */
const getSocialMediaAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const days = parseInt(req.query.days, 10) || 30;

    const [socialMedia, geographic, suspicious, topReferrers] = await Promise.all([
      AccessLog.getSocialMediaAnalytics(days),
      AccessLog.getGeographicDistribution(days),
      AccessLog.detectSuspiciousActivity(24),
      AccessLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
            'referralSource.referrer': { $ne: '', $exists: true },
          },
        },
        {
          $group: {
            _id: '$referralSource.referrer',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            referrer: '$_id',
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({
      socialMedia,
      geographic,
      suspicious,
      topReferrers,
      period: `Last ${days} days`,
    });
  } catch (error) {
    console.error('Error getting social media analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

/**
 * Get security dashboard (admin only)
 */
const getSecurityDashboard = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hours = parseInt(req.query.hours, 10) || 24;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [
      totalAccesses,
      flaggedAccesses,
      suspiciousActivity,
      topRiskUsers,
      deviceDistribution,
      accessByHour,
    ] = await Promise.all([
      AccessLog.countDocuments({ createdAt: { $gte: startDate } }),
      AccessLog.countDocuments({ createdAt: { $gte: startDate }, flagged: true }),
      AccessLog.detectSuspiciousActivity(hours),
      AccessLog.find({ createdAt: { $gte: startDate } })
        .sort({ 'security.riskScore': -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email'),
      AccessLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$deviceInfo.deviceType',
            count: { $sum: 1 },
          },
        },
      ]),
      AccessLog.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            avgRiskScore: { $avg: '$security.riskScore' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      summary: {
        totalAccesses,
        flaggedAccesses,
        flaggedPercentage:
          totalAccesses > 0 ? ((flaggedAccesses / totalAccesses) * 100).toFixed(2) : 0,
        suspiciousUsers: suspiciousActivity.length,
      },
      suspiciousActivity,
      topRiskUsers,
      deviceDistribution,
      accessByHour,
      period: `Last ${hours} hours`,
    });
  } catch (error) {
    console.error('Error getting security dashboard:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
};

module.exports = {
  trackAccess,
  getAccessAnalytics,
  getSocialMediaAnalytics,
  getSecurityDashboard,
};
