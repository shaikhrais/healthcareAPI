/**
 * Project Profile Controller
 * Handles project studies, analytics, and profile management
 */

const ProjectProfile = require('../models/ProjectProfile');
const ProjectModule = require('../models/ProjectModule');
const fs = require('fs').promises;
const path = require('path');

/**
 * Create or update project profile
 */
const createOrUpdateProfile = async (req, res) => {
  try {
    const profileData = req.body;

    // Check if profile exists
    let profile = await ProjectProfile.findOne({ projectName: profileData.projectName });

    if (profile) {
      // Update existing profile
      Object.assign(profile, profileData);
      profile.updatedAt = new Date();
    } else {
      // Create new profile
      profile = new ProjectProfile(profileData);
    }

    const savedProfile = await profile.save();

    res.json({
      success: true,
      message: profile.isNew ? 'Project profile created successfully' : 'Project profile updated successfully',
      data: savedProfile
    });
  } catch (error) {
    console.error('Create/Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save project profile',
      error: error.message
    });
  }
};

/**
 * Get project profile
 */
const getProfile = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const profile = await ProjectProfile.findOne({ 
      $or: [
        { projectId },
        { projectName: projectId }
      ]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project profile',
      error: error.message
    });
  }
};

/**
 * Get all project profiles
 */
const getAllProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = {};
    if (status) filter['basicInfo.status'] = status;

    const skip = (page - 1) * limit;
    const profiles = await ProjectProfile.find(filter)
      .select('projectName projectId basicInfo studies.codeAnalysis.totalLines moduleRegistry.totalModules createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ProjectProfile.countDocuments(filter);

    res.json({
      success: true,
      data: profiles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all profiles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project profiles',
      error: error.message
    });
  }
};

/**
 * Run code analysis
 */
const runCodeAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { projectPath = process.cwd() } = req.body;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    console.log('Running code analysis...');

    // Perform code analysis
    const analysisResults = await performCodeAnalysis(projectPath);

    // Update profile with analysis results
    await profile.updateCodeAnalysis(analysisResults);

    res.json({
      success: true,
      message: 'Code analysis completed successfully',
      data: analysisResults
    });
  } catch (error) {
    console.error('Code analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run code analysis',
      error: error.message
    });
  }
};

/**
 * Run performance study
 */
const runPerformanceStudy = async (req, res) => {
  try {
    const { projectId } = req.params;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    console.log('Running performance study...');

    // Gather performance metrics from modules
    const performanceMetrics = await gatherPerformanceMetrics();

    // Update profile with performance study results
    await profile.updatePerformanceMetrics(performanceMetrics);

    res.json({
      success: true,
      message: 'Performance study completed successfully',
      data: performanceMetrics
    });
  } catch (error) {
    console.error('Performance study error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run performance study',
      error: error.message
    });
  }
};

/**
 * Run security assessment
 */
const runSecurityAssessment = async (req, res) => {
  try {
    const { projectId } = req.params;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    console.log('Running security assessment...');

    // Perform security assessment
    const securityResults = await performSecurityAssessment();

    // Update profile
    profile.studies.securityStudy = { ...profile.studies.securityStudy, ...securityResults };
    await profile.save();

    res.json({
      success: true,
      message: 'Security assessment completed successfully',
      data: securityResults
    });
  } catch (error) {
    console.error('Security assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run security assessment',
      error: error.message
    });
  }
};

/**
 * Generate comprehensive project report
 */
const generateProjectReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { reportType = 'comprehensive', includeCharts = false } = req.query;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    const report = {
      reportId: `report_${Date.now()}`,
      generatedAt: new Date(),
      projectInfo: {
        name: profile.projectName,
        id: profile.projectId,
        status: profile.basicInfo.status,
        version: profile.basicInfo.version
      },
      executiveSummary: generateExecutiveSummary(profile),
      codeAnalysis: profile.studies.codeAnalysis,
      performanceStudy: profile.studies.performanceStudy,
      securityStudy: profile.studies.securityStudy,
      usabilityStudy: profile.studies.usabilityStudy,
      businessImpact: profile.studies.businessImpact,
      recommendations: generateRecommendations(profile),
      healthScore: profile.calculateHealthScore()
    };

    if (reportType === 'comprehensive') {
      // Add detailed module breakdown
      const modules = await ProjectModule.find({ status: 'Active' })
        .select('moduleName moduleType performance endpoints components analytics');
      
      report.moduleBreakdown = modules;
      report.technicalDetails = {
        technologyStack: profile.technologyStack,
        deployment: profile.deployment,
        qualityMetrics: profile.qualityMetrics
      };
    }

    // Save report to profile
    await profile.addReport({
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Project Report`,
      type: 'Technical',
      summary: report.executiveSummary,
      recommendations: report.recommendations
    });

    res.json({
      success: true,
      message: 'Project report generated successfully',
      data: report
    });
  } catch (error) {
    console.error('Generate project report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate project report',
      error: error.message
    });
  }
};

/**
 * Get project health score
 */
const getProjectHealth = async (req, res) => {
  try {
    const { projectId } = req.params;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    const healthScore = profile.calculateHealthScore();
    
    // Get additional health metrics
    const moduleHealth = await ProjectModule.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: null,
          avgPerformance: { $avg: '$performance.avgResponseTime' },
          totalVulnerabilities: { $sum: { $size: '$security.vulnerabilities' } },
          avgUptime: { $avg: '$performance.uptime' },
          totalErrors: { $sum: '$performance.errorRate' }
        }
      }
    ]);

    const healthData = {
      overallScore: healthScore,
      breakdown: {
        codeQuality: profile.studies.codeAnalysis?.codeQuality?.maintainabilityIndex || 0,
        performance: Math.max(0, 100 - (profile.studies.performanceStudy?.apiPerformance?.avgResponseTime || 0) / 10),
        security: profile.studies.securityStudy?.complianceScore || 0,
        testCoverage: profile.studies.codeAnalysis?.codeQuality?.testCoverage || 0
      },
      moduleMetrics: moduleHealth[0] || {},
      recommendations: generateHealthRecommendations(healthScore, profile),
      lastAssessment: profile.lastAnalysis,
      nextAssessment: profile.nextScheduledAnalysis
    };

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Get project health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project health',
      error: error.message
    });
  }
};

/**
 * Update business metrics
 */
const updateBusinessMetrics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { metrics } = req.body;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    // Add business metrics
    if (!profile.studies.businessImpact.businessMetrics) {
      profile.studies.businessImpact.businessMetrics = [];
    }

    metrics.forEach(metric => {
      profile.studies.businessImpact.businessMetrics.push({
        ...metric,
        date: new Date()
      });
    });

    await profile.save();

    res.json({
      success: true,
      message: 'Business metrics updated successfully',
      data: profile.studies.businessImpact
    });
  } catch (error) {
    console.error('Update business metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update business metrics',
      error: error.message
    });
  }
};

/**
 * Schedule automated analysis
 */
const scheduleAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { analysisType, schedule } = req.body;

    const profile = await ProjectProfile.findOne({ projectId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Project profile not found'
      });
    }

    // Calculate next analysis date based on schedule
    const nextAnalysis = new Date();
    switch (schedule) {
      case 'daily':
        nextAnalysis.setDate(nextAnalysis.getDate() + 1);
        break;
      case 'weekly':
        nextAnalysis.setDate(nextAnalysis.getDate() + 7);
        break;
      case 'monthly':
        nextAnalysis.setMonth(nextAnalysis.getMonth() + 1);
        break;
      default:
        nextAnalysis.setDate(nextAnalysis.getDate() + 7); // Default weekly
    }

    profile.nextScheduledAnalysis = nextAnalysis;
    await profile.save();

    res.json({
      success: true,
      message: 'Analysis scheduled successfully',
      data: {
        analysisType,
        schedule,
        nextAnalysis
      }
    });
  } catch (error) {
    console.error('Schedule analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule analysis',
      error: error.message
    });
  }
};

// Helper functions
async function performCodeAnalysis(projectPath) {
  try {
    console.log(`Analyzing code in ${projectPath}...`);
    
    const results = {
      totalLines: 0,
      totalFiles: 0,
      codeQuality: {
        maintainabilityIndex: 0,
        cyclomaticComplexity: 0,
        duplicateCodePercentage: 0,
        testCoverage: 0
      },
      languageBreakdown: [],
      fileTypeBreakdown: []
    };

    // Scan all files
    const fileStats = await scanProjectFiles(projectPath);
    results.totalFiles = fileStats.totalFiles;
    results.totalLines = fileStats.totalLines;
    results.languageBreakdown = fileStats.languageBreakdown;
    results.fileTypeBreakdown = fileStats.fileTypeBreakdown;

    // Calculate code quality metrics (simplified)
    results.codeQuality.maintainabilityIndex = Math.max(0, 100 - (results.totalLines / 1000));
    results.codeQuality.cyclomaticComplexity = Math.min(10, results.totalLines / 500);
    results.codeQuality.duplicateCodePercentage = Math.random() * 5; // Placeholder
    results.codeQuality.testCoverage = await calculateTestCoverage(projectPath);

    return results;
  } catch (error) {
    console.error('Code analysis error:', error);
    throw error;
  }
}

async function scanProjectFiles(projectPath) {
  const stats = {
    totalFiles: 0,
    totalLines: 0,
    languageBreakdown: {},
    fileTypeBreakdown: {}
  };

  async function scanDir(dirPath) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const fullPath = path.join(dirPath, item);
        const itemStats = await fs.stat(fullPath);
        
        if (itemStats.isDirectory()) {
          await scanDir(fullPath);
        } else if (itemStats.isFile()) {
          stats.totalFiles++;
          
          const ext = path.extname(item);
          const language = getLanguageFromExtension(ext);
          
          // Count lines
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n').length;
            stats.totalLines += lines;
            
            // Update language breakdown
            if (!stats.languageBreakdown[language]) {
              stats.languageBreakdown[language] = { lines: 0, files: 0 };
            }
            stats.languageBreakdown[language].lines += lines;
            stats.languageBreakdown[language].files += 1;
            
            // Update file type breakdown
            if (!stats.fileTypeBreakdown[ext]) {
              stats.fileTypeBreakdown[ext] = { count: 0, totalSize: 0 };
            }
            stats.fileTypeBreakdown[ext].count += 1;
            stats.fileTypeBreakdown[ext].totalSize += itemStats.size;
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  await scanDir(projectPath);

  // Convert to array format
  stats.languageBreakdown = Object.entries(stats.languageBreakdown).map(([language, data]) => ({
    language,
    lines: data.lines,
    files: data.files,
    percentage: Math.round((data.lines / stats.totalLines) * 100)
  }));

  stats.fileTypeBreakdown = Object.entries(stats.fileTypeBreakdown).map(([type, data]) => ({
    type,
    count: data.count,
    totalSize: data.totalSize
  }));

  return stats;
}

function getLanguageFromExtension(ext) {
  const langMap = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'React JSX',
    '.tsx': 'React TSX',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.css': 'CSS',
    '.html': 'HTML',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C'
  };
  return langMap[ext] || 'Other';
}

async function calculateTestCoverage(projectPath) {
  try {
    // Look for test files and estimate coverage
    const testFiles = [];
    await findTestFiles(projectPath, testFiles);
    
    // Simple heuristic: assume 1% coverage per test file
    return Math.min(100, testFiles.length * 5);
  } catch (error) {
    return 0;
  }
}

async function findTestFiles(dirPath, testFiles) {
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;
      
      const fullPath = path.join(dirPath, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await findTestFiles(fullPath, testFiles);
      } else if (stats.isFile() && /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(item)) {
        testFiles.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
}

async function gatherPerformanceMetrics() {
  const modules = await ProjectModule.find({ status: 'Active' })
    .select('performance analytics endpoints');

  const metrics = {
    apiPerformance: {
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      throughput: 0,
      errorRate: 0
    },
    databasePerformance: {
      avgQueryTime: 50, // Placeholder
      slowQueries: 0,
      connectionPoolUsage: 75,
      cacheHitRate: 85
    },
    systemResources: {
      cpuUsage: Math.random() * 50 + 20,
      memoryUsage: Math.random() * 40 + 30,
      diskUsage: Math.random() * 30 + 10,
      networkUsage: Math.random() * 60 + 20
    }
  };

  // Calculate API performance from modules
  let totalResponseTime = 0;
  let moduleCount = 0;
  let maxResponse = 0;
  let minResponse = Infinity;

  modules.forEach(module => {
    if (module.performance && module.performance.avgResponseTime) {
      totalResponseTime += module.performance.avgResponseTime;
      moduleCount++;
      maxResponse = Math.max(maxResponse, module.performance.avgResponseTime);
      minResponse = Math.min(minResponse, module.performance.avgResponseTime);
    }
  });

  if (moduleCount > 0) {
    metrics.apiPerformance.avgResponseTime = totalResponseTime / moduleCount;
    metrics.apiPerformance.maxResponseTime = maxResponse;
    metrics.apiPerformance.minResponseTime = minResponse === Infinity ? 0 : minResponse;
  }

  return metrics;
}

async function performSecurityAssessment() {
  const modules = await ProjectModule.find({ status: 'Active' })
    .select('security endpoints');

  const assessment = {
    vulnerabilityAssessment: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      lastScan: new Date()
    },
    complianceScore: 85, // Placeholder HIPAA score
    authenticationMethods: ['JWT', 'Biometric', 'MFA'],
    encryptionStatus: {
      inTransit: true,
      atRest: true,
      algorithm: 'AES-256'
    },
    accessControlMaturity: 4
  };

  // Count vulnerabilities from modules
  modules.forEach(module => {
    if (module.security && module.security.vulnerabilities) {
      module.security.vulnerabilities.forEach(vuln => {
        switch (vuln.severity) {
          case 'Critical':
            assessment.vulnerabilityAssessment.critical++;
            break;
          case 'High':
            assessment.vulnerabilityAssessment.high++;
            break;
          case 'Medium':
            assessment.vulnerabilityAssessment.medium++;
            break;
          case 'Low':
            assessment.vulnerabilityAssessment.low++;
            break;
        }
      });
    }
  });

  return assessment;
}

function generateExecutiveSummary(profile) {
  const healthScore = profile.calculateHealthScore();
  const totalModules = profile.moduleRegistry?.totalModules || 0;
  const totalLines = profile.studies?.codeAnalysis?.totalLines || 0;

  return `Project ${profile.projectName} is a ${profile.basicInfo?.status || 'active'} healthcare application with ${totalModules} modules and ${totalLines} lines of code. The overall health score is ${healthScore}/100, indicating ${healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : 'needs improvement'} project health.`;
}

function generateRecommendations(profile) {
  const recommendations = [];
  const healthScore = profile.calculateHealthScore();

  if (healthScore < 60) {
    recommendations.push('Consider refactoring code to improve maintainability');
    recommendations.push('Increase test coverage to improve quality assurance');
  }

  if (profile.studies?.securityStudy?.vulnerabilityAssessment?.critical > 0) {
    recommendations.push('Address critical security vulnerabilities immediately');
  }

  if (profile.studies?.performanceStudy?.apiPerformance?.avgResponseTime > 1000) {
    recommendations.push('Optimize API response times for better user experience');
  }

  if (profile.studies?.codeAnalysis?.codeQuality?.testCoverage < 70) {
    recommendations.push('Increase test coverage to at least 70%');
  }

  return recommendations;
}

function generateHealthRecommendations(healthScore, profile) {
  const recommendations = [];

  if (healthScore < 70) {
    recommendations.push({
      category: 'Code Quality',
      priority: 'High',
      action: 'Refactor complex modules and improve maintainability index'
    });
  }

  if (profile.studies?.performanceStudy?.apiPerformance?.avgResponseTime > 500) {
    recommendations.push({
      category: 'Performance',
      priority: 'Medium',
      action: 'Optimize slow API endpoints and implement caching'
    });
  }

  if (profile.studies?.securityStudy?.vulnerabilityAssessment?.high > 0) {
    recommendations.push({
      category: 'Security',
      priority: 'High',
      action: 'Fix high-severity security vulnerabilities'
    });
  }

  return recommendations;
}

module.exports = {
  createOrUpdateProfile,
  getProfile,
  getAllProfiles,
  runCodeAnalysis,
  runPerformanceStudy,
  runSecurityAssessment,
  generateProjectReport,
  getProjectHealth,
  updateBusinessMetrics,
  scheduleAnalysis
};