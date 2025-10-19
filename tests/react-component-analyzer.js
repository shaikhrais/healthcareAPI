/**
 * React Component Analyzer and Backend Generator
 * Analyzes React components to understand data flow and generates corresponding backend APIs
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

class ReactComponentAnalyzer {
  constructor() {
    this.healthcareAPIPath = process.cwd();
    this.analysis = {
      dataModels: new Map(),
      apiEndpoints: new Map(),
      componentHierarchy: new Map(),
      stateManagement: new Map(),
      formStructures: new Map(),
      routeStructures: new Map()
    };
  }

  /**
   * Analyze React component file in detail
   */
  analyzeComponent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath, path.extname(filePath));
      
      console.log(`🔍 Analyzing component: ${fileName}`.blue);

      const analysis = {
        componentName: fileName,
        filePath,
        dataStructures: this.extractDataStructures(content),
        apiCalls: this.extractAPICallsDetailed(content),
        stateVariables: this.extractStateVariables(content),
        props: this.extractProps(content),
        formFields: this.extractFormFields(content),
        eventHandlers: this.extractEventHandlers(content),
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        hooks: this.extractHooksUsage(content),
        routing: this.extractRoutingInfo(content),
        validationRules: this.extractValidation(content)
      };

      this.generateBackendEndpoints(analysis);
      return analysis;
    } catch (error) {
      console.log(`❌ Error analyzing ${filePath}: ${error.message}`.red);
      return null;
    }
  }

  /**
   * Extract data structures from component
   */
  extractDataStructures(content) {
    const structures = [];

    // Extract from useState initial values
    const stateMatches = content.match(/useState\s*\(\s*({[^}]+}|\[[^\]]+\]|[\w'"]+)\s*\)/g);
    if (stateMatches) {
      stateMatches.forEach(match => {
        const valueMatch = match.match(/useState\s*\(\s*([^)]+)\s*\)/);
        if (valueMatch) {
          try {
            const value = valueMatch[1].trim();
            if (value.startsWith('{') || value.startsWith('[')) {
              structures.push({
                type: 'useState',
                structure: value,
                parsed: this.parseDataStructure(value)
              });
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      });
    }

    // Extract from interface/type definitions
    const interfaceMatches = content.match(/interface\s+(\w+)\s*{([^}]+)}/g);
    if (interfaceMatches) {
      interfaceMatches.forEach(match => {
        const interfaceMatch = match.match(/interface\s+(\w+)\s*{([^}]+)}/);
        if (interfaceMatch) {
          structures.push({
            type: 'interface',
            name: interfaceMatch[1],
            structure: interfaceMatch[2],
            parsed: this.parseInterfaceStructure(interfaceMatch[2])
          });
        }
      });
    }

    // Extract from object literals
    const objectMatches = content.match(/(?:const|let|var)\s+\w+\s*=\s*({[^}]+})/g);
    if (objectMatches) {
      objectMatches.forEach(match => {
        const objMatch = match.match(/(?:const|let|var)\s+(\w+)\s*=\s*({[^}]+})/);
        if (objMatch) {
          structures.push({
            type: 'object',
            name: objMatch[1],
            structure: objMatch[2],
            parsed: this.parseDataStructure(objMatch[2])
          });
        }
      });
    }

    return structures;
  }

  /**
   * Parse data structure to understand fields and types
   */
  parseDataStructure(structureString) {
    try {
      // Simple parsing for common patterns
      const fields = [];
      const cleanString = structureString.replace(/[{}]/g, '');
      const parts = cleanString.split(',');

      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed) {
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex > -1) {
            const key = trimmed.substring(0, colonIndex).trim().replace(/['"]/g, '');
            const value = trimmed.substring(colonIndex + 1).trim();
            
            let type = 'string';
            if (value === 'true' || value === 'false') type = 'boolean';
            else if (!isNaN(value)) type = 'number';
            else if (value.startsWith('[')) type = 'array';
            else if (value.startsWith('{')) type = 'object';
            else if (value.includes('Date')) type = 'date';

            fields.push({ key, type, defaultValue: value });
          } else {
            fields.push({ key: trimmed.replace(/['"]/g, ''), type: 'unknown' });
          }
        }
      });

      return fields;
    } catch (e) {
      return [];
    }
  }

  /**
   * Parse interface structure
   */
  parseInterfaceStructure(interfaceBody) {
    const fields = [];
    const lines = interfaceBody.split(/[;\n]/);

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        const match = trimmed.match(/(\w+)(\??):\s*([^;]+)/);
        if (match) {
          fields.push({
            key: match[1],
            optional: !!match[2],
            type: match[3].trim(),
            isInterface: true
          });
        }
      }
    });

    return fields;
  }

  /**
   * Extract detailed API calls with context
   */
  extractAPICallsDetailed(content) {
    const apiCalls = [];

    // Axios calls
    const axiosMatches = content.match(/axios\.(get|post|put|delete|patch)\s*\([^)]+\)/g);
    if (axiosMatches) {
      axiosMatches.forEach(match => {
        const methodMatch = match.match(/axios\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (methodMatch) {
          apiCalls.push({
            library: 'axios',
            method: methodMatch[1].toUpperCase(),
            url: methodMatch[2],
            fullCall: match
          });
        }
      });
    }

    // Fetch calls
    const fetchMatches = content.match(/fetch\s*\([^)]+\)/g);
    if (fetchMatches) {
      fetchMatches.forEach(match => {
        const urlMatch = match.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (urlMatch) {
          const methodMatch = match.match(/method:\s*['"`](\w+)['"`]/);
          apiCalls.push({
            library: 'fetch',
            method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
            url: urlMatch[1],
            fullCall: match
          });
        }
      });
    }

    // Custom API service calls
    const serviceMatches = content.match(/\w+Service\.\w+\([^)]*\)/g);
    if (serviceMatches) {
      serviceMatches.forEach(match => {
        const serviceMatch = match.match(/(\w+)Service\.(\w+)\(/);
        if (serviceMatch) {
          apiCalls.push({
            library: 'service',
            service: serviceMatch[1],
            method: serviceMatch[2],
            fullCall: match
          });
        }
      });
    }

    return apiCalls;
  }

  /**
   * Extract state variables and their types
   */
  extractStateVariables(content) {
    const stateVars = [];

    // useState hooks
    const useStateMatches = content.match(/const\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState\s*\([^)]*\)/g);
    if (useStateMatches) {
      useStateMatches.forEach(match => {
        const varMatch = match.match(/const\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState\s*\(([^)]*)\)/);
        if (varMatch) {
          stateVars.push({
            variable: varMatch[1],
            setter: varMatch[2],
            initialValue: varMatch[3].trim(),
            type: this.inferType(varMatch[3].trim())
          });
        }
      });
    }

    // useReducer hooks
    const useReducerMatches = content.match(/const\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useReducer\s*\([^)]*\)/g);
    if (useReducerMatches) {
      useReducerMatches.forEach(match => {
        const varMatch = match.match(/const\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]/);
        if (varMatch) {
          stateVars.push({
            variable: varMatch[1],
            dispatcher: varMatch[2],
            type: 'reducer',
            stateType: 'complex'
          });
        }
      });
    }

    return stateVars;
  }

  /**
   * Extract props structure
   */
  extractProps(content) {
    const props = [];

    // Function component props
    const funcPropMatches = content.match(/(?:function\s+\w+\s*\(([^)]*)\)|const\s+\w+\s*=\s*\(([^)]*)\)\s*=>)/);
    if (funcPropMatches) {
      const propsString = funcPropMatches[1] || funcPropMatches[2];
      if (propsString && propsString.includes('{')) {
        const destructuredMatch = propsString.match(/{([^}]+)}/);
        if (destructuredMatch) {
          const propNames = destructuredMatch[1].split(',').map(p => p.trim());
          propNames.forEach(propName => {
            const [name, defaultValue] = propName.split('=').map(p => p.trim());
            props.push({
              name: name.replace(/['"]/g, ''),
              defaultValue: defaultValue || undefined,
              type: this.inferType(defaultValue)
            });
          });
        }
      }
    }

    // PropTypes definitions
    const propTypesMatches = content.match(/(\w+)\.propTypes\s*=\s*{([^}]+)}/);
    if (propTypesMatches) {
      const propTypesBody = propTypesMatches[2];
      const propLines = propTypesBody.split(',');
      propLines.forEach(line => {
        const propMatch = line.trim().match(/(\w+):\s*PropTypes\.(\w+)/);
        if (propMatch) {
          props.push({
            name: propMatch[1],
            type: propMatch[2],
            source: 'PropTypes'
          });
        }
      });
    }

    return props;
  }

  /**
   * Extract form fields and validation
   */
  extractFormFields(content) {
    const formFields = [];

    // Input elements
    const inputMatches = content.match(/<input[^>]*>/g);
    if (inputMatches) {
      inputMatches.forEach(match => {
        const nameMatch = match.match(/name=['"]([^'"]+)['"]/);
        const typeMatch = match.match(/type=['"]([^'"]+)['"]/);
        const requiredMatch = match.match(/required/);
        
        if (nameMatch) {
          formFields.push({
            name: nameMatch[1],
            type: typeMatch ? typeMatch[1] : 'text',
            required: !!requiredMatch,
            element: 'input'
          });
        }
      });
    }

    // Select elements
    const selectMatches = content.match(/<select[^>]*name=['"]([^'"]+)['"][^>]*>/g);
    if (selectMatches) {
      selectMatches.forEach(match => {
        const nameMatch = match.match(/name=['"]([^'"]+)['"]/);
        if (nameMatch) {
          formFields.push({
            name: nameMatch[1],
            type: 'select',
            element: 'select'
          });
        }
      });
    }

    // Textarea elements
    const textareaMatches = content.match(/<textarea[^>]*name=['"]([^'"]+)['"][^>]*>/g);
    if (textareaMatches) {
      textareaMatches.forEach(match => {
        const nameMatch = match.match(/name=['"]([^'"]+)['"]/);
        if (nameMatch) {
          formFields.push({
            name: nameMatch[1],
            type: 'textarea',
            element: 'textarea'
          });
        }
      });
    }

    return formFields;
  }

  /**
   * Extract event handlers
   */
  extractEventHandlers(content) {
    const handlers = [];

    // onClick handlers
    const onClickMatches = content.match(/onClick\s*=\s*{([^}]+)}/g);
    if (onClickMatches) {
      onClickMatches.forEach(match => {
        const handlerMatch = match.match(/onClick\s*=\s*{([^}]+)}/);
        if (handlerMatch) {
          handlers.push({
            event: 'click',
            handler: handlerMatch[1].trim()
          });
        }
      });
    }

    // onChange handlers
    const onChangeMatches = content.match(/onChange\s*=\s*{([^}]+)}/g);
    if (onChangeMatches) {
      onChangeMatches.forEach(match => {
        const handlerMatch = match.match(/onChange\s*=\s*{([^}]+)}/);
        if (handlerMatch) {
          handlers.push({
            event: 'change',
            handler: handlerMatch[1].trim()
          });
        }
      });
    }

    // onSubmit handlers
    const onSubmitMatches = content.match(/onSubmit\s*=\s*{([^}]+)}/g);
    if (onSubmitMatches) {
      onSubmitMatches.forEach(match => {
        const handlerMatch = match.match(/onSubmit\s*=\s*{([^}]+)}/);
        if (handlerMatch) {
          handlers.push({
            event: 'submit',
            handler: handlerMatch[1].trim()
          });
        }
      });
    }

    return handlers;
  }

  /**
   * Extract imports
   */
  extractImports(content) {
    const imports = [];
    const importMatches = content.match(/import\s+.*?\s+from\s+['"][^'"]+['"]/g);
    
    if (importMatches) {
      importMatches.forEach(match => {
        const parts = match.match(/import\s+(.*?)\s+from\s+['"]([^'"]+)['"]/);
        if (parts) {
          imports.push({
            imports: parts[1].trim(),
            from: parts[2],
            statement: match
          });
        }
      });
    }

    return imports;
  }

  /**
   * Extract exports
   */
  extractExports(content) {
    const exports = [];
    
    // Default exports
    const defaultExportMatches = content.match(/export\s+default\s+(\w+)/g);
    if (defaultExportMatches) {
      defaultExportMatches.forEach(match => {
        const nameMatch = match.match(/export\s+default\s+(\w+)/);
        if (nameMatch) {
          exports.push({
            type: 'default',
            name: nameMatch[1]
          });
        }
      });
    }

    // Named exports
    const namedExportMatches = content.match(/export\s+(?:const|function|class)\s+(\w+)/g);
    if (namedExportMatches) {
      namedExportMatches.forEach(match => {
        const nameMatch = match.match(/export\s+(?:const|function|class)\s+(\w+)/);
        if (nameMatch) {
          exports.push({
            type: 'named',
            name: nameMatch[1]
          });
        }
      });
    }

    return exports;
  }

  /**
   * Extract hooks usage
   */
  extractHooksUsage(content) {
    const hooks = [];
    const hookMatches = content.match(/use\w+\s*\([^)]*\)/g);
    
    if (hookMatches) {
      hookMatches.forEach(match => {
        const hookMatch = match.match(/(use\w+)\s*\(([^)]*)\)/);
        if (hookMatch) {
          hooks.push({
            name: hookMatch[1],
            params: hookMatch[2].trim(),
            fullCall: match
          });
        }
      });
    }

    return hooks;
  }

  /**
   * Extract routing information
   */
  extractRoutingInfo(content) {
    const routing = [];

    // React Router Route components
    const routeMatches = content.match(/<Route[^>]*>/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const pathMatch = match.match(/path=['"]([^'"]+)['"]/);
        const componentMatch = match.match(/component={(\w+)}/);
        const elementMatch = match.match(/element={<(\w+)[^>]*>}/);
        
        if (pathMatch) {
          routing.push({
            path: pathMatch[1],
            component: componentMatch ? componentMatch[1] : (elementMatch ? elementMatch[1] : null),
            routeDefinition: match
          });
        }
      });
    }

    // Navigation/Link components
    const linkMatches = content.match(/<Link[^>]*to=['"]([^'"]+)['"][^>]*>/g);
    if (linkMatches) {
      linkMatches.forEach(match => {
        const toMatch = match.match(/to=['"]([^'"]+)['"]/);
        if (toMatch) {
          routing.push({
            type: 'link',
            to: toMatch[1],
            linkDefinition: match
          });
        }
      });
    }

    return routing;
  }

  /**
   * Extract validation rules
   */
  extractValidation(content) {
    const validations = [];

    // Yup schema validations
    const yupMatches = content.match(/Yup\.\w+\(\)(?:\.\w+\([^)]*\))*/g);
    if (yupMatches) {
      yupMatches.forEach(match => {
        validations.push({
          library: 'yup',
          rule: match
        });
      });
    }

    // Joi validations
    const joiMatches = content.match(/Joi\.\w+\(\)(?:\.\w+\([^)]*\))*/g);
    if (joiMatches) {
      joiMatches.forEach(match => {
        validations.push({
          library: 'joi',
          rule: match
        });
      });
    }

    // Custom validation functions
    const customValidationMatches = content.match(/const\s+(\w*[Vv]alidat\w*)\s*=\s*\([^)]*\)\s*=>/g);
    if (customValidationMatches) {
      customValidationMatches.forEach(match => {
        const nameMatch = match.match(/const\s+(\w+)/);
        if (nameMatch) {
          validations.push({
            library: 'custom',
            name: nameMatch[1],
            rule: match
          });
        }
      });
    }

    return validations;
  }

  /**
   * Generate backend endpoints based on component analysis
   */
  generateBackendEndpoints(analysis) {
    const endpoints = [];

    // Generate CRUD endpoints based on data structures
    analysis.dataStructures.forEach(structure => {
      if (structure.type === 'interface' || (structure.type === 'object' && structure.parsed.length > 2)) {
        const resourceName = structure.name?.toLowerCase() || 'resource';
        
        endpoints.push({
          method: 'GET',
          path: `/api/${resourceName}`,
          description: `Get all ${resourceName} records`,
          requestBody: null,
          responseBody: structure.parsed
        });

        endpoints.push({
          method: 'GET',
          path: `/api/${resourceName}/:id`,
          description: `Get ${resourceName} by ID`,
          requestBody: null,
          responseBody: structure.parsed
        });

        endpoints.push({
          method: 'POST',
          path: `/api/${resourceName}`,
          description: `Create new ${resourceName}`,
          requestBody: structure.parsed,
          responseBody: structure.parsed
        });

        endpoints.push({
          method: 'PUT',
          path: `/api/${resourceName}/:id`,
          description: `Update ${resourceName}`,
          requestBody: structure.parsed,
          responseBody: structure.parsed
        });

        endpoints.push({
          method: 'DELETE',
          path: `/api/${resourceName}/:id`,
          description: `Delete ${resourceName}`,
          requestBody: null,
          responseBody: { message: 'string', success: 'boolean' }
        });
      }
    });

    // Generate endpoints based on API calls found
    analysis.apiCalls.forEach(apiCall => {
      if (apiCall.url && apiCall.url.startsWith('/api/')) {
        endpoints.push({
          method: apiCall.method,
          path: apiCall.url,
          description: `${apiCall.method} endpoint for ${apiCall.url}`,
          source: 'existing_call',
          library: apiCall.library
        });
      }
    });

    // Generate endpoints based on form submissions
    if (analysis.formFields.length > 0 && analysis.eventHandlers.some(h => h.event === 'submit')) {
      const resourceName = analysis.componentName.toLowerCase().replace(/form|component/g, '');
      
      endpoints.push({
        method: 'POST',
        path: `/api/${resourceName}/submit`,
        description: `Submit ${resourceName} form`,
        requestBody: analysis.formFields.map(field => ({
          key: field.name,
          type: field.type === 'email' ? 'string' : field.type,
          required: field.required
        })),
        responseBody: { message: 'string', success: 'boolean' }
      });
    }

    analysis.generatedEndpoints = endpoints;
    this.analysis.apiEndpoints.set(analysis.componentName, endpoints);
  }

  /**
   * Generate Express.js route files
   */
  generateExpressRoutes(componentAnalysis) {
    const routes = [];
    const endpoints = componentAnalysis.generatedEndpoints || [];

    endpoints.forEach(endpoint => {
      const routeCode = this.generateRouteCode(endpoint);
      routes.push(routeCode);
    });

    if (routes.length === 0) return null;

    const resourceName = componentAnalysis.componentName.toLowerCase().replace(/component|form/g, '');
    
    const routeFileContent = `/**
 * ${componentAnalysis.componentName} Routes
 * Generated from React component analysis
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../auth/middleware/authMiddleware');
const ${resourceName}Controller = require('../controllers/${resourceName}Controller');

${routes.join('\n\n')}

module.exports = router;`;

    return {
      filename: `${resourceName}Routes.js`,
      content: routeFileContent,
      resourceName
    };
  }

  /**
   * Generate route code for endpoint
   */
  generateRouteCode(endpoint) {
    const pathWithoutApi = endpoint.path.replace('/api', '');
    const routePath = pathWithoutApi || '/';
    
    return `// ${endpoint.description}
router.${endpoint.method.toLowerCase()}('${routePath}', authenticateToken, ${endpoint.method.toLowerCase()}${endpoint.path.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'Handler'});`;
  }

  /**
   * Generate controller files
   */
  generateController(componentAnalysis) {
    const endpoints = componentAnalysis.generatedEndpoints || [];
    if (endpoints.length === 0) return null;

    const resourceName = componentAnalysis.componentName.toLowerCase().replace(/component|form/g, '');
    const controllerMethods = [];

    endpoints.forEach(endpoint => {
      const methodName = `${endpoint.method.toLowerCase()}${endpoint.path.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'Handler'}`;
      
      let methodBody = '';
      switch (endpoint.method) {
        case 'GET':
          if (endpoint.path.includes(':id')) {
            methodBody = this.generateGetByIdMethod(resourceName, endpoint);
          } else {
            methodBody = this.generateGetAllMethod(resourceName, endpoint);
          }
          break;
        case 'POST':
          methodBody = this.generatePostMethod(resourceName, endpoint);
          break;
        case 'PUT':
          methodBody = this.generatePutMethod(resourceName, endpoint);
          break;
        case 'DELETE':
          methodBody = this.generateDeleteMethod(resourceName, endpoint);
          break;
      }

      controllerMethods.push(`
/**
 * ${endpoint.description}
 */
const ${methodName} = async (req, res) => {
${methodBody}
};`);
    });

    const controllerContent = `/**
 * ${componentAnalysis.componentName} Controller
 * Generated from React component analysis
 */

const ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} = require('../models/${resourceName}Model');

${controllerMethods.join('\n')}

module.exports = {
${endpoints.map(endpoint => {
  const methodName = `${endpoint.method.toLowerCase()}${endpoint.path.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'Handler'}`;
  return `  ${methodName}`;
}).join(',\n')}
};`;

    return {
      filename: `${resourceName}Controller.js`,
      content: controllerContent,
      resourceName
    };
  }

  /**
   * Generate specific method implementations
   */
  generateGetAllMethod(resourceName, endpoint) {
    return `  try {
    const ${resourceName}s = await ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}.find()
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ${resourceName}s,
      count: ${resourceName}s.length
    });
  } catch (error) {
    console.error('Get ${resourceName}s error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ${resourceName}s',
      error: error.message
    });
  }`;
  }

  generateGetByIdMethod(resourceName, endpoint) {
    return `  try {
    const ${resourceName} = await ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}.findById(req.params.id);
    
    if (!${resourceName}) {
      return res.status(404).json({
        success: false,
        message: '${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} not found'
      });
    }

    res.json({
      success: true,
      data: ${resourceName}
    });
  } catch (error) {
    console.error('Get ${resourceName} error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ${resourceName}',
      error: error.message
    });
  }`;
  }

  generatePostMethod(resourceName, endpoint) {
    const fields = endpoint.requestBody || [];
    const validationCode = fields.length > 0 ? `
    // Validate required fields
    const requiredFields = [${fields.filter(f => f.required).map(f => `'${f.key}'`).join(', ')}];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: \`\${field} is required\`
        });
      }
    }` : '';

    return `  try {${validationCode}

    const ${resourceName}Data = {
${fields.map(f => `      ${f.key}: req.body.${f.key}`).join(',\n') || '      ...req.body'}
    };

    const new${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} = new ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}(${resourceName}Data);
    const saved${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} = await new${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}.save();

    res.status(201).json({
      success: true,
      message: '${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} created successfully',
      data: saved${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}
    });
  } catch (error) {
    console.error('Create ${resourceName} error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ${resourceName}',
      error: error.message
    });
  }`;
  }

  generatePutMethod(resourceName, endpoint) {
    return `  try {
    const ${resourceName} = await ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!${resourceName}) {
      return res.status(404).json({
        success: false,
        message: '${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} not found'
      });
    }

    res.json({
      success: true,
      message: '${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} updated successfully',
      data: ${resourceName}
    });
  } catch (error) {
    console.error('Update ${resourceName} error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ${resourceName}',
      error: error.message
    });
  }`;
  }

  generateDeleteMethod(resourceName, endpoint) {
    return `  try {
    const ${resourceName} = await ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}.findByIdAndDelete(req.params.id);

    if (!${resourceName}) {
      return res.status(404).json({
        success: false,
        message: '${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} not found'
      });
    }

    res.json({
      success: true,
      message: '${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} deleted successfully'
    });
  } catch (error) {
    console.error('Delete ${resourceName} error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ${resourceName}',
      error: error.message
    });
  }`;
  }

  /**
   * Generate Mongoose model
   */
  generateModel(componentAnalysis) {
    const dataStructures = componentAnalysis.dataStructures || [];
    const formFields = componentAnalysis.formFields || [];
    
    // Combine fields from data structures and forms
    let fields = [];
    
    dataStructures.forEach(structure => {
      if (structure.parsed) {
        fields.push(...structure.parsed);
      }
    });

    formFields.forEach(field => {
      if (!fields.find(f => f.key === field.name)) {
        fields.push({
          key: field.name,
          type: field.type,
          required: field.required
        });
      }
    });

    if (fields.length === 0) {
      // Default fields if none found
      fields = [
        { key: 'name', type: 'string', required: true },
        { key: 'description', type: 'string' }
      ];
    }

    const resourceName = componentAnalysis.componentName.toLowerCase().replace(/component|form/g, '');
    
    const schemaFields = fields.map(field => {
      let typeMapping = 'String';
      switch (field.type) {
        case 'number': typeMapping = 'Number'; break;
        case 'boolean': typeMapping = 'Boolean'; break;
        case 'date': typeMapping = 'Date'; break;
        case 'array': typeMapping = 'Array'; break;
        case 'object': typeMapping = 'Object'; break;
        default: typeMapping = 'String';
      }

      return `  ${field.key}: {
    type: ${typeMapping},${field.required ? '\n    required: true,' : ''}
    trim: true
  }`;
    }).join(',\n');

    const modelContent = `/**
 * ${componentAnalysis.componentName} Model
 * Generated from React component analysis
 */

const mongoose = require('mongoose');

const ${resourceName}Schema = new mongoose.Schema({
${schemaFields},
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
${resourceName}Schema.index({ createdAt: -1 });

// Pre-save middleware
${resourceName}Schema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}', ${resourceName}Schema);`;

    return {
      filename: `${resourceName}Model.js`,
      content: modelContent,
      resourceName
    };
  }

  /**
   * Infer type from value
   */
  inferType(value) {
    if (!value || value === 'undefined') return 'unknown';
    
    value = value.trim();
    
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(value) && value !== '') return 'number';
    if (value.startsWith('[')) return 'array';
    if (value.startsWith('{')) return 'object';
    if (value.includes('Date') || value.includes('date')) return 'date';
    if (value.startsWith('"') || value.startsWith("'")) return 'string';
    
    return 'string';
  }

  /**
   * Main execution method
   */
  async execute(reactComponentPath) {
    console.log('🚀 REACT COMPONENT ANALYZER AND BACKEND GENERATOR'.rainbow.bold);
    console.log('🔍 Deep Component Analysis and API Generation'.cyan);
    console.log('='.repeat(80));

    if (!reactComponentPath || !fs.existsSync(reactComponentPath)) {
      console.log('❌ React component file not found'.red);
      return false;
    }

    try {
      const analysis = this.analyzeComponent(reactComponentPath);
      if (!analysis) {
        console.log('❌ Component analysis failed'.red);
        return false;
      }

      console.log('\n📊 COMPONENT ANALYSIS REPORT'.cyan.bold);
      console.log(`📁 Component: ${analysis.componentName}`.white);
      console.log(`📄 File: ${analysis.filePath}`.gray);
      console.log(`📦 Data Structures: ${analysis.dataStructures.length}`.white);
      console.log(`🌐 API Calls: ${analysis.apiCalls.length}`.white);
      console.log(`🎛️ State Variables: ${analysis.stateVariables.length}`.white);
      console.log(`📝 Form Fields: ${analysis.formFields.length}`.white);
      console.log(`🎯 Event Handlers: ${analysis.eventHandlers.length}`.white);
      console.log(`🔗 Imports: ${analysis.imports.length}`.white);

      // Generate backend files
      console.log('\n🔨 GENERATING BACKEND FILES'.cyan.bold);
      
      const outputDir = path.join(this.healthcareAPIPath, 'generated-backend');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate routes
      const routeFile = this.generateExpressRoutes(analysis);
      if (routeFile) {
        const routePath = path.join(outputDir, routeFile.filename);
        fs.writeFileSync(routePath, routeFile.content);
        console.log(`✅ Generated routes: ${routeFile.filename}`.green);
      }

      // Generate controller
      const controllerFile = this.generateController(analysis);
      if (controllerFile) {
        const controllerPath = path.join(outputDir, controllerFile.filename);
        fs.writeFileSync(controllerPath, controllerFile.content);
        console.log(`✅ Generated controller: ${controllerFile.filename}`.green);
      }

      // Generate model
      const modelFile = this.generateModel(analysis);
      if (modelFile) {
        const modelPath = path.join(outputDir, modelFile.filename);
        fs.writeFileSync(modelPath, modelFile.content);
        console.log(`✅ Generated model: ${modelFile.filename}`.green);
      }

      // Generate analysis report
      const reportPath = path.join(outputDir, 'component-analysis-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
      console.log(`✅ Generated analysis report: component-analysis-report.json`.green);

      console.log('\n🎉 Component analysis and backend generation complete!'.green.bold);
      console.log(`📁 Output directory: ${outputDir}`.cyan);
      
      return true;
    } catch (error) {
      console.log(`❌ Error during analysis: ${error.message}`.red);
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const componentPath = args[0];

  if (!componentPath) {
    console.log('❌ React component file path is required'.red);
    console.log('Usage: node react-component-analyzer.js <component-file-path>'.gray);
    console.log('Example: node react-component-analyzer.js /path/to/UserForm.jsx'.gray);
    process.exit(1);
  }

  const analyzer = new ReactComponentAnalyzer();
  analyzer.execute(componentPath).catch(console.error);
}

module.exports = ReactComponentAnalyzer;