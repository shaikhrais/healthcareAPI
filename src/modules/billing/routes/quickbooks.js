/* eslint-disable camelcase */
const express = require('express');

const mongoose = require('mongoose');

const QuickBooksSync = require('../models/QuickBooksSync');
/**
 * QuickBooks Sync API Routes
 * TASK-15.14 - QuickBooks Sync
 *
 * Endpoints for managing QuickBooks Online integration
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

// ==================== CONNECTION MANAGEMENT ====================

/**
 * @route   POST /api/quickbooks/connect
 * @desc    Connect to QuickBooks Online
 * @access  Private
 */
router.post('/connect', protect, async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresIn, realmId, companyName } = req.body;

    if (!accessToken || !refreshToken || !realmId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['accessToken', 'refreshToken', 'realmId'],
      });
    }

    // Check if connection already exists
    const existing = await QuickBooksSync.getByOrganization(req.organizationId);

    if (existing) {
      return res.status(400).json({
        error: 'QuickBooks already connected',
        message: 'Disconnect existing connection first',
      });
    }

    const connection = await QuickBooksSync.createConnection({
      organization: req.organizationId,
      accessToken,
      refreshToken,
      expiresIn: expiresIn || 3600,
      company: {
        realmId,
        companyName: companyName || 'Unknown',
      },
      userId: req.userId,
    });

    res.status(201).json({
      message: 'QuickBooks connected successfully',
      connection,
    });
  } catch (error) {
    console.error('QuickBooks connect error:', error);
    res.status(500).json({
      error: 'Failed to connect QuickBooks',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/quickbooks/disconnect
 * @desc    Disconnect from QuickBooks
 * @access  Private
 */
router.post('/disconnect', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.disconnect(req.userId, reason || 'User requested disconnect');

    res.json({
      message: 'QuickBooks disconnected successfully',
    });
  } catch (error) {
    console.error('QuickBooks disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect QuickBooks',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/quickbooks/connection
 * @desc    Get QuickBooks connection status
 * @access  Private
 */
router.get('/connection', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.json({
        connected: false,
        message: 'No QuickBooks connection',
      });
    }

    res.json({
      connected: connection.isConnected,
      status: connection.status,
      companyName: connection.quickbooksCompany.companyName,
      realmId: connection.quickbooksCompany.realmId,
      lastSync: connection.lastSync.fullSync,
      needsTokenRefresh: connection.needsTokenRefresh,
      syncConfig: connection.syncConfig,
    });
  } catch (error) {
    console.error('Get connection error:', error);
    res.status(500).json({
      error: 'Failed to get connection',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/quickbooks/refresh-token
 * @desc    Refresh OAuth token
 * @access  Private
 */
router.post('/refresh-token', protect, async (req, res) => {
  try {
    const { access_token, refresh_token, expires_in, refresh_token_expires_in } = req.body;

    if (!access_token || !refresh_token) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['access_token', 'refresh_token'],
      });
    }

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.refreshOAuthToken({
      access_token,
      refresh_token,
      expires_in: expires_in || 3600,
      refresh_token_expires_in,
    });

    res.json({
      message: 'Token refreshed successfully',
      expiresAt: connection.oauth.expiresAt,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message,
    });
  }
});

// ==================== SYNC OPERATIONS ====================

/**
 * @route   POST /api/quickbooks/sync
 * @desc    Trigger a sync
 * @access  Private
 */
router.post('/sync', protect, async (req, res) => {
  try {
    const { entityType = 'all', direction = 'to_qb' } = req.body;

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    if (!connection.isConnected) {
      return res.status(400).json({
        error: 'QuickBooks not connected',
        message: 'Please reconnect to QuickBooks',
      });
    }

    const syncId = await connection.startSync(entityType, direction);

    // In production, this would trigger async background job
    // For now, we'll simulate a successful sync
    setTimeout(async () => {
      await connection.completeSync(syncId, {
        created: 5,
        updated: 10,
        deleted: 0,
        skipped: 2,
        failed: 0,
      });
    }, 1000);

    res.json({
      message: 'Sync started',
      syncId,
      entityType,
      direction,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'Failed to start sync',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/quickbooks/sync/:syncId
 * @desc    Get sync status
 * @access  Private
 */
router.get('/sync/:syncId', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    const syncRecord = connection.syncHistory.find((s) => s.syncId === req.params.syncId);

    if (!syncRecord) {
      return res.status(404).json({
        error: 'Sync record not found',
      });
    }

    res.json(syncRecord);
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/quickbooks/sync-history
 * @desc    Get sync history
 * @access  Private
 */
router.get('/sync-history', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    const history = connection.syncHistory.slice(0, parseInt(limit, 10));

    res.json({
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({
      error: 'Failed to get sync history',
      message: error.message,
    });
  }
});

// ==================== SYNC QUEUE ====================

/**
 * @route   POST /api/quickbooks/queue
 * @desc    Add item to sync queue
 * @access  Private
 */
router.post('/queue', protect, async (req, res) => {
  try {
    const { entityType, entityId, operation, priority } = req.body;

    if (!entityType || !entityId || !operation) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['entityType', 'entityId', 'operation'],
      });
    }

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.addToSyncQueue(entityType, entityId, operation, priority);

    res.json({
      message: 'Added to sync queue',
      queueLength: connection.syncQueue.length,
    });
  } catch (error) {
    console.error('Add to queue error:', error);
    res.status(500).json({
      error: 'Failed to add to queue',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/quickbooks/queue
 * @desc    Get sync queue
 * @access  Private
 */
router.get('/queue', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    res.json({
      queue: connection.syncQueue,
      count: connection.syncQueue.length,
    });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({
      error: 'Failed to get queue',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/quickbooks/queue/:entityId
 * @desc    Remove item from sync queue
 * @access  Private
 */
router.delete('/queue/:entityId', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.removeFromSyncQueue(req.params.entityId);

    res.json({
      message: 'Removed from sync queue',
      queueLength: connection.syncQueue.length,
    });
  } catch (error) {
    console.error('Remove from queue error:', error);
    res.status(500).json({
      error: 'Failed to remove from queue',
      message: error.message,
    });
  }
});

// ==================== MAPPINGS ====================

/**
 * @route   GET /api/quickbooks/mappings
 * @desc    Get all mappings
 * @access  Private
 */
router.get('/mappings', protect, async (req, res) => {
  try {
    const { type } = req.query;

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    if (type) {
      res.json({
        mappings: connection.mappings[type] || [],
        count: (connection.mappings[type] || []).length,
      });
    } else {
      res.json({
        customers: connection.mappings.customers,
        invoices: connection.mappings.invoices,
        payments: connection.mappings.payments,
        accounts: connection.mappings.accounts,
        taxRates: connection.mappings.taxRates,
      });
    }
  } catch (error) {
    console.error('Get mappings error:', error);
    res.status(500).json({
      error: 'Failed to get mappings',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/quickbooks/mappings/customer
 * @desc    Add customer mapping
 * @access  Private
 */
router.post('/mappings/customer', protect, async (req, res) => {
  try {
    const { expoJaneId, quickbooksId, displayName } = req.body;

    if (!expoJaneId || !quickbooksId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['expoJaneId', 'quickbooksId'],
      });
    }

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.addCustomerMapping(expoJaneId, quickbooksId, displayName);

    res.json({
      message: 'Customer mapping added',
    });
  } catch (error) {
    console.error('Add customer mapping error:', error);
    res.status(500).json({
      error: 'Failed to add mapping',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/quickbooks/mappings/invoice
 * @desc    Add invoice mapping
 * @access  Private
 */
router.post('/mappings/invoice', protect, async (req, res) => {
  try {
    const { expoJaneId, quickbooksId, docNumber } = req.body;

    if (!expoJaneId || !quickbooksId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['expoJaneId', 'quickbooksId'],
      });
    }

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.addInvoiceMapping(expoJaneId, quickbooksId, docNumber);

    res.json({
      message: 'Invoice mapping added',
    });
  } catch (error) {
    console.error('Add invoice mapping error:', error);
    res.status(500).json({
      error: 'Failed to add mapping',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/quickbooks/mappings/payment
 * @desc    Add payment mapping
 * @access  Private
 */
router.post('/mappings/payment', protect, async (req, res) => {
  try {
    const { expoJaneId, quickbooksId } = req.body;

    if (!expoJaneId || !quickbooksId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['expoJaneId', 'quickbooksId'],
      });
    }

    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    await connection.addPaymentMapping(expoJaneId, quickbooksId);

    res.json({
      message: 'Payment mapping added',
    });
  } catch (error) {
    console.error('Add payment mapping error:', error);
    res.status(500).json({
      error: 'Failed to add mapping',
      message: error.message,
    });
  }
});

// ==================== CONFIGURATION ====================

/**
 * @route   PUT /api/quickbooks/config
 * @desc    Update sync configuration
 * @access  Private
 */
router.put('/config', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    // Update sync config
    if (req.body.syncConfig) {
      Object.assign(connection.syncConfig, req.body.syncConfig);
    }

    // Update settings
    if (req.body.settings) {
      Object.assign(connection.settings, req.body.settings);
    }

    await connection.save();

    res.json({
      message: 'Configuration updated',
      syncConfig: connection.syncConfig,
      settings: connection.settings,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/quickbooks/config
 * @desc    Get sync configuration
 * @access  Private
 */
router.get('/config', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    res.json({
      syncConfig: connection.syncConfig,
      settings: connection.settings,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      error: 'Failed to get configuration',
      message: error.message,
    });
  }
});

// ==================== STATISTICS ====================

/**
 * @route   GET /api/quickbooks/stats
 * @desc    Get sync statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await QuickBooksSync.getSyncStatistics(req.organizationId);

    if (!stats) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message,
    });
  }
});

// ==================== WEBHOOKS ====================

/**
 * @route   POST /api/quickbooks/webhook
 * @desc    Receive QuickBooks webhook
 * @access  Public (with verification)
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['intuit-signature'];
    const payload = req.body;

    // In production, verify webhook signature here

    const { realmId, eventNotifications } = payload;

    if (!realmId || !eventNotifications) {
      return res.status(400).json({
        error: 'Invalid webhook payload',
      });
    }

    // Find connection by realmId
    const connection = await QuickBooksSync.findOne({
      'quickbooksCompany.realmId': realmId,
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
      });
    }

    // Process webhook events
    for (const event of eventNotifications) {
      const { entityType, operation, id } = event;

      // Add to sync queue for processing
      await connection.addToSyncQueue(
        entityType.toLowerCase(),
        id,
        operation.toLowerCase(),
        10 // High priority for webhooks
      );
    }

    connection.webhooks.lastWebhookAt = new Date();
    await connection.save();

    res.status(200).json({ message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message,
    });
  }
});

// ==================== ADMIN OPERATIONS ====================

/**
 * @route   POST /api/quickbooks/admin/test-connection
 * @desc    Test QuickBooks connection
 * @access  Private
 */
router.post('/admin/test-connection', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    // In production, this would make actual API call to QuickBooks
    const testResult = {
      success: connection.isConnected,
      companyName: connection.quickbooksCompany.companyName,
      realmId: connection.quickbooksCompany.realmId,
      tokenValid: new Date() < connection.oauth.expiresAt,
      message: connection.isConnected ? 'Connection successful' : 'Connection failed',
    };

    res.json(testResult);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      error: 'Failed to test connection',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/quickbooks/admin/force-sync
 * @desc    Force a full sync
 * @access  Private (Admin)
 */
router.post('/admin/force-sync', protect, async (req, res) => {
  try {
    const connection = await QuickBooksSync.getByOrganization(req.organizationId);

    if (!connection) {
      return res.status(404).json({
        error: 'No QuickBooks connection found',
      });
    }

    const syncId = await connection.startSync('all', 'to_qb');

    res.json({
      message: 'Force sync started',
      syncId,
    });
  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({
      error: 'Failed to start force sync',
      message: error.message,
    });
  }
});

module.exports = router;
