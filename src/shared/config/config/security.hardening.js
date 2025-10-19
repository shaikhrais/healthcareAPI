/**
 * Production Security & Secrets Hardening
 * Comprehensive validation and security checks for production deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurityHardening {
  constructor() {
    this.securityChecks = [];
    this.warnings = [];
    this.criticalErrors = [];
  }

  /**
   * Validate JWT secrets strength
   */
  validateJWTSecurity(config) {
    const { jwt } = config;

    // Check JWT secret strength
    if (!jwt.secret) {
      this.criticalErrors.push('JWT_SECRET is not set');
      return false;
    }

    // Check for weak secrets
    const weakSecrets = [
      'secret', 'jwt-secret', 'change-me', 'your-secret', 
      'test', 'development', 'password', '123456',
      'your_super_secure_jwt_secret_here_minimum_32_chars'
    ];

    if (weakSecrets.some(weak => jwt.secret.toLowerCase().includes(weak))) {
      this.criticalErrors.push('JWT_SECRET appears to be a default/weak value');
      return false;
    }

    // Check minimum length (256 bits = 32 chars minimum)
    if (jwt.secret.length < 32) {
      this.criticalErrors.push('JWT_SECRET must be at least 32 characters long');
      return false;
    }

    // Check for entropy (should have good randomness)
    const entropy = this.calculateEntropy(jwt.secret);
    if (entropy < 4.0) {
      this.warnings.push('JWT_SECRET has low entropy - consider using a more random secret');
    }

    // Check refresh secret
    if (!jwt.refreshSecret || jwt.refreshSecret === jwt.secret) {
      this.criticalErrors.push('JWT_REFRESH_SECRET must be set and different from JWT_SECRET');
      return false;
    }

    this.securityChecks.push('✅ JWT secrets validation passed');
    return true;
  }

  /**
   * Validate database security configuration
   */
  validateDatabaseSecurity(config) {
    const { mongodb } = config;

    if (!mongodb.uri) {
      this.criticalErrors.push('MONGODB_URI is not configured');
      return false;
    }

    // Check for production database requirements
    if (config.isProduction) {
      // Check for localhost/memory database in production
      if (mongodb.uri.includes('localhost') || mongodb.uri.includes('127.0.0.1')) {
        this.criticalErrors.push('Production should not use localhost MongoDB');
        return false;
      }

      // Check for MongoDB Atlas or proper authentication
      if (!mongodb.uri.includes('@') && !mongodb.uri.includes('mongodb+srv')) {
        this.warnings.push('Consider using MongoDB Atlas or authenticated connection');
      }

      // Check SSL/TLS
      if (!mongodb.uri.includes('ssl=true') && !mongodb.uri.includes('mongodb+srv')) {
        this.warnings.push('Consider enabling SSL/TLS for database connections');
      }
    }

    this.securityChecks.push('✅ Database security validation passed');
    return true;
  }

  /**
   * Validate CORS and security headers
   */
  validateCORSSecurity(config) {
    const { security } = config;

    if (config.isProduction) {
      // Check CORS origin in production
      if (security.corsOrigin === '*') {
        this.criticalErrors.push('CORS_ORIGIN should not be "*" in production');
        return false;
      }

      // Check for proper production URLs
      if (!security.corsOrigin.includes('https://')) {
        this.warnings.push('Production CORS_ORIGIN should use HTTPS');
      }
    }

    this.securityChecks.push('✅ CORS security validation passed');
    return true;
  }

  /**
   * Validate external service configurations
   */
  validateExternalServices(config) {
    const { services } = config;

    // Check for placeholder values
    const placeholderPatterns = [
      'your_', 'sk_test_', 'pk_test_', 'test_', 'example', 'placeholder'
    ];

    Object.entries(services).forEach(([serviceName, serviceConfig]) => {
      Object.entries(serviceConfig).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          if (placeholderPatterns.some(pattern => value.toLowerCase().includes(pattern))) {
            this.warnings.push(`${serviceName}.${key} appears to be a placeholder value`);
          }
        }
      });
    });

    // Check for production Stripe keys
    if (config.isProduction && services.stripe.secretKey) {
      if (services.stripe.secretKey.startsWith('sk_test_')) {
        this.criticalErrors.push('Production should not use Stripe test keys');
        return false;
      }
    }

    this.securityChecks.push('✅ External services validation passed');
    return true;
  }

  /**
   * Validate environment-specific configurations
   */
  validateEnvironmentConfig(config) {
    if (config.isProduction) {
      // Check NODE_ENV
      if (process.env.NODE_ENV !== 'production') {
        this.criticalErrors.push('NODE_ENV must be "production" for production deployment');
        return false;
      }

      // Check bcrypt rounds (should be higher in production)
      if (config.security.bcryptRounds < 12) {
        this.warnings.push('Consider increasing BCRYPT_ROUNDS to 12+ for production');
      }

      // Check rate limiting
      if (config.security.rateLimitMax > 200) {
        this.warnings.push('Rate limit seems high for production (consider lowering RATE_LIMIT_MAX)');
      }

      // Check upload limits
      if (config.app.maxUploadSize > 10 * 1024 * 1024) {
        this.warnings.push('Upload size limit seems high (consider lowering MAX_UPLOAD_SIZE)');
      }
    }

    this.securityChecks.push('✅ Environment configuration validation passed');
    return true;
  }

  /**
   * Check for sensitive data exposure
   */
  validateSensitiveDataExposure(config) {
    const sensitiveKeys = ['secret', 'token', 'key', 'password', 'auth'];
    const exposedSecrets = [];

    // Check if any secrets are logged or exposed
    const configString = JSON.stringify(config, null, 2);
    
    sensitiveKeys.forEach(key => {
      const regex = new RegExp(`"${key}":\\s*"([^"]+)"`, 'gi');
      const matches = configString.match(regex);
      if (matches) {
        matches.forEach(match => {
          const value = match.split('"')[3];
          if (value && value.length > 10) {
            exposedSecrets.push(`Potential secret exposure in config: ${key}`);
          }
        });
      }
    });

    if (exposedSecrets.length > 0) {
      this.warnings.push('Potential sensitive data in configuration object');
    }

    this.securityChecks.push('✅ Sensitive data exposure check passed');
    return true;
  }

  /**
   * Calculate string entropy (randomness measure)
   */
  calculateEntropy(str) {
    const charCounts = {};
    for (let char of str) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    let entropy = 0;
    const length = str.length;
    
    for (let count of Object.values(charCounts)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Generate secure random secret
   */
  static generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Run all security validations
   */
  runSecurityAudit(config) {
    console.log('🔐 Running Security Hardening Audit...\n');

    const checks = [
      () => this.validateJWTSecurity(config),
      () => this.validateDatabaseSecurity(config),
      () => this.validateCORSSecurity(config),
      () => this.validateExternalServices(config),
      () => this.validateEnvironmentConfig(config),
      () => this.validateSensitiveDataExposure(config),
    ];

    let allPassed = true;
    checks.forEach(check => {
      try {
        if (!check()) {
          allPassed = false;
        }
      } catch (error) {
        this.criticalErrors.push(`Security check failed: ${error.message}`);
        allPassed = false;
      }
    });

    return this.generateReport(allPassed);
  }

  /**
   * Generate security audit report
   */
  generateReport(passed) {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      passed,
      securityChecks: this.securityChecks,
      warnings: this.warnings,
      criticalErrors: this.criticalErrors,
      recommendations: this.generateRecommendations(),
    };

    // Print console report
    console.log('📊 Security Audit Report');
    console.log('========================\n');

    if (this.criticalErrors.length > 0) {
      console.log('🚨 CRITICAL ERRORS:');
      this.criticalErrors.forEach(error => console.log(`   ❌ ${error}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
      console.log('');
    }

    if (this.securityChecks.length > 0) {
      console.log('✅ PASSED CHECKS:');
      this.securityChecks.forEach(check => console.log(`   ${check}`));
      console.log('');
    }

    if (report.recommendations.length > 0) {
      console.log('💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`   💡 ${rec}`));
      console.log('');
    }

    const status = passed ? '✅ SECURITY AUDIT PASSED' : '❌ SECURITY AUDIT FAILED';
    console.log(`🎯 ${status}\n`);

    return report;
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (process.env.NODE_ENV === 'production') {
      recommendations.push('Enable audit logging for all API endpoints');
      recommendations.push('Set up monitoring and alerting for security events');
      recommendations.push('Regularly rotate JWT secrets and API keys');
      recommendations.push('Implement API key authentication for external services');
      recommendations.push('Enable database connection encryption');
      recommendations.push('Configure backup and disaster recovery plans');
    }

    recommendations.push('Use environment-specific configuration files');
    recommendations.push('Implement secret rotation policies');
    recommendations.push('Set up vulnerability scanning in CI/CD pipeline');
    recommendations.push('Enable security headers middleware');

    return recommendations;
  }
}

module.exports = SecurityHardening;