/**
 * Project Profile Model
 * Tracks project studies, analytics, and overall project health
 */

const mongoose = require('mongoose');

const projectProfileSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  projectId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },
  
  // Basic Information
  basicInfo: {
    description: String,
    version: { type: String, default: '1.0.0' },
    startDate: Date,
    expectedEndDate: Date,
    actualEndDate: Date,
    status: {
      type: String,
      enum: ['Planning', 'Development', 'Testing', 'Deployment', 'Production', 'Maintenance', 'Archived'],
      default: 'Development'
    },
    environment: {
      type: String,
      enum: ['Development', 'Staging', 'Production'],
      default: 'Development'
    }
  },
  
  // Project Studies and Analytics
  studies: {
    codeAnalysis: {
      totalLines: Number,
      totalFiles: Number,
      codeQuality: {
        maintainabilityIndex: Number, // 0-100
        cyclomaticComplexity: Number,
        duplicateCodePercentage: Number,
        testCoverage: Number
      },
      languageBreakdown: [{
        language: String,
        lines: Number,
        files: Number,
        percentage: Number
      }],
      fileTypeBreakdown: [{
        type: String,
        count: Number,
        totalSize: Number
      }]
    },
    
    performanceStudy: {
      apiPerformance: {
        avgResponseTime: Number,
        maxResponseTime: Number,
        minResponseTime: Number,
        throughput: Number, // requests per second
        errorRate: Number
      },
      databasePerformance: {
        avgQueryTime: Number,
        slowQueries: Number,
        connectionPoolUsage: Number,
        cacheHitRate: Number
      },
      systemResources: {
        cpuUsage: Number,
        memoryUsage: Number,
        diskUsage: Number,
        networkUsage: Number
      }
    },
    
    securityStudy: {
      vulnerabilityAssessment: {
        critical: Number,
        high: Number,
        medium: Number,
        low: Number,
        lastScan: Date
      },
      complianceScore: Number, // 0-100 for HIPAA compliance
      authenticationMethods: [String],
      encryptionStatus: {
        inTransit: Boolean,
        atRest: Boolean,
        algorithm: String
      },
      accessControlMaturity: Number // 0-5 scale
    },
    
    usabilityStudy: {
      userExperience: {
        averageLoadTime: Number,
        bounceRate: Number,
        userSatisfactionScore: Number,
        accessibility: {
          score: Number,
          issues: [String]
        }
      },
      componentUsage: [{
        componentName: String,
        usageFrequency: Number,
        userFeedback: Number
      }],
      navigationPatterns: [{
        path: String,
        frequency: Number,
        avgTimeSpent: Number
      }]
    },
    
    businessImpact: {
      roi: Number, // Return on Investment
      costSavings: Number,
      productivityGains: Number,
      userAdoption: {
        totalUsers: Number,
        activeUsers: Number,
        retentionRate: Number
      },
      businessMetrics: [{
        metric: String,
        value: Number,
        unit: String,
        date: Date
      }]
    }
  },
  
  // Module Registry
  moduleRegistry: {
    totalModules: Number,
    moduleBreakdown: [{
      type: String,
      count: Number,
      status: String
    }],
    dependencies: {
      internal: [String],
      external: [{
        name: String,
        version: String,
        type: String,
        size: Number
      }]
    },
    apiEndpoints: {
      total: Number,
      byMethod: [{
        method: String,
        count: Number
      }],
      byModule: [{
        module: String,
        count: Number
      }]
    }
  },
  
  // Technology Stack
  technologyStack: {
    frontend: [{
      technology: String,
      version: String,
      purpose: String,
      size: Number
    }],
    backend: [{
      technology: String,
      version: String,
      purpose: String,
      size: Number
    }],
    database: [{
      technology: String,
      version: String,
      purpose: String,
      size: Number
    }],
    infrastructure: [{
      technology: String,
      version: String,
      purpose: String,
      cost: Number
    }]
  },
  
  // Team and Resources
  team: {
    totalMembers: Number,
    roles: [{
      role: String,
      count: Number,
      avgExperience: Number
    }],
    workload: [{
      memberId: String,
      name: String,
      allocation: Number, // percentage
      expertise: [String]
    }],
    productivity: {
      avgCommitsPerDay: Number,
      avgLinesPerCommit: Number,
      bugFixTime: Number, // in hours
      featureDeliveryTime: Number // in hours
    }
  },
  
  // Quality Metrics
  qualityMetrics: {
    bugDensity: Number, // bugs per KLOC
    defectRemovalEfficiency: Number,
    testEffectiveness: Number,
    codeReviewCoverage: Number,
    documentationCoverage: Number,
    maintenanceIndex: Number
  },
  
  // Risk Assessment
  riskAssessment: {
    technicalRisks: [{
      risk: String,
      probability: Number, // 1-5
      impact: Number, // 1-5
      mitigation: String,
      status: String
    }],
    businessRisks: [{
      risk: String,
      probability: Number,
      impact: Number,
      mitigation: String,
      status: String
    }],
    overallRiskScore: Number // 1-25
  },
  
  // Deployment Information
  deployment: {
    environments: [{
      name: String,
      url: String,
      status: String,
      lastDeployment: Date,
      deploymentFrequency: Number
    }],
    cicdPipeline: {
      buildTime: Number,
      testTime: Number,
      deploymentTime: Number,
      successRate: Number
    },
    monitoring: {
      uptime: Number,
      alertsCount: Number,
      incidentsCount: Number,
      mttr: Number // Mean Time To Recovery
    }
  },
  
  // Historical Data
  history: [{
    date: Date,
    event: String,
    description: String,
    impact: String,
    author: String
  }],
  
  // Reports and Studies
  reports: [{
    title: String,
    type: { type: String, enum: ['Performance', 'Security', 'Quality', 'Business', 'Technical'] },
    generatedAt: Date,
    summary: String,
    filePath: String,
    recommendations: [String]
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAnalysis: Date,
  nextScheduledAnalysis: Date
  
}, {
  timestamps: true,
  collection: 'project_profiles'
});

// Indexes
projectProfileSchema.index({ projectName: 1 });
projectProfileSchema.index({ projectId: 1 });
projectProfileSchema.index({ 'basicInfo.status': 1 });
projectProfileSchema.index({ createdAt: -1 });
projectProfileSchema.index({ lastAnalysis: -1 });

// Pre-save middleware
projectProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
projectProfileSchema.methods.updateCodeAnalysis = function(analysis) {
  this.studies.codeAnalysis = { ...this.studies.codeAnalysis, ...analysis };
  this.lastAnalysis = new Date();
  return this.save();
};

projectProfileSchema.methods.addReport = function(report) {
  this.reports.push({
    ...report,
    generatedAt: new Date()
  });
  return this.save();
};

projectProfileSchema.methods.updatePerformanceMetrics = function(metrics) {
  this.studies.performanceStudy = { ...this.studies.performanceStudy, ...metrics };
  return this.save();
};

projectProfileSchema.methods.calculateHealthScore = function() {
  const codeQuality = this.studies.codeAnalysis?.codeQuality?.maintainabilityIndex || 0;
  const testCoverage = this.studies.codeAnalysis?.codeQuality?.testCoverage || 0;
  const performance = Math.max(0, 100 - (this.studies.performanceStudy?.apiPerformance?.avgResponseTime || 0) / 10);
  const security = this.studies.securityStudy?.complianceScore || 0;
  
  return Math.round((codeQuality + testCoverage + performance + security) / 4);
};

// Static methods
projectProfileSchema.statics.getProjectSummary = function(projectId) {
  return this.findOne({ projectId }).select('basicInfo studies.codeAnalysis.totalLines studies.codeAnalysis.totalFiles moduleRegistry.totalModules');
};

projectProfileSchema.statics.generatePerformanceReport = function(projectId) {
  return this.aggregate([
    { $match: { projectId } },
    {
      $project: {
        projectName: 1,
        performance: '$studies.performanceStudy',
        qualityMetrics: 1,
        lastAnalysis: 1
      }
    }
  ]);
};

module.exports = mongoose.model('ProjectProfile', projectProfileSchema);