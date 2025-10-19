const express = require('express');

const mongoose = require('mongoose');

const ZapierWebhook = require('../models/ZapierWebhook');
/**
 * Zapier Webhooks API Routes
 * TASK-15.13 - Zapier Webhooks
 *
 * Endpoints for managing Zapier webhook integrations
 */

const router = express.Router();
// eslint-disable-next-line no-unused-vars
// Simple auth middleware
const protect = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const organizationId = req.headers['x-organization-id'];

  if (!userId || !organizationId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide x-user-id and x-organization-id headers',
    });
  }

  req.userId = userId;
  req.organizationId = organizationId;
  next();
};

// Webhook authentication middleware
const authenticateWebhook = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Provide X-API-Key header or api_key query parameter',
    });
  }

  try {
    const webhook = await ZapierWebhook.getByApiKey(apiKey);

    if (!webhook) {
      return res.status(401).json({
        error: 'Invalid API key',
      });
    }

    if (!webhook.isActive) {
      return res.status(403).json({
        error: 'Webhook is not active',
      });
    }

    req.webhook = webhook;
    next();
  } catch (error) {
    console.error('Webhook authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
};

// ==================== WEBHOOK MANAGEMENT ====================

/**
 * @route   POST /api/zapier/webhooks
 * @desc    Create a new webhook subscription
 * @access  Private
 */
router.post('/webhooks', protect, async (req, res) => {
  try {
    const { type, event, targetUrl, filters, retryConfig, rateLimit, config, zapierConfig } =
      req.body;

    if (!type || !event || !targetUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['type', 'event', 'targetUrl'],
      });
    }

    // Validate event
    const availableEvents = ZapierWebhook.getAvailableEvents();
    if (!availableEvents.includes(event)) {
      return res.status(400).json({
        error: 'Invalid event',
        message: 'Event must be one of: ' + availableEvents.join(', '),
      });
    }

    const webhook = await ZapierWebhook.createWebhook({
      type,
      event,
      targetUrl,
      organization: req.organizationId,
      createdBy: req.userId,
      filters: filters || {},
      retryConfig: retryConfig || {},
      rateLimit: rateLimit || {},
      config: config || {},
      zapierConfig: zapierConfig || {},
    });

    res.status(201).json(webhook);
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({
      error: 'Failed to create webhook',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zapier/webhooks
 * @desc    List all webhooks
 * @access  Private
 */
router.get('/webhooks', protect, async (req, res) => {
  try {
    const { status, type, event } = req.query;

    const query = {
      organization: req.organizationId,
      isDeleted: false,
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (event) query.event = event;

    const webhooks = await ZapierWebhook.find(query).sort({ createdAt: -1 });

    res.json({
      webhooks,
      count: webhooks.length,
    });
  } catch (error) {
    console.error('List webhooks error:', error);
    res.status(500).json({
      error: 'Failed to list webhooks',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zapier/webhooks/:id
 * @desc    Get a webhook by ID
 * @access  Private
 */
router.get('/webhooks/:id', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    res.json(webhook);
  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({
      error: 'Failed to get webhook',
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/zapier/webhooks/:id
 * @desc    Update a webhook
 * @access  Private
 */
router.put('/webhooks/:id', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    // Don't allow updating certain fields
    const disallowedFields = ['authentication', 'organization', 'createdBy'];
    disallowedFields.forEach((field) => delete req.body[field]);

    Object.assign(webhook, req.body);
    await webhook.save();

    res.json(webhook);
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({
      error: 'Failed to update webhook',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/zapier/webhooks/:id
 * @desc    Delete a webhook (soft delete)
 * @access  Private
 */
router.delete('/webhooks/:id', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    webhook.isDeleted = true;
    webhook.deletedAt = new Date();
    webhook.deletedBy = req.userId;
    await webhook.save();

    res.json({
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      error: 'Failed to delete webhook',
      message: error.message,
    });
  }
});

// ==================== WEBHOOK CONTROL ====================

/**
 * @route   PUT /api/zapier/webhooks/:id/pause
 * @desc    Pause a webhook
 * @access  Private
 */
router.put('/webhooks/:id/pause', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    await webhook.pause();

    res.json({
      message: 'Webhook paused',
      webhook,
    });
  } catch (error) {
    console.error('Pause webhook error:', error);
    res.status(500).json({
      error: 'Failed to pause webhook',
      message: error.message,
    });
  }
});

/**
 * @route   PUT /api/zapier/webhooks/:id/resume
 * @desc    Resume a paused webhook
 * @access  Private
 */
router.put('/webhooks/:id/resume', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    await webhook.resume();

    res.json({
      message: 'Webhook resumed',
      webhook,
    });
  } catch (error) {
    console.error('Resume webhook error:', error);
    res.status(500).json({
      error: 'Failed to resume webhook',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/zapier/webhooks/:id/test
 * @desc    Test a webhook
 * @access  Private
 */
router.post('/webhooks/:id/test', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    const testPayload = req.body.payload || {
      test: true,
      timestamp: new Date(),
      message: 'Test webhook from ExpoJane',
    };

    const testResult = await webhook.testWebhook(testPayload);

    res.json({
      message: 'Webhook tested',
      result: testResult,
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      error: 'Failed to test webhook',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/zapier/webhooks/:id/regenerate-key
 * @desc    Regenerate API key for webhook
 * @access  Private
 */
router.post('/webhooks/:id/regenerate-key', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    const newApiKey = webhook.generateApiKey();
    const newSecret = webhook.generateSecret();
    await webhook.save();

    res.json({
      message: 'API key regenerated',
      apiKey: newApiKey,
      secret: newSecret,
    });
  } catch (error) {
    console.error('Regenerate key error:', error);
    res.status(500).json({
      error: 'Failed to regenerate key',
      message: error.message,
    });
  }
});

// ==================== EVENT TRIGGERING ====================

/**
 * @route   POST /api/zapier/trigger/:event
 * @desc    Trigger an event to all subscribed webhooks
 * @access  Private
 */
router.post('/trigger/:event', protect, async (req, res) => {
  try {
    const { event } = req.params;
    const payload = req.body;

    // Get all active webhooks for this event
    const webhooks = await ZapierWebhook.getActiveWebhooksForEvent(event, req.organizationId);

    if (webhooks.length === 0) {
      return res.json({
        message: 'No active webhooks for this event',
        triggeredCount: 0,
      });
    }

    // Trigger each webhook (in production, this would be async/queued)
    const results = await Promise.all(
      webhooks.map(async (webhook) => {
        try {
          // Check if payload matches conditions
          if (!webhook.matchesConditions(payload)) {
            return {
              webhookId: webhook._id,
              status: 'skipped',
              reason: 'Conditions not met',
            };
          }

          // Apply filters
          const filteredPayload = webhook.applyFilters(payload);

          // Record event
          await webhook.recordEvent({
            eventType: event,
            payload: filteredPayload,
            status: 'sent',
            statusCode: 200,
            responseTime: Math.random() * 500, // Simulated
          });

          return {
            webhookId: webhook._id,
            status: 'sent',
          };
        } catch (error) {
          await webhook.recordEvent({
            eventType: event,
            payload,
            status: 'failed',
            errorMessage: error.message,
          });

          return {
            webhookId: webhook._id,
            status: 'failed',
            error: error.message,
          };
        }
      })
    );

    res.json({
      message: 'Event triggered',
      event,
      triggeredCount: webhooks.length,
      results,
    });
  } catch (error) {
    console.error('Trigger event error:', error);
    res.status(500).json({
      error: 'Failed to trigger event',
      message: error.message,
    });
  }
});

// ==================== ZAPIER REST HOOKS (Subscription) ====================

/**
 * @route   POST /api/zapier/hooks/subscribe
 * @desc    Subscribe to webhook (Zapier REST Hooks)
 * @access  Public (with API key)
 */
router.post('/hooks/subscribe', authenticateWebhook, async (req, res) => {
  try {
    const { hookUrl, event } = req.body;

    if (!hookUrl || !event) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['hookUrl', 'event'],
      });
    }

    // Update existing webhook or create new one
    req.webhook.targetUrl = hookUrl;
    req.webhook.event = event;
    req.webhook.zapierConfig.hookUrl = hookUrl;
    req.webhook.status = 'active';
    await req.webhook.save();

    res.json({
      id: req.webhook._id,
      message: 'Subscription created',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      error: 'Failed to subscribe',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/zapier/hooks/unsubscribe/:id
 * @desc    Unsubscribe from webhook (Zapier REST Hooks)
 * @access  Public (with API key)
 */
router.delete('/hooks/unsubscribe/:id', authenticateWebhook, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findById(req.params.id);

    if (!webhook) {
      return res.status(404).json({
        error: 'Subscription not found',
      });
    }

    webhook.isDeleted = true;
    webhook.deletedAt = new Date();
    await webhook.save();

    res.json({
      message: 'Subscription deleted',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zapier/hooks/perform-list
 * @desc    Get sample data for Zapier (for static webhooks)
 * @access  Public (with API key)
 */
router.get('/hooks/perform-list', authenticateWebhook, async (req, res) => {
  try {
    const { event } = req.query;

    // Return sample data based on event type
    const sampleData = getSampleDataForEvent(event || req.webhook.event);

    res.json(sampleData);
  } catch (error) {
    console.error('Perform list error:', error);
    res.status(500).json({
      error: 'Failed to get sample data',
      message: error.message,
    });
  }
});

// ==================== STATISTICS ====================

/**
 * @route   GET /api/zapier/webhooks/:id/stats
 * @desc    Get webhook statistics
 * @access  Private
 */
router.get('/webhooks/:id/stats', protect, async (req, res) => {
  try {
    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    res.json({
      totalEvents: webhook.stats.totalEvents,
      successfulEvents: webhook.stats.successfulEvents,
      failedEvents: webhook.stats.failedEvents,
      successRate: webhook.successRate,
      failureRate: webhook.failureRate,
      lastTriggeredAt: webhook.stats.lastTriggeredAt,
      lastSuccessAt: webhook.stats.lastSuccessAt,
      lastFailureAt: webhook.stats.lastFailureAt,
      averageResponseTime: webhook.stats.averageResponseTime,
    });
  } catch (error) {
    console.error('Get webhook stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zapier/webhooks/:id/events
 * @desc    Get recent events for webhook
 * @access  Private
 */
router.get('/webhooks/:id/events', protect, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const webhook = await ZapierWebhook.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!webhook) {
      return res.status(404).json({
        error: 'Webhook not found',
      });
    }

    const events = webhook.recentEvents.slice(0, parseInt(limit, 10));

    res.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Get webhook events error:', error);
    res.status(500).json({
      error: 'Failed to get events',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zapier/stats
 * @desc    Get organization-wide webhook statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await ZapierWebhook.getOrganizationStats(req.organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/zapier/failing-webhooks
 * @desc    Get webhooks with high failure rates
 * @access  Private
 */
router.get('/failing-webhooks', protect, async (req, res) => {
  try {
    const { threshold = 50 } = req.query;

    const failingWebhooks = await ZapierWebhook.getFailingWebhooks(
      req.organizationId,
      parseInt(threshold, 10)
    );

    res.json({
      webhooks: failingWebhooks,
      count: failingWebhooks.length,
    });
  } catch (error) {
    console.error('Get failing webhooks error:', error);
    res.status(500).json({
      error: 'Failed to get failing webhooks',
      message: error.message,
    });
  }
});

// ==================== AVAILABLE EVENTS ====================

/**
 * @route   GET /api/zapier/events
 * @desc    Get list of available events
 * @access  Public
 */
router.get('/events', async (req, res) => {
  try {
    const events = ZapierWebhook.getAvailableEvents();

    res.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      error: 'Failed to get events',
      message: error.message,
    });
  }
});

// ==================== ADMIN OPERATIONS ====================

/**
 * @route   POST /api/zapier/admin/cleanup
 * @desc    Cleanup old webhook events
 * @access  Private (Admin)
 */
router.post('/admin/cleanup', protect, async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const result = await ZapierWebhook.cleanupOldEvents(daysToKeep);

    res.json({
      message: 'Cleanup completed',
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup',
      message: error.message,
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Get sample data for event type
 */
function getSampleDataForEvent(event) {
  const samples = {
    'appointment.created': [
      {
        id: '123',
        patientName: 'John Doe',
        date: '2024-01-15',
        time: '10:00 AM',
        status: 'scheduled',
        createdAt: new Date(),
      },
    ],
    'patient.created': [
      {
        id: '456',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-0100',
        createdAt: new Date(),
      },
    ],
    'invoice.paid': [
      {
        id: '789',
        amount: 150.0,
        currency: 'USD',
        patientName: 'John Doe',
        paidAt: new Date(),
      },
    ],
  };

  return (
    samples[event] || [
      {
        id: 'sample-1',
        event,
        timestamp: new Date(),
      },
    ]
  );
}

module.exports = router;
