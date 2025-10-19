/**
 * Environment-specific Configuration
 * Handles different configurations for development, staging, and production
 */

const path = require('path');

// Load environment variables
require('dotenv').config();

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3001,
  
  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    passwordResetExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 60,
    emailVerificationExpiry: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES, 10) || 1440,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockoutTimeHours: parseInt(process.env.LOCKOUT_TIME_HOURS, 10) || 2,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 60,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000,
  },
  
  // External Services
  services: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'support@healthcare.com',
      fromName: process.env.SENDGRID_FROM_NAME || 'HealthCare Team',
    },
    firebase: {
      serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
    },
    webPush: {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      vapidSubject: process.env.VAPID_SUBJECT || 'mailto:support@healthcare.com',
    }
  },
  
  // Application
  app: {
    name: process.env.APP_NAME || 'HealthCare Management API',
    version: '1.0.0',
    description: 'Complete healthcare practice management system REST API',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  // File Storage
  storage: {
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:19006'],
    credentials: true,
  }
};

// Environment-specific overrides
if (config.NODE_ENV === 'production') {
  // Production-specific settings
  config.database.options.maxPoolSize = 20;
  config.logging.level = 'warn';
  config.rateLimit.maxRequests = 500; // Stricter in production
  
  // Security enhancements for production
  config.security.bcryptRounds = 14;
  config.security.maxLoginAttempts = 3;
  config.security.lockoutTimeHours = 24;
  
} else if (config.NODE_ENV === 'staging') {
  // Staging-specific settings
  config.logging.level = 'debug';
  config.rateLimit.maxRequests = 750;
  
} else {
  // Development-specific settings
  config.logging.level = 'debug';
  config.rateLimit.maxRequests = 2000; // More lenient in development
}

/**
 * Validate required configuration
 */
function validateConfig() {
  const required = {
    JWT_SECRET: config.security.jwtSecret,
    MONGODB_URI: config.database.uri,
  };
  
  const missing = [];
  const weak = [];
  
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    } else if (key === 'JWT_SECRET' && (
      value.length < 32 || 
      value.includes('change-in-production') ||
      value.includes('secret-key') ||
      value === 'secret'
    )) {
      weak.push(key);
    }
  }
  
  // Check for placeholder values
  const placeholders = [];
  if (config.services.stripe.secretKey && config.services.stripe.secretKey.includes('replace_with_actual')) {
    placeholders.push('STRIPE_SECRET_KEY');
  }
  
  return {
    valid: missing.length === 0 && weak.length === 0,
    missing,
    weak,
    placeholders,
    warnings: placeholders.length > 0 ? placeholders : []
  };
}

/**
 * Get configuration for specific module
 */
function getModuleConfig(moduleName) {
  const moduleConfigs = {
    auth: {
      jwt: config.security,
      rateLimit: config.rateLimit,
      twilio: config.services.twilio,
    },
    database: config.database,
    push: {
      firebase: config.services.firebase,
      webPush: config.services.webPush,
    },
    payment: {
      stripe: config.services.stripe,
    },
    email: {
      sendgrid: config.services.sendgrid,
    }
  };
  
  return moduleConfigs[moduleName] || {};
}

module.exports = {
  config,
  validateConfig,
  getModuleConfig,
  
  // Direct exports for convenience
  NODE_ENV: config.NODE_ENV,
  PORT: config.PORT,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isStaging: config.NODE_ENV === 'staging',
};