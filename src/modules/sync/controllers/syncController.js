/**
 * Sync Controller
 * Handles HTTP requests for offline synchronization
 */

const syncService = require('../services/syncService');
const { validationResult } = require('express-validator');

/**
 * Initialize device for sync
 */
exports.initializeDevice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId, deviceType, capabilities } = req.body;
    const userId = req.user.id;

    const result = await syncService.initializeDevice(userId, deviceId, deviceType, capabilities);

    res.json(result);
  } catch (error) {
    console.error('Initialize device error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize device',
      message: error.message,
    });
  }
};

/**
 * Get sync status for device
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const status = await syncService.getSyncStatus(userId, deviceId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message,
    });
  }
};

/**
 * Queue a change for synchronization
 */
exports.queueChange = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { dataType, recordId, operation, changeData, originalData } = req.body;
    const userId = req.user.id;

    const result = await syncService.queueChange(
      userId,
      deviceId,
      dataType,
      recordId,
      operation,
      changeData,
      originalData
    );

    res.json(result);
  } catch (error) {
    console.error('Queue change error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue change',
      message: error.message,
    });
  }
};

/**
 * Process pending synchronization
 */
exports.processPendingSync = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit, dataType } = req.query;
    const userId = req.user.id;

    const options = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (dataType) options.dataType = dataType;

    const result = await syncService.processPendingSync(userId, deviceId, options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Process pending sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process pending sync',
      message: error.message,
    });
  }
};

/**
 * Get incremental sync data
 */
exports.getIncrementalSync = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId, dataType } = req.params;
    const { lastSyncTime } = req.query;
    const userId = req.user.id;

    if (!lastSyncTime) {
      return res.status(400).json({
        success: false,
        error: 'lastSyncTime query parameter is required',
      });
    }

    const result = await syncService.getIncrementalSync(userId, deviceId, dataType, lastSyncTime);

    res.json(result);
  } catch (error) {
    console.error('Get incremental sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incremental sync',
      message: error.message,
    });
  }
};

/**
 * Get conflicts for manual resolution
 */
exports.getConflicts = async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.id;

    const result = await syncService.getConflicts(userId, deviceId);

    res.json(result);
  } catch (error) {
    console.error('Get conflicts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conflicts',
      message: error.message,
    });
  }
};

/**
 * Resolve a conflict
 */
exports.resolveConflict = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conflictId } = req.params;
    const { resolution, resolvedData } = req.body;

    const result = await syncService.resolveConflict(conflictId, resolution, resolvedData);

    res.json(result);
  } catch (error) {
    console.error('Resolve conflict error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve conflict',
      message: error.message,
    });
  }
};

/**
 * Update device connection status
 */
exports.updateConnectionStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { isOnline, quality } = req.body;
    const userId = req.user.id;

    const result = await syncService.updateConnectionStatus(userId, deviceId, isOnline, quality);

    res.json(result);
  } catch (error) {
    console.error('Update connection status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update connection status',
      message: error.message,
    });
  }
};

/**
 * Batch sync operations
 */
exports.batchSync = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { operations } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Operations must be an array',
      });
    }

    const results = [];

    for (const operation of operations) {
      try {
        const { type, data } = operation;

        let result;
        switch (type) {
          case 'queue_change':
            result = await syncService.queueChange(
              userId,
              deviceId,
              data.dataType,
              data.recordId,
              data.operation,
              data.changeData,
              data.originalData
            );
            break;

          case 'update_status':
            result = await syncService.updateConnectionStatus(
              userId,
              deviceId,
              data.isOnline,
              data.quality
            );
            break;

          default:
            result = {
              success: false,
              error: `Unknown operation type: ${type}`,
            };
        }

        results.push({
          operation,
          result,
        });
      } catch (error) {
        results.push({
          operation,
          result: {
            success: false,
            error: error.message,
          },
        });
      }
    }

    res.json({
      success: true,
      results,
      processed: results.length,
      successful: results.filter(r => r.result.success).length,
      failed: results.filter(r => !r.result.success).length,
    });
  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch sync',
      message: error.message,
    });
  }
};

/**
 * Force full sync (emergency function)
 */
exports.forceFullSync = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { dataTypes } = req.body;
    const userId = req.user.id;

    const results = {};

    // Get all data for specified types
    const typesToSync = dataTypes || ['appointments', 'patients', 'clinicalNotes'];

    for (const dataType of typesToSync) {
      try {
        const syncResult = await syncService.getIncrementalSync(
          userId,
          deviceId,
          dataType,
          new Date(0).toISOString() // Start from beginning
        );
        results[dataType] = syncResult;
      } catch (error) {
        results[dataType] = {
          success: false,
          error: error.message,
        };
      }
    }

    res.json({
      success: true,
      message: 'Full sync initiated',
      results,
    });
  } catch (error) {
    console.error('Force full sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force full sync',
      message: error.message,
    });
  }
};

/**
 * Get sync statistics
 */
exports.getSyncStats = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // This would typically aggregate data from sync models
    // For now, return basic stats
    const stats = {
      device: deviceId,
      user: userId,
      totalSyncs: 0,
      pendingChanges: 0,
      conflicts: 0,
      lastSync: new Date(),
      // Add more stats as needed
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get sync stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync stats',
      message: error.message,
    });
  }
};