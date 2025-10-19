/**
 * Project Management Service
 * Service layer for project analytics and automation
 */

const ProjectModule = require('../models/ProjectModule');
const ProjectProfile = require('../models/ProjectProfile');
const fs = require('fs').promises;
const path = require('path');

class ProjectManagementService {
  constructor() {
    this.projectPath = process.cwd();
    this.analysisCache = new Map();
  }

  /**
   * Auto-register project from file system scan
   */
  async autoRegisterProject(projectPath = this.projectPath) {
    try {
      console.log('Starting auto-registration scan...');
      
      const scanResults = {
        modules: [],
        endpoints: [],
        components: [],
        files: [],
        dependencies: []
      };

      // Scan project structure
      await this.scanProjectStructure(projectPath, scanResults);
      
      // Process package.json for dependencies
      await this.processDependencies(projectPath, scanResults);
      
      // Register discovered modules
      for (const moduleData of scanResults.modules) {
        await this.registerOrUpdateModule(moduleData);
      }

      // Update project profile
      await this.updateProjectProfile(scanResults);

      return {
        modulesRegistered: scanResults.modules.length,
        endpointsFound: scanResults.endpoints.length,
        componentsFound: scanResults.components.length,
        filesScanned: scanResults.files.length
      };
    } catch (error) {
      console.error('Auto-registration error:', error);
      throw error;
    }
  }

  /**
   * Scan project structure recursively
   */
  async scanProjectStructure(dirPath, results, depth = 0) {
    if (depth > 10) return; // Prevent infinite recursion

    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        // Skip common ignore patterns
        if (this.shouldSkipItem(item)) continue;
        
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.scanProjectStructure(fullPath, results, depth + 1);
        } else if (stats.isFile()) {
          await this.analyzeProjectFile(fullPath, results);
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dirPath}:`, error);
    }
  }

  /**
   * Check if item should be skipped during scan
   */
  shouldSkipItem(item) {
    const skipPatterns = [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      'coverage',
      '.env',
      '.DS_Store',
      'Thumbs.db'
    ];
    
    return skipPatterns.some(pattern => item.startsWith(pattern));
  }

  /**
   * Analyze individual project file
   */
  async analyzeProjectFile(filePath, results) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      
      const fileInfo = {
        path: filePath,
        type: this.getFileType(filePath, content),
        size: stats.size,
        lines: content.split('\n').length,
        lastModified: stats.mtime
      };
      
      results.files.push(fileInfo);
      
      // Analyze based on file type
      if (this.isSourceFile(ext)) {
        const moduleInfo = await this.extractModuleInfo(filePath, content);
        if (moduleInfo) {
          results.modules.push(moduleInfo);
        }
        
        // Extract endpoints
        const endpoints = this.extractEndpoints(content);
        results.endpoints.push(...endpoints);
        
        // Extract components
        const components = this.extractComponents(content);
        results.components.push(...components);
      }
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
  }

  /**
   * Get file type based on path and content
   */
  getFileType(filePath, content) {
    const pathLower = filePath.toLowerCase();
    
    if (pathLower.includes('/routes/') || content.includes('router.')) return 'Route';
    if (pathLower.includes('/controllers/')) return 'Controller';
    if (pathLower.includes('/models/') || content.includes('mongoose.Schema')) return 'Model';
    if (pathLower.includes('/services/')) return 'Service';
    if (pathLower.includes('/middleware/')) return 'Middleware';
    if (pathLower.includes('/components/') || content.includes('React.')) return 'Component';
    if (pathLower.includes('/utils/') || pathLower.includes('/helpers/')) return 'Utility';
    if (pathLower.includes('/test/') || pathLower.includes('.test.') || pathLower.includes('.spec.')) return 'Test';
    
    return 'Other';
  }

  /**
   * Check if file is a source code file
   */
  isSourceFile(ext) {
    const sourceExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c'];
    return sourceExts.includes(ext);
  }

  /**
   * Extract module information from file
   */
  async extractModuleInfo(filePath, content) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const fileType = this.getFileType(filePath, content);
    
    // Skip if not a significant module file
    if (fileType === 'Other' || content.length < 100) {
      return null;
    }
    
    const moduleType = this.determineModuleType(filePath, content);
    if (!moduleType) return null;
    
    return {
      moduleName: fileName,
      moduleType: moduleType,
      description: `Auto-detected ${moduleType} module from ${fileName}`,
      version: '1.0.0',
      status: 'Active',
      technologies: this.extractTechnologies(content),
      dependencies: this.extractDependencies(content),
      files: [{
        path: filePath,
        type: fileType,
        size: content.length,
        lines: content.split('\n').length,
        lastModified: new Date()
      }],
      endpoints: this.extractEndpoints(content),
      components: this.extractComponents(content),
      performance: {
        avgResponseTime: Math.random() * 200 + 50, // Placeholder
        errorRate: Math.random() * 5,
        uptime: 95 + Math.random() * 5,
        loadTime: Math.random() * 100 + 50,
        memoryUsage: Math.random() * 50 + 25
      },
      security: {
        authRequired: content.includes('authenticateToken') || content.includes('auth'),
        permissions: this.extractPermissions(content),
        vulnerabilities: []
      },
      testing: {
        unitTests: this.countTests(content),
        coverage: Math.random() * 40 + 60 // Placeholder
      }
    };
  }

  /**
   * Determine module type from file analysis
   */
  determineModuleType(filePath, content) {
    const pathLower = filePath.toLowerCase();
    
    if (pathLower.includes('/routes/') || content.includes('router.')) return 'API';
    if (pathLower.includes('/models/') || content.includes('Schema')) return 'Database';
    if (pathLower.includes('/middleware/')) return 'Middleware';
    if (pathLower.includes('/services/')) return 'Service';
    if (pathLower.includes('/components/') || content.includes('React')) return 'UI';
    if (pathLower.includes('/utils/') || pathLower.includes('/helpers/')) return 'Utility';
    if (pathLower.includes('/auth/')) return 'Authentication';
    if (content.includes('integration') || content.includes('webhook')) return 'Integration';
    
    return null;
  }

  /**
   * Extract technology stack from content
   */
  extractTechnologies(content) {
    const technologies = [];
    const techPatterns = [
      { pattern: /express/i, name: 'Express.js', purpose: 'Web Framework' },
      { pattern: /mongoose/i, name: 'Mongoose', purpose: 'ODM' },
      { pattern: /react/i, name: 'React', purpose: 'UI Framework' },
      { pattern: /jwt/i, name: 'JWT', purpose: 'Authentication' },
      { pattern: /bcrypt/i, name: 'bcrypt', purpose: 'Password Hashing' },
      { pattern: /axios/i, name: 'Axios', purpose: 'HTTP Client' },
      { pattern: /multer/i, name: 'Multer', purpose: 'File Upload' },
      { pattern: /socket\.io/i, name: 'Socket.IO', purpose: 'WebSocket' },
      { pattern: /redis/i, name: 'Redis', purpose: 'Caching' },
      { pattern: /stripe/i, name: 'Stripe', purpose: 'Payment Processing' }
    ];
    
    techPatterns.forEach(({ pattern, name, purpose }) => {
      if (pattern.test(content)) {
        technologies.push({ name, purpose, version: 'auto-detected' });
      }
    });
    
    return technologies;
  }

  /**
   * Extract dependencies from content
   */
  extractDependencies(content) {
    const dependencies = [];
    const importRegex = /(?:import|require)\s*\(?['"`]([^'"`]+)['"`]\)?/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push({
          moduleName: dep,
          type: 'Required',
          version: 'auto-detected'
        });
      }
    }
    
    return [...new Set(dependencies.map(d => JSON.stringify(d)))].map(d => JSON.parse(d));
  }

  /**
   * Extract API endpoints from content
   */
  extractEndpoints(content) {
    const endpoints = [];
    const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      endpoints.push({
        path: match[2],
        method: match[1].toUpperCase(),
        description: `Auto-detected ${match[1].toUpperCase()} endpoint`,
        isPublic: !content.includes('authenticateToken'),
        responseTime: Math.random() * 100 + 20,
        usageCount: Math.floor(Math.random() * 1000)
      });
    }
    
    return endpoints;
  }

  /**
   * Extract React components from content
   */
  extractComponents(content) {
    const components = [];
    
    // React function components
    const funcCompRegex = /(?:function|const)\s+([A-Z][a-zA-Z0-9]*)\s*[=\(]/g;
    let match;
    
    while ((match = funcCompRegex.exec(content)) !== null) {
      if (content.includes('React') || content.includes('jsx') || content.includes('return (')) {
        components.push({
          name: match[1],
          type: 'Component',
          size: content.length,
          props: this.extractProps(content),
          state: this.extractState(content),
          dependencies: this.extractComponentDependencies(content)
        });
      }
    }
    
    return components;
  }

  /**
   * Extract React props from content
   */
  extractProps(content) {
    const props = [];
    const propsRegex = /\{\s*([a-zA-Z0-9_,\s]+)\s*\}/g;
    const match = propsRegex.exec(content);
    
    if (match) {
      const propNames = match[1].split(',').map(p => p.trim());
      props.push(...propNames.filter(p => p && p.length > 0));
    }
    
    return props;
  }

  /**
   * Extract React state from content
   */
  extractState(content) {
    const state = [];
    const stateRegex = /useState\s*\(\s*([^)]*)\s*\)/g;
    let match;
    
    while ((match = stateRegex.exec(content)) !== null) {
      state.push(match[1] || 'state');
    }
    
    return state;
  }

  /**
   * Extract component dependencies
   */
  extractComponentDependencies(content) {
    const deps = [];
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      if (!match[1].startsWith('.')) {
        deps.push(match[1]);
      }
    }
    
    return deps;
  }

  /**
   * Extract permissions from content
   */
  extractPermissions(content) {
    const permissions = [];
    const permissionPatterns = [
      /permission[s]?:\s*['"`]([^'"`]+)['"`]/gi,
      /role[s]?:\s*['"`]([^'"`]+)['"`]/gi,
      /access:\s*['"`]([^'"`]+)['"`]/gi
    ];
    
    permissionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        permissions.push(match[1]);
      }
    });
    
    return [...new Set(permissions)];
  }

  /**
   * Count test functions in content
   */
  countTests(content) {
    const testPatterns = [
      /test\s*\(/g,
      /it\s*\(/g,
      /describe\s*\(/g,
      /expect\s*\(/g
    ];
    
    let count = 0;
    testPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      count += matches ? matches.length : 0;
    });
    
    return count;
  }

  /**
   * Process package.json for dependencies
   */
  async processDependencies(projectPath, results) {
    try {
      const packagePath = path.join(projectPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      Object.entries(allDeps).forEach(([name, version]) => {
        results.dependencies.push({
          name,
          version,
          type: packageJson.dependencies[name] ? 'Production' : 'Development'
        });
      });
    } catch (error) {
      console.log('No package.json found or error reading it');
    }
  }

  /**
   * Register or update module
   */
  async registerOrUpdateModule(moduleData) {
    try {
      const existingModule = await ProjectModule.findOne({ moduleName: moduleData.moduleName });
      
      if (existingModule) {
        // Update existing module
        Object.assign(existingModule, moduleData);
        existingModule.updatedAt = new Date();
        await existingModule.save();
        console.log(`Updated module: ${moduleData.moduleName}`);
      } else {
        // Create new module
        const newModule = new ProjectModule(moduleData);
        await newModule.save();
        console.log(`Registered new module: ${moduleData.moduleName}`);
      }
    } catch (error) {
      console.error(`Error registering module ${moduleData.moduleName}:`, error);
    }
  }

  /**
   * Update project profile with scan results
   */
  async updateProjectProfile(scanResults) {
    try {
      let profile = await ProjectProfile.findOne();
      
      if (!profile) {
        profile = new ProjectProfile({
          projectName: 'Healthcare API',
          projectId: `healthcare_${Date.now()}`
        });
      }
      
      // Update code analysis
      profile.studies.codeAnalysis = {
        totalLines: scanResults.files.reduce((sum, file) => sum + (file.lines || 0), 0),
        totalFiles: scanResults.files.length,
        codeQuality: {
          maintainabilityIndex: this.calculateMaintainabilityIndex(scanResults),
          cyclomaticComplexity: this.calculateComplexity(scanResults),
          duplicateCodePercentage: Math.random() * 5,
          testCoverage: this.calculateTestCoverage(scanResults)
        },
        languageBreakdown: this.calculateLanguageBreakdown(scanResults.files),
        fileTypeBreakdown: this.calculateFileTypeBreakdown(scanResults.files)
      };
      
      // Update module registry
      profile.moduleRegistry = {
        totalModules: scanResults.modules.length,
        moduleBreakdown: this.calculateModuleBreakdown(scanResults.modules),
        dependencies: {
          external: scanResults.dependencies
        },
        apiEndpoints: {
          total: scanResults.endpoints.length,
          byMethod: this.calculateEndpointsByMethod(scanResults.endpoints)
        }
      };
      
      // Update technology stack
      profile.technologyStack = this.extractTechnologyStack(scanResults);
      
      profile.lastAnalysis = new Date();
      await profile.save();
      
      console.log('Project profile updated successfully');
    } catch (error) {
      console.error('Error updating project profile:', error);
    }
  }

  /**
   * Calculate maintainability index
   */
  calculateMaintainabilityIndex(scanResults) {
    const totalLines = scanResults.files.reduce((sum, file) => sum + (file.lines || 0), 0);
    const avgFileSize = totalLines / scanResults.files.length;
    
    // Simple heuristic: lower score for larger average file size
    return Math.max(0, 100 - (avgFileSize / 10));
  }

  /**
   * Calculate complexity
   */
  calculateComplexity(scanResults) {
    const totalFiles = scanResults.files.length;
    const totalModules = scanResults.modules.length;
    
    // Simple heuristic based on file count and module count
    return Math.min(10, (totalFiles / totalModules) || 1);
  }

  /**
   * Calculate test coverage
   */
  calculateTestCoverage(scanResults) {
    const testFiles = scanResults.files.filter(file => 
      file.type === 'Test' || file.path.includes('.test.') || file.path.includes('.spec.')
    );
    
    const sourceFiles = scanResults.files.filter(file => 
      ['Component', 'Controller', 'Service', 'Model'].includes(file.type)
    );
    
    if (sourceFiles.length === 0) return 0;
    
    return Math.min(100, (testFiles.length / sourceFiles.length) * 100);
  }

  /**
   * Calculate language breakdown
   */
  calculateLanguageBreakdown(files) {
    const breakdown = {};
    const totalLines = files.reduce((sum, file) => sum + (file.lines || 0), 0);
    
    files.forEach(file => {
      const ext = path.extname(file.path);
      const language = this.getLanguageFromExtension(ext);
      
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
      percentage: Math.round((data.lines / totalLines) * 100)
    }));
  }

  /**
   * Get language from file extension
   */
  getLanguageFromExtension(ext) {
    const langMap = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.jsx': 'React JSX',
      '.tsx': 'React TSX',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.css': 'CSS',
      '.html': 'HTML'
    };
    return langMap[ext] || 'Other';
  }

  /**
   * Calculate file type breakdown
   */
  calculateFileTypeBreakdown(files) {
    const breakdown = {};
    
    files.forEach(file => {
      const type = file.type || 'Other';
      if (!breakdown[type]) {
        breakdown[type] = { count: 0, totalSize: 0 };
      }
      breakdown[type].count += 1;
      breakdown[type].totalSize += file.size || 0;
    });
    
    return Object.entries(breakdown).map(([type, data]) => ({
      type,
      count: data.count,
      totalSize: data.totalSize
    }));
  }

  /**
   * Calculate module breakdown
   */
  calculateModuleBreakdown(modules) {
    const breakdown = {};
    
    modules.forEach(module => {
      const type = module.moduleType;
      if (!breakdown[type]) {
        breakdown[type] = 0;
      }
      breakdown[type] += 1;
    });
    
    return Object.entries(breakdown).map(([type, count]) => ({
      type,
      count,
      status: 'Active'
    }));
  }

  /**
   * Calculate endpoints by method
   */
  calculateEndpointsByMethod(endpoints) {
    const breakdown = {};
    
    endpoints.forEach(endpoint => {
      const method = endpoint.method || 'GET';
      if (!breakdown[method]) {
        breakdown[method] = 0;
      }
      breakdown[method] += 1;
    });
    
    return Object.entries(breakdown).map(([method, count]) => ({
      method,
      count
    }));
  }

  /**
   * Extract technology stack
   */
  extractTechnologyStack(scanResults) {
    const technologies = {
      frontend: [],
      backend: [],
      database: [],
      infrastructure: []
    };
    
    // Extract from all modules
    scanResults.modules.forEach(module => {
      module.technologies.forEach(tech => {
        let category = 'backend';
        
        if (['React', 'Vue', 'Angular'].some(fw => tech.name.includes(fw))) {
          category = 'frontend';
        } else if (['MongoDB', 'MySQL', 'PostgreSQL', 'Redis'].some(db => tech.name.includes(db))) {
          category = 'database';
        } else if (['Docker', 'Kubernetes', 'AWS', 'Azure'].some(inf => tech.name.includes(inf))) {
          category = 'infrastructure';
        }
        
        technologies[category].push({
          technology: tech.name,
          version: tech.version || 'auto-detected',
          purpose: tech.purpose,
          size: 0
        });
      });
    });
    
    // Remove duplicates
    Object.keys(technologies).forEach(category => {
      technologies[category] = technologies[category].filter((tech, index, self) =>
        index === self.findIndex(t => t.technology === tech.technology)
      );
    });
    
    return technologies;
  }

  /**
   * Generate project health report
   */
  async generateHealthReport() {
    try {
      const modules = await ProjectModule.find({ status: 'Active' });
      const profile = await ProjectProfile.findOne();
      
      const report = {
        timestamp: new Date(),
        overallHealth: profile ? profile.calculateHealthScore() : 0,
        moduleHealth: this.calculateModuleHealth(modules),
        performanceMetrics: this.aggregatePerformanceMetrics(modules),
        securityAssessment: this.aggregateSecurityMetrics(modules),
        recommendations: this.generateHealthRecommendations(modules, profile)
      };
      
      return report;
    } catch (error) {
      console.error('Error generating health report:', error);
      throw error;
    }
  }

  /**
   * Calculate module health
   */
  calculateModuleHealth(modules) {
    const healthMetrics = {
      total: modules.length,
      healthy: 0,
      warning: 0,
      critical: 0
    };
    
    modules.forEach(module => {
      const avgResponseTime = module.performance?.avgResponseTime || 0;
      const errorRate = module.performance?.errorRate || 0;
      const uptime = module.performance?.uptime || 100;
      
      if (avgResponseTime < 200 && errorRate < 1 && uptime > 99) {
        healthMetrics.healthy++;
      } else if (avgResponseTime < 500 && errorRate < 5 && uptime > 95) {
        healthMetrics.warning++;
      } else {
        healthMetrics.critical++;
      }
    });
    
    return healthMetrics;
  }

  /**
   * Aggregate performance metrics
   */
  aggregatePerformanceMetrics(modules) {
    const metrics = {
      avgResponseTime: 0,
      totalRequests: 0,
      errorCount: 0,
      uptime: 0
    };
    
    let activeModules = 0;
    
    modules.forEach(module => {
      if (module.performance) {
        metrics.avgResponseTime += module.performance.avgResponseTime || 0;
        metrics.uptime += module.performance.uptime || 0;
        activeModules++;
      }
      
      if (module.analytics?.dailyUsage) {
        module.analytics.dailyUsage.forEach(usage => {
          metrics.totalRequests += usage.requests || 0;
          metrics.errorCount += usage.errors || 0;
        });
      }
    });
    
    if (activeModules > 0) {
      metrics.avgResponseTime = metrics.avgResponseTime / activeModules;
      metrics.uptime = metrics.uptime / activeModules;
    }
    
    return metrics;
  }

  /**
   * Aggregate security metrics
   */
  aggregateSecurityMetrics(modules) {
    const security = {
      totalVulnerabilities: 0,
      criticalVulnerabilities: 0,
      authProtectedEndpoints: 0,
      totalEndpoints: 0
    };
    
    modules.forEach(module => {
      if (module.security?.vulnerabilities) {
        security.totalVulnerabilities += module.security.vulnerabilities.length;
        security.criticalVulnerabilities += module.security.vulnerabilities.filter(
          v => v.severity === 'Critical'
        ).length;
      }
      
      if (module.endpoints) {
        security.totalEndpoints += module.endpoints.length;
        security.authProtectedEndpoints += module.endpoints.filter(
          e => !e.isPublic
        ).length;
      }
    });
    
    return security;
  }

  /**
   * Generate health recommendations
   */
  generateHealthRecommendations(modules, profile) {
    const recommendations = [];
    
    // Performance recommendations
    const avgResponseTime = modules.reduce((sum, m) => 
      sum + (m.performance?.avgResponseTime || 0), 0) / modules.length;
    
    if (avgResponseTime > 500) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        message: 'Average response time is above recommended threshold',
        action: 'Optimize slow endpoints and implement caching'
      });
    }
    
    // Security recommendations
    const totalVulns = modules.reduce((sum, m) => 
      sum + (m.security?.vulnerabilities?.length || 0), 0);
    
    if (totalVulns > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'Critical',
        message: `Found ${totalVulns} security vulnerabilities`,
        action: 'Review and fix security issues immediately'
      });
    }
    
    // Test coverage recommendations
    if (profile && profile.studies?.codeAnalysis?.codeQuality?.testCoverage < 70) {
      recommendations.push({
        category: 'Quality',
        priority: 'Medium',
        message: 'Test coverage is below recommended 70%',
        action: 'Add more unit and integration tests'
      });
    }
    
    return recommendations;
  }
}

module.exports = new ProjectManagementService();