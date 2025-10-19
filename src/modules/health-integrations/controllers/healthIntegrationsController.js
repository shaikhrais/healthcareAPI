/**
 * Health Integrations Controller
 * Handles HTTP requests for health data integration
 */

const healthIntegrationService = require('../services/healthIntegrationService');
const HealthData = require('../models/HealthData');
const { validationResult } = require('express-validator');

/**
 * Sync health data from external platform
 */
exports.syncHealthData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { platform, data, options = {} } = req.body;
    const userId = req.user.id;

    const result = await healthIntegrationService.syncHealthData(userId, platform, data, options);

    res.json({
      success: true,
      message: 'Health data synchronized successfully',
      result,
    });
  } catch (error) {
    console.error('Sync health data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync health data',
      message: error.message,
    });
  }
};

/**
 * Get user's health data summary
 */
exports.getHealthSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days, categories } = req.query;

    const options = {};
    if (days) options.days = parseInt(days, 10);
    if (categories) options.categories = categories.split(',');

    const summary = await healthIntegrationService.getHealthSummary(userId, options);

    res.json(summary);
  } catch (error) {
    console.error('Get health summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health summary',
      message: error.message,
    });
  }
};

/**
 * Get health trends and insights
 */
exports.getHealthTrends = async (req, res) => {
  try {
    const { dataType } = req.params;
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const trends = await healthIntegrationService.getHealthTrends(
      userId,
      dataType,
      parseInt(days, 10)
    );

    res.json(trends);
  } catch (error) {
    console.error('Get health trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health trends',
      message: error.message,
    });
  }
};

/**
 * Get health data by type
 */
exports.getHealthDataByType = async (req, res) => {
  try {
    const { dataType } = req.params;
    const { limit = 50, startDate, endDate } = req.query;
    const userId = req.user.id;

    let data;
    if (startDate && endDate) {
      data = await HealthData.getInDateRange(userId, startDate, endDate, { dataType });
    } else {
      data = await HealthData.getLatestByType(userId, dataType, parseInt(limit, 10));
    }

    res.json({
      success: true,
      dataType,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Get health data by type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health data',
      message: error.message,
    });
  }
};

/**
 * Create manual health data entry
 */
exports.createHealthData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const healthDataInput = {
      ...req.body,
      user: userId,
      source: {
        platform: 'manual',
        appName: 'Healthcare Portal',
        ...req.body.source,
      },
      syncedAt: new Date(),
    };

    // Validate the data
    const validation = healthIntegrationService.validateHealthData(healthDataInput);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid health data',
        details: validation.errors,
      });
    }

    const healthData = new HealthData(healthDataInput);
    await healthData.save();

    // Check for duplicates
    await healthData.checkForDuplicates();

    res.status(201).json({
      success: true,
      message: 'Health data created successfully',
      data: healthData,
    });
  } catch (error) {
    console.error('Create health data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create health data',
      message: error.message,
    });
  }
};

/**
 * Update health data entry
 */
exports.updateHealthData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const healthData = await HealthData.findOne({ _id: id, user: userId });
    if (!healthData) {
      return res.status(404).json({
        success: false,
        error: 'Health data not found',
      });
    }

    // Only allow updating certain fields
    const allowedUpdates = ['value', 'unit', 'metadata', 'quality'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(healthData, updates);
    await healthData.save();

    res.json({
      success: true,
      message: 'Health data updated successfully',
      data: healthData,
    });
  } catch (error) {
    console.error('Update health data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update health data',
      message: error.message,
    });
  }
};

/**
 * Delete health data entry
 */
exports.deleteHealthData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const healthData = await HealthData.findOneAndDelete({ _id: id, user: userId });
    if (!healthData) {
      return res.status(404).json({
        success: false,
        error: 'Health data not found',
      });
    }

    res.json({
      success: true,
      message: 'Health data deleted successfully',
    });
  } catch (error) {
    console.error('Delete health data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete health data',
      message: error.message,
    });
  }
};

/**
 * Get flagged health data for review
 */
exports.getFlaggedData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, flagType } = req.query;

    const query = {
      user: userId,
      status: 'flagged',
      'flags.resolved': false,
    };

    if (flagType) {
      query['flags.type'] = flagType;
    }

    const flaggedData = await HealthData.find(query)
      .sort({ 'flags.flaggedAt': -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: flaggedData.length,
      data: flaggedData,
    });
  } catch (error) {
    console.error('Get flagged data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get flagged data',
      message: error.message,
    });
  }
};

/**
 * Resolve flagged health data
 */
exports.resolveFlaggedData = async (req, res) => {
  try {
    const { id } = req.params;
    const { flagIndex } = req.body;
    const userId = req.user.id;

    const healthData = await HealthData.findOne({ _id: id, user: userId });
    if (!healthData) {
      return res.status(404).json({
        success: false,
        error: 'Health data not found',
      });
    }

    await healthData.resolveFlag(flagIndex, userId);

    res.json({
      success: true,
      message: 'Flag resolved successfully',
      data: healthData,
    });
  } catch (error) {
    console.error('Resolve flagged data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve flag',
      message: error.message,
    });
  }
};

/**
 * Get health statistics for user
 */
exports.getHealthStats = async (req, res) => {
  try {
    const { dataType } = req.params;
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const stats = await HealthData.getStats(userId, dataType, parseInt(days, 10));

    res.json({
      success: true,
      dataType,
      period: `${days} days`,
      statistics: stats[0] || null,
    });
  } catch (error) {
    console.error('Get health stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health statistics',
      message: error.message,
    });
  }
};

/**
 * Get supported platforms and data types
 */
exports.getSupportedPlatforms = async (req, res) => {
  try {
    const platforms = healthIntegrationService.getSupportedPlatforms();
    res.json(platforms);
  } catch (error) {
    console.error('Get supported platforms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported platforms',
      message: error.message,
    });
  }
};

/**
 * Export user's health data
 */
exports.exportHealthData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', startDate, endDate, dataTypes } = req.query;

    let query = { user: userId };

    if (startDate && endDate) {
      query.recordedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (dataTypes) {
      query.dataType = { $in: dataTypes.split(',') };
    }

    const healthData = await HealthData.find(query).sort({ recordedAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csv = this.convertToCSV(healthData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=health-data.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        count: healthData.length,
        exportedAt: new Date().toISOString(),
        data: healthData,
      });
    }
  } catch (error) {
    console.error('Export health data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export health data',
      message: error.message,
    });
  }
};

/**
 * Convert health data to CSV format
 */
exports.convertToCSV = (data) => {
  if (data.length === 0) return '';

  const headers = [
    'Date',
    'Data Type',
    'Value',
    'Unit',
    'Source Platform',
    'Category',
    'Status',
  ];

  const rows = data.map(item => [
    item.recordedAt.toISOString(),
    item.dataType,
    item.formattedValue,
    item.unit || '',
    item.source.platform,
    item.category,
    item.status,
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

/**
 * Batch import health data
 */
exports.batchImportHealthData = async (req, res) => {
  try {
    const { platform, dataArray } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(dataArray)) {
      return res.status(400).json({
        success: false,
        error: 'dataArray must be an array',
      });
    }

    const result = await healthIntegrationService.syncHealthData(
      userId,
      platform,
      dataArray,
      { checkDuplicates: true }
    );

    res.json({
      success: true,
      message: 'Batch import completed',
      result,
    });
  } catch (error) {
    console.error('Batch import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import health data',
      message: error.message,
    });
  }
};