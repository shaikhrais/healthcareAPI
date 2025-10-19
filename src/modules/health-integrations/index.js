/**
 * Health Integrations Module
 * Apple Health, Google Fit, and other health platform integrations
 * 
 * Features:
 * - Multi-platform health data synchronization
 * - Automatic duplicate detection and conflict resolution
 * - Health trends and insights generation
 * - Data validation and quality checks
 * - Goal setting and progress tracking
 * - Export functionality for health data
 */

const express = require('express');
const mongoose = require('mongoose');

// Import module components
const healthIntegrationsRoutes = require('./routes/healthIntegrationsRoutes');
const HealthData = require('./models/HealthData');
const healthIntegrationService = require('./services/healthIntegrationService');

/**
 * Initialize health integrations module
 */
const initializeHealthIntegrations = async () => {
  try {
    console.log('Initializing Health Integrations module...');
    
    // Ensure database indexes are created
    await HealthData.createIndexes();
    
    // Initialize background services
    await healthIntegrationService.initialize();
    
    console.log('Health Integrations module initialized successfully');
    
    return {
      routes: healthIntegrationsRoutes,
      models: { HealthData },
      services: { healthIntegrationService },
    };
  } catch (error) {
    console.error('Failed to initialize Health Integrations module:', error);
    throw error;
  }
};

/**
 * Health Integrations module configuration
 */
const healthIntegrationsConfig = {
  // Supported platforms
  supportedPlatforms: ['apple_health', 'google_fit', 'fitbit', 'manual'],
  
  // Supported data categories
  supportedCategories: [
    'vitals',
    'activity',
    'sleep',
    'nutrition',
    'body_measurements',
    'clinical'
  ],
  
  // Data quality thresholds
  qualityThresholds: {
    heart_rate: { min: 30, max: 220 },
    blood_pressure_systolic: { min: 70, max: 250 },
    blood_pressure_diastolic: { min: 40, max: 150 },
    weight: { min: 20, max: 300 }, // kg
    steps: { min: 0, max: 100000 },
    sleep_duration: { min: 0, max: 24 }, // hours
    blood_glucose: { min: 2, max: 30 }, // mmol/L
  },
  
  // Sync settings
  syncSettings: {
    batchSize: 100,
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    duplicateWindow: 300000, // 5 minutes
  },
  
  // Rate limiting
  rateLimits: {
    sync: 100, // per hour
    create: 200, // per hour
    batch: 10, // per hour
    export: 5, // per hour
  },
};

/**
 * Get module health status
 */
const getModuleStatus = async () => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check service status
    const serviceStatus = await healthIntegrationService.getStatus();
    
    // Get recent activity stats
    const recentSyncs = await HealthData.countDocuments({
      syncedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24 hours
    });
    
    return {
      status: 'healthy',
      database: dbStatus,
      service: serviceStatus,
      recentSyncs,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      lastCheck: new Date().toISOString(),
    };
  }
};

/**
 * Cleanup function for module shutdown
 */
const cleanup = async () => {
  try {
    console.log('Cleaning up Health Integrations module...');
    
    // Clean up any background processes
    await healthIntegrationService.cleanup();
    
    console.log('Health Integrations module cleanup completed');
  } catch (error) {
    console.error('Error during Health Integrations module cleanup:', error);
  }
};

module.exports = {
  initialize: initializeHealthIntegrations,
  routes: healthIntegrationsRoutes,
  models: { HealthData },
  services: { healthIntegrationService },
  config: healthIntegrationsConfig,
  getStatus: getModuleStatus,
  cleanup,
};