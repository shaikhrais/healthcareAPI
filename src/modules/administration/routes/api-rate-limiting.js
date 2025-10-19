const express = require('express');


const ApiRateLimiting = require('../models/ApiRateLimiting');
const router = express.Router();
// Middleware to extract user and organization from headers
const extractContext = (req, res, next) => {
  req.userId = req.headers['x-user-id'];
  req.organizationId = req.headers['x-organization-id'];
  next();
};

router.use(extractContext);

// POST /api/rate-limiting/initialize - Initialize rate limiting
router.post('/initialize', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    // Check if already initialized
    let rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (rateLimiting) {
      return res.status(200).json({
        success: true,
        message: 'API rate limiting already initialized',
        data: rateLimiting,
      });
    }

    // Create with default tiers
    rateLimiting = await ApiRateLimiting.create({
      organization: organizationId,
      tiers: req.body.tiers || [],
      settings: req.body.settings || {},
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'API rate limiting initialized successfully',
      data: rateLimiting,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize rate limiting',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/tiers - Get all tiers
router.get('/tiers', async (req, res) => {
  try {
    const { organizationId } = req;
    const { level, active } = req.query;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    let { tiers } = rateLimiting;

    // Apply filters
    if (level) {
      tiers = tiers.filter((t) => t.level === level);
    }
    if (active !== undefined) {
      tiers = tiers.filter((t) => t.isActive === (active === 'true'));
    }

    // Sort by sort order
    tiers.sort((a, b) => a.sortOrder - b.sortOrder);

    res.json({
      success: true,
      data: tiers,
      count: tiers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get tiers',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/tiers - Create new tier
router.post('/tiers', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.addTier(req.body);

    const newTier = rateLimiting.tiers[rateLimiting.tiers.length - 1];

    res.status(201).json({
      success: true,
      message: 'Tier created successfully',
      data: newTier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create tier',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/tiers/:tierId - Get specific tier
router.get('/tiers/:tierId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { tierId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    const tier = rateLimiting.tiers.find((t) => t.tierId === tierId);

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Tier not found',
      });
    }

    res.json({
      success: true,
      data: tier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get tier',
      error: error.message,
    });
  }
});

// PUT /api/rate-limiting/tiers/:tierId - Update tier
router.put('/tiers/:tierId', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { tierId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.updateTier(tierId, req.body);
    rateLimiting.lastModifiedBy = userId;
    await rateLimiting.save();

    const updatedTier = rateLimiting.tiers.find((t) => t.tierId === tierId);

    res.json({
      success: true,
      message: 'Tier updated successfully',
      data: updatedTier,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update tier',
      error: error.message,
    });
  }
});

// DELETE /api/rate-limiting/tiers/:tierId - Delete tier
router.delete('/tiers/:tierId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { tierId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.deleteTier(tierId);

    res.json({
      success: true,
      message: 'Tier deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete tier',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/api-keys - Get all API keys
router.get('/api-keys', async (req, res) => {
  try {
    const { organizationId } = req;
    const { status, tierId, userId } = req.query;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    let { apiKeys } = rateLimiting;

    // Apply filters
    if (status) {
      apiKeys = apiKeys.filter((k) => k.status === status);
    }
    if (tierId) {
      apiKeys = apiKeys.filter((k) => k.tierId === tierId);
    }
    if (userId) {
      apiKeys = apiKeys.filter((k) => k.userId && k.userId.toString() === userId);
    }

    // Don't expose actual keys in list
    apiKeys = apiKeys.map((k) => ({
      keyId: k.keyId,
      name: k.name,
      tierId: k.tierId,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));

    res.json({
      success: true,
      data: apiKeys,
      count: apiKeys.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get API keys',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/api-keys - Create new API key
router.post('/api-keys', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    }).select('+apiKeys.key +apiKeys.secret');

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.createApiKey({
      ...req.body,
      userId,
    });

    const newKey = rateLimiting.apiKeys[rateLimiting.apiKeys.length - 1];

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        keyId: newKey.keyId,
        name: newKey.name,
        key: newKey.key,
        secret: newKey.secret,
        tierId: newKey.tierId,
        status: newKey.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create API key',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/api-keys/:keyId - Get specific API key
router.get('/api-keys/:keyId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    const apiKey = rateLimiting.apiKeys.find((k) => k.keyId === keyId);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found',
      });
    }

    // Don't expose actual key/secret
    res.json({
      success: true,
      data: {
        keyId: apiKey.keyId,
        name: apiKey.name,
        tierId: apiKey.tierId,
        status: apiKey.status,
        permissions: apiKey.permissions,
        ipWhitelist: apiKey.ipWhitelist,
        scopes: apiKey.scopes,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get API key',
      error: error.message,
    });
  }
});

// PUT /api/rate-limiting/api-keys/:keyId - Update API key
router.put('/api-keys/:keyId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.updateApiKey(keyId, req.body);

    const updatedKey = rateLimiting.apiKeys.find((k) => k.keyId === keyId);

    res.json({
      success: true,
      message: 'API key updated successfully',
      data: {
        keyId: updatedKey.keyId,
        name: updatedKey.name,
        status: updatedKey.status,
        tierId: updatedKey.tierId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update API key',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/api-keys/:keyId/revoke - Revoke API key
router.post('/api-keys/:keyId/revoke', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.revokeApiKey(keyId);

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/check - Check rate limit
router.post('/check', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId, limitType } = req.body;

    const result = await ApiRateLimiting.checkRateLimit(organizationId, keyId, limitType);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check rate limit',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/usage - Record usage
router.post('/usage', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.recordUsage(req.body);

    res.json({
      success: true,
      message: 'Usage recorded successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record usage',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/usage/:keyId - Get usage for API key
router.get('/usage/:keyId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId } = req.params;
    const { startDate, endDate, period } = req.query;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    let usage = rateLimiting.usage.filter((u) => u.keyId === keyId);

    // Filter by date range
    if (startDate || endDate) {
      usage = usage.filter((u) => {
        const usageDate = new Date(u.timestamp);
        if (startDate && usageDate < new Date(startDate)) return false;
        if (endDate && usageDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Filter by period type
    if (period) {
      usage = usage.filter((u) => u.period.includes(period));
    }

    // Get summary
    const summary = rateLimiting.getUsageSummary(keyId, startDate, endDate);

    res.json({
      success: true,
      data: {
        usage,
        summary,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get usage',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/violations - Record violation
router.post('/violations', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.recordViolation(req.body);

    res.status(201).json({
      success: true,
      message: 'Violation recorded successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record violation',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/violations - Get violations
router.get('/violations', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId, limitType, action, limit = 100 } = req.query;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    let { violations } = rateLimiting;

    // Apply filters
    if (keyId) {
      violations = violations.filter((v) => v.keyId === keyId);
    }
    if (limitType) {
      violations = violations.filter((v) => v.limitType === limitType);
    }
    if (action) {
      violations = violations.filter((v) => v.action === action);
    }

    // Sort by timestamp descending
    violations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    violations = violations.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: violations,
      count: violations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get violations',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/custom-limits - Get custom limits
router.get('/custom-limits', async (req, res) => {
  try {
    const { organizationId } = req;
    const { keyId } = req.query;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    let { customLimits } = rateLimiting;

    if (keyId) {
      customLimits = customLimits.filter((cl) => cl.keyId === keyId);
    }

    res.json({
      success: true,
      data: customLimits,
      count: customLimits.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get custom limits',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/custom-limits - Add custom limit
router.post('/custom-limits', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.addCustomLimit({
      ...req.body,
      createdBy: userId,
    });

    const newLimit = rateLimiting.customLimits[rateLimiting.customLimits.length - 1];

    res.status(201).json({
      success: true,
      message: 'Custom limit added successfully',
      data: newLimit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add custom limit',
      error: error.message,
    });
  }
});

// DELETE /api/rate-limiting/custom-limits/:customLimitId - Remove custom limit
router.delete('/custom-limits/:customLimitId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { customLimitId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.removeCustomLimit(customLimitId);

    res.json({
      success: true,
      message: 'Custom limit removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove custom limit',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/alerts - Get alerts
router.get('/alerts', async (req, res) => {
  try {
    const { organizationId } = req;
    const { type, severity, acknowledged, limit = 50 } = req.query;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    let { alerts } = rateLimiting;

    // Apply filters
    if (type) {
      alerts = alerts.filter((a) => a.type === type);
    }
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }
    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === (acknowledged === 'true'));
    }

    // Sort by created date descending
    alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit results
    alerts = alerts.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get alerts',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/alerts/:alertId/acknowledge - Acknowledge alert
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { alertId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.acknowledgeAlert(alertId, userId);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message,
    });
  }
});

// POST /api/rate-limiting/alerts/:alertId/resolve - Resolve alert
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { organizationId } = req;
    const { alertId } = req.params;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    await rateLimiting.resolveAlert(alertId);

    res.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/analytics - Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...rateLimiting.analytics,
        throttleRate: rateLimiting.throttleRate,
        activeKeysByTier: rateLimiting.activeKeysByTier,
        tierDistribution: Object.fromEntries(rateLimiting.analytics.tierDistribution || new Map()),
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

// GET /api/rate-limiting/stats - Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    const stats = {
      totalTiers: rateLimiting.tiers.length,
      activeTiers: rateLimiting.tiers.filter((t) => t.isActive).length,
      totalApiKeys: rateLimiting.analytics.totalApiKeys,
      activeApiKeys: rateLimiting.analytics.activeApiKeys,
      totalRequests: rateLimiting.analytics.totalRequests,
      totalThrottled: rateLimiting.analytics.totalThrottled,
      throttleRate: rateLimiting.throttleRate,
      totalViolations: rateLimiting.violations.length,
      activeAlerts: rateLimiting.alerts.filter((a) => !a.acknowledged).length,
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

// GET /api/rate-limiting/settings - Get settings
router.get('/settings', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    res.json({
      success: true,
      data: rateLimiting.settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message,
    });
  }
});

// PUT /api/rate-limiting/settings - Update settings
router.put('/settings', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    Object.assign(rateLimiting.settings, req.body);
    rateLimiting.lastModifiedBy = userId;
    await rateLimiting.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: rateLimiting.settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
});

// GET /api/rate-limiting/notifications - Get notification settings
router.get('/notifications', async (req, res) => {
  try {
    const { organizationId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    res.json({
      success: true,
      data: rateLimiting.notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get notification settings',
      error: error.message,
    });
  }
});

// PUT /api/rate-limiting/notifications - Update notification settings
router.put('/notifications', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const rateLimiting = await ApiRateLimiting.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!rateLimiting) {
      return res.status(404).json({
        success: false,
        message: 'Rate limiting not found',
      });
    }

    Object.assign(rateLimiting.notifications, req.body);
    rateLimiting.lastModifiedBy = userId;
    await rateLimiting.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: rateLimiting.notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message,
    });
  }
});

module.exports = router;
