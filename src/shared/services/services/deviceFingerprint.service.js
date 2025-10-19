const crypto = require('crypto');
const UAParser = require('ua-parser-js');

/**
 * Device Fingerprinting Service
 * Creates unique device identifiers and tracks device information
 */

class DeviceFingerprintService {
  /**
   * Generate device fingerprint from request
   */
  static generateFingerprint(req, clientFingerprint = null) {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || req.connection.remoteAddress || '',
    ];

    // Add client-provided fingerprint data if available
    if (clientFingerprint) {
      components.push(
        clientFingerprint.screen || '',
        clientFingerprint.timezone || '',
        clientFingerprint.plugins || '',
        clientFingerprint.canvas || ''
      );
    }

    const fingerprintString = components.join('|');
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Parse device information from user agent
   */
  static parseDeviceInfo(req, clientData = {}) {
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();

    const deviceInfo = {
      deviceId: this.generateFingerprint(req, clientData),
      deviceType: this.getDeviceType(result),
      os: result.os.name || 'Unknown',
      osVersion: result.os.version || 'Unknown',
      browser: result.browser.name || 'Unknown',
      browserVersion: result.browser.version || 'Unknown',
      userAgent: req.headers['user-agent'] || 'Unknown',
      screenResolution: clientData.screenResolution || 'Unknown',
      timezone: clientData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: req.headers['accept-language']?.split(',')[0] || 'Unknown',
    };

    return deviceInfo;
  }

  /**
   * Determine device type from parsed result
   */
  static getDeviceType(parsedUA) {
    if (parsedUA.device.type === 'mobile') return 'mobile';
    if (parsedUA.device.type === 'tablet') return 'tablet';
    if (parsedUA.device.type) return parsedUA.device.type;

    // Fallback detection
    const ua = parsedUA.ua.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
      return 'mobile';
    }
    if (/tablet|ipad/.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Calculate device risk score
   */
  static calculateRiskScore(deviceInfo, userDevices = [], location = {}) {
    let riskScore = 0;
    const riskFactors = [];

    // New device
    const isNewDevice = !userDevices.some((d) => d.deviceId === deviceInfo.deviceId);
    if (isNewDevice) {
      riskScore += 20;
      riskFactors.push('new_device');
    }

    // Suspicious user agent
    if (!deviceInfo.userAgent || deviceInfo.userAgent === 'Unknown') {
      riskScore += 15;
      riskFactors.push('missing_user_agent');
    }

    // Uncommon browser
    const commonBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    if (!commonBrowsers.includes(deviceInfo.browser)) {
      riskScore += 10;
      riskFactors.push('uncommon_browser');
    }

    // VPN/Proxy detection (basic)
    if (location.isp && /vpn|proxy|tor/i.test(location.isp)) {
      riskScore += 25;
      riskFactors.push('vpn_or_proxy');
    }

    // Unusual location
    if (location.country && userDevices.length > 0) {
      const commonCountries = userDevices.map((d) => d.location?.country).filter(Boolean);

      if (commonCountries.length > 0 && !commonCountries.includes(location.country)) {
        riskScore += 15;
        riskFactors.push('unusual_location');
      }
    }

    // Multiple devices in short time
    const recentDevices = userDevices.filter((d) => {
      const deviceAge = Date.now() - new Date(d.lastSeen).getTime();
      return deviceAge < 3600000; // 1 hour
    });

    if (recentDevices.length > 3) {
      riskScore += 20;
      riskFactors.push('multiple_devices');
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskFactors,
      isNewDevice,
    };
  }

  /**
   * Parse referral source information
   */
  static parseReferralSource(req) {
    const referrer = req.headers.referer || req.headers.referrer || '';
    const query = req.query || {};

    const referralSource = {
      type: 'direct',
      platform: 'none',
      campaign: query.campaign || query.utm_campaign || null,
      referrer,
      utmSource: query.utm_source || null,
      utmMedium: query.utm_medium || null,
      utmCampaign: query.utm_campaign || null,
      utmTerm: query.utm_term || null,
      utmContent: query.utm_content || null,
    };

    // Detect social media platforms
    const socialPlatforms = {
      facebook: /facebook\.com|fb\.com|fbcdn\.net/i,
      instagram: /instagram\.com|instagr\.am/i,
      twitter: /twitter\.com|t\.co/i,
      linkedin: /linkedin\.com|lnkd\.in/i,
      tiktok: /tiktok\.com/i,
      youtube: /youtube\.com|youtu\.be/i,
      whatsapp: /whatsapp\.com|wa\.me/i,
      telegram: /telegram\.org|t\.me/i,
    };

    for (const [platform, regex] of Object.entries(socialPlatforms)) {
      if (regex.test(referrer) || regex.test(query.utm_source || '')) {
        referralSource.type = 'social_media';
        referralSource.platform = platform;
        break;
      }
    }

    // Detect search engines
    if (/google|bing|yahoo|duckduckgo|baidu/i.test(referrer)) {
      referralSource.type = 'search';
    }

    // Detect email campaigns
    if (query.utm_medium === 'email' || /email|newsletter/i.test(referrer)) {
      referralSource.type = 'email';
    }

    // Detect QR codes
    if (query.source === 'qr' || query.qr === '1') {
      referralSource.type = 'qr_code';
    }

    // Detect advertisements
    if (/^(cpc|ppc|display|banner)$/i.test(query.utm_medium)) {
      referralSource.type = 'advertisement';
    }

    return referralSource;
  }

  /**
   * Get IP-based location (requires external service or GeoIP database)
   */
  static async getLocationFromIP(ip) {
    // This is a placeholder - integrate with ip-api.com, MaxMind, or similar
    try {
      // Example using ip-api.com (free tier)
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`
      );
      const data = await response.json();

      if (data.status === 'success') {
        return {
          ip,
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          isp: data.isp,
        };
      }
    } catch (error) {
      console.error('Failed to get location from IP:', error);
    }

    // Fallback
    return {
      ip,
      country: 'Unknown',
      countryCode: 'XX',
      region: 'Unknown',
      city: 'Unknown',
      latitude: null,
      longitude: null,
      timezone: 'Unknown',
      isp: 'Unknown',
    };
  }

  /**
   * Validate device trust score
   */
  static isDeviceTrusted(deviceId, trustedDevices = []) {
    return trustedDevices.some(
      (d) =>
        d.deviceId === deviceId &&
        d.trusted === true &&
        (!d.expiresAt || new Date(d.expiresAt) > new Date())
    );
  }
}

module.exports = DeviceFingerprintService;
