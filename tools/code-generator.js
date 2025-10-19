#!/usr/bin/env node

/**
 * Smart Code Generator for Healthcare API
 * 
 * This tool analyzes existing code patterns and generates appropriate
 * development prompts and templates for maintaining consistency.
 */

const fs = require('fs');
const path = require('path');

class HealthcareCodeGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.patterns = {
      routes: [],
      controllers: [],
      models: [],
      services: []
    };
    this.stats = {
      totalFiles: 0,
      documentedFiles: 0,
      endpoints: 0,
      modules: new Set()
    };
  }

  /**
   * Analyze existing codebase to extract patterns
   */
  async analyzeCodebase() {
    console.log('🔍 Analyzing Healthcare API codebase...');
    
    const modulesPath = path.join(this.projectRoot, 'src', 'modules');
    const modules = fs.readdirSync(modulesPath);
    
    for (const module of modules) {
      await this.analyzeModule(module);
    }
    
    this.generateReport();
    return this.patterns;
  }

  /**
   * Analyze individual module for patterns
   */
  async analyzeModule(moduleName) {
    const modulePath = path.join(this.projectRoot, 'src', 'modules', moduleName);
    
    if (!fs.existsSync(modulePath)) return;
    
    this.stats.modules.add(moduleName);
    
    // Analyze routes
    const routesPath = path.join(modulePath, 'routes');
    if (fs.existsSync(routesPath)) {
      const routeFiles = fs.readdirSync(routesPath).filter(f => f.endsWith('.js'));
      
      for (const routeFile of routeFiles) {
        await this.analyzeRouteFile(moduleName, routeFile);
      }
    }
    
    // Analyze controllers
    const controllersPath = path.join(modulePath, 'controllers');
    if (fs.existsSync(controllersPath)) {
      const controllerFiles = fs.readdirSync(controllersPath).filter(f => f.endsWith('.js'));
      
      for (const controllerFile of controllerFiles) {
        await this.analyzeControllerFile(moduleName, controllerFile);
      }
    }
    
    // Analyze models
    const modelsPath = path.join(modulePath, 'models');
    if (fs.existsSync(modelsPath)) {
      const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith('.js'));
      
      for (const modelFile of modelFiles) {
        await this.analyzeModelFile(moduleName, modelFile);
      }
    }
  }

  /**
   * Analyze route file for endpoint patterns
   */
  async analyzeRouteFile(moduleName, fileName) {
    const filePath = path.join(this.projectRoot, 'src', 'modules', moduleName, 'routes', fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    
    this.stats.totalFiles++;
    
    // Check if documented
    const hasSwagger = content.includes('@swagger') || content.includes('* @swagger');
    if (hasSwagger) {
      this.stats.documentedFiles++;
    }
    
    // Extract HTTP methods and endpoints
    const methodRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    let endpointCount = 0;
    const endpoints = [];
    
    while ((match = methodRegex.exec(content)) !== null) {
      endpointCount++;
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        module: moduleName,
        file: fileName
      });
    }
    
    this.stats.endpoints += endpointCount;
    
    // Extract middleware patterns
    const middlewarePatterns = this.extractMiddlewarePatterns(content);
    
    // Extract authentication patterns
    const authPatterns = this.extractAuthPatterns(content);
    
    this.patterns.routes.push({
      module: moduleName,
      file: fileName,
      documented: hasSwagger,
      endpointCount,
      endpoints,
      middlewarePatterns,
      authPatterns,
      filePath
    });
  }

  /**
   * Analyze controller file for implementation patterns
   */
  async analyzeControllerFile(moduleName, fileName) {
    const filePath = path.join(this.projectRoot, 'src', 'modules', moduleName, 'controllers', fileName);
    
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract controller methods
    const methodRegex = /exports\.(\w+)\s*=|const\s+(\w+)\s*=/g;
    const methods = [];
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push(match[1] || match[2]);
    }
    
    // Extract error handling patterns
    const errorPatterns = this.extractErrorPatterns(content);
    
    // Extract validation patterns
    const validationPatterns = this.extractValidationPatterns(content);
    
    this.patterns.controllers.push({
      module: moduleName,
      file: fileName,
      methods,
      errorPatterns,
      validationPatterns,
      filePath
    });
  }

  /**
   * Analyze model file for schema patterns
   */
  async analyzeModelFile(moduleName, fileName) {
    const filePath = path.join(this.projectRoot, 'src', 'modules', moduleName, 'models', fileName);
    
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract schema fields
    const schemaPattern = /new\s+mongoose\.Schema\s*\(\s*\{([^}]+)\}/s;
    const schemaMatch = content.match(schemaPattern);
    
    let fields = [];
    if (schemaMatch) {
      // Basic field extraction (could be enhanced)
      const fieldPattern = /(\w+)\s*:/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(schemaMatch[1])) !== null) {
        fields.push(fieldMatch[1]);
      }
    }
    
    // Extract indexes
    const indexPattern = /\.index\s*\(\s*\{([^}]+)\}/g;
    const indexes = [];
    let indexMatch;
    
    while ((indexMatch = indexPattern.exec(content)) !== null) {
      indexes.push(indexMatch[1].trim());
    }
    
    this.patterns.models.push({
      module: moduleName,
      file: fileName,
      fields,
      indexes,
      filePath
    });
  }

  /**
   * Extract middleware patterns from code
   */
  extractMiddlewarePatterns(content) {
    const patterns = [];
    
    // Common middleware patterns
    const middlewareChecks = [
      { name: 'authMiddleware', regex: /authMiddleware|auth\.protect|requireAuth/g },
      { name: 'rateLimiting', regex: /rateLimiter|rateLimit/g },
      { name: 'validation', regex: /body\(|param\(|query\(/g },
      { name: 'roleAuth', regex: /requireRole|authorize|hasRole/g }
    ];
    
    middlewareChecks.forEach(check => {
      if (check.regex.test(content)) {
        patterns.push(check.name);
      }
    });
    
    return patterns;
  }

  /**
   * Extract authentication patterns from code
   */
  extractAuthPatterns(content) {
    const patterns = [];
    
    if (content.includes('requireRole') || content.includes('authorize')) {
      patterns.push('role-based-auth');
    }
    
    if (content.includes('JWT') || content.includes('jwt')) {
      patterns.push('jwt-auth');
    }
    
    if (content.includes('admin') || content.includes('provider') || content.includes('staff')) {
      patterns.push('healthcare-roles');
    }
    
    return patterns;
  }

  /**
   * Extract error handling patterns from code
   */
  extractErrorPatterns(content) {
    const patterns = [];
    
    if (content.includes('try') && content.includes('catch')) {
      patterns.push('try-catch');
    }
    
    if (content.includes('res.status(400)') || content.includes('res.status(500)')) {
      patterns.push('http-status-codes');
    }
    
    if (content.includes('ValidationError') || content.includes('validationResult')) {
      patterns.push('validation-errors');
    }
    
    return patterns;
  }

  /**
   * Extract validation patterns from code
   */
  extractValidationPatterns(content) {
    const patterns = [];
    
    if (content.includes('express-validator') || content.includes('body(') || content.includes('param(')) {
      patterns.push('express-validator');
    }
    
    if (content.includes('.isEmail()') || content.includes('.isLength()')) {
      patterns.push('field-validation');
    }
    
    if (content.includes('validationResult')) {
      patterns.push('validation-result-check');
    }
    
    return patterns;
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    const report = {
      summary: {
        totalModules: this.stats.modules.size,
        totalFiles: this.stats.totalFiles,
        documentedFiles: this.stats.documentedFiles,
        documentationPercentage: ((this.stats.documentedFiles / this.stats.totalFiles) * 100).toFixed(1),
        totalEndpoints: this.stats.endpoints
      },
      modules: Array.from(this.stats.modules),
      patterns: this.patterns
    };
    
    console.log('\n📊 Healthcare API Analysis Report:');
    console.log('================================');
    console.log(`Total Modules: ${report.summary.totalModules}`);
    console.log(`Total Route Files: ${report.summary.totalFiles}`);
    console.log(`Documented Files: ${report.summary.documentedFiles}/${report.summary.totalFiles} (${report.summary.documentationPercentage}%)`);
    console.log(`Total Endpoints: ${report.summary.totalEndpoints}`);
    console.log(`Modules: ${report.modules.join(', ')}`);
    
    // Save detailed report
    fs.writeFileSync('codebase-analysis.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed analysis saved to: codebase-analysis.json');
    
    return report;
  }

  /**
   * Generate smart prompts based on analysis
   */
  generateSmartPrompts(targetModule, targetFeature) {
    console.log(`\n🤖 Generating smart prompts for ${targetModule}/${targetFeature}...`);
    
    // Find similar patterns in existing code
    const modulePatterns = this.patterns.routes.filter(r => r.module === targetModule);
    const similarPatterns = this.patterns.routes.filter(r => 
      r.file.includes(targetFeature) || 
      r.endpoints.some(e => e.path.includes(targetFeature))
    );
    
    const prompt = this.buildContextualPrompt(modulePatterns, similarPatterns, targetModule, targetFeature);
    
    console.log('\n📝 Generated Smart Prompt:');
    console.log('=========================');
    console.log(prompt);
    
    return prompt;
  }

  /**
   * Build contextual prompt based on existing patterns
   */
  buildContextualPrompt(modulePatterns, similarPatterns, targetModule, targetFeature) {
    const commonMiddleware = this.getCommonMiddleware(modulePatterns);
    const commonAuthPatterns = this.getCommonAuthPatterns(modulePatterns);
    const commonErrorPatterns = this.getCommonErrorPatterns();
    
    return `
HEALTHCARE API DEVELOPMENT PROMPT
Context: Creating ${targetFeature} feature in ${targetModule} module

EXISTING PATTERNS DETECTED:
- Common Middleware: ${commonMiddleware.join(', ')}
- Authentication: ${commonAuthPatterns.join(', ')}
- Error Handling: ${commonErrorPatterns.join(', ')}

PROJECT STANDARDS (AUTO-DETECTED):
- Total Endpoints: ${this.stats.endpoints} across ${this.stats.totalFiles} files
- Documentation Coverage: ${((this.stats.documentedFiles / this.stats.totalFiles) * 100).toFixed(1)}%
- Common Modules: ${Array.from(this.stats.modules).join(', ')}

IMPLEMENTATION REQUIREMENTS:
1. Follow existing ${targetModule} module patterns
2. Implement standard middleware chain: ${commonMiddleware.join(' → ')}
3. Use healthcare role-based authentication
4. Include comprehensive error handling
5. Add Swagger documentation (current coverage: ${((this.stats.documentedFiles / this.stats.totalFiles) * 100).toFixed(1)}%)
6. Implement input validation with express-validator
7. Ensure HIPAA compliance for PHI data

SIMILAR IMPLEMENTATIONS FOUND:
${this.formatSimilarImplementations(similarPatterns)}

Please generate code that follows these established patterns while implementing the ${targetFeature} functionality.
    `.trim();
  }

  /**
   * Get common middleware patterns
   */
  getCommonMiddleware(patterns) {
    const middlewareCount = {};
    patterns.forEach(p => {
      p.middlewarePatterns.forEach(m => {
        middlewareCount[m] = (middlewareCount[m] || 0) + 1;
      });
    });
    
    return Object.entries(middlewareCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([middleware]) => middleware);
  }

  /**
   * Get common auth patterns
   */
  getCommonAuthPatterns(patterns) {
    const authCount = {};
    patterns.forEach(p => {
      p.authPatterns.forEach(a => {
        authCount[a] = (authCount[a] || 0) + 1;
      });
    });
    
    return Object.keys(authCount);
  }

  /**
   * Get common error patterns
   */
  getCommonErrorPatterns() {
    const errorCount = {};
    this.patterns.controllers.forEach(c => {
      c.errorPatterns.forEach(e => {
        errorCount[e] = (errorCount[e] || 0) + 1;
      });
    });
    
    return Object.keys(errorCount);
  }

  /**
   * Format similar implementations for prompt
   */
  formatSimilarImplementations(patterns) {
    if (patterns.length === 0) {
      return 'No similar implementations found. Follow general module patterns.';
    }
    
    return patterns.slice(0, 3).map(p => 
      `- ${p.module}/${p.file}: ${p.endpointCount} endpoints, ${p.documented ? 'documented' : 'undocumented'}`
    ).join('\n');
  }

  /**
   * Generate new feature template
   */
  generateFeatureTemplate(moduleName, featureName) {
    const template = `
// Healthcare API Feature Template
// Module: ${moduleName}
// Feature: ${featureName}
// Generated: ${new Date().toISOString()}

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');

// Middleware imports (based on common patterns)
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');
const { requireRole } = require('../middleware/rolePermissions');

// Model and service imports
const ${featureName.charAt(0).toUpperCase() + featureName.slice(1)} = require('../models/${featureName.charAt(0).toUpperCase() + featureName.slice(1)}');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}:
 *       type: object
 *       required:
 *         - field1
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier
 *         field1:
 *           type: string
 *           description: Description of field1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/${moduleName}/${featureName}:
 *   get:
 *     summary: Get all ${featureName} records
 *     tags:
 *       - ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/${featureName.charAt(0).toUpperCase() + featureName.slice(1)}'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/',
  authMiddleware,
  requireRole(['admin', 'provider', 'staff']),
  rateLimiterMiddleware,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const items = await ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}.find()
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      console.error('Error fetching ${featureName}:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ${featureName} records'
      });
    }
  }
);

/**
 * @swagger
 * /api/${moduleName}/${featureName}:
 *   post:
 *     summary: Create new ${featureName}
 *     tags:
 *       - ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${featureName.charAt(0).toUpperCase() + featureName.slice(1)}'
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post('/',
  authMiddleware,
  requireRole(['admin', 'provider']),
  rateLimiterMiddleware,
  [
    body('field1').trim().notEmpty().withMessage('Field1 is required'),
    // Add more validation as needed
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const item = await ${featureName.charAt(0).toUpperCase() + featureName.slice(1)}.create({
        ...req.body,
        createdBy: req.user._id
      });
      
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Error creating ${featureName}:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create ${featureName}'
      });
    }
  }
);

module.exports = router;
    `.trim();
    
    // Save template to file
    const templatePath = path.join(this.projectRoot, `${featureName}-template.js`);
    fs.writeFileSync(templatePath, template);
    
    console.log(`\n📄 Feature template generated: ${templatePath}`);
    
    return template;
  }
}

// CLI interface
if (require.main === module) {
  const generator = new HealthcareCodeGenerator();
  
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'analyze':
      generator.analyzeCodebase();
      break;
      
    case 'prompt':
      if (!arg1 || !arg2) {
        console.log('Usage: node code-generator.js prompt <module> <feature>');
        process.exit(1);
      }
      generator.analyzeCodebase().then(() => {
        generator.generateSmartPrompts(arg1, arg2);
      });
      break;
      
    case 'template':
      if (!arg1 || !arg2) {
        console.log('Usage: node code-generator.js template <module> <feature>');
        process.exit(1);
      }
      generator.analyzeCodebase().then(() => {
        generator.generateFeatureTemplate(arg1, arg2);
      });
      break;
      
    default:
      console.log('Healthcare API Code Generator');
      console.log('Usage:');
      console.log('  node code-generator.js analyze                    # Analyze codebase patterns');
      console.log('  node code-generator.js prompt <module> <feature>  # Generate smart prompt');
      console.log('  node code-generator.js template <module> <feature> # Generate feature template');
      break;
  }
}

module.exports = HealthcareCodeGenerator;