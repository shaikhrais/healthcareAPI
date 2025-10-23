/**
 * ConfigManager
 * Typed, centralized access to environment configuration with sane defaults.
 */
require('dotenv').config();

const parseBool = (v, d = false) => {
  if (v === undefined || v === null || v === '') return d;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const parseNumber = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const ConfigManager = {
  // Core server
  env: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3001),
  httpsPort: parseNumber(process.env.HTTPS_PORT, 3443),
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',

  // Security
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  enableCORS: parseBool(process.env.ENABLE_CORS, true),
  trustProxy: parseBool(process.env.TRUST_PROXY, false),

  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare',
  mongoPoolSize: parseNumber(process.env.MONGO_POOL_SIZE, 10),

  // Rate limiting
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_WINDOW_MS, 15 * 60 * 1000),
    max: parseNumber(process.env.RATE_MAX, 100),
  },

  // Mail/SMS
  mail: {
    host: process.env.MAIL_HOST,
    port: parseNumber(process.env.MAIL_PORT, 587),
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || 'no-reply@healthcare.local',
  },
  sms: {
    twilioSid: process.env.TWILIO_SID,
    twilioToken: process.env.TWILIO_TOKEN,
    from: process.env.TWILIO_FROM,
  },

  // Feature flags
  features: {
    enableBilling: parseBool(process.env.FEAT_BILLING, true),
    enableAnalytics: parseBool(process.env.FEAT_ANALYTICS, true),
    enableAttachments: parseBool(process.env.FEAT_ATTACHMENTS, true),
  },

  // Safe snapshot for exposing to clients/admin pages (no secrets!)
  public() {
    return {
      env: this.env,
      baseUrl: this.baseUrl,
      rateLimit: this.rateLimit,
      features: this.features,
    };
  },
};

module.exports = ConfigManager;
