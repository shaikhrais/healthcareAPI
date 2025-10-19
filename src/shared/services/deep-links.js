const express = require('express');


const DeepLink = require('../models/DeepLink');
/**
 * Deep Links API Routes
 * TASK-14.9 - Deep Linking & Universal Links
 */

const router = express.Router();
// Simple auth middleware
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  req.organization = { _id: req.headers['x-organization-id'] || '507f1f77bcf86cd799439012' };
  next();
};

/**
 * @route   POST /api/deep-links
 * @desc    Create a deep link
 */
router.post('/', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.createLink({
      ...req.body,
      createdBy: req.user._id,
      organization: req.organization._id,
    });

    res.status(201).json({
      success: true,
      message: 'Deep link created successfully',
      data: {
        ...deepLink.toObject(),
        shortUrl: deepLink.getShortUrl(),
        deepLinkUrl: deepLink.getDeepLinkUrl(),
        universalLink: deepLink.getUniversalLink(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create deep link',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links
 * @desc    Get all deep links
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, type, campaign, screen, limit = 20, page = 1 } = req.query;

    const query = { organization: req.organization._id };

    if (status) query.status = status;
    if (type) query.type = type;
    if (campaign) query['campaign.name'] = campaign;
    if (screen) query['destination.screen'] = screen;

    const deepLinks = await DeepLink.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

    const total = await DeepLink.countDocuments(query);

    res.json({
      success: true,
      count: deepLinks.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      data: deepLinks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deep links',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/active
 * @desc    Get active deep links
 */
router.get('/active', protect, async (req, res) => {
  try {
    const deepLinks = await DeepLink.getActiveLinks({
      organization: req.organization._id,
    });

    res.json({
      success: true,
      count: deepLinks.length,
      data: deepLinks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active deep links',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/:id
 * @desc    Get specific deep link
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...deepLink.toObject(),
        shortUrl: deepLink.getShortUrl(),
        deepLinkUrl: deepLink.getDeepLinkUrl(),
        universalLink: deepLink.getUniversalLink(),
        isActive: deepLink.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deep link',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/code/:shortCode
 * @desc    Get deep link by short code
 */
router.get('/code/:shortCode', async (req, res) => {
  try {
    const deepLink = await DeepLink.getByShortCode(req.params.shortCode);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...deepLink.toObject(),
        shortUrl: deepLink.getShortUrl(),
        deepLinkUrl: deepLink.getDeepLinkUrl(),
        universalLink: deepLink.getUniversalLink(),
        isActive: deepLink.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deep link',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/deep-links/:id
 * @desc    Update deep link
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    res.json({
      success: true,
      message: 'Deep link updated successfully',
      data: deepLink,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update deep link',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/deep-links/:id
 * @desc    Delete deep link
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.findByIdAndDelete(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    res.json({
      success: true,
      message: 'Deep link deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete deep link',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/:id/click
 * @desc    Track deep link click
 */
router.post('/:id/click', async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    const clickData = {
      platform: req.body.platform,
      device: req.body.device,
      location: req.body.location,
      ipAddress: req.ip || req.body.ipAddress,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.body.referrer,
    };

    await deepLink.trackClick(clickData);

    res.json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        destination: deepLink.destination,
        deepLinkUrl: deepLink.getDeepLinkUrl(),
        platforms: deepLink.platforms,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track click',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/code/:shortCode/click
 * @desc    Track deep link click by short code
 */
router.post('/code/:shortCode/click', async (req, res) => {
  try {
    const deepLink = await DeepLink.getByShortCode(req.params.shortCode);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    const clickData = {
      platform: req.body.platform,
      device: req.body.device,
      location: req.body.location,
      ipAddress: req.ip || req.body.ipAddress,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.body.referrer,
    };

    await deepLink.trackClick(clickData);

    res.json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        destination: deepLink.destination,
        deepLinkUrl: deepLink.getDeepLinkUrl(),
        universalLink: deepLink.getUniversalLink(),
        platforms: deepLink.platforms,
        behavior: deepLink.behavior,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track click',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/:id/install
 * @desc    Track app install from deep link
 */
router.post('/:id/install', async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    await deepLink.trackInstall();

    res.json({
      success: true,
      message: 'Install tracked successfully',
      data: {
        installs: deepLink.analytics.installs,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track install',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/:id/conversion
 * @desc    Track conversion from deep link
 */
router.post('/:id/conversion', async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    await deepLink.trackConversion();

    res.json({
      success: true,
      message: 'Conversion tracked successfully',
      data: {
        conversions: deepLink.analytics.conversions,
        conversionRate: deepLink.conversionRate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track conversion',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/:id/pause
 * @desc    Pause deep link
 */
router.post('/:id/pause', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    await deepLink.pause();

    res.json({
      success: true,
      message: 'Deep link paused',
      data: deepLink,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to pause deep link',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/:id/resume
 * @desc    Resume deep link
 */
router.post('/:id/resume', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    await deepLink.resume();

    res.json({
      success: true,
      message: 'Deep link resumed',
      data: deepLink,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resume deep link',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/:id/analytics
 * @desc    Get deep link analytics
 */
router.get('/:id/analytics', protect, async (req, res) => {
  try {
    const deepLink = await DeepLink.findById(req.params.id);

    if (!deepLink) {
      return res.status(404).json({
        success: false,
        message: 'Deep link not found',
      });
    }

    const summary = deepLink.getAnalyticsSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/campaign/:campaignName
 * @desc    Get links by campaign
 */
router.get('/campaign/:campaignName', protect, async (req, res) => {
  try {
    const deepLinks = await DeepLink.getByCampaign(req.params.campaignName);

    res.json({
      success: true,
      count: deepLinks.length,
      data: deepLinks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign links',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/analytics/summary
 * @desc    Get overall analytics
 */
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };

    const analytics = await DeepLink.getAnalytics(dateRange, {
      organization: req.organization._id,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/analytics/top-performers
 * @desc    Get top performing links
 */
router.get('/analytics/top-performers', protect, async (req, res) => {
  try {
    const { limit = 10, metric = 'totalClicks' } = req.query;

    const topLinks = await DeepLink.getTopPerformers(parseInt(limit, 10), metric);

    res.json({
      success: true,
      count: topLinks.length,
      data: topLinks.map((link) => ({
        ...link.toObject(),
        shortUrl: link.getShortUrl(),
        analytics: link.getAnalyticsSummary(),
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performers',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/admin/cleanup-expired
 * @desc    Clean up expired links (admin only)
 */
router.post('/admin/cleanup-expired', protect, async (req, res) => {
  try {
    const result = await DeepLink.cleanupExpired();

    res.json({
      success: true,
      message: 'Expired links cleaned up',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired links',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/deep-links/admin/cleanup-history
 * @desc    Clean up old click history (admin only)
 */
router.post('/admin/cleanup-history', protect, async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const result = await DeepLink.cleanupClickHistory(parseInt(daysToKeep, 10));

    res.json({
      success: true,
      message: `Click history cleaned up (kept last ${daysToKeep} days)`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup click history',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/generate/apple-app-site-association
 * @desc    Generate Apple App Site Association file
 */
router.get('/generate/apple-app-site-association', async (req, res) => {
  try {
    const { appId, teamId, paths = ['*'] } = req.query;

    const aasa = {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${appId}`,
            paths: Array.isArray(paths) ? paths : [paths],
          },
        ],
      },
    };

    res.json(aasa);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate AASA file',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/deep-links/generate/assetlinks
 * @desc    Generate Android assetlinks.json
 */
router.get('/generate/assetlinks', async (req, res) => {
  try {
    const { packageName, sha256CertFingerprints } = req.query;

    const fingerprints = Array.isArray(sha256CertFingerprints)
      ? sha256CertFingerprints
      : [sha256CertFingerprints];

    const assetlinks = [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ];

    res.json(assetlinks);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate assetlinks.json',
      error: error.message,
    });
  }
});

module.exports = router;
