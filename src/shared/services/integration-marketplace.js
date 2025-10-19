const express = require('express');


const IntegrationMarketplace = require('../models/IntegrationMarketplace');
const router = express.Router();
// Middleware to extract user and organization from headers
const extractContext = (req, res, next) => {
  req.userId = req.headers['x-user-id'];
  req.organizationId = req.headers['x-organization-id'];
  next();
};

router.use(extractContext);

// POST /api/integration-marketplace/initialize - Initialize marketplace
router.post('/initialize', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    // Check if already initialized
    let marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (marketplace) {
      return res.status(200).json({
        success: true,
        message: 'Integration marketplace already initialized',
        data: marketplace,
      });
    }

    // Create new marketplace
    marketplace = await IntegrationMarketplace.create({
      organization: organizationId,
      availableIntegrations: req.body.integrations || [],
      settings: req.body.settings || {},
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Integration marketplace initialized successfully',
      data: marketplace,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize marketplace',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/browse - Browse all integrations
router.get('/browse', async (req, res) => {
  try {
    const { organizationId } = req;
    const { category, featured, popular, pricing, minRating, sort, limit = 50 } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    let integrations = marketplace.availableIntegrations.filter((i) => i.status === 'active');

    // Apply filters
    if (category) {
      integrations = integrations.filter((i) => i.category === category);
    }
    if (featured === 'true') {
      integrations = integrations.filter((i) => i.featured);
    }
    if (popular === 'true') {
      integrations = integrations.filter((i) => i.popular);
    }
    if (pricing) {
      integrations = integrations.filter((i) => i.pricing.model === pricing);
    }
    if (minRating) {
      integrations = integrations.filter((i) => i.ratings.average >= parseFloat(minRating));
    }

    // Sort
    switch (sort) {
      case 'popular':
        integrations.sort((a, b) => b.statistics.totalInstalls - a.statistics.totalInstalls);
        break;
      case 'rating':
        integrations.sort((a, b) => b.ratings.average - a.ratings.average);
        break;
      case 'newest':
        integrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'name':
        integrations.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Default sort by featured, then popular, then rating
        integrations.sort((a, b) => {
          if (a.featured !== b.featured) return b.featured ? 1 : -1;
          if (a.popular !== b.popular) return b.popular ? 1 : -1;
          return b.ratings.average - a.ratings.average;
        });
    }

    // Limit results
    integrations = integrations.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: integrations,
      count: integrations.length,
      total: marketplace.availableIntegrations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to browse integrations',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/search - Search integrations
router.get('/search', async (req, res) => {
  try {
    const { organizationId } = req;
    const { q, category, featured, pricing, minRating } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query (q) is required',
      });
    }

    const results = await IntegrationMarketplace.searchIntegrations(organizationId, q, {
      category,
      featured,
      pricingModel: pricing,
      minRating,
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/integrations/:integrationId - Get specific integration
router.get('/integrations/:integrationId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { integrationId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const integration = marketplace.availableIntegrations.find(
      (i) => i.integrationId === integrationId
    );

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found',
      });
    }

    // Record view
    await marketplace.recordIntegrationView(integrationId);

    // Get reviews for this integration
    const reviews = marketplace.reviews.filter((r) => r.integrationId === integrationId);

    // Check if user has installed this
    const installation = marketplace.installedIntegrations.find(
      (i) => i.integrationId === integrationId && i.status === 'active'
    );

    res.json({
      success: true,
      data: {
        ...integration.toObject(),
        isInstalled: !!installation,
        recentReviews: reviews.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get integration',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/integrations - Add integration to marketplace
router.post('/integrations', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.addIntegration(req.body);

    const newIntegration =
      marketplace.availableIntegrations[marketplace.availableIntegrations.length - 1];

    res.status(201).json({
      success: true,
      message: 'Integration added to marketplace',
      data: newIntegration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add integration',
      error: error.message,
    });
  }
});

// PUT /api/integration-marketplace/integrations/:integrationId - Update integration
router.put('/integrations/:integrationId', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { integrationId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.updateIntegration(integrationId, req.body);
    marketplace.lastModifiedBy = userId;
    await marketplace.save();

    const updatedIntegration = marketplace.availableIntegrations.find(
      (i) => i.integrationId === integrationId
    );

    res.json({
      success: true,
      message: 'Integration updated',
      data: updatedIntegration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update integration',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    // Count integrations per category
    const categoryCounts = {};
    marketplace.availableIntegrations
      .filter((i) => i.status === 'active')
      .forEach((integration) => {
        categoryCounts[integration.category] = (categoryCounts[integration.category] || 0) + 1;
      });

    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }));

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/featured - Get featured integrations
router.get('/featured', async (req, res) => {
  try {
    const { organizationId } = req;
    const { limit = 6 } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const featured = marketplace.availableIntegrations
      .filter((i) => i.featured && i.status === 'active')
      .slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: featured,
      count: featured.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get featured integrations',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/popular - Get popular integrations
router.get('/popular', async (req, res) => {
  try {
    const { organizationId } = req;
    const { limit = 10 } = req.query;

    const popular = await IntegrationMarketplace.getPopularIntegrations(
      organizationId,
      parseInt(limit, 10)
    );

    res.json({
      success: true,
      data: popular,
      count: popular.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get popular integrations',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/recommended - Get recommended integrations
router.get('/recommended', async (req, res) => {
  try {
    const { organizationId } = req;
    const { limit = 8 } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const recommended = marketplace.availableIntegrations
      .filter((i) => i.recommended && i.status === 'active')
      .slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: recommended,
      count: recommended.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommended integrations',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/install - Install integration
router.post('/install', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { integrationId, configuration } = req.body;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.installIntegration(integrationId, userId, configuration);

    const installation =
      marketplace.installedIntegrations[marketplace.installedIntegrations.length - 1];

    res.status(201).json({
      success: true,
      message: 'Integration installed successfully',
      data: installation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to install integration',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/uninstall - Uninstall integration
router.post('/uninstall', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { integrationId, reason } = req.body;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.uninstallIntegration(integrationId, userId, reason);

    res.json({
      success: true,
      message: 'Integration uninstalled successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to uninstall integration',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/installed - Get installed integrations
router.get('/installed', async (req, res) => {
  try {
    const { organizationId } = req;
    const { status } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    let installed = marketplace.installedIntegrations;

    if (status) {
      installed = installed.filter((i) => i.status === status);
    }

    res.json({
      success: true,
      data: installed,
      count: installed.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get installed integrations',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/installed/:integrationId - Get installation details
router.get('/installed/:integrationId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { integrationId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const installation = marketplace.installedIntegrations.find(
      (i) => i.integrationId === integrationId && i.status === 'active'
    );

    if (!installation) {
      return res.status(404).json({
        success: false,
        message: 'Integration not installed',
      });
    }

    res.json({
      success: true,
      data: installation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get installation details',
      error: error.message,
    });
  }
});

// PUT /api/integration-marketplace/installed/:integrationId/config - Update installation config
router.put('/installed/:integrationId/config', async (req, res) => {
  try {
    const { organizationId } = req;
    const { integrationId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.updateInstallationConfig(integrationId, req.body.configuration);

    const installation = marketplace.installedIntegrations.find(
      (i) => i.integrationId === integrationId && i.status === 'active'
    );

    res.json({
      success: true,
      message: 'Configuration updated',
      data: installation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/reviews/:integrationId - Get reviews for integration
router.get('/reviews/:integrationId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { integrationId } = req.params;
    const { sort = 'newest', limit = 20 } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    let reviews = marketplace.reviews.filter((r) => r.integrationId === integrationId);

    // Sort
    switch (sort) {
      case 'helpful':
        reviews.sort((a, b) => b.helpful.count - a.helpful.count);
        break;
      case 'rating_high':
        reviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        reviews.sort((a, b) => a.rating - b.rating);
        break;
      default: // newest
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    reviews = reviews.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: reviews,
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/reviews - Add review
router.post('/reviews', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.addReview({
      ...req.body,
      userId,
    });

    const newReview = marketplace.reviews[marketplace.reviews.length - 1];

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: newReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: error.message,
    });
  }
});

// PUT /api/integration-marketplace/reviews/:reviewId - Update review
router.put('/reviews/:reviewId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { reviewId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.updateReview(reviewId, req.body);

    const updatedReview = marketplace.reviews.find((r) => r.reviewId === reviewId);

    res.json({
      success: true,
      message: 'Review updated',
      data: updatedReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/reviews/:reviewId/helpful - Mark review as helpful
router.post('/reviews/:reviewId/helpful', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { reviewId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.markReviewHelpful(reviewId, userId);

    res.json({
      success: true,
      message: 'Review marked as helpful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark review as helpful',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/favorites - Get user's favorites
router.get('/favorites', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const userFavorites = marketplace.favorites.filter(
      (f) => f.userId.toString() === userId.toString()
    );

    // Get integration details for favorites
    const favoriteIntegrations = userFavorites
      .map((fav) => {
        const integration = marketplace.availableIntegrations.find(
          (i) => i.integrationId === fav.integrationId
        );
        return {
          ...integration?.toObject(),
          favoritedAt: fav.addedAt,
        };
      })
      .filter((i) => i.integrationId); // Remove null entries

    res.json({
      success: true,
      data: favoriteIntegrations,
      count: favoriteIntegrations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get favorites',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/favorites - Add to favorites
router.post('/favorites', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { integrationId } = req.body;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.addToFavorites(integrationId, userId);

    res.status(201).json({
      success: true,
      message: 'Added to favorites',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add to favorites',
      error: error.message,
    });
  }
});

// DELETE /api/integration-marketplace/favorites/:integrationId - Remove from favorites
router.delete('/favorites/:integrationId', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { integrationId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.removeFromFavorites(integrationId, userId);

    res.json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from favorites',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/collections - Get collections
router.get('/collections', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    res.json({
      success: true,
      data: marketplace.collections,
      count: marketplace.collections.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get collections',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/collections - Create collection
router.post('/collections', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.createCollection(req.body);

    const newCollection = marketplace.collections[marketplace.collections.length - 1];

    res.status(201).json({
      success: true,
      message: 'Collection created',
      data: newCollection,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create collection',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/collections/:collectionId - Get collection details
router.get('/collections/:collectionId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { collectionId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const collection = marketplace.collections.find((c) => c.collectionId === collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Get integration details for collection
    const integrations = collection.integrations
      .map((intId) => {
        return marketplace.availableIntegrations.find((i) => i.integrationId === intId);
      })
      .filter((i) => i); // Remove null entries

    res.json({
      success: true,
      data: {
        ...collection.toObject(),
        integrations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get collection',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/requests - Get integration requests
router.get('/requests', async (req, res) => {
  try {
    const { organizationId } = req;
    const { status, sort = 'votes' } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    let requests = marketplace.integrationRequests;

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    // Sort
    if (sort === 'votes') {
      requests.sort((a, b) => b.votes.count - a.votes.count);
    } else if (sort === 'newest') {
      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get requests',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/requests - Submit integration request
router.post('/requests', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.submitIntegrationRequest({
      ...req.body,
      userId,
    });

    const newRequest = marketplace.integrationRequests[marketplace.integrationRequests.length - 1];

    res.status(201).json({
      success: true,
      message: 'Integration request submitted',
      data: newRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit request',
      error: error.message,
    });
  }
});

// POST /api/integration-marketplace/requests/:requestId/vote - Vote for request
router.post('/requests/:requestId/vote', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { requestId } = req.params;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    await marketplace.voteForRequest(requestId, userId);

    res.json({
      success: true,
      message: 'Vote added',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to vote',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/analytics - Get marketplace analytics
router.get('/analytics', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    res.json({
      success: true,
      data: {
        totalAvailable: marketplace.totalAvailableIntegrations,
        totalInstalled: marketplace.totalInstalledIntegrations,
        totalViews: marketplace.analytics.totalViews,
        totalInstalls: marketplace.analytics.totalInstalls,
        totalUninstalls: marketplace.analytics.totalUninstalls,
        installationRate: marketplace.installationRate,
        popularIntegrations: marketplace.analytics.popularIntegrations.slice(0, 10),
        categoryBreakdown: Object.fromEntries(marketplace.analytics.categoryBreakdown || new Map()),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/history - Get installation history
router.get('/history', async (req, res) => {
  try {
    const { organizationId } = req;
    const { limit = 50, action } = req.query;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    let history = marketplace.installationHistory;

    if (action) {
      history = history.filter((h) => h.action === action);
    }

    history = history
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get history',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/settings - Get marketplace settings
router.get('/settings', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    res.json({
      success: true,
      data: marketplace.settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message,
    });
  }
});

// PUT /api/integration-marketplace/settings - Update marketplace settings
router.put('/settings', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    Object.assign(marketplace.settings, req.body);
    marketplace.lastModifiedBy = userId;
    await marketplace.save();

    res.json({
      success: true,
      message: 'Settings updated',
      data: marketplace.settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
});

// GET /api/integration-marketplace/stats - Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const { organizationId } = req;

    const marketplace = await IntegrationMarketplace.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!marketplace) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace not found',
      });
    }

    const stats = {
      availableIntegrations: marketplace.totalAvailableIntegrations,
      installedIntegrations: marketplace.totalInstalledIntegrations,
      featuredIntegrations: marketplace.availableIntegrations.filter((i) => i.featured).length,
      totalReviews: marketplace.reviews.length,
      totalFavorites: marketplace.favorites.length,
      totalRequests: marketplace.integrationRequests.length,
      pendingRequests: marketplace.integrationRequests.filter((r) => r.status === 'pending').length,
      collections: marketplace.collections.length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message,
    });
  }
});

module.exports = router;
