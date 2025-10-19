const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const integrationMarketplaceSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Available Integrations in Marketplace
    availableIntegrations: [
      {
        integrationId: {
          type: String,
          required: true,
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        slug: {
          type: String,
          required: true,
          unique: true,
        },
        description: {
          type: String,
          required: true,
        },
        longDescription: String,
        category: {
          type: String,
          enum: [
            'accounting',
            'communication',
            'crm',
            'email',
            'payment',
            'scheduling',
            'analytics',
            'marketing',
            'productivity',
            'security',
            'healthcare',
            'other',
          ],
          required: true,
        },
        subcategory: String,
        provider: {
          name: {
            type: String,
            required: true,
          },
          website: String,
          supportEmail: String,
          supportUrl: String,
          logo: String,
        },
        version: {
          type: String,
          default: '1.0.0',
        },
        pricing: {
          model: {
            type: String,
            enum: ['free', 'freemium', 'paid', 'enterprise', 'usage_based'],
            default: 'free',
          },
          startingPrice: Number,
          currency: {
            type: String,
            default: 'USD',
          },
          billingPeriod: {
            type: String,
            enum: ['monthly', 'annually', 'one_time', 'usage'],
          },
          trialDays: Number,
          details: String,
        },
        features: [
          {
            name: String,
            description: String,
            icon: String,
          },
        ],
        screenshots: [
          {
            url: String,
            title: String,
            description: String,
          },
        ],
        media: {
          logo: String,
          icon: String,
          banner: String,
          video: String,
        },
        tags: [String],
        requirements: {
          minVersion: String,
          maxVersion: String,
          dependencies: [String],
          permissions: [String],
        },
        configuration: {
          requiresApiKey: {
            type: Boolean,
            default: false,
          },
          requiresOAuth: {
            type: Boolean,
            default: false,
          },
          requiresWebhook: {
            type: Boolean,
            default: false,
          },
          configFields: [
            {
              fieldName: String,
              fieldType: {
                type: String,
                enum: ['text', 'password', 'url', 'email', 'number', 'boolean', 'select'],
              },
              label: String,
              required: {
                type: Boolean,
                default: false,
              },
              placeholder: String,
              helpText: String,
              options: [String], // For select type
            },
          ],
        },
        documentation: {
          setupGuide: String,
          apiReference: String,
          faq: String,
          changelog: String,
          videoTutorial: String,
        },
        ratings: {
          average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
          },
          count: {
            type: Number,
            default: 0,
          },
          distribution: {
            five: { type: Number, default: 0 },
            four: { type: Number, default: 0 },
            three: { type: Number, default: 0 },
            two: { type: Number, default: 0 },
            one: { type: Number, default: 0 },
          },
        },
        statistics: {
          totalInstalls: {
            type: Number,
            default: 0,
          },
          activeInstalls: {
            type: Number,
            default: 0,
          },
          totalReviews: {
            type: Number,
            default: 0,
          },
          lastUpdated: Date,
        },
        status: {
          type: String,
          enum: ['active', 'beta', 'deprecated', 'coming_soon', 'maintenance'],
          default: 'active',
        },
        featured: {
          type: Boolean,
          default: false,
        },
        popular: {
          type: Boolean,
          default: false,
        },
        recommended: {
          type: Boolean,
          default: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: Date,
      },
    ],

    // Installed Integrations
    installedIntegrations: [
      {
        installationId: {
          type: String,
          required: true,
        },
        integrationId: {
          type: String,
          required: true,
        },
        name: String,
        status: {
          type: String,
          enum: ['installing', 'active', 'paused', 'error', 'uninstalling'],
          default: 'installing',
        },
        version: String,
        installedAt: {
          type: Date,
          default: Date.now,
        },
        installedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        configuration: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        settings: {
          autoUpdate: {
            type: Boolean,
            default: true,
          },
          notifications: {
            type: Boolean,
            default: true,
          },
          syncEnabled: {
            type: Boolean,
            default: true,
          },
        },
        lastSync: Date,
        lastError: {
          message: String,
          timestamp: Date,
          code: String,
        },
        usage: {
          apiCalls: {
            type: Number,
            default: 0,
          },
          dataTransferred: {
            type: Number,
            default: 0,
          }, // in bytes
          lastUsed: Date,
        },
        uninstalledAt: Date,
        uninstalledBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Reviews & Ratings
    reviews: [
      {
        reviewId: {
          type: String,
          required: true,
        },
        integrationId: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        title: String,
        comment: String,
        pros: [String],
        cons: [String],
        verified: {
          type: Boolean,
          default: false,
        },
        helpful: {
          count: {
            type: Number,
            default: 0,
          },
          users: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
          ],
        },
        response: {
          message: String,
          respondedBy: String,
          respondedAt: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: Date,
      },
    ],

    // Installation History
    installationHistory: [
      {
        historyId: String,
        integrationId: String,
        action: {
          type: String,
          enum: ['installed', 'uninstalled', 'updated', 'configured', 'paused', 'resumed'],
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        version: String,
        details: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Marketplace Collections
    collections: [
      {
        collectionId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: String,
        integrations: [String], // Array of integrationIds
        featured: {
          type: Boolean,
          default: false,
        },
        icon: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Wishlists & Favorites
    favorites: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        integrationId: {
          type: String,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Integration Requests
    integrationRequests: [
      {
        requestId: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        integrationName: {
          type: String,
          required: true,
        },
        description: String,
        category: String,
        provider: String,
        useCase: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        votes: {
          count: {
            type: Number,
            default: 1,
          },
          users: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
          ],
        },
        status: {
          type: String,
          enum: ['pending', 'under_review', 'in_development', 'completed', 'rejected'],
          default: 'pending',
        },
        response: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: Date,
      },
    ],

    // Marketplace Settings
    settings: {
      autoInstallUpdates: {
        type: Boolean,
        default: false,
      },
      allowBetaIntegrations: {
        type: Boolean,
        default: false,
      },
      requireApproval: {
        type: Boolean,
        default: true,
      },
      maxIntegrations: {
        type: Number,
        default: 100,
      },
      notifyNewIntegrations: {
        type: Boolean,
        default: true,
      },
      notifyUpdates: {
        type: Boolean,
        default: true,
      },
    },

    // Analytics
    analytics: {
      totalViews: {
        type: Number,
        default: 0,
      },
      totalInstalls: {
        type: Number,
        default: 0,
      },
      totalUninstalls: {
        type: Number,
        default: 0,
      },
      popularIntegrations: [
        {
          integrationId: String,
          name: String,
          installCount: Number,
          viewCount: Number,
        },
      ],
      categoryBreakdown: {
        type: Map,
        of: Number,
      },
      lastUpdated: Date,
    },

    // Audit Trail
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// integrationMarketplaceSchema.index({ organization: 1, isDeleted: 1 });
integrationMarketplaceSchema.index({ 'availableIntegrations.integrationId': 1 });
integrationMarketplaceSchema.index({ 'availableIntegrations.category': 1 });
integrationMarketplaceSchema.index({ 'availableIntegrations.status': 1 });
integrationMarketplaceSchema.index({ 'availableIntegrations.featured': 1 });
integrationMarketplaceSchema.index({ 'installedIntegrations.integrationId': 1 });
integrationMarketplaceSchema.index({ 'reviews.integrationId': 1 });
integrationMarketplaceSchema.index({ 'reviews.userId': 1 });

// Virtual: Total Available Integrations
integrationMarketplaceSchema.virtual('totalAvailableIntegrations').get(function () {
  return this.availableIntegrations.filter((i) => i.status === 'active').length;
});

// Virtual: Total Installed Integrations
integrationMarketplaceSchema.virtual('totalInstalledIntegrations').get(function () {
  return this.installedIntegrations.filter((i) => i.status === 'active').length;
});

// Virtual: Installation Rate
integrationMarketplaceSchema.virtual('installationRate').get(function () {
  if (this.analytics.totalViews === 0) return 0;
  return ((this.analytics.totalInstalls / this.analytics.totalViews) * 100).toFixed(2);
});

// Virtual: Active Integrations
integrationMarketplaceSchema.virtual('activeIntegrations').get(function () {
  return this.installedIntegrations.filter((i) => i.status === 'active');
});

// Static Methods

// Get by Organization
integrationMarketplaceSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Search Integrations
integrationMarketplaceSchema.statics.searchIntegrations = async function (
  organizationId,
  query,
  filters = {}
) {
  const marketplace = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!marketplace) return [];

  let integrations = marketplace.availableIntegrations.filter((i) => i.status === 'active');

  // Apply filters
  if (filters.category) {
    integrations = integrations.filter((i) => i.category === filters.category);
  }
  if (filters.featured) {
    integrations = integrations.filter((i) => i.featured);
  }
  if (filters.popular) {
    integrations = integrations.filter((i) => i.popular);
  }
  if (filters.pricingModel) {
    integrations = integrations.filter((i) => i.pricing.model === filters.pricingModel);
  }
  if (filters.minRating) {
    integrations = integrations.filter((i) => i.ratings.average >= parseFloat(filters.minRating));
  }

  // Search by query
  if (query) {
    const searchLower = query.toLowerCase();
    integrations = integrations.filter(
      (i) =>
        i.name.toLowerCase().includes(searchLower) ||
        i.description.toLowerCase().includes(searchLower) ||
        i.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  return integrations;
};

// Get Popular Integrations
integrationMarketplaceSchema.statics.getPopularIntegrations = async function (
  organizationId,
  limit = 10
) {
  const marketplace = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!marketplace) return [];

  return marketplace.availableIntegrations
    .filter((i) => i.status === 'active')
    .sort((a, b) => b.statistics.totalInstalls - a.statistics.totalInstalls)
    .slice(0, limit);
};

// Get Integration Analytics
integrationMarketplaceSchema.statics.getIntegrationAnalytics = async function (
  organizationId,
  integrationId
) {
  const marketplace = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!marketplace) return null;

  const integration = marketplace.availableIntegrations.find(
    (i) => i.integrationId === integrationId
  );
  if (!integration) return null;

  const installs = marketplace.installedIntegrations.filter(
    (i) => i.integrationId === integrationId
  );
  const reviews = marketplace.reviews.filter((r) => r.integrationId === integrationId);

  return {
    integration: integration.name,
    totalInstalls: integration.statistics.totalInstalls,
    activeInstalls: integration.statistics.activeInstalls,
    rating: integration.ratings.average,
    totalReviews: reviews.length,
    installHistory: installs.map((i) => ({
      installedAt: i.installedAt,
      status: i.status,
    })),
  };
};

// Instance Methods

// Add Integration to Marketplace
integrationMarketplaceSchema.methods.addIntegration = async function (integrationData) {
  const integrationId =
    integrationData.integrationId || `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const slug =
    integrationData.slug ||
    integrationData.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  this.availableIntegrations.push({
    ...integrationData,
    integrationId,
    slug,
  });

  return this.save();
};

// Update Integration
integrationMarketplaceSchema.methods.updateIntegration = async function (
  integrationId,
  updateData
) {
  const integration = this.availableIntegrations.find((i) => i.integrationId === integrationId);
  if (!integration) {
    throw new Error('Integration not found');
  }

  Object.assign(integration, updateData);
  integration.updatedAt = new Date();

  return this.save();
};

// Install Integration
integrationMarketplaceSchema.methods.installIntegration = async function (
  integrationId,
  userId,
  configuration = {}
) {
  const integration = this.availableIntegrations.find((i) => i.integrationId === integrationId);
  if (!integration) {
    throw new Error('Integration not found in marketplace');
  }

  // Check if already installed
  const existing = this.installedIntegrations.find(
    (i) => i.integrationId === integrationId && i.status !== 'uninstalling'
  );
  if (existing) {
    throw new Error('Integration already installed');
  }

  const installationId = `INST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.installedIntegrations.push({
    installationId,
    integrationId,
    name: integration.name,
    status: 'active',
    version: integration.version,
    installedBy: userId,
    configuration,
  });

  // Update statistics
  integration.statistics.totalInstalls += 1;
  integration.statistics.activeInstalls += 1;

  // Update analytics
  this.analytics.totalInstalls += 1;

  // Add to history
  this.installationHistory.push({
    historyId: `HIST-${Date.now()}`,
    integrationId,
    action: 'installed',
    userId,
    version: integration.version,
    details: `Installed ${integration.name}`,
  });

  return this.save();
};

// Uninstall Integration
integrationMarketplaceSchema.methods.uninstallIntegration = async function (
  integrationId,
  userId,
  reason = ''
) {
  const installation = this.installedIntegrations.find(
    (i) => i.integrationId === integrationId && i.status === 'active'
  );
  if (!installation) {
    throw new Error('Integration not installed');
  }

  installation.status = 'uninstalling';
  installation.uninstalledAt = new Date();
  installation.uninstalledBy = userId;

  // Update statistics
  const integration = this.availableIntegrations.find((i) => i.integrationId === integrationId);
  if (integration) {
    integration.statistics.activeInstalls = Math.max(0, integration.statistics.activeInstalls - 1);
  }

  // Update analytics
  this.analytics.totalUninstalls += 1;

  // Add to history
  this.installationHistory.push({
    historyId: `HIST-${Date.now()}`,
    integrationId,
    action: 'uninstalled',
    userId,
    details: reason || `Uninstalled ${installation.name}`,
  });

  return this.save();
};

// Update Installation Configuration
integrationMarketplaceSchema.methods.updateInstallationConfig = async function (
  integrationId,
  configuration
) {
  const installation = this.installedIntegrations.find(
    (i) => i.integrationId === integrationId && i.status === 'active'
  );
  if (!installation) {
    throw new Error('Integration not installed');
  }

  Object.assign(installation.configuration, configuration);

  // Add to history
  this.installationHistory.push({
    historyId: `HIST-${Date.now()}`,
    integrationId,
    action: 'configured',
    details: 'Configuration updated',
  });

  return this.save();
};

// Add Review
integrationMarketplaceSchema.methods.addReview = async function (reviewData) {
  const reviewId =
    reviewData.reviewId || `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Check if user already reviewed this integration
  const existingReview = this.reviews.find(
    (r) =>
      r.integrationId === reviewData.integrationId &&
      r.userId.toString() === reviewData.userId.toString()
  );

  if (existingReview) {
    throw new Error('You have already reviewed this integration');
  }

  this.reviews.push({
    ...reviewData,
    reviewId,
  });

  // Update integration ratings
  const integration = this.availableIntegrations.find(
    (i) => i.integrationId === reviewData.integrationId
  );
  if (integration) {
    const allReviews = this.reviews.filter((r) => r.integrationId === reviewData.integrationId);
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    integration.ratings.average = (totalRating / allReviews.length).toFixed(2);
    integration.ratings.count = allReviews.length;

    // Update distribution
    const { rating } = reviewData;
    const ratingKey = ['one', 'two', 'three', 'four', 'five'][rating - 1];
    integration.ratings.distribution[ratingKey] += 1;

    integration.statistics.totalReviews = allReviews.length;
  }

  return this.save();
};

// Update Review
integrationMarketplaceSchema.methods.updateReview = async function (reviewId, updateData) {
  const review = this.reviews.find((r) => r.reviewId === reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  const oldRating = review.rating;
  Object.assign(review, updateData);
  review.updatedAt = new Date();

  // Update integration ratings if rating changed
  if (updateData.rating && updateData.rating !== oldRating) {
    const integration = this.availableIntegrations.find(
      (i) => i.integrationId === review.integrationId
    );
    if (integration) {
      const allReviews = this.reviews.filter((r) => r.integrationId === review.integrationId);
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      integration.ratings.average = (totalRating / allReviews.length).toFixed(2);

      // Update distribution
      const oldRatingKey = ['one', 'two', 'three', 'four', 'five'][oldRating - 1];
      const newRatingKey = ['one', 'two', 'three', 'four', 'five'][updateData.rating - 1];
      integration.ratings.distribution[oldRatingKey] = Math.max(
        0,
        integration.ratings.distribution[oldRatingKey] - 1
      );
      integration.ratings.distribution[newRatingKey] += 1;
    }
  }

  return this.save();
};

// Mark Review as Helpful
integrationMarketplaceSchema.methods.markReviewHelpful = async function (reviewId, userId) {
  const review = this.reviews.find((r) => r.reviewId === reviewId);
  if (!review) {
    throw new Error('Review not found');
  }

  if (review.helpful.users.includes(userId)) {
    throw new Error('Already marked as helpful');
  }

  review.helpful.users.push(userId);
  review.helpful.count += 1;

  return this.save();
};

// Add to Favorites
integrationMarketplaceSchema.methods.addToFavorites = async function (integrationId, userId) {
  const existing = this.favorites.find(
    (f) => f.integrationId === integrationId && f.userId.toString() === userId.toString()
  );

  if (existing) {
    throw new Error('Already in favorites');
  }

  this.favorites.push({
    userId,
    integrationId,
  });

  return this.save();
};

// Remove from Favorites
integrationMarketplaceSchema.methods.removeFromFavorites = async function (integrationId, userId) {
  const index = this.favorites.findIndex(
    (f) => f.integrationId === integrationId && f.userId.toString() === userId.toString()
  );

  if (index === -1) {
    throw new Error('Not in favorites');
  }

  this.favorites.splice(index, 1);
  return this.save();
};

// Submit Integration Request
integrationMarketplaceSchema.methods.submitIntegrationRequest = async function (requestData) {
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.integrationRequests.push({
    ...requestData,
    requestId,
    votes: {
      count: 1,
      users: [requestData.userId],
    },
  });

  return this.save();
};

// Vote for Integration Request
integrationMarketplaceSchema.methods.voteForRequest = async function (requestId, userId) {
  const request = this.integrationRequests.find((r) => r.requestId === requestId);
  if (!request) {
    throw new Error('Request not found');
  }

  if (request.votes.users.includes(userId)) {
    throw new Error('Already voted for this request');
  }

  request.votes.users.push(userId);
  request.votes.count += 1;

  return this.save();
};

// Create Collection
integrationMarketplaceSchema.methods.createCollection = async function (collectionData) {
  const collectionId = `COLL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.collections.push({
    ...collectionData,
    collectionId,
  });

  return this.save();
};

// Record Integration View
integrationMarketplaceSchema.methods.recordIntegrationView = async function (integrationId) {
  this.analytics.totalViews += 1;

  const popularIndex = this.analytics.popularIntegrations.findIndex(
    (p) => p.integrationId === integrationId
  );
  if (popularIndex > -1) {
    this.analytics.popularIntegrations[popularIndex].viewCount += 1;
  } else {
    const integration = this.availableIntegrations.find((i) => i.integrationId === integrationId);
    if (integration) {
      this.analytics.popularIntegrations.push({
        integrationId,
        name: integration.name,
        installCount: 0,
        viewCount: 1,
      });
    }
  }

  this.analytics.lastUpdated = new Date();
  return this.save();
};

// Soft Delete
integrationMarketplaceSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore
integrationMarketplaceSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

module.exports = mongoose.model('IntegrationMarketplace', integrationMarketplaceSchema);
