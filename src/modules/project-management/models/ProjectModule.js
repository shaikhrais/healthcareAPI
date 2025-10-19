/**
 * Project Module Model
 * Tracks all modules in the healthcare API project
 */

const mongoose = require('mongoose');

const projectModuleSchema = new mongoose.Schema({
  moduleName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  moduleType: {
    type: String,
    required: true,
    enum: ['API', 'UI', 'Database', 'Service', 'Middleware', 'Utility', 'Authentication', 'Integration'],
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Development', 'Testing', 'Deprecated'],
    default: 'Active',
    index: true
  },
  
  // Technical Details
  technologies: [{
    name: { type: String, required: true },
    version: String,
    purpose: String
  }],
  
  dependencies: [{
    moduleName: String,
    version: String,
    type: { type: String, enum: ['Required', 'Optional', 'Development'] }
  }],
  
  // File Structure
  files: [{
    path: { type: String, required: true },
    type: { type: String, enum: ['Controller', 'Model', 'Route', 'Service', 'Middleware', 'Utility', 'Component', 'Test'] },
    size: Number, // in bytes
    lines: Number,
    lastModified: Date
  }],
  
  // API Endpoints (if applicable)
  endpoints: [{
    path: { type: String, required: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    description: String,
    isPublic: { type: Boolean, default: false },
    responseTime: Number, // in ms
    usageCount: { type: Number, default: 0 }
  }],
  
  // UI Components (if applicable)
  components: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['Page', 'Component', 'Hook', 'Utility'] },
    size: Number, // component size in bytes
    props: [String],
    state: [String],
    dependencies: [String]
  }],
  
  // Database Usage
  databaseUsage: {
    collections: [String],
    queries: [{
      type: String,
      frequency: Number,
      avgExecutionTime: Number
    }],
    indexes: [String],
    dataSize: Number // in bytes
  },
  
  // Performance Metrics
  performance: {
    avgResponseTime: Number,
    errorRate: Number,
    uptime: Number,
    loadTime: Number,
    memoryUsage: Number
  },
  
  // Security
  security: {
    authRequired: { type: Boolean, default: true },
    permissions: [String],
    vulnerabilities: [{
      severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
      description: String,
      status: { type: String, enum: ['Open', 'In Progress', 'Resolved'] },
      discoveredAt: Date
    }]
  },
  
  // Documentation
  documentation: {
    readme: String,
    apiDocs: String,
    examples: [String],
    coverage: Number // percentage
  },
  
  // Testing
  testing: {
    unitTests: Number,
    integrationTests: Number,
    coverage: Number, // percentage
    lastTestRun: Date,
    testResults: {
      passed: Number,
      failed: Number,
      skipped: Number
    }
  },
  
  // Maintainer Information
  maintainer: {
    name: String,
    email: String,
    team: String
  },
  
  // Usage Analytics
  analytics: {
    dailyUsage: [{
      date: Date,
      requests: Number,
      uniqueUsers: Number,
      errors: Number
    }],
    popularEndpoints: [{
      endpoint: String,
      count: Number
    }],
    userFeedback: [{
      rating: Number,
      comment: String,
      date: Date
    }]
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Additional Fields
  tags: [String],
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  estimatedEffort: Number, // in hours
  actualEffort: Number, // in hours
  
}, {
  timestamps: true,
  collection: 'project_modules'
});

// Indexes
projectModuleSchema.index({ moduleName: 1, moduleType: 1 });
projectModuleSchema.index({ status: 1, priority: 1 });
projectModuleSchema.index({ createdAt: -1 });
projectModuleSchema.index({ 'analytics.dailyUsage.date': -1 });

// Pre-save middleware
projectModuleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
projectModuleSchema.methods.updateUsageStats = function(endpoint, responseTime) {
  // Update endpoint usage
  const endpointIndex = this.endpoints.findIndex(ep => ep.path === endpoint);
  if (endpointIndex > -1) {
    this.endpoints[endpointIndex].usageCount += 1;
    this.endpoints[endpointIndex].responseTime = responseTime;
  }
  
  // Update performance metrics
  if (this.performance.avgResponseTime) {
    this.performance.avgResponseTime = (this.performance.avgResponseTime + responseTime) / 2;
  } else {
    this.performance.avgResponseTime = responseTime;
  }
  
  return this.save();
};

projectModuleSchema.methods.addVulnerability = function(vulnerability) {
  this.security.vulnerabilities.push(vulnerability);
  return this.save();
};

projectModuleSchema.methods.updateTestResults = function(results) {
  this.testing.testResults = results;
  this.testing.lastTestRun = new Date();
  return this.save();
};

// Static methods
projectModuleSchema.statics.getModulesByType = function(type) {
  return this.find({ moduleType: type, status: 'Active' });
};

projectModuleSchema.statics.getPerformanceStats = function() {
  return this.aggregate([
    { $match: { status: 'Active' } },
    {
      $group: {
        _id: '$moduleType',
        avgResponseTime: { $avg: '$performance.avgResponseTime' },
        totalEndpoints: { $sum: { $size: '$endpoints' } },
        totalComponents: { $sum: { $size: '$components' } }
      }
    }
  ]);
};

module.exports = mongoose.model('ProjectModule', projectModuleSchema);