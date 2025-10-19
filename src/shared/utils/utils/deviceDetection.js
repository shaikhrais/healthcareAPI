const UAParser = require('ua-parser-js');
const crypto = require('crypto');

/**
 * Device Detection and Fingerprinting Utilities
 */

/**
 * Parse user agent string to extract device information
 */
function parseUserAgent(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || 'Unknown',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || 'Unknown',
    device: result.device.model || 'Unknown',
    deviceVendor: result.device.vendor || 'Unknown',
    deviceType: result.device.type || 'desktop',
  };
}

/**
 * Determine device type from user agent
 */
function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();

  if (ua.includes('tv') || ua.includes('smarttv') || ua.includes('appletv')) {
    return 'tv';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Generate device fingerprint from request data
 * This creates a unique identifier for the device
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Get client IP (considering proxies)
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';

  // Create fingerprint from various headers
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip}`;

  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Extract IP address from request
 */
function getClientIP(req) {
  // Check for forwarded IP (from proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Get location from IP address (placeholder for geolocation service)
 * In production, you would use a service like MaxMind GeoIP2, ipapi.co, or ip-api.com
 */
async function getLocationFromIP(ip) {
  // Skip for localhost/private IPs
  if (
    ip === 'unknown' ||
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip === '::1'
  ) {
    return {
      country: 'Local',
      region: 'Local',
      city: 'Local',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  try {
    // Example using free ip-api.com service (rate limited to 45 requests/minute)
    const axios = require('axios');
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 3000,
    });

    if (response.data.status === 'success') {
      return {
        country: response.data.country || 'Unknown',
        region: response.data.regionName || 'Unknown',
        city: response.data.city || 'Unknown',
        latitude: response.data.lat || null,
        longitude: response.data.lon || null,
        timezone: response.data.timezone || null,
      };
    }
  } catch (error) {
    console.error('Error fetching location:', error.message);
  }

  // Fallback if geolocation fails
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    timezone: null,
  };
}

/**
 * Create device-friendly name
 */
function generateDeviceName(userAgent) {
  const parsed = parseUserAgent(userAgent);

  if (parsed.device !== 'Unknown') {
    return `${parsed.deviceVendor} ${parsed.device}`.trim();
  }

  if (parsed.os !== 'Unknown') {
    return `${parsed.os} ${parsed.browser}`.trim();
  }

  return 'Unknown Device';
}

/**
 * Extract complete device data from request
 */
async function extractDeviceData(req) {
  const userAgent = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(userAgent);
  const ip = getClientIP(req);
  const location = await getLocationFromIP(ip);

  return {
    deviceFingerprint: generateDeviceFingerprint(req),
    deviceType: getDeviceType(userAgent),
    platform: parsed.os,
    browser: parsed.browser,
    userAgent,
    ipAddress: ip,
    location,
    deviceName: generateDeviceName(userAgent),
  };
}

/**
 * Check if device is suspicious
 * Returns true if device shows signs of being suspicious
 */
function isSuspiciousDevice(deviceData, user) {
  const suspiciousIndicators = [];

  // Check for missing user agent
  if (!deviceData.userAgent || deviceData.userAgent.length < 20) {
    suspiciousIndicators.push('Missing or very short user agent');
  }

  // Check for unknown IP
  if (deviceData.ipAddress === 'unknown') {
    suspiciousIndicators.push('Unknown IP address');
  }

  // Check for headless browsers
  if (deviceData.userAgent.toLowerCase().includes('headless')) {
    suspiciousIndicators.push('Headless browser detected');
  }

  // Check for bot indicators
  const botKeywords = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
  if (botKeywords.some((keyword) => deviceData.userAgent.toLowerCase().includes(keyword))) {
    suspiciousIndicators.push('Bot-like user agent');
  }

  return {
    isSuspicious: suspiciousIndicators.length > 0,
    reasons: suspiciousIndicators,
  };
}

module.exports = {
  parseUserAgent,
  getDeviceType,
  generateDeviceFingerprint,
  getClientIP,
  getLocationFromIP,
  generateDeviceName,
  extractDeviceData,
  isSuspiciousDevice,
};
