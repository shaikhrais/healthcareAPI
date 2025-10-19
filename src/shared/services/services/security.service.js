
const AccessLog = require('../models/AccessLog');
const Device = require('../models/Device');
const User = require('../models/User');
/**
 * Advanced Security Service
 * Provides security recommendations and threat detection
 */

class SecurityService {
  /**
   * Analyze system security posture
   */
  static async analyzeSecurityPosture() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      recentHighRisk,
      flaggedAccesses,
      newDevices,
      unusualLocations,
      failedLogins,
      multipleDevices,
      vpnUsage,
    ] = await Promise.all([
      AccessLog.countDocuments({
        createdAt: { $gte: last24Hours },
        'security.riskScore': { $gte: 70 },
      }),
      AccessLog.countDocuments({
        createdAt: { $gte: last7Days },
        flagged: true,
      }),
      Device.countDocuments({
        createdAt: { $gte: last7Days },
        'security.isNewDevice': true,
      }),
      this.detectUnusualLocations(),
      this.getFailedLoginAttempts(24),
      this.detectMultipleDeviceAccess(),
      this.detectVPNUsage(),
    ]);

    const totalAccesses = await AccessLog.countDocuments({
      createdAt: { $gte: last7Days },
    });

    const securityScore = this.calculateSecurityScore({
      recentHighRisk,
      flaggedAccesses,
      newDevices,
      unusualLocations: unusualLocations.length,
      failedLogins: failedLogins.length,
      multipleDevices: multipleDevices.length,
      vpnUsage: vpnUsage.length,
      totalAccesses,
    });

    return {
      securityScore,
      threats: {
        high: recentHighRisk,
        medium: flaggedAccesses,
        low: newDevices,
      },
      metrics: {
        recentHighRisk,
        flaggedAccesses,
        newDevices,
        unusualLocations: unusualLocations.length,
        failedLogins: failedLogins.length,
        multipleDevices: multipleDevices.length,
        vpnUsage: vpnUsage.length,
      },
      details: {
        unusualLocations,
        failedLogins,
        multipleDevices,
        vpnUsage,
      },
    };
  }

  /**
   * Calculate overall security score (0-100)
   */
  static calculateSecurityScore(metrics) {
    let score = 100;

    // Deduct points for security issues
    score -= Math.min(metrics.recentHighRisk * 5, 30);
    score -= Math.min(metrics.flaggedAccesses * 2, 20);
    score -= Math.min(metrics.unusualLocations * 3, 15);
    score -= Math.min(metrics.failedLogins * 2, 15);
    score -= Math.min(metrics.multipleDevices * 4, 15);
    score -= Math.min(metrics.vpnUsage * 1, 5);

    return Math.max(score, 0);
  }

  /**
   * Get security recommendations
   */
  static async getSecurityRecommendations() {
    const posture = await this.analyzeSecurityPosture();
    const recommendations = [];

    // Critical recommendations
    if (posture.threats.high > 10) {
      recommendations.push({
        priority: 'critical',
        category: 'threat_detection',
        title: 'High-Risk Access Attempts Detected',
        description: `${posture.threats.high} high-risk access attempts in the last 24 hours`,
        action: 'Review access logs and block suspicious IPs',
        impact: 'high',
      });
    }

    if (posture.metrics.failedLogins > 50) {
      recommendations.push({
        priority: 'critical',
        category: 'authentication',
        title: 'Excessive Failed Login Attempts',
        description: `${posture.metrics.failedLogins} failed login attempts detected`,
        action: 'Enable stricter rate limiting and CAPTCHA',
        impact: 'high',
      });
    }

    // High priority recommendations
    if (posture.metrics.vpnUsage > 20) {
      recommendations.push({
        priority: 'high',
        category: 'access_control',
        title: 'High VPN/Proxy Usage',
        description: 'Significant access through VPNs or proxies detected',
        action: 'Consider implementing additional verification for VPN users',
        impact: 'medium',
      });
    }

    if (posture.metrics.multipleDevices > 10) {
      recommendations.push({
        priority: 'high',
        category: 'device_management',
        title: 'Multiple Device Access',
        description: 'Users accessing from multiple devices simultaneously',
        action: 'Implement device limits or multi-device authentication',
        impact: 'medium',
      });
    }

    // Medium priority recommendations
    if (posture.metrics.newDevices > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'device_management',
        title: 'High Number of New Devices',
        description: `${posture.metrics.newDevices} new devices in the last week`,
        action: 'Enable email notifications for new device logins',
        impact: 'low',
      });
    }

    if (posture.metrics.unusualLocations > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'access_control',
        title: 'Unusual Access Locations',
        description: 'Access from uncommon geographic locations detected',
        action: 'Enable geo-blocking or additional verification for new locations',
        impact: 'medium',
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'low',
      category: 'best_practices',
      title: 'Enable Two-Factor Authentication',
      description: 'Enhance security with 2FA for all users',
      action: 'Implement SMS or authenticator app 2FA',
      impact: 'high',
    });

    recommendations.push({
      priority: 'low',
      category: 'best_practices',
      title: 'Regular Security Audits',
      description: 'Schedule periodic security reviews',
      action: 'Review access logs and security settings monthly',
      impact: 'medium',
    });

    recommendations.push({
      priority: 'low',
      category: 'monitoring',
      title: 'Set Up Real-time Alerts',
      description: 'Enable instant notifications for security events',
      action: 'Configure email/SMS alerts for high-risk activities',
      impact: 'high',
    });

    recommendations.push({
      priority: 'low',
      category: 'data_protection',
      title: 'Implement IP Whitelisting',
      description: 'Restrict admin access to trusted IPs',
      action: 'Configure IP whitelist for admin users',
      impact: 'high',
    });

    recommendations.push({
      priority: 'low',
      category: 'compliance',
      title: 'HIPAA Compliance Check',
      description: 'Ensure healthcare data protection standards',
      action: 'Review and update privacy policies and access controls',
      impact: 'critical',
    });

    return {
      securityScore: posture.securityScore,
      totalRecommendations: recommendations.length,
      critical: recommendations.filter((r) => r.priority === 'critical').length,
      high: recommendations.filter((r) => r.priority === 'high').length,
      medium: recommendations.filter((r) => r.priority === 'medium').length,
      low: recommendations.filter((r) => r.priority === 'low').length,
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      lastAnalyzed: new Date(),
    };
  }

  /**
   * Detect unusual access locations
   */
  static async detectUnusualLocations() {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return AccessLog.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
          'location.country': { $exists: true, $ne: 'Unknown' },
        },
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            country: '$location.country',
          },
          count: { $sum: 1 },
          cities: { $addToSet: '$location.city' },
          ips: { $addToSet: '$location.ip' },
          avgRiskScore: { $avg: '$security.riskScore' },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          countries: { $push: { country: '$_id.country', count: '$count' } },
          totalCountries: { $sum: 1 },
          avgRiskScore: { $avg: '$avgRiskScore' },
        },
      },
      {
        $match: { totalCountries: { $gte: 3 } },
      },
      { $sort: { totalCountries: -1, avgRiskScore: -1 } },
      { $limit: 20 },
    ]);
  }

  /**
   * Get failed login attempts
   */
  static async getFailedLoginAttempts(hours = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    return AccessLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          accessType: 'login',
          statusCode: { $in: [401, 403] },
        },
      },
      {
        $group: {
          _id: {
            ip: '$location.ip',
            userAgent: '$deviceInfo.userAgent',
          },
          attempts: { $sum: 1 },
          countries: { $addToSet: '$location.country' },
          lastAttempt: { $max: '$createdAt' },
        },
      },
      {
        $match: { attempts: { $gte: 5 } },
      },
      {
        $project: {
          ip: '$_id.ip',
          userAgent: '$_id.userAgent',
          attempts: 1,
          countries: 1,
          lastAttempt: 1,
        },
      },
      { $sort: { attempts: -1 } },
      { $limit: 50 },
    ]);
  }

  /**
   * Detect multiple device access
   */
  static async detectMultipleDeviceAccess() {
    const last1Hour = new Date(Date.now() - 60 * 60 * 1000);

    return AccessLog.aggregate([
      {
        $match: {
          createdAt: { $gte: last1Hour },
        },
      },
      {
        $group: {
          _id: '$userId',
          devices: { $addToSet: '$deviceInfo.deviceId' },
          ips: { $addToSet: '$location.ip' },
          locations: {
            $addToSet: {
              country: '$location.country',
              city: '$location.city',
            },
          },
        },
      },
      {
        $project: {
          userId: '$_id',
          deviceCount: { $size: '$devices' },
          ipCount: { $size: '$ips' },
          locationCount: { $size: '$locations' },
        },
      },
      {
        $match: {
          $or: [
            { deviceCount: { $gte: 3 } },
            { ipCount: { $gte: 3 } },
            { locationCount: { $gte: 2 } },
          ],
        },
      },
      { $sort: { deviceCount: -1 } },
      { $limit: 20 },
    ]);
  }

  /**
   * Detect VPN/Proxy usage
   */
  static async detectVPNUsage() {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return AccessLog.aggregate([
      {
        $match: {
          createdAt: { $gte: last24Hours },
          'security.riskFactors': 'vpn_or_proxy',
        },
      },
      {
        $group: {
          _id: '$userId',
          accessCount: { $sum: 1 },
          ips: { $addToSet: '$location.ip' },
          countries: { $addToSet: '$location.country' },
          isps: { $addToSet: '$location.isp' },
        },
      },
      {
        $project: {
          userId: '$_id',
          accessCount: 1,
          ipCount: { $size: '$ips' },
          countries: 1,
          isps: 1,
        },
      },
      { $sort: { accessCount: -1 } },
      { $limit: 20 },
    ]);
  }

  /**
   * Additional security measures to implement
   */
  static getImplementationGuide() {
    return {
      immediate: [
        {
          measure: 'Multi-Factor Authentication (MFA)',
          description: 'Require 2FA for all admin users and high-risk accounts',
          implementation:
            'Use TOTP (Time-based One-Time Password) with apps like Google Authenticator',
          priority: 'critical',
        },
        {
          measure: 'Rate Limiting Enhancement',
          description: 'Implement progressive rate limiting based on risk score',
          implementation: 'Use Redis to track and limit requests per user/IP',
          priority: 'high',
        },
        {
          measure: 'IP Reputation Checking',
          description: 'Integrate with IP reputation services to block known bad actors',
          implementation: 'Use AbuseIPDB, IPQualityScore, or similar services',
          priority: 'high',
        },
      ],
      shortTerm: [
        {
          measure: 'Geo-Blocking',
          description: 'Block or require additional verification from high-risk countries',
          implementation: 'Use MaxMind GeoIP2 or similar for country detection',
          priority: 'medium',
        },
        {
          measure: 'Device Fingerprinting Enhancement',
          description: 'Use advanced browser fingerprinting techniques',
          implementation: 'Implement FingerprintJS or similar client-side library',
          priority: 'medium',
        },
        {
          measure: 'Anomaly Detection',
          description: 'ML-based detection of unusual user behavior',
          implementation: 'Train models on historical access patterns',
          priority: 'medium',
        },
        {
          measure: 'Session Management',
          description: 'Implement absolute and idle session timeouts',
          implementation: 'Redis-based session store with configurable TTL',
          priority: 'high',
        },
      ],
      longTerm: [
        {
          measure: 'Zero Trust Architecture',
          description: 'Never trust, always verify - authenticate every request',
          implementation: 'Implement continuous authentication and authorization',
          priority: 'medium',
        },
        {
          measure: 'Behavioral Biometrics',
          description: 'Analyze typing patterns, mouse movements for authentication',
          implementation: 'Use BioCatch or TypingDNA',
          priority: 'low',
        },
        {
          measure: 'SIEM Integration',
          description: 'Integrate with Security Information and Event Management system',
          implementation: 'Send logs to Splunk, ELK Stack, or similar',
          priority: 'low',
        },
      ],
      compliance: [
        {
          measure: 'HIPAA Compliance',
          description: 'Ensure all healthcare data handling meets HIPAA standards',
          implementation: 'Audit trails, encryption at rest/transit, access controls',
          priority: 'critical',
        },
        {
          measure: 'GDPR Compliance',
          description: 'User data protection and privacy rights',
          implementation: 'Data retention policies, right to be forgotten, consent management',
          priority: 'high',
        },
        {
          measure: 'SOC 2 Certification',
          description: 'Demonstrate security controls to clients',
          implementation: 'Engage auditor, implement required controls',
          priority: 'medium',
        },
      ],
    };
  }
}

module.exports = SecurityService;
