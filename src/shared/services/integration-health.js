const express = require('express');


const IntegrationHealth = require('../models/IntegrationHealth');
const { protect } = require('../middleware/auth');
const router = express.Router();
// Apply authentication middleware to all routes
router.use(protect);

// Helper: Get organization ID from headers
const getOrgId = (req) => req.headers['x-organization-id'];

/**
 * @route   POST /api/integration-health/initialize
 * @desc    Initialize integration health monitoring
 * @access  Private
 */
router.post('/initialize', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    // Check if health monitoring already exists
    let health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (health) {
      return res.status(400).json({
        success: false,
        error: 'Integration health monitoring already initialized',
      });
    }

    // Create new health monitoring
    health = await IntegrationHealth.create({
      organization: organizationId,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Integration health monitoring initialized',
      health,
    });
  } catch (error) {
    console.error('Initialize health monitoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize health monitoring',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/dashboard
 * @desc    Get health dashboard overview
 * @access  Private
 */
router.get('/dashboard', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    res.json({
      success: true,
      dashboard: {
        overallStatus: health.overallHealthStatus,
        healthScore: health.healthScore,
        stats: health.stats,
        integrations: health.integrations,
        recentIncidents: health.incidents.slice(-5).reverse(),
        activeAlerts: health.alerts.filter((a) => !a.acknowledged).slice(-10),
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/integration-health/integrations
 * @desc    Add an integration to monitor
 * @access  Private
 */
router.post('/integrations', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const integrationData = req.body;

    if (
      !integrationData.integrationId ||
      !integrationData.integrationType ||
      !integrationData.name
    ) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID, type, and name are required',
      });
    }

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.addIntegration(integrationData);

    res.json({
      success: true,
      message: 'Integration added to health monitoring',
    });
  } catch (error) {
    console.error('Add integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add integration',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/integrations
 * @desc    Get all monitored integrations
 * @access  Private
 */
router.get('/integrations', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { status } = req.query;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    let { integrations } = health;

    if (status) {
      integrations = integrations.filter((i) => i.status === status);
    }

    res.json({
      success: true,
      integrations,
      total: integrations.length,
    });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve integrations',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/integrations/:integrationId
 * @desc    Get specific integration health
 * @access  Private
 */
router.get('/integrations/:integrationId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { integrationId } = req.params;

    const integration = await IntegrationHealth.getIntegrationHealth(organizationId, integrationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
      });
    }

    res.json({
      success: true,
      integration,
    });
  } catch (error) {
    console.error('Get integration health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve integration health',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/integration-health/integrations/:integrationId/status
 * @desc    Update integration status
 * @access  Private
 */
router.put('/integrations/:integrationId/status', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { integrationId } = req.params;
    const { status, responseTime } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.updateIntegrationStatus(integrationId, status, responseTime);

    res.json({
      success: true,
      message: 'Integration status updated',
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/integration-health/health-checks
 * @desc    Record a health check
 * @access  Private
 */
router.post('/health-checks', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const checkData = req.body;

    if (!checkData.integrationId || !checkData.status) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID and status are required',
      });
    }

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.recordHealthCheck(checkData);

    // Update integration status based on check
    let newStatus = 'healthy';
    if (checkData.status === 'failure' || checkData.status === 'timeout') {
      newStatus = 'down';
    } else if (checkData.status === 'degraded') {
      newStatus = 'degraded';
    }

    await health.updateIntegrationStatus(
      checkData.integrationId,
      newStatus,
      checkData.responseTime
    );

    res.json({
      success: true,
      message: 'Health check recorded',
    });
  } catch (error) {
    console.error('Record health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record health check',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/health-checks
 * @desc    Get health check history
 * @access  Private
 */
router.get('/health-checks', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { integrationId, status, limit = 100 } = req.query;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    let checks = health.healthChecks;

    if (integrationId) {
      checks = checks.filter((c) => c.integrationId === integrationId);
    }

    if (status) {
      checks = checks.filter((c) => c.status === status);
    }

    // Sort by timestamp (newest first)
    checks.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    checks = checks.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      checks,
      total: checks.length,
    });
  } catch (error) {
    console.error('Get health checks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health checks',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/incidents
 * @desc    Get incidents
 * @access  Private
 */
router.get('/incidents', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { status, severity, integrationId, limit = 50 } = req.query;

    const incidents = await IntegrationHealth.getRecentIncidents(organizationId, {
      status,
      severity,
      integrationId,
      limit: parseInt(limit, 10),
    });

    res.json({
      success: true,
      incidents,
      total: incidents.length,
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve incidents',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/incidents/:incidentId
 * @desc    Get specific incident
 * @access  Private
 */
router.get('/incidents/:incidentId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { incidentId } = req.params;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    const incident = health.incidents.find((i) => i.incidentId === incidentId);

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found',
      });
    }

    res.json({
      success: true,
      incident,
    });
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve incident',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/integration-health/incidents
 * @desc    Create an incident
 * @access  Private
 */
router.post('/incidents', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const incidentData = req.body;

    if (!incidentData.integrationId || !incidentData.title) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID and title are required',
      });
    }

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.createIncident(incidentData);

    res.json({
      success: true,
      message: 'Incident created',
    });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/integration-health/incidents/:incidentId
 * @desc    Update an incident
 * @access  Private
 */
router.put('/incidents/:incidentId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { incidentId } = req.params;
    const updates = req.body;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.updateIncident(incidentId, updates, req.user._id);

    res.json({
      success: true,
      message: 'Incident updated',
    });
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/alerts
 * @desc    Get alerts
 * @access  Private
 */
router.get('/alerts', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { acknowledged, severity, type, integrationId } = req.query;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    let { alerts } = health;

    if (acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === (acknowledged === 'true'));
    }

    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    if (type) {
      alerts = alerts.filter((a) => a.type === type);
    }

    if (integrationId) {
      alerts = alerts.filter((a) => a.integrationId === integrationId);
    }

    // Sort by creation date (newest first)
    alerts.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      alerts,
      total: alerts.length,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/integration-health/alerts
 * @desc    Create an alert
 * @access  Private
 */
router.post('/alerts', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const alertData = req.body;

    if (!alertData.integrationId || !alertData.type || !alertData.message) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID, type, and message are required',
      });
    }

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.createAlert(alertData);

    res.json({
      success: true,
      message: 'Alert created',
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/integration-health/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { alertId } = req.params;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.acknowledgeAlert(alertId, req.user._id);

    res.json({
      success: true,
      message: 'Alert acknowledged',
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/notifications
 * @desc    Get notification configuration
 * @access  Private
 */
router.get('/notifications', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    res.json({
      success: true,
      config: health.notificationConfig,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification configuration',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/integration-health/notifications
 * @desc    Update notification configuration
 * @access  Private
 */
router.put('/notifications', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const updates = req.body;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    await health.updateNotificationConfig(updates);

    res.json({
      success: true,
      message: 'Notification configuration updated',
      config: health.notificationConfig,
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification configuration',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/stats
 * @desc    Get overall statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const stats = await IntegrationHealth.getOverallStats(organizationId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/uptime/:integrationId
 * @desc    Get uptime for specific integration
 * @access  Private
 */
router.get('/uptime/:integrationId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { integrationId } = req.params;
    const { period = '24h' } = req.query;

    const health = await IntegrationHealth.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!health) {
      return res.status(404).json({
        success: false,
        error: 'Health monitoring not found',
      });
    }

    const integration = health.integrations.find((i) => i.integrationId === integrationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
      });
    }

    // Calculate period in milliseconds
    const periodMap = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    };

    const periodMs = periodMap[period] || periodMap['24h'];
    const startTime = new Date(Date.now() - periodMs);

    // Filter checks within period
    const checksInPeriod = health.healthChecks.filter(
      (c) => c.integrationId === integrationId && c.timestamp >= startTime
    );

    const successfulChecks = checksInPeriod.filter((c) => c.status === 'success').length;
    const uptimePercentage =
      checksInPeriod.length > 0 ? (successfulChecks / checksInPeriod.length) * 100 : 100;

    res.json({
      success: true,
      uptime: {
        percentage: uptimePercentage.toFixed(2),
        period,
        totalChecks: checksInPeriod.length,
        successfulChecks,
        failedChecks: checksInPeriod.length - successfulChecks,
        currentStatus: integration.status,
        lastCheckAt: integration.lastCheckAt,
      },
    });
  } catch (error) {
    console.error('Get uptime error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve uptime',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/integration-health/response-times/:integrationId
 * @desc    Get response time metrics
 * @access  Private
 */
router.get('/response-times/:integrationId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { integrationId } = req.params;

    const integration = await IntegrationHealth.getIntegrationHealth(organizationId, integrationId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found',
      });
    }

    res.json({
      success: true,
      responseTimes: {
        current: integration.responseTime.current,
        average: integration.responseTime.average,
        min: integration.responseTime.min,
        max: integration.responseTime.max,
      },
    });
  } catch (error) {
    console.error('Get response times error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve response times',
      details: error.message,
    });
  }
});

module.exports = router;
