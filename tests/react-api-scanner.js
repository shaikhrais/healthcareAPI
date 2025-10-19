/**
 * React API Scanner and Component Generator
 * Analyzes React applications to extract components, API endpoints, and structure
 * Generates corresponding components with proper API integration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import colors with fallback
let colors;
try {
  colors = require('colors');
} catch (e) {
  colors = {
    green: (text) => text,
    cyan: (text) => text,
    white: (text) => text,
    yellow: (text) => text,
    red: (text) => text,
    blue: (text) => text,
    gray: (text) => text,
    bold: (text) => text
  };
}

class ReactAPIScanner {
  constructor(reactProjectPath = null) {
    this.reactProjectPath = reactProjectPath;
    this.healthcareAPIPath = process.cwd(); // Current healthcare API path
    this.scanResults = {
      components: [],
      pages: [],
      hooks: [],
      services: [],
      apiEndpoints: [],
      routes: [],
      context: [],
      utils: []
    };
    this.generatedComponents = [];
  }

  /**
   * Scan React project for components and structure
   */
  async scanReactProject(projectPath) {
    if (!projectPath || !fs.existsSync(projectPath)) {
      console.log('❌ React project path not found or not specified'.red);
      return false;
    }

    this.reactProjectPath = projectPath;
    console.log(`🔍 Scanning React project: ${projectPath}`.cyan);

    try {
      // Scan for different file types
      await this.scanComponents();
      await this.scanPages();
      await this.scanHooks();
      await this.scanServices();
      await this.scanAPIEndpoints();
      await this.scanRoutes();
      await this.scanContext();
      await this.scanUtils();

      console.log(`✅ React project scan completed`.green);
      return true;
    } catch (error) {
      console.log(`❌ Error scanning React project: ${error.message}`.red);
      return false;
    }
  }

  /**
   * Recursively find files by pattern
   */
  findFiles(dir, patterns, results = []) {
    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.findFiles(filePath, patterns, results);
      } else if (stat.isFile()) {
        for (const pattern of patterns) {
          if (file.match(pattern)) {
            results.push(filePath);
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Extract component information from file
   */
  extractComponentInfo(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Extract component name
      const componentMatch = content.match(/(?:export\s+default\s+)?(?:function|const|class)\s+(\w+)/);
      const componentName = componentMatch ? componentMatch[1] : fileName;

      // Extract props
      const propsMatch = content.match(/(?:function\s+\w+\s*\(([^)]*)\)|const\s+\w+\s*=\s*\(([^)]*)\))/);
      const propsString = propsMatch ? (propsMatch[1] || propsMatch[2]) : '';
      
      // Extract hooks used
      const hooksUsed = [];
      const hookMatches = content.match(/use\w+/g);
      if (hookMatches) {
        hooksUsed.push(...new Set(hookMatches));
      }

      // Extract API calls
      const apiCalls = [];
      const apiMatches = content.match(/(?:fetch|axios|api)\s*\(['"](.*?)['"]|\.(?:get|post|put|delete)\s*\(['"](.*?)['"])/g);
      if (apiMatches) {
        apiMatches.forEach(match => {
          const urlMatch = match.match(/['"](.*?)['"]/);
          if (urlMatch) {
            apiCalls.push(urlMatch[1]);
          }
        });
      }

      // Extract dependencies/imports
      const imports = [];
      const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
          if (moduleMatch) {
            imports.push(moduleMatch[1]);
          }
        });
      }

      return {
        filePath,
        fileName,
        componentName,
        props: propsString,
        hooksUsed,
        apiCalls,
        imports,
        content: content.length > 10000 ? content.substring(0, 10000) + '...' : content
      };
    } catch (error) {
      console.log(`⚠️ Error parsing ${filePath}: ${error.message}`.yellow);
      return null;
    }
  }

  /**
   * Scan for React components
   */
  async scanComponents() {
    console.log('🔍 Scanning for React components...'.blue);
    
    const componentPatterns = [
      /\.jsx?$/,
      /\.tsx?$/,
      /Component\.js$/,
      /components\/.*\.js$/
    ];

    const componentFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      componentPatterns
    );

    for (const file of componentFiles) {
      const componentInfo = this.extractComponentInfo(file);
      if (componentInfo) {
        this.scanResults.components.push(componentInfo);
      }
    }

    console.log(`   Found ${this.scanResults.components.length} components`.gray);
  }

  /**
   * Scan for pages/screens
   */
  async scanPages() {
    console.log('🔍 Scanning for pages/screens...'.blue);
    
    const pagePatterns = [
      /pages\/.*\.jsx?$/,
      /screens\/.*\.jsx?$/,
      /views\/.*\.jsx?$/,
      /Page\.jsx?$/,
      /Screen\.jsx?$/
    ];

    const pageFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      pagePatterns
    );

    for (const file of pageFiles) {
      const pageInfo = this.extractComponentInfo(file);
      if (pageInfo) {
        this.scanResults.pages.push(pageInfo);
      }
    }

    console.log(`   Found ${this.scanResults.pages.length} pages/screens`.gray);
  }

  /**
   * Scan for custom hooks
   */
  async scanHooks() {
    console.log('🔍 Scanning for custom hooks...'.blue);
    
    const hookPatterns = [
      /use\w+\.js$/,
      /hooks\/.*\.js$/
    ];

    const hookFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      hookPatterns
    );

    for (const file of hookFiles) {
      const hookInfo = this.extractComponentInfo(file);
      if (hookInfo) {
        this.scanResults.hooks.push(hookInfo);
      }
    }

    console.log(`   Found ${this.scanResults.hooks.length} custom hooks`.gray);
  }

  /**
   * Scan for services and API files
   */
  async scanServices() {
    console.log('🔍 Scanning for services and API files...'.blue);
    
    const servicePatterns = [
      /services\/.*\.js$/,
      /api\/.*\.js$/,
      /Service\.js$/,
      /API\.js$/
    ];

    const serviceFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      servicePatterns
    );

    for (const file of serviceFiles) {
      const serviceInfo = this.extractComponentInfo(file);
      if (serviceInfo) {
        this.scanResults.services.push(serviceInfo);
      }
    }

    console.log(`   Found ${this.scanResults.services.length} service files`.gray);
  }

  /**
   * Extract API endpoints from service files
   */
  async scanAPIEndpoints() {
    console.log('🔍 Extracting API endpoints...'.blue);
    
    const allFiles = [
      ...this.scanResults.components,
      ...this.scanResults.services,
      ...this.scanResults.pages
    ];

    const endpoints = new Set();

    allFiles.forEach(file => {
      if (file && file.apiCalls) {
        file.apiCalls.forEach(call => {
          // Clean and normalize API endpoints
          let endpoint = call.replace(/^https?:\/\/[^\/]+/, ''); // Remove domain
          endpoint = endpoint.replace(/\$\{.*?\}/g, ':param'); // Replace template literals
          endpoint = endpoint.replace(/\+.*$/, ''); // Remove concatenation
          endpoint = endpoint.split('?')[0]; // Remove query params
          
          if (endpoint && endpoint.startsWith('/')) {
            endpoints.add(endpoint);
          }
        });
      }
    });

    this.scanResults.apiEndpoints = Array.from(endpoints);
    console.log(`   Found ${this.scanResults.apiEndpoints.length} API endpoints`.gray);
  }

  /**
   * Scan for routing configuration
   */
  async scanRoutes() {
    console.log('🔍 Scanning for routing configuration...'.blue);
    
    const routePatterns = [
      /routes\.js$/,
      /router\.js$/,
      /App\.js$/,
      /navigation\.js$/
    ];

    const routeFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      routePatterns
    );

    for (const file of routeFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Extract routes from React Router
        const routeMatches = content.match(/<Route[^>]*path=['"](.*?)['"][^>]*>/g);
        if (routeMatches) {
          routeMatches.forEach(match => {
            const pathMatch = match.match(/path=['"](.*?)['\"]/);
            if (pathMatch) {
              this.scanResults.routes.push({
                path: pathMatch[1],
                file: file,
                routeDefinition: match
              });
            }
          });
        }
      } catch (error) {
        console.log(`⚠️ Error reading route file ${file}: ${error.message}`.yellow);
      }
    }

    console.log(`   Found ${this.scanResults.routes.length} routes`.gray);
  }

  /**
   * Scan for Context providers
   */
  async scanContext() {
    console.log('🔍 Scanning for Context providers...'.blue);
    
    const contextPatterns = [
      /Context\.js$/,
      /context\/.*\.js$/,
      /Provider\.js$/
    ];

    const contextFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      contextPatterns
    );

    for (const file of contextFiles) {
      const contextInfo = this.extractComponentInfo(file);
      if (contextInfo) {
        this.scanResults.context.push(contextInfo);
      }
    }

    console.log(`   Found ${this.scanResults.context.length} context providers`.gray);
  }

  /**
   * Scan for utility functions
   */
  async scanUtils() {
    console.log('🔍 Scanning for utility functions...'.blue);
    
    const utilPatterns = [
      /utils\/.*\.js$/,
      /helpers\/.*\.js$/,
      /utils\.js$/,
      /helpers\.js$/
    ];

    const utilFiles = this.findFiles(
      path.join(this.reactProjectPath, 'src'),
      utilPatterns
    );

    for (const file of utilFiles) {
      const utilInfo = this.extractComponentInfo(file);
      if (utilInfo) {
        this.scanResults.utils.push(utilInfo);
      }
    }

    console.log(`   Found ${this.scanResults.utils.length} utility files`.gray);
  }

  /**
   * Generate scan report
   */
  generateScanReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 REACT PROJECT SCAN REPORT'.cyan.bold);
    console.log('='.repeat(80));

    console.log(`📱 Project Path: ${this.reactProjectPath}`.white);
    console.log(`📊 Scan Results Summary:`.cyan.bold);
    console.log(`   📦 Components: ${this.scanResults.components.length}`.white);
    console.log(`   📄 Pages/Screens: ${this.scanResults.pages.length}`.white);
    console.log(`   🎣 Custom Hooks: ${this.scanResults.hooks.length}`.white);
    console.log(`   🔧 Services: ${this.scanResults.services.length}`.white);
    console.log(`   🌐 API Endpoints: ${this.scanResults.apiEndpoints.length}`.white);
    console.log(`   🛣️ Routes: ${this.scanResults.routes.length}`.white);
    console.log(`   📡 Context Providers: ${this.scanResults.context.length}`.white);
    console.log(`   🛠️ Utilities: ${this.scanResults.utils.length}`.white);

    // Show API endpoints discovered
    if (this.scanResults.apiEndpoints.length > 0) {
      console.log(`\n🌐 Discovered API Endpoints:`.cyan.bold);
      this.scanResults.apiEndpoints.forEach(endpoint => {
        console.log(`   • ${endpoint}`.gray);
      });
    }

    // Show most used hooks
    const allHooks = [];
    [...this.scanResults.components, ...this.scanResults.pages].forEach(comp => {
      if (comp.hooksUsed) {
        allHooks.push(...comp.hooksUsed);
      }
    });

    const hookCounts = allHooks.reduce((acc, hook) => {
      acc[hook] = (acc[hook] || 0) + 1;
      return acc;
    }, {});

    const topHooks = Object.entries(hookCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    if (topHooks.length > 0) {
      console.log(`\n🎣 Most Used Hooks:`.cyan.bold);
      topHooks.forEach(([hook, count]) => {
        console.log(`   • ${hook}: ${count} times`.gray);
      });
    }
  }

  /**
   * Generate React component template
   */
  generateComponentTemplate(componentName, apiEndpoints = [], props = '', hooks = []) {
    const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    
    // Generate API service calls
    const apiCalls = apiEndpoints.map(endpoint => {
      const methodName = endpoint.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'data';
      const httpMethod = endpoint.includes('create') || endpoint.includes('add') ? 'POST' :
                        endpoint.includes('update') || endpoint.includes('edit') ? 'PUT' :
                        endpoint.includes('delete') || endpoint.includes('remove') ? 'DELETE' : 'GET';
      
      return `
  const ${methodName} = async () => {
    try {
      const response = await api.${httpMethod.toLowerCase()}('${endpoint}');
      return response.data;
    } catch (error) {
      console.error('${methodName} error:', error);
      throw error;
    }
  };`;
    }).join('\n');

    // Generate hook imports
    const hookImports = hooks.includes('useState') || hooks.includes('useEffect') ? 
      `import React, { ${hooks.filter(h => h.startsWith('use')).join(', ')} } from 'react';` :
      `import React from 'react';`;

    return `${hookImports}
import { api } from '../services/api';
import './styles/${capitalizedName}.css';

/**
 * ${capitalizedName} Component
 * Generated from React project scan
 */
const ${capitalizedName} = (${props || '{ }'}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // API service functions${apiCalls}

  // Effects
  useEffect(() => {
    // Initialize component
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load initial data
      const result = await getData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="${componentName.toLowerCase()}__loading">Loading...</div>;
  }

  if (error) {
    return <div className="${componentName.toLowerCase()}__error">Error: {error}</div>;
  }

  return (
    <div className="${componentName.toLowerCase()}">
      <div className="${componentName.toLowerCase()}__header">
        <h2>${capitalizedName}</h2>
      </div>
      <div className="${componentName.toLowerCase()}__content">
        {data ? (
          <div className="${componentName.toLowerCase()}__data">
            {/* Render your data here */}
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        ) : (
          <div className="${componentName.toLowerCase()}__empty">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};

export default ${capitalizedName};`;
  }

  /**
   * Generate API service file
   */
  generateAPIService(endpoints) {
    const endpointMethods = endpoints.map(endpoint => {
      const parts = endpoint.split('/').filter(p => p);
      const methodName = parts[parts.length - 1]?.replace(/[^a-zA-Z0-9]/g, '') || 'request';
      const resourceName = parts[parts.length - 2] || 'resource';
      
      // Determine HTTP method based on endpoint pattern
      let httpMethod = 'GET';
      if (endpoint.includes('create') || endpoint.includes('add')) httpMethod = 'POST';
      else if (endpoint.includes('update') || endpoint.includes('edit')) httpMethod = 'PUT';
      else if (endpoint.includes('delete') || endpoint.includes('remove')) httpMethod = 'DELETE';

      return `
  // ${endpoint}
  ${methodName}: (data = null, params = {}) => {
    const url = \`\${BASE_URL}${endpoint}\`;
    return api.request({
      method: '${httpMethod}',
      url,
      data,
      params
    });
  },`;
    }).join('\n');

    return `/**
 * Healthcare API Service
 * Generated from React project scan and HealthCare API endpoints
 */

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const healthcareAPI = {${endpointMethods}
};

export { api };
export default healthcareAPI;`;
  }

  /**
   * Generate all components based on scan results
   */
  async generateComponents(outputDir = 'generated-react-components') {
    console.log('\n🔨 GENERATING REACT COMPONENTS'.cyan.bold);
    
    const outputPath = path.join(this.healthcareAPIPath, outputDir);
    
    // Create output directories
    const directories = [
      'components',
      'pages',
      'hooks',
      'services',
      'styles',
      'utils'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(outputPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // Generate API service
    const apiServiceContent = this.generateAPIService(this.scanResults.apiEndpoints);
    fs.writeFileSync(path.join(outputPath, 'services', 'api.js'), apiServiceContent);
    console.log(`✅ Generated API service: services/api.js`.green);

    // Generate components
    for (const component of this.scanResults.components) {
      const componentContent = this.generateComponentTemplate(
        component.componentName,
        component.apiCalls.filter(call => call.startsWith('/')),
        component.props,
        component.hooksUsed
      );
      
      const fileName = `${component.componentName}.jsx`;
      fs.writeFileSync(path.join(outputPath, 'components', fileName), componentContent);
      
      // Generate basic CSS
      const cssContent = `.${component.componentName.toLowerCase()} {
  padding: 20px;
}

.${component.componentName.toLowerCase()}__header {
  margin-bottom: 20px;
}

.${component.componentName.toLowerCase()}__content {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
}

.${component.componentName.toLowerCase()}__loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.${component.componentName.toLowerCase()}__error {
  color: #d32f2f;
  padding: 10px;
  background: #ffebee;
  border-radius: 4px;
  margin: 10px 0;
}

.${component.componentName.toLowerCase()}__empty {
  text-align: center;
  color: #999;
  padding: 40px;
}`;

      fs.writeFileSync(path.join(outputPath, 'styles', `${component.componentName}.css`), cssContent);
      console.log(`✅ Generated component: ${fileName}`.green);
    }

    // Generate pages
    for (const page of this.scanResults.pages) {
      const pageContent = this.generateComponentTemplate(
        page.componentName,
        page.apiCalls.filter(call => call.startsWith('/')),
        page.props,
        page.hooksUsed
      );
      
      const fileName = `${page.componentName}.jsx`;
      fs.writeFileSync(path.join(outputPath, 'pages', fileName), pageContent);
      console.log(`✅ Generated page: ${fileName}`.green);
    }

    // Generate custom hooks
    for (const hook of this.scanResults.hooks) {
      const hookContent = `import { useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * ${hook.componentName} Hook
 * Generated from React project scan
 */
const ${hook.componentName} = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Implement your data fetching logic here
      const response = await api.get('/data');
      setData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};

export default ${hook.componentName};`;

      const fileName = `${hook.componentName}.js`;
      fs.writeFileSync(path.join(outputPath, 'hooks', fileName), hookContent);
      console.log(`✅ Generated hook: ${fileName}`.green);
    }

    // Generate utils
    const utilsContent = `/**
 * Healthcare App Utilities
 * Generated from React project scan
 */

// Format date for display
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

// Format time for display
export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString();
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number format
export const isValidPhone = (phone) => {
  const phoneRegex = /^\\+?[1-9]\\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\\s-()]/g, ''));
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Local storage helpers
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },
  remove: (key) => {
    localStorage.removeItem(key);
  }
};

// API error handling
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data?.message || 'Server error occurred';
  } else if (error.request) {
    // Request made but no response
    return 'Network error - please check your connection';
  } else {
    // Request setup error
    return error.message || 'An unexpected error occurred';
  }
};`;

    fs.writeFileSync(path.join(outputPath, 'utils', 'index.js'), utilsContent);
    console.log(`✅ Generated utilities: utils/index.js`.green);

    // Generate README
    const readmeContent = `# Generated React Components

This directory contains React components and utilities generated from the React project scan.

## 📁 Structure

- **components/**: Generated React components
- **pages/**: Generated page components  
- **hooks/**: Generated custom hooks
- **services/**: API service layer
- **styles/**: Component CSS files
- **utils/**: Utility functions

## 🚀 Usage

### API Service
\`\`\`javascript
import { healthcareAPI } from './services/api';

// Use the generated API methods
const data = await healthcareAPI.getData();
\`\`\`

### Components
\`\`\`javascript
import MyComponent from './components/MyComponent';

// Use in your JSX
<MyComponent />
\`\`\`

### Hooks
\`\`\`javascript
import useMyHook from './hooks/useMyHook';

// Use in components
const { data, loading, error } = useMyHook();
\`\`\`

## 📊 Generated Files

- **${this.scanResults.components.length}** Components
- **${this.scanResults.pages.length}** Pages
- **${this.scanResults.hooks.length}** Hooks
- **1** API Service
- **1** Utilities file

## 🔧 Integration

1. Copy the generated files to your React project
2. Install required dependencies: \`npm install axios\`
3. Configure API base URL in environment variables
4. Import and use the components in your application

## 📝 Notes

- All components are generated with basic error handling and loading states
- API service includes authentication token management
- CSS files provide basic styling that can be customized
- Utility functions include common helpers for healthcare applications

Generated on: ${new Date().toISOString()}
`;

    fs.writeFileSync(path.join(outputPath, 'README.md'), readmeContent);

    this.generatedComponents = directories;

    console.log(`\n✨ Component generation complete!`.green.bold);
    console.log(`📁 Output directory: ${outputPath}`.cyan);
    console.log(`📊 Generated ${this.scanResults.components.length + this.scanResults.pages.length + this.scanResults.hooks.length + 2} files`.white);
  }

  /**
   * Generate component mapping report
   */
  generateMappingReport() {
    const mappingData = {
      timestamp: new Date().toISOString(),
      reactProject: this.reactProjectPath,
      healthcareAPI: this.healthcareAPIPath,
      mapping: {
        components: this.scanResults.components.map(comp => ({
          name: comp.componentName,
          originalFile: comp.filePath,
          apiEndpoints: comp.apiCalls,
          hooks: comp.hooksUsed,
          generated: true
        })),
        apiEndpoints: this.scanResults.apiEndpoints.map(endpoint => ({
          endpoint,
          method: endpoint.includes('create') || endpoint.includes('add') ? 'POST' :
                  endpoint.includes('update') || endpoint.includes('edit') ? 'PUT' :
                  endpoint.includes('delete') || endpoint.includes('remove') ? 'DELETE' : 'GET',
          implemented: true
        })),
        routes: this.scanResults.routes,
        hooks: this.scanResults.hooks.map(hook => ({
          name: hook.componentName,
          originalFile: hook.filePath,
          generated: true
        }))
      }
    };

    const reportPath = path.join(this.healthcareAPIPath, 'component-mapping-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(mappingData, null, 2));

    console.log(`\n📄 Component mapping report generated: ${reportPath}`.cyan);
    return mappingData;
  }

  /**
   * Main execution method
   */
  async execute(reactProjectPath = null) {
    console.log('🚀 REACT API SCANNER AND COMPONENT GENERATOR'.rainbow.bold);
    console.log('🏥 Healthcare API Integration Tool'.cyan);
    console.log('='.repeat(80));

    if (reactProjectPath) {
      const scanSuccess = await this.scanReactProject(reactProjectPath);
      if (!scanSuccess) {
        return false;
      }

      this.generateScanReport();
      await this.generateComponents();
      this.generateMappingReport();

      console.log('\n🎉 React API integration complete!'.green.bold);
      console.log(`📱 Scanned React project: ${reactProjectPath}`.gray);
      console.log(`🏥 Healthcare API: ${this.healthcareAPIPath}`.gray);
      
      return true;
    } else {
      console.log('❌ Please provide a React project path'.red);
      console.log('Usage: node react-api-scanner.js <react-project-path>'.gray);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const reactProjectPath = args[0];

  if (!reactProjectPath) {
    console.log('❌ React project path is required'.red);
    console.log('Usage: node react-api-scanner.js <react-project-path>'.gray);
    console.log('Example: node react-api-scanner.js /path/to/react/project'.gray);
    process.exit(1);
  }

  const scanner = new ReactAPIScanner();
  scanner.execute(reactProjectPath).catch(console.error);
}

module.exports = ReactAPIScanner;