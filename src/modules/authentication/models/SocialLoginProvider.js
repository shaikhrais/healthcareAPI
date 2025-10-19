const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const socialLoginProviderSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    providers: {
      google: {
        enabled: { type: Boolean, default: false },
        clientId: String,
        clientSecret: String,
        redirectUri: String,
        scopes: [{ type: String }],
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
      facebook: {
        enabled: { type: Boolean, default: false },
        appId: String,
        appSecret: String,
        redirectUri: String,
        scopes: [{ type: String }],
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
      apple: {
        enabled: { type: Boolean, default: false },
        serviceId: String,
        teamId: String,
        keyId: String,
        privateKey: String,
        redirectUri: String,
        scopes: [{ type: String }],
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
      microsoft: {
        enabled: { type: Boolean, default: false },
        clientId: String,
        clientSecret: String,
        tenantId: String,
        redirectUri: String,
        scopes: [{ type: String }],
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
      github: {
        enabled: { type: Boolean, default: false },
        clientId: String,
        clientSecret: String,
        redirectUri: String,
        scopes: [{ type: String }],
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
      twitter: {
        enabled: { type: Boolean, default: false },
        apiKey: String,
        apiSecret: String,
        bearerToken: String,
        redirectUri: String,
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
      linkedin: {
        enabled: { type: Boolean, default: false },
        clientId: String,
        clientSecret: String,
        redirectUri: String,
        scopes: [{ type: String }],
        loginCount: { type: Number, default: 0 },
        lastUsedAt: Date,
      },
    },
    socialAccounts: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
          index: true,
        },
        provider: {
          type: String,
          enum: ['google', 'facebook', 'apple', 'microsoft', 'github', 'twitter', 'linkedin'],
          required: true,
        },
        providerId: {
          type: String,
          required: true,
          index: true,
        },
        email: {
          type: String,
        },
        displayName: {
          type: String,
        },
        firstName: {
          type: String,
        },
        lastName: {
          type: String,
        },
        profilePicture: {
          type: String,
        },
        accessToken: {
          type: String,
        },
        refreshToken: {
          type: String,
        },
        tokenExpiresAt: {
          type: Date,
        },
        profileData: {
          type: mongoose.Schema.Types.Mixed,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        isEmailVerified: {
          type: Boolean,
          default: false,
        },
        lastLoginAt: {
          type: Date,
        },
        loginCount: {
          type: Number,
          default: 0,
        },
        linkedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    loginHistory: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        provider: {
          type: String,
          enum: ['google', 'facebook', 'apple', 'microsoft', 'github', 'twitter', 'linkedin'],
        },
        providerId: {
          type: String,
        },
        email: {
          type: String,
        },
        loginMethod: {
          type: String,
          enum: ['link', 'login', 'signup'],
          default: 'login',
        },
        ipAddress: {
          type: String,
        },
        userAgent: {
          type: String,
        },
        location: {
          country: String,
          city: String,
          coordinates: {
            latitude: Number,
            longitude: Number,
          },
        },
        success: {
          type: Boolean,
          default: true,
        },
        errorMessage: {
          type: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
          index: true,
        },
      },
    ],
    config: {
      allowSignup: {
        type: Boolean,
        default: true,
      },
      allowLinking: {
        type: Boolean,
        default: true,
      },
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
      autoCreateUser: {
        type: Boolean,
        default: true,
      },
      defaultUserRole: {
        type: String,
        default: 'patient',
      },
      allowedDomains: [
        {
          type: String,
        },
      ],
      blockedDomains: [
        {
          type: String,
        },
      ],
      sessionDuration: {
        type: Number,
        default: 86400, // 24 hours in seconds
      },
    },
    security: {
      enableMFA: {
        type: Boolean,
        default: false,
      },
      requireMFAForSocialLogin: {
        type: Boolean,
        default: false,
      },
      maxLoginAttempts: {
        type: Number,
        default: 5,
      },
      lockoutDuration: {
        type: Number,
        default: 900, // 15 minutes in seconds
      },
      trustedIPs: [
        {
          type: String,
        },
      ],
      restrictToTrustedIPs: {
        type: Boolean,
        default: false,
      },
    },
    stats: {
      totalLogins: {
        type: Number,
        default: 0,
      },
      totalSignups: {
        type: Number,
        default: 0,
      },
      totalLinkedAccounts: {
        type: Number,
        default: 0,
      },
      failedLogins: {
        type: Number,
        default: 0,
      },
      googleLogins: {
        type: Number,
        default: 0,
      },
      facebookLogins: {
        type: Number,
        default: 0,
      },
      appleLogins: {
        type: Number,
        default: 0,
      },
      microsoftLogins: {
        type: Number,
        default: 0,
      },
      githubLogins: {
        type: Number,
        default: 0,
      },
      twitterLogins: {
        type: Number,
        default: 0,
      },
      linkedinLogins: {
        type: Number,
        default: 0,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
socialLoginProviderSchema.index({ organization: 1 });
socialLoginProviderSchema.index({ 'socialAccounts.userId': 1 });
socialLoginProviderSchema.index({ 'socialAccounts.provider': 1, 'socialAccounts.providerId': 1 });
socialLoginProviderSchema.index({ 'loginHistory.timestamp': -1 });

// Virtual: Total Enabled Providers
socialLoginProviderSchema.virtual('enabledProvidersCount').get(function () {
  let count = 0;
  if (this.providers.google?.enabled) count += 1;
  if (this.providers.facebook?.enabled) count += 1;
  if (this.providers.apple?.enabled) count += 1;
  if (this.providers.microsoft?.enabled) count += 1;
  if (this.providers.github?.enabled) count += 1;
  if (this.providers.twitter?.enabled) count += 1;
  if (this.providers.linkedin?.enabled) count += 1;
  return count;
});

// Virtual: Success Rate
socialLoginProviderSchema.virtual('loginSuccessRate').get(function () {
  if (this.stats.totalLogins === 0) return 100;
  const successfulLogins = this.stats.totalLogins - this.stats.failedLogins;
  return ((successfulLogins / this.stats.totalLogins) * 100).toFixed(2);
});

// Virtual: Most Popular Provider
socialLoginProviderSchema.virtual('mostPopularProvider').get(function () {
  const providerCounts = {
    google: this.stats.googleLogins,
    facebook: this.stats.facebookLogins,
    apple: this.stats.appleLogins,
    microsoft: this.stats.microsoftLogins,
    github: this.stats.githubLogins,
    twitter: this.stats.twitterLogins,
    linkedin: this.stats.linkedinLogins,
  };

  let maxProvider = 'none';
  let maxCount = 0;

  for (const [provider, count] of Object.entries(providerCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxProvider = provider;
    }
  }

  return maxProvider;
});

// Instance method: Enable Provider
socialLoginProviderSchema.methods.enableProvider = function (provider, config) {
  if (!this.providers[provider]) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  this.providers[provider] = {
    ...this.providers[provider],
    ...config,
    enabled: true,
  };

  return this.save();
};

// Instance method: Disable Provider
socialLoginProviderSchema.methods.disableProvider = function (provider) {
  if (!this.providers[provider]) {
    throw new Error(`Invalid provider: ${provider}`);
  }

  this.providers[provider].enabled = false;
  return this.save();
};

// Instance method: Link Social Account
socialLoginProviderSchema.methods.linkSocialAccount = function (accountData) {
  // Check if account already exists
  const existingIndex = this.socialAccounts.findIndex(
    (a) => a.provider === accountData.provider && a.providerId === accountData.providerId
  );

  if (existingIndex !== -1) {
    // Update existing account
    this.socialAccounts[existingIndex] = {
      ...this.socialAccounts[existingIndex].toObject(),
      ...accountData,
      lastLoginAt: new Date(),
      loginCount: this.socialAccounts[existingIndex].loginCount + 1,
    };
  } else {
    // Add new account
    this.socialAccounts.push({
      ...accountData,
      linkedAt: new Date(),
      loginCount: 1,
    });
    this.stats.totalLinkedAccounts += 1;
  }

  // Update provider stats
  const providerField = `${accountData.provider}Logins`;
  if (this.stats[providerField] !== undefined) {
    this.stats[providerField] += 1;
  }

  return this.save();
};

// Instance method: Unlink Social Account
socialLoginProviderSchema.methods.unlinkSocialAccount = function (userId, provider) {
  const accountIndex = this.socialAccounts.findIndex(
    (a) => a.userId.toString() === userId.toString() && a.provider === provider
  );

  if (accountIndex === -1) {
    throw new Error('Social account not found');
  }

  this.socialAccounts.splice(accountIndex, 1);
  this.stats.totalLinkedAccounts = Math.max(0, this.stats.totalLinkedAccounts - 1);

  return this.save();
};

// Instance method: Record Login
socialLoginProviderSchema.methods.recordLogin = function (loginData) {
  this.loginHistory.push({
    userId: loginData.userId,
    provider: loginData.provider,
    providerId: loginData.providerId,
    email: loginData.email,
    loginMethod: loginData.loginMethod || 'login',
    ipAddress: loginData.ipAddress,
    userAgent: loginData.userAgent,
    location: loginData.location,
    success: loginData.success !== undefined ? loginData.success : true,
    errorMessage: loginData.errorMessage,
    timestamp: new Date(),
  });

  // Update stats
  this.stats.totalLogins += 1;

  if (loginData.success === false) {
    this.stats.failedLogins += 1;
  }

  if (loginData.loginMethod === 'signup') {
    this.stats.totalSignups += 1;
  }

  // Update provider last used
  if (this.providers[loginData.provider]) {
    this.providers[loginData.provider].lastUsedAt = new Date();
    this.providers[loginData.provider].loginCount =
      (this.providers[loginData.provider].loginCount || 0) + 1;
  }

  return this.save();
};

// Instance method: Get User Social Accounts
socialLoginProviderSchema.methods.getUserAccounts = function (userId) {
  return this.socialAccounts.filter((a) => a.userId.toString() === userId.toString());
};

// Instance method: Find Account by Provider
socialLoginProviderSchema.methods.findAccountByProvider = function (provider, providerId) {
  return this.socialAccounts.find((a) => a.provider === provider && a.providerId === providerId);
};

// Instance method: Update Configuration
socialLoginProviderSchema.methods.updateConfig = function (updates) {
  this.config = {
    ...this.config,
    ...updates,
  };
  return this.save();
};

// Instance method: Update Security Settings
socialLoginProviderSchema.methods.updateSecurity = function (updates) {
  this.security = {
    ...this.security,
    ...updates,
  };
  return this.save();
};

// Instance method: Check if IP is Trusted
socialLoginProviderSchema.methods.isTrustedIP = function (ipAddress) {
  if (!this.security.restrictToTrustedIPs) {
    return true;
  }

  return this.security.trustedIPs.includes(ipAddress);
};

// Instance method: Check if Domain is Allowed
socialLoginProviderSchema.methods.isDomainAllowed = function (email) {
  if (this.config.allowedDomains.length === 0 && this.config.blockedDomains.length === 0) {
    return true;
  }

  const domain = email.split('@')[1];

  // Check if domain is blocked
  if (this.config.blockedDomains.includes(domain)) {
    return false;
  }

  // Check if domain is in allowed list (if list is not empty)
  if (this.config.allowedDomains.length > 0) {
    return this.config.allowedDomains.includes(domain);
  }

  return true;
};

// Static method: Get by organization
socialLoginProviderSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Static method: Get user by social account
socialLoginProviderSchema.statics.getUserBySocialAccount = async function (
  organizationId,
  provider,
  providerId
) {
  const config = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!config) return null;

  const account = config.socialAccounts.find(
    (a) => a.provider === provider && a.providerId === providerId
  );

  return account ? account.userId : null;
};

// Static method: Get login history
socialLoginProviderSchema.statics.getLoginHistory = async function (organizationId, filters = {}) {
  const config = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!config) return [];

  let history = config.loginHistory;

  // Apply filters
  if (filters.userId) {
    history = history.filter((h) => h.userId && h.userId.toString() === filters.userId.toString());
  }

  if (filters.provider) {
    history = history.filter((h) => h.provider === filters.provider);
  }

  if (filters.success !== undefined) {
    history = history.filter((h) => h.success === filters.success);
  }

  if (filters.startDate) {
    history = history.filter((h) => h.timestamp >= filters.startDate);
  }

  if (filters.endDate) {
    history = history.filter((h) => h.timestamp <= filters.endDate);
  }

  // Sort by timestamp (newest first)
  history.sort((a, b) => b.timestamp - a.timestamp);

  // Apply limit
  if (filters.limit) {
    history = history.slice(0, filters.limit);
  }

  return history;
};

// Static method: Get overall statistics
socialLoginProviderSchema.statics.getOverallStats = async function (organizationId) {
  const config = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!config) return null;

  return {
    totalLogins: config.stats.totalLogins,
    totalSignups: config.stats.totalSignups,
    totalLinkedAccounts: config.stats.totalLinkedAccounts,
    failedLogins: config.stats.failedLogins,
    loginSuccessRate: config.loginSuccessRate,
    enabledProvidersCount: config.enabledProvidersCount,
    mostPopularProvider: config.mostPopularProvider,
    providerBreakdown: {
      google: config.stats.googleLogins,
      facebook: config.stats.facebookLogins,
      apple: config.stats.appleLogins,
      microsoft: config.stats.microsoftLogins,
      github: config.stats.githubLogins,
      twitter: config.stats.twitterLogins,
      linkedin: config.stats.linkedinLogins,
    },
  };
};

// Enable virtuals in JSON
socialLoginProviderSchema.set('toJSON', { virtuals: true });
socialLoginProviderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SocialLoginProvider', socialLoginProviderSchema);
