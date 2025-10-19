/**
 * Project Management Controller
 * Handles registration and management of project modules, components, and analytics
 */

const ProjectModule = require('../models/ProjectModule');
const ProjectProfile = require('../models/ProjectProfile');
const fs = require('fs').promises;
const path = require('path');

/**
 * Register a new project module
 */
const registerModule = async (req, res) => {
  try {
    const moduleData = req.body;
    
    // Validate required fields
    const name = moduleData.name || moduleData.moduleName;
    const type = moduleData.type || moduleData.moduleType;
    const description = moduleData.description;
    
    if (!name || !type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Module name, type, and description are required'
      });
    }

    // Check if module already exists
    const existingModule = await ProjectModule.findOne({ moduleName: name });
    if (existingModule) {
      return res.status(409).json({
        success: false,
        message: 'Module with this name already exists'
      });
    }

    // Prepare module data
    const newModuleData = {
      moduleName: name,
      moduleType: type,
      description: description,
      version: moduleData.version || '1.0.0',
      status: moduleData.status || 'active',
      path: moduleData.path || '',
      size: moduleData.size || { files: 0, lines: 0, bytes: 0 },
      endpoints: moduleData.endpoints || [],
      components: moduleData.components || [],
      dependencies: moduleData.dependencies || [],
      lastModified: moduleData.lastModified || new Date(),
      documentation: moduleData.documentation || '',
      metadata: moduleData.metadata || {}
    };

    // Create new module
    const newModule = new ProjectModule(newModuleData);
    const savedModule = await newModule.save();

    // Update project profile
    await updateProjectModuleCount();

    res.status(201).json({
      success: true,
      message: 'Module registered successfully',
      module: savedModule
    });
  } catch (error) {
    console.error('Register module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register module',
      error: error.message
    });
  }
};

/**
 * Get all modules with filtering
 */
const getModules = async (req, res) => {
  try {
    const { 
      type, 
      status, 
      page = 1, 
      limit = 20, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.moduleType = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { moduleName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const modules = await ProjectModule.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ProjectModule.countDocuments(filter);

    res.json({
      success: true,
      data: modules,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules',
      error: error.message
    });
  }
};

/**
 * Get module by ID
 */
const getModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const module = await ProjectModule.findById(id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    res.json({
      success: true,
      data: module
    });
  } catch (error) {
    console.error('Get module by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module',
      error: error.message
    });
  }
};

/**
 * Update module
 */
const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const module = await ProjectModule.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    res.json({
      success: true,
      message: 'Module updated successfully',
      data: module
    });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update module',
      error: error.message
    });
  }
};

/**
 * Delete module
 */
const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const module = await ProjectModule.findByIdAndDelete(id);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Update project profile
    await updateProjectModuleCount();

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete module',
      error: error.message
    });
  }
};

/**
 * Get project dashboard data
 */
const getProjectDashboard = async (req, res) => {
  try {
    // Get module statistics
    const moduleStats = await ProjectModule.aggregate([
      {
        $group: {
          _id: '$moduleType',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$performance.avgResponseTime' },
          totalEndpoints: { $sum: { $size: '$endpoints' } }
        }
      }
    ]);

    // Get performance metrics
    const performanceStats = await ProjectModule.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$performance.avgResponseTime' },
          totalErrors: { $sum: '$analytics.dailyUsage.errors' },
          totalRequests: { $sum: '$analytics.dailyUsage.requests' },
          uptime: { $avg: '$performance.uptime' }
        }
      }
    ]);

    // Get recent activities
    const recentModules = await ProjectModule.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('moduleName moduleType status updatedAt');

    // Get project profile summary
    const projectProfile = await ProjectProfile.findOne()
      .select('basicInfo studies.codeAnalysis moduleRegistry');

    res.json({
      success: true,
      data: {
        moduleStats,
        performanceStats: performanceStats[0] || {},
        recentModules,
        projectProfile: projectProfile || {},
        summary: {
          totalModules: await ProjectModule.countDocuments(),
          activeModules: await ProjectModule.countDocuments({ status: 'Active' }),
          totalEndpoints: await getTotalEndpoints(),
          totalComponents: await getTotalComponents()
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Register API endpoint
 */
const registerEndpoint = async (req, res) => {
  try {
    const { moduleName, endpoint } = req.body;

    if (!moduleName || !endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Module name and endpoint data are required'
      });
    }

    const module = await ProjectModule.findOne({ moduleName });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Check if endpoint already exists
    const existingEndpoint = module.endpoints.find(ep => 
      ep.path === endpoint.path && ep.method === endpoint.method
    );

    if (existingEndpoint) {
      return res.status(409).json({
        success: false,
        message: 'Endpoint already exists in this module'
      });
    }

    // Add endpoint
    module.endpoints.push(endpoint);
    await module.save();

    res.status(201).json({
      success: true,
      message: 'Endpoint registered successfully',
      data: endpoint
    });
  } catch (error) {
    console.error('Register endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register endpoint',
      error: error.message
    });
  }
};

/**
 * Register UI component
 */
const registerComponent = async (req, res) => {
  try {
    const { moduleName, component } = req.body;

    if (!moduleName || !component) {
      return res.status(400).json({
        success: false,
        message: 'Module name and component data are required'
      });
    }

    const module = await ProjectModule.findOne({ moduleName });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Check if component already exists
    const existingComponent = module.components.find(comp => comp.name === component.name);
    if (existingComponent) {
      return res.status(409).json({
        success: false,
        message: 'Component already exists in this module'
      });
    }

    // Add component
    module.components.push(component);
    await module.save();

    res.status(201).json({
      success: true,
      message: 'Component registered successfully',
      data: component
    });
  } catch (error) {
    console.error('Register component error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register component',
      error: error.message
    });
  }
};

/**
 * Update usage statistics
 */
const updateUsageStats = async (req, res) => {
  try {
    const { moduleName, endpoint, responseTime, userId } = req.body;

    const module = await ProjectModule.findOne({ moduleName });
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Update usage stats
    await module.updateUsageStats(endpoint, responseTime);

    // Update daily usage analytics
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = module.analytics.dailyUsage.find(usage => 
      usage.date.toISOString().split('T')[0] === today
    );

    if (dailyUsage) {
      dailyUsage.requests += 1;
      if (userId && !dailyUsage.uniqueUsers.includes(userId)) {
        dailyUsage.uniqueUsers += 1;
      }
    } else {
      module.analytics.dailyUsage.push({
        date: new Date(),
        requests: 1,
        uniqueUsers: userId ? 1 : 0,
        errors: 0
      });
    }

    await module.save();

    res.json({
      success: true,
      message: 'Usage statistics updated successfully'
    });
  } catch (error) {
    console.error('Update usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update usage statistics',
      error: error.message
    });
  }
};

/**
 * Generate project analytics report
 */
const generateAnalyticsReport = async (req, res) => {
  try {
    const { reportType = 'comprehensive', timeRange = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const report = {
      generatedAt: new Date(),
      timeRange: { startDate, endDate },
      summary: {},
      details: {}
    };

    // Module statistics
    report.summary.modules = await ProjectModule.aggregate([
      {
        $group: {
          _id: '$moduleType',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          avgPerformance: { $avg: '$performance.avgResponseTime' }
        }
      }
    ]);

    // Performance metrics
    report.summary.performance = await ProjectModule.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$performance.avgResponseTime' },
          maxResponseTime: { $max: '$performance.avgResponseTime' },
          minResponseTime: { $min: '$performance.avgResponseTime' },
          avgUptime: { $avg: '$performance.uptime' },
          totalEndpoints: { $sum: { $size: '$endpoints' } }
        }
      }
    ]);

    // Usage analytics
    report.summary.usage = await ProjectModule.aggregate([
      { $unwind: '$analytics.dailyUsage' },
      {
        $match: {
          'analytics.dailyUsage.date': {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: '$analytics.dailyUsage.requests' },
          totalUsers: { $sum: '$analytics.dailyUsage.uniqueUsers' },
          totalErrors: { $sum: '$analytics.dailyUsage.errors' },
          avgDailyRequests: { $avg: '$analytics.dailyUsage.requests' }
        }
      }
    ]);

    // Security metrics
    report.summary.security = await ProjectModule.aggregate([
      { $unwind: '$security.vulnerabilities' },
      {
        $group: {
          _id: '$security.vulnerabilities.severity',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get detailed breakdown if requested
    if (reportType === 'comprehensive') {
      report.details.moduleBreakdown = await ProjectModule.find({ status: 'Active' })
        .select('moduleName moduleType performance endpoints components analytics.dailyUsage')
        .lean();

      report.details.trendAnalysis = await generateTrendAnalysis(startDate, endDate);
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Generate analytics report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics report',
      error: error.message
    });
  }
};

/**
 * Scan project files and auto-register components
 */
const scanAndRegisterProject = async (req, res) => {
  try {
    const { projectPath = process.cwd() } = req.body;

    console.log('Starting project scan...');
    
    const scanResults = {
      modules: [],
      endpoints: [],
      components: [],
      files: []
    };

    // Scan for JavaScript/TypeScript files
    await scanDirectory(projectPath, scanResults);

    // Auto-register discovered modules
    for (const moduleData of scanResults.modules) {
      try {
        const existingModule = await ProjectModule.findOne({ moduleName: moduleData.moduleName });
        if (!existingModule) {
          const newModule = new ProjectModule(moduleData);
          await newModule.save();
          console.log(`Registered module: ${moduleData.moduleName}`);
        } else {
          // Update existing module
          await ProjectModule.findByIdAndUpdate(existingModule._id, moduleData);
          console.log(`Updated module: ${moduleData.moduleName}`);
        }
      } catch (error) {
        console.error(`Error registering module ${moduleData.moduleName}:`, error);
      }
    }

    // Update project profile
    await updateProjectProfile(scanResults);

    res.json({
      success: true,
      message: 'Project scan completed successfully',
      data: {
        modulesScanned: scanResults.modules.length,
        endpointsFound: scanResults.endpoints.length,
        componentsFound: scanResults.components.length,
        filesScanned: scanResults.files.length
      }
    });
  } catch (error) {
    console.error('Project scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan project',
      error: error.message
    });
  }
};

// Helper functions
async function updateProjectModuleCount() {
  try {
    const moduleCount = await ProjectModule.countDocuments();
    const moduleBreakdown = await ProjectModule.aggregate([
      {
        $group: {
          _id: '$moduleType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Update or create project profile
    await ProjectProfile.findOneAndUpdate(
      {},
      {
        $set: {
          'moduleRegistry.totalModules': moduleCount,
          'moduleRegistry.moduleBreakdown': moduleBreakdown.map(item => ({
            type: item._id,
            count: item.count,
            status: 'Active'
          })),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating project module count:', error);
  }
}

async function getTotalEndpoints() {
  const result = await ProjectModule.aggregate([
    { $project: { endpointCount: { $size: '$endpoints' } } },
    { $group: { _id: null, total: { $sum: '$endpointCount' } } }
  ]);
  return result[0]?.total || 0;
}

async function getTotalComponents() {
  const result = await ProjectModule.aggregate([
    { $project: { componentCount: { $size: '$components' } } },
    { $group: { _id: null, total: { $sum: '$componentCount' } } }
  ]);
  return result[0]?.total || 0;
}

async function scanDirectory(dirPath, results) {
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await scanDirectory(fullPath, results);
      } else if (stats.isFile() && /\.(js|ts|jsx|tsx)$/.test(item)) {
        await analyzeFile(fullPath, results);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
}

async function analyzeFile(filePath, results) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const stats = await fs.stat(filePath);
    
    results.files.push({
      path: filePath,
      size: stats.size,
      lines: content.split('\n').length,
      lastModified: stats.mtime
    });

    // Detect module type based on file path and content
    const moduleType = detectModuleType(filePath, content);
    if (moduleType) {
      const moduleName = path.basename(filePath, path.extname(filePath));
      
      results.modules.push({
        moduleName: moduleName,
        moduleType: moduleType,
        description: `Auto-detected ${moduleType} module`,
        files: [{
          path: filePath,
          type: moduleType,
          size: stats.size,
          lines: content.split('\n').length,
          lastModified: stats.mtime
        }],
        endpoints: extractEndpoints(content),
        components: extractComponents(content),
        status: 'Active'
      });
    }
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
  }
}

function detectModuleType(filePath, content) {
  if (filePath.includes('/routes/') || content.includes('router.')) return 'API';
  if (filePath.includes('/models/') || content.includes('mongoose.Schema')) return 'Database';
  if (filePath.includes('/middleware/')) return 'Middleware';
  if (filePath.includes('/services/')) return 'Service';
  if (filePath.includes('/components/') || content.includes('React.')) return 'UI';
  if (filePath.includes('/utils/') || filePath.includes('/helpers/')) return 'Utility';
  if (filePath.includes('/auth/')) return 'Authentication';
  return null;
}

function extractEndpoints(content) {
  const endpoints = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = routeRegex.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      description: `Auto-detected ${match[1].toUpperCase()} endpoint`,
      isPublic: false,
      usageCount: 0
    });
  }
  
  return endpoints;
}

function extractComponents(content) {
  const components = [];
  const componentRegex = /(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=\(]/g;
  let match;
  
  while ((match = componentRegex.exec(content)) !== null) {
    if (content.includes('React') || content.includes('jsx')) {
      components.push({
        name: match[1],
        type: 'Component',
        size: content.length,
        props: [],
        state: [],
        dependencies: []
      });
    }
  }
  
  return components;
}

async function updateProjectProfile(scanResults) {
  try {
    const profile = await ProjectProfile.findOne() || new ProjectProfile({
      projectName: 'Healthcare API',
      projectId: 'healthcare_api_' + Date.now()
    });

    // Update code analysis
    profile.studies.codeAnalysis = {
      totalLines: scanResults.files.reduce((sum, file) => sum + (file.lines || 0), 0),
      totalFiles: scanResults.files.length,
      languageBreakdown: calculateLanguageBreakdown(scanResults.files),
      fileTypeBreakdown: calculateFileTypeBreakdown(scanResults.files)
    };

    // Update module registry
    profile.moduleRegistry = {
      totalModules: scanResults.modules.length,
      moduleBreakdown: calculateModuleBreakdown(scanResults.modules),
      apiEndpoints: {
        total: scanResults.endpoints.length,
        byMethod: calculateEndpointsByMethod(scanResults.endpoints)
      }
    };

    profile.lastAnalysis = new Date();
    await profile.save();
  } catch (error) {
    console.error('Error updating project profile:', error);
  }
}

function calculateLanguageBreakdown(files) {
  const breakdown = {};
  files.forEach(file => {
    const ext = path.extname(file.path);
    let language = 'Other';
    
    switch (ext) {
      case '.js': language = 'JavaScript'; break;
      case '.ts': language = 'TypeScript'; break;
      case '.jsx': language = 'React JSX'; break;
      case '.tsx': language = 'React TSX'; break;
    }
    
    if (!breakdown[language]) {
      breakdown[language] = { lines: 0, files: 0 };
    }
    breakdown[language].lines += file.lines || 0;
    breakdown[language].files += 1;
  });
  
  return Object.entries(breakdown).map(([language, data]) => ({
    language,
    lines: data.lines,
    files: data.files,
    percentage: Math.round((data.lines / files.reduce((sum, f) => sum + (f.lines || 0), 0)) * 100)
  }));
}

function calculateFileTypeBreakdown(files) {
  const breakdown = {};
  files.forEach(file => {
    const ext = path.extname(file.path);
    if (!breakdown[ext]) {
      breakdown[ext] = { count: 0, totalSize: 0 };
    }
    breakdown[ext].count += 1;
    breakdown[ext].totalSize += file.size || 0;
  });
  
  return Object.entries(breakdown).map(([type, data]) => ({
    type,
    count: data.count,
    totalSize: data.totalSize
  }));
}

function calculateModuleBreakdown(modules) {
  const breakdown = {};
  modules.forEach(module => {
    if (!breakdown[module.moduleType]) {
      breakdown[module.moduleType] = 0;
    }
    breakdown[module.moduleType] += 1;
  });
  
  return Object.entries(breakdown).map(([type, count]) => ({
    type,
    count,
    status: 'Active'
  }));
}

function calculateEndpointsByMethod(endpoints) {
  const breakdown = {};
  endpoints.forEach(endpoint => {
    if (!breakdown[endpoint.method]) {
      breakdown[endpoint.method] = 0;
    }
    breakdown[endpoint.method] += 1;
  });
  
  return Object.entries(breakdown).map(([method, count]) => ({
    method,
    count
  }));
}

async function generateTrendAnalysis(startDate, endDate) {
  // Implementation for trend analysis
  return {
    performanceTrend: [],
    usageTrend: [],
    errorTrend: []
  };
}

module.exports = {
  registerModule,
  getModules,
  getModuleById,
  updateModule,
  deleteModule,
  getProjectDashboard,
  registerEndpoint,
  registerComponent,
  updateUsageStats,
  generateAnalyticsReport,
  scanAndRegisterProject
};