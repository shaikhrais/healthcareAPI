/**
 * Health Integration Service
 * Handles integration with Apple Health, Google Fit, and other health platforms
 */

const HealthData = require('../models/HealthData');

class HealthIntegrationService {
  constructor() {
    this.platforms = {
      apple_health: {
        name: 'Apple HealthKit',
        dataTypes: [
          'heart_rate', 'blood_pressure', 'steps', 'distance', 'calories_burned',
          'sleep_duration', 'weight', 'height', 'body_temperature', 'blood_glucose'
        ],
      },
      google_fit: {
        name: 'Google Fit',
        dataTypes: [
          'heart_rate', 'steps', 'distance', 'calories_burned', 'active_minutes',
          'weight', 'height', 'sleep_duration'
        ],
      },
      fitbit: {
        name: 'Fitbit',
        dataTypes: [
          'heart_rate', 'steps', 'distance', 'calories_burned', 'sleep_duration',
          'active_minutes', 'floors_climbed', 'weight'
        ],
      },
    };
  }

  /**
   * Sync health data from external platform
   */
  async syncHealthData(userId, platform, data, options = {}) {
    try {
      const results = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      };

      if (!this.platforms[platform]) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Validate data format
      if (!Array.isArray(data)) {
        data = [data];
      }

      for (const item of data) {
        try {
          const result = await this.processHealthDataItem(userId, platform, item, options);
          
          if (result.action === 'created') {
            results.created += 1;
          } else if (result.action === 'updated') {
            results.updated += 1;
          } else {
            results.skipped += 1;
          }
          
          results.processed += 1;
        } catch (error) {
          results.errors.push({
            item,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Sync health data error:', error);
      throw new Error(`Failed to sync health data: ${error.message}`);
    }
  }

  /**
   * Process individual health data item
   */
  async processHealthDataItem(userId, platform, item, options = {}) {
    try {
      // Normalize data format
      const normalizedData = this.normalizeHealthData(platform, item);
      
      // Check for existing data
      const existing = await HealthData.findOne({
        user: userId,
        'source.platform': platform,
        'source.sourceId': normalizedData.sourceId,
        dataType: normalizedData.dataType,
        recordedAt: normalizedData.recordedAt,
      });

      if (existing && !options.allowDuplicates) {
        // Update existing record if data is newer
        if (normalizedData.syncedAt > existing.syncedAt) {
          Object.assign(existing, normalizedData);
          await existing.save();
          return { action: 'updated', record: existing };
        } else {
          return { action: 'skipped', record: existing };
        }
      }

      // Create new health data record
      const healthData = new HealthData({
        user: userId,
        ...normalizedData,
      });

      await healthData.save();

      // Check for duplicates after saving
      if (options.checkDuplicates) {
        await healthData.checkForDuplicates();
      }

      return { action: 'created', record: healthData };
    } catch (error) {
      console.error('Process health data item error:', error);
      throw error;
    }
  }

  /**
   * Normalize health data from different platforms
   */
  normalizeHealthData(platform, rawData) {
    switch (platform) {
      case 'apple_health':
        return this.normalizeAppleHealthData(rawData);
      case 'google_fit':
        return this.normalizeGoogleFitData(rawData);
      case 'fitbit':
        return this.normalizeFitbitData(rawData);
      default:
        throw new Error(`No normalizer for platform: ${platform}`);
    }
  }

  /**
   * Normalize Apple HealthKit data
   */
  normalizeAppleHealthData(data) {
    const typeMapping = {
      'HKQuantityTypeIdentifierHeartRate': 'heart_rate',
      'HKQuantityTypeIdentifierStepCount': 'steps',
      'HKQuantityTypeIdentifierDistanceWalkingRunning': 'distance',
      'HKQuantityTypeIdentifierActiveEnergyBurned': 'calories_burned',
      'HKQuantityTypeIdentifierBodyMass': 'weight',
      'HKQuantityTypeIdentifierHeight': 'height',
      'HKQuantityTypeIdentifierBodyTemperature': 'body_temperature',
      'HKQuantityTypeIdentifierBloodGlucose': 'blood_glucose',
      'HKCategoryTypeIdentifierSleepAnalysis': 'sleep_duration',
    };

    const unitMapping = {
      'count/min': 'bpm',
      'count': 'steps',
      'm': 'meters',
      'kcal': 'calories',
      'kg': 'kg',
      'cm': 'cm',
      'degC': 'celsius',
      'mg/dL': 'mg/dl',
    };

    return {
      source: {
        platform: 'apple_health',
        appName: data.sourceName || 'Apple Health',
        deviceModel: data.device || 'iPhone',
        version: data.sourceVersion,
        sourceId: data.UUID || data.id,
      },
      dataType: typeMapping[data.type] || data.type,
      value: {
        numeric: parseFloat(data.value),
      },
      unit: unitMapping[data.unit] || data.unit,
      recordedAt: new Date(data.startDate || data.date),
      syncedAt: new Date(),
      metadata: {
        duration: data.endDate ? new Date(data.endDate) - new Date(data.startDate) : undefined,
      },
    };
  }

  /**
   * Normalize Google Fit data
   */
  normalizeGoogleFitData(data) {
    const typeMapping = {
      'com.google.heart_rate.bpm': 'heart_rate',
      'com.google.step_count.delta': 'steps',
      'com.google.distance.delta': 'distance',
      'com.google.calories.expended': 'calories_burned',
      'com.google.weight': 'weight',
      'com.google.height': 'height',
      'com.google.sleep.segment': 'sleep_duration',
    };

    return {
      source: {
        platform: 'google_fit',
        appName: data.originDataSourceId?.split(':')[0] || 'Google Fit',
        version: data.version,
        sourceId: data.dataStreamId || data.id,
      },
      dataType: typeMapping[data.dataTypeName] || data.dataTypeName,
      value: {
        numeric: data.value?.[0]?.fpVal || data.value?.[0]?.intVal,
      },
      unit: this.mapGoogleFitUnit(data.dataTypeName),
      recordedAt: new Date(data.startTimeNanos / 1000000),
      syncedAt: new Date(),
      metadata: {
        duration: data.endTimeNanos ? (data.endTimeNanos - data.startTimeNanos) / 1000000 : undefined,
      },
    };
  }

  /**
   * Normalize Fitbit data
   */
  normalizeFitbitData(data) {
    const typeMapping = {
      'heart_rate': 'heart_rate',
      'steps': 'steps',
      'distance': 'distance',
      'calories': 'calories_burned',
      'weight': 'weight',
      'sleep': 'sleep_duration',
      'floors': 'floors_climbed',
    };

    return {
      source: {
        platform: 'fitbit',
        appName: 'Fitbit',
        deviceModel: data.device || 'Fitbit Device',
        sourceId: data.logId || data.id,
      },
      dataType: typeMapping[data.type] || data.type,
      value: {
        numeric: parseFloat(data.value),
      },
      unit: this.mapFitbitUnit(data.type),
      recordedAt: new Date(data.dateTime || data.date),
      syncedAt: new Date(),
    };
  }

  /**
   * Get user's health data summary
   */
  async getHealthSummary(userId, options = {}) {
    try {
      const { days = 30, categories } = options;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const query = {
        user: userId,
        recordedAt: { $gte: startDate },
        status: { $ne: 'ignored' },
      };

      if (categories) {
        query.category = { $in: categories };
      }

      const summary = await HealthData.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              category: '$category',
              dataType: '$dataType',
            },
            count: { $sum: 1 },
            latestValue: { $last: '$value.numeric' },
            avgValue: { $avg: '$value.numeric' },
            minValue: { $min: '$value.numeric' },
            maxValue: { $max: '$value.numeric' },
            latestDate: { $max: '$recordedAt' },
            unit: { $last: '$unit' },
            sources: { $addToSet: '$source.platform' },
          },
        },
        {
          $group: {
            _id: '$_id.category',
            dataTypes: {
              $push: {
                type: '$_id.dataType',
                count: '$count',
                latest: '$latestValue',
                average: '$avgValue',
                min: '$minValue',
                max: '$maxValue',
                lastUpdated: '$latestDate',
                unit: '$unit',
                sources: '$sources',
              },
            },
          },
        },
      ]);

      return {
        success: true,
        period: `${days} days`,
        summary,
      };
    } catch (error) {
      console.error('Get health summary error:', error);
      throw new Error(`Failed to get health summary: ${error.message}`);
    }
  }

  /**
   * Get health trends and insights
   */
  async getHealthTrends(userId, dataType, days = 30) {
    try {
      const data = await HealthData.getInDateRange(
        userId,
        new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        new Date(),
        { dataType }
      );

      if (data.length === 0) {
        return {
          success: true,
          dataType,
          message: 'No data available for this period',
          trend: null,
        };
      }

      // Calculate basic statistics
      const values = data.map(d => d.value.numeric).filter(v => v !== undefined);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate trend (simple linear regression)
      const trend = this.calculateTrend(data);

      return {
        success: true,
        dataType,
        period: `${days} days`,
        statistics: {
          count: values.length,
          average: avg,
          minimum: min,
          maximum: max,
          latest: values[0],
          unit: data[0].unit,
        },
        trend,
        insights: this.generateInsights(dataType, { avg, min, max, trend }),
      };
    } catch (error) {
      console.error('Get health trends error:', error);
      throw new Error(`Failed to get health trends: ${error.message}`);
    }
  }

  /**
   * Calculate simple trend using linear regression
   */
  calculateTrend(data) {
    if (data.length < 2) return null;

    const points = data.map((item, index) => ({
      x: index,
      y: item.value.numeric,
    })).filter(point => point.y !== undefined);

    if (points.length < 2) return null;

    const n = points.length;
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    const sumXY = points.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = points.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      slope,
      intercept,
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.abs(slope),
    };
  }

  /**
   * Generate health insights
   */
  generateInsights(dataType, stats) {
    const insights = [];

    switch (dataType) {
      case 'steps':
        if (stats.avg < 5000) {
          insights.push('Consider increasing daily activity - aim for at least 10,000 steps per day');
        } else if (stats.avg > 10000) {
          insights.push('Great job maintaining an active lifestyle!');
        }
        break;

      case 'heart_rate':
        if (stats.trend?.direction === 'increasing') {
          insights.push('Heart rate showing upward trend - consider discussing with healthcare provider');
        }
        break;

      case 'weight':
        if (stats.trend?.direction === 'increasing' && stats.trend.strength > 0.1) {
          insights.push('Weight trending upward - consider reviewing diet and exercise');
        } else if (stats.trend?.direction === 'decreasing' && stats.trend.strength > 0.1) {
          insights.push('Weight trending downward - great progress if this is your goal');
        }
        break;

      case 'sleep_duration':
        if (stats.avg < 7) {
          insights.push('Average sleep duration below recommended 7-9 hours');
        } else if (stats.avg > 9) {
          insights.push('Getting plenty of sleep - maintain this healthy habit');
        }
        break;
    }

    return insights;
  }

  /**
   * Map Google Fit units
   */
  mapGoogleFitUnit(dataTypeName) {
    const unitMap = {
      'com.google.heart_rate.bpm': 'bpm',
      'com.google.step_count.delta': 'steps',
      'com.google.distance.delta': 'meters',
      'com.google.calories.expended': 'calories',
      'com.google.weight': 'kg',
      'com.google.height': 'meters',
    };
    return unitMap[dataTypeName] || '';
  }

  /**
   * Map Fitbit units
   */
  mapFitbitUnit(dataType) {
    const unitMap = {
      heart_rate: 'bpm',
      steps: 'steps',
      distance: 'km',
      calories: 'calories',
      weight: 'kg',
      floors: 'floors',
      sleep: 'minutes',
    };
    return unitMap[dataType] || '';
  }

  /**
   * Get supported platforms and their capabilities
   */
  getSupportedPlatforms() {
    return {
      success: true,
      platforms: this.platforms,
    };
  }

  /**
   * Validate health data before processing
   */
  validateHealthData(data) {
    const errors = [];

    if (!data.dataType) {
      errors.push('dataType is required');
    }

    if (!data.value || (data.value.numeric === undefined && !data.value.text && data.value.boolean === undefined)) {
      errors.push('value is required');
    }

    if (!data.recordedAt) {
      errors.push('recordedAt timestamp is required');
    }

    if (!data.source || !data.source.platform) {
      errors.push('source platform is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = new HealthIntegrationService();