/**
 * Secrets Manager
 * Secure handling and validation of sensitive configuration data
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretsManager {
  constructor() {
    this.encryptionKey = this.getEncryptionKey();
    this.secretsCache = new Map();
  }

  /**
   * Get or generate encryption key for secrets
   */
  getEncryptionKey() {
    const keyFromEnv = process.env.ENCRYPTION_KEY;
    
    if (keyFromEnv) {
      return Buffer.from(keyFromEnv, 'base64');
    }

    // Generate a key (in production, this should come from secure storage)
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  No ENCRYPTION_KEY provided in production - using generated key');
    }
    
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    if (!text) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedObj) {
    if (!encryptedObj || !encryptedObj.encryptedData) return null;

    try {
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt secret:', error.message);
      return null;
    }
  }

  /**
   * Securely store secrets to file
   */
  storeSecrets(secrets, filename = 'secrets.enc') {
    const secretsPath = path.join(__dirname, '../config', filename);
    
    try {
      const encryptedSecrets = {};
      
      Object.entries(secrets).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          encryptedSecrets[key] = this.encrypt(value);
        }
      });
      
      fs.writeFileSync(secretsPath, JSON.stringify(encryptedSecrets, null, 2));
      console.log(`🔐 Secrets stored securely: ${secretsPath}`);
      
      return true;
    } catch (error) {
      console.error('Failed to store secrets:', error.message);
      return false;
    }
  }

  /**
   * Load and decrypt secrets from file
   */
  loadSecrets(filename = 'secrets.enc') {
    const secretsPath = path.join(__dirname, '../config', filename);
    
    if (!fs.existsSync(secretsPath)) {
      return {};
    }

    try {
      const encryptedSecrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
      const decryptedSecrets = {};
      
      Object.entries(encryptedSecrets).forEach(([key, encryptedValue]) => {
        decryptedSecrets[key] = this.decrypt(encryptedValue);
      });
      
      return decryptedSecrets;
    } catch (error) {
      console.error('Failed to load secrets:', error.message);
      return {};
    }
  }

  /**
   * Generate secure secrets for configuration
   */
  generateSecrets() {
    return {
      JWT_SECRET: crypto.randomBytes(64).toString('base64url'),
      JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('base64url'),
      SESSION_SECRET: crypto.randomBytes(32).toString('base64url'),
      ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
    };
  }

  /**
   * Validate secret strength
   */
  validateSecretStrength(secret, minLength = 32) {
    if (!secret || secret.length < minLength) {
      return {
        valid: false,
        reason: `Secret must be at least ${minLength} characters`,
      };
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // Repeated characters
      /password|secret|123456|qwerty/i, // Common words
      /^[a-zA-Z]+$/, // Only letters
      /^[0-9]+$/, // Only numbers
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) {
        return {
          valid: false,
          reason: 'Secret contains weak patterns',
        };
      }
    }

    // Calculate entropy
    const entropy = this.calculateEntropy(secret);
    if (entropy < 4.0) {
      return {
        valid: false,
        reason: 'Secret has low entropy (not random enough)',
      };
    }

    return { valid: true };
  }

  /**
   * Calculate string entropy
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
   * Mask sensitive values for logging
   */
  maskSecret(secret, visibleChars = 4) {
    if (!secret || secret.length <= visibleChars) {
      return '****';
    }
    
    const visible = secret.slice(0, visibleChars);
    const masked = '*'.repeat(Math.min(secret.length - visibleChars, 20));
    
    return `${visible}${masked}`;
  }

  /**
   * Create secure configuration object with masked secrets
   */
  createSecureConfig(config) {
    const secureConfig = JSON.parse(JSON.stringify(config));
    
    // List of keys that contain sensitive data
    const sensitiveKeys = [
      'secret', 'token', 'key', 'password', 'auth', 'dsn', 'uri'
    ];

    const maskSensitiveData = (obj, path = '') => {
      Object.keys(obj).forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskSensitiveData(obj[key], fullPath);
        } else if (typeof obj[key] === 'string') {
          // Check if key contains sensitive data
          const isSensitive = sensitiveKeys.some(sensitive => 
            key.toLowerCase().includes(sensitive)
          );
          
          if (isSensitive && obj[key]) {
            obj[key] = this.maskSecret(obj[key]);
          }
        }
      });
    };

    maskSensitiveData(secureConfig);
    return secureConfig;
  }

  /**
   * Rotate secrets (generate new ones)
   */
  rotateSecrets(currentSecrets = {}) {
    console.log('🔄 Rotating secrets...');
    
    const newSecrets = this.generateSecrets();
    const timestamp = Date.now();
    
    // Backup current secrets
    if (Object.keys(currentSecrets).length > 0) {
      this.storeSecrets(currentSecrets, `secrets-backup-${timestamp}.enc`);
    }
    
    // Store new secrets
    this.storeSecrets(newSecrets);
    
    console.log('✅ Secrets rotated successfully');
    console.log('📝 Update your environment variables with the new secrets');
    
    return newSecrets;
  }
}

module.exports = SecretsManager;