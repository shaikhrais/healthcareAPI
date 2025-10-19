/**
 * Environment Configuration
 * Centralized environment variable management with validation
 */

require('dotenv').config();
const SecurityHardening = require('./security.hardening');

const requiredEnvVars = {
  development: ['PORT', 'JWT_SECRET'],
  production: [
    'PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'NODE_ENV',
    'CORS_ORIGIN', 'SENDGRID_API_KEY', 'TWILIO_ACCOUNT_SID', 'STRIPE_SECRET_KEY'
  ],
  test: ['JWT_SECRET'],
};

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  host: process.env.HOST || 'localhost',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // requests per window
    corsOrigin: process.env.CORS_ORIGIN || '*',
    corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || 'logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // External Services
  services: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME || 'HealthCare',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },

  // Application Settings
  app: {
    name: process.env.APP_NAME || 'HealthCare',
    url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:8081',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE, 10) || 5 * 1024 * 1024, // 5MB
  },

  // Pagination
  pagination: {
    defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT, 10) || 25,
    maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT, 10) || 100,
  },

  // Cache
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300, // 5 minutes
    redisUrl: process.env.REDIS_URL,
  },

  // Monitoring & Error Tracking
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    enableProfiling: process.env.ENABLE_PROFILING === 'true',
    enableTracing: process.env.ENABLE_TRACING === 'true',
  },

  // Production Security Settings
  production: {
    forceHttps: process.env.FORCE_HTTPS === 'true',
    trustProxy: process.env.TRUST_PROXY === 'true',
    sessionSecret: process.env.SESSION_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    disableMemoryDatabase: process.env.DISABLE_MEMORY_DB === 'true',
  },
};

// Enhanced validation with security hardening
function validateEnv() {
  const required = requiredEnvVars[config.env] || requiredEnvVars.development;
  const missing = [];
  const warnings = [];

  // Check required variables
  required.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(', ')}\n` +
        `Please create a .env file with these variables.\n` +
        `Use the template: cp .env.production.template .env`
    );
  }

  // Production-specific validations
  if (config.isProduction) {
    // Check memory database is disabled
    if (!config.production.disableMemoryDatabase) {
      warnings.push('DISABLE_MEMORY_DB should be "true" in production');
    }

    // Check HTTPS enforcement
    if (!config.production.forceHttps) {
      warnings.push('FORCE_HTTPS should be "true" in production');
    }

    // Check for development URLs in production
    if (config.app.clientUrl.includes('localhost')) {
      warnings.push('CLIENT_URL should not use localhost in production');
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
    console.warn('');
  }

  return true;
}

// Run comprehensive security audit
function runSecurityAudit() {
  if (process.env.SKIP_SECURITY_AUDIT === 'true') {
    console.log('⚠️  Security audit skipped');
    return;
  }

  const hardening = new SecurityHardening();
  const auditResult = hardening.runSecurityAudit(config);

  // Save audit report in production
  if (config.isProduction) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const reportFile = path.join(reportsDir, `security-audit-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(auditResult, null, 2));
      console.log(`📄 Security audit saved: ${reportFile}`);
    } catch (error) {
      console.warn('⚠️  Could not save security audit report:', error.message);
    }
  }

  // Fail if critical errors in production
  if (config.isProduction && !auditResult.passed) {
    throw new Error(
      '🚨 Security audit failed with critical errors. ' +
      'Please fix all critical issues before deploying to production.'
    );
  }

  return auditResult;
}

// Run validation and security audit on import
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
  
  // Run security audit (but don't fail in development)
  try {
    runSecurityAudit();
  } catch (error) {
    if (config.isProduction) {
      throw error;
    } else {
      console.warn('⚠️  Security audit warning:', error.message);
    }
  }
}

module.exports = config;
