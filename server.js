// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const mongoose = require('mongoose');

// Load configuration
const { config, validateConfig, PORT, NODE_ENV } = require('./src/shared/config/environment');

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error('🚨 Configuration validation failed:');
  if (configValidation.missing.length > 0) {
    console.error('   Missing required variables:', configValidation.missing.join(', '));
  }
  if (configValidation.weak.length > 0) {
    console.error('   Weak/default values:', configValidation.weak.join(', '));
  }
  if (configValidation.warnings.length > 0) {
    console.warn('⚠️  Placeholder values detected:', configValidation.warnings.join(', '));
  }
}

// Initialize Express app
const app = express();

// ===== DATABASE CONNECTION =====
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected Successfully');
    
    // Initialize project management registry after database connection
    try {
      const projectInitService = require('./src/shared/services/project-initialization');
      await projectInitService.initializeProject();
    } catch (initError) {
      console.log('⚠️ Project initialization warning:', initError.message);
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

console.log('🏥 Starting HealthCare Management API...');
console.log(`📡 Port: ${PORT}`);
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🔒 Security: ${configValidation.valid ? 'VALID' : 'NEEDS ATTENTION'}`);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HealthCare Management API',
      version: '1.0.0',
      description: 'Complete healthcare practice management system REST API',
      contact: {
        name: 'HealthCare Support',
        email: 'support@healthcare.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server (HTTP)'
      },
      {
        url: `https://localhost:${process.env.HTTPS_PORT || 3443}`,
        description: 'Development server (HTTPS)'
      }
    ],
    tags: [
      { name: 'Health', description: 'System health and status monitoring' },
      { name: 'Authentication', description: 'User authentication, login, registration, MFA, biometric auth' },
      { name: 'Patients', description: 'Patient registration, profiles, medical records management' },
      { name: 'Appointments', description: 'Appointment scheduling, calendar management, availability' },
      { name: 'Clinical', description: 'Medical records, clinical notes, vitals, assessments' },
      { name: 'Clinical Notes', description: 'Clinical documentation, progress notes, amendments, medical records' },
      { name: 'Billing', description: 'Payment processing, insurance claims, invoicing' },
      { name: 'Insurance Claims', description: 'Healthcare billing, insurance claim processing, revenue cycle management' },
      { name: 'Insurance', description: 'Insurance verification, eligibility, claims processing' },
      { name: 'Staff', description: 'Healthcare staff management, scheduling, roles' },
      { name: 'Communication', description: 'Patient-provider messaging, notifications' },
      { name: 'Analytics', description: 'Reports, dashboards, business intelligence' },
      { name: 'Administration', description: 'System administration, user management' },
      { name: 'Mobile Features', description: 'Mobile-specific features and integrations' },
      { name: 'Phone Verification', description: 'SMS-based phone number verification' },
      { name: 'Offline Sync', description: 'Offline data synchronization capabilities' },
      { name: 'Biometric Auth', description: 'Biometric authentication (Touch ID, Face ID)' },
      { name: 'Health Integrations', description: 'Apple Health, Google Fit, wearable device sync' },
      { name: 'Push Notifications', description: 'Mobile push notification management' },
      { name: 'Project Management', description: 'Module registry, project analytics, system monitoring' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            message: { type: 'string', example: 'Detailed error description' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object', description: 'Response data' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./server.js', './src/modules/**/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Security middleware
const { basicSecurityHeaders, apiSecurityHeaders } = require('./src/shared/middleware/securityHeaders');
app.use(basicSecurityHeaders);

// Middleware
app.use(cors(config.cors));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Favicon route (explicit handling)
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.use(express.static('public'));

// API security headers for API routes
app.use('/api', apiSecurityHeaders);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== SWAGGER DOCUMENTATION =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HealthCare Management API Documentation',
  explorer: true
}));

/**
 * @swagger
 * /api-docs.json:
 *   get:
 *     tags: [Health]
 *     summary: Get OpenAPI specification as JSON
 *     description: Returns the complete OpenAPI/Swagger specification in JSON format
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ===== HEALTH ENDPOINTS =====
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: System health check
 *     description: Returns the current health status of the API server and its dependencies
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *                   example: "HealthCare Management API is running"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'HealthCare Management API is running',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     tags: [Health]
 *     summary: API status and module information
 *     description: Returns detailed status information about all loaded modules and their availability
 *     responses:
 *       200:
 *         description: API status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 api:
 *                   type: string
 *                   example: "HealthCare Management API"
 *                 status:
 *                   type: string
 *                   example: "operational"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 documentation:
 *                   type: object
 *                   properties:
 *                     swagger:
 *                       type: string
 *                       example: "/api-docs"
 *                     json:
 *                       type: string
 *                       example: "/api-docs.json"
 *                 modules:
 *                   type: object
 *                   description: Status of each loaded module
 */
app.get('/api/status', (req, res) => {
  console.log('📊 API status requested');
  res.json({
    api: 'HealthCare Management API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    documentation: {
      swagger: '/api-docs',
      json: '/api-docs.json'
    },
    modules: [
      'Authentication',
      'Patients', 
      'Appointments',
      'Offline Sync',
      'Clinical',
      'Billing',
      'Communication',
      'Analytics',
      'Staff',
      'Administration',
      'Health Integrations',
      'Push Notifications'
    ]
  });
});

// ===== MODULE ROUTES =====
try {
  // Authentication Module
  const authModule = require('./src/modules/auth');
  app.use('/api/auth', authModule.routes);
  if (authModule.mfaRoutes) {
    app.use('/api/auth/mfa', authModule.mfaRoutes);
  }
  if (authModule.biometricRoutes) {
    app.use('/api/auth/biometric', authModule.biometricRoutes);
  }
  console.log('✅ Auth module loaded');
} catch (e) {
  console.log('⚠️ Auth module not available:', e.message);
  // Mock auth endpoints
  app.get('/api/auth/me', (req, res) => res.json({ message: 'Auth endpoint - implementation needed' }));
  app.post('/api/auth/login', (req, res) => res.json({ message: 'Login endpoint - implementation needed' }));
  app.post('/api/auth/register', (req, res) => res.json({ message: 'Register endpoint - implementation needed' }));
}

try {
  // Patients Module
  const patientsModule = require('./src/modules/patients');
  app.use('/api/patients', patientsModule.routes);
  if (patientsModule.familyRoutes) {
    app.use('/api/family-members', patientsModule.familyRoutes);
  }
  console.log('✅ Patients module loaded');
} catch (e) {
  console.log('⚠️ Patients module not available:', e.message);
  // Mock patients endpoints
  app.get('/api/patients', (req, res) => res.json({ message: 'Patients list - implementation needed', data: [] }));
  app.post('/api/patients', (req, res) => res.json({ message: 'Create patient - implementation needed' }));
}

try {
  // Appointments Module
  const appointmentsModule = require('./src/modules/appointments');
  app.use('/api/appointments', appointmentsModule.routes);
  if (appointmentsModule.checkinRoutes) {
    app.use('/api/checkin', appointmentsModule.checkinRoutes);
  }
  console.log('✅ Appointments module loaded');
} catch (e) {
  console.log('⚠️ Appointments module not available:', e.message);
  // Mock appointments endpoints
  app.get('/api/appointments', (req, res) => res.json({ message: 'Appointments list - implementation needed', data: [] }));
  app.post('/api/appointments', (req, res) => res.json({ message: 'Create appointment - implementation needed' }));
}

try {
  // Offline Sync Module
  const syncModule = require('./src/modules/sync');
  app.use('/api/sync', syncModule.routes);
  console.log('✅ Sync module loaded - Offline sync capabilities enabled');
} catch (e) {
  console.log('⚠️ Sync module not available:', e.message);
  // Mock sync endpoints
  app.get('/api/sync/health', (req, res) => res.json({ message: 'Sync endpoint - implementation needed' }));
}

try {
  // Health Integrations Module
  const healthIntegrationsModule = require('./src/modules/health-integrations');
  app.use('/api/health', healthIntegrationsModule.routes);
  console.log('✅ Health Integrations module loaded - Apple Health & Google Fit sync enabled');
} catch (e) {
  console.log('⚠️ Health Integrations module not available:', e.message);
  // Mock health endpoints
  app.get('/api/health/summary', (req, res) => res.json({ message: 'Health summary endpoint - implementation needed' }));
  app.post('/api/health/sync', (req, res) => res.json({ message: 'Health sync endpoint - implementation needed' }));
}

try {
  // Communication Module (Push Notifications)
  const communicationModule = require('./src/modules/communication');
  app.use('/api/notifications', communicationModule.routes);
  console.log('✅ Communication module loaded - Push notifications enabled');
} catch (e) {
  console.log('⚠️ Communication module not available:', e.message);
  // Mock communication endpoints
  app.get('/api/notifications', (req, res) => res.json({ message: 'Notifications endpoint - implementation needed' }));
  app.post('/api/notifications/send', (req, res) => res.json({ message: 'Send notification endpoint - implementation needed' }));
}

try {
  // Project Management Module
  const projectManagementModule = require('./src/modules/project-management');
  app.use('/api/project', projectManagementModule.routes);
  console.log('✅ Project Management module loaded - Module registry & analytics enabled');
} catch (e) {
  console.log('⚠️ Project Management module not available:', e.message);
  // Mock project management endpoints
  app.get('/api/project/modules', (req, res) => res.json({ message: 'Project modules endpoint - implementation needed' }));
  app.post('/api/project/register', (req, res) => res.json({ message: 'Register module endpoint - implementation needed' }));
}

// ===== ROOT AND ERROR HANDLERS =====
/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: API root endpoint
 *     description: Returns basic API information and available module endpoints
 *     responses:
 *       200:
 *         description: API information and module list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "HealthCare Management API - Modular Architecture"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 documentation:
 *                   type: object
 *                   properties:
 *                     swagger:
 *                       type: string
 *                       example: "/api-docs"
 *                     json:
 *                       type: string
 *                       example: "/api-docs.json"
 *                 architecture:
 *                   type: string
 *                   example: "Module-based organization"
 *                 modules:
 *                   type: object
 *                   description: Available API modules and their base paths
 */
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint accessed');
  res.json({
    message: 'HealthCare Management API - Modular Architecture',
    version: '1.0.0',
    documentation: {
      swagger: '/api-docs',
      json: '/api-docs.json'
    },
    architecture: 'Module-based organization',
    modules: {
      auth: '/api/auth',
      patients: '/api/patients',
      appointments: '/api/appointments',
      sync: '/api/sync',
      health: '/api/health',
      notifications: '/api/notifications',
      clinical: '/api/clinical',
      billing: '/api/billing',
      communication: '/api/messaging',
      analytics: '/api/analytics',
      project: '/api/project'
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 - ${req.path}`);
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    message: 'Check /api-docs for available endpoints',
    suggestion: 'Visit /api/status for module information'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ===== SSL/HTTPS CONFIGURATION =====
let httpsServer = null;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Check if SSL certificates exist
const sslPath = path.join(__dirname, 'ssl');
const certExists = fs.existsSync(path.join(sslPath, 'cert.pem')) && fs.existsSync(path.join(sslPath, 'key.pem'));

if (certExists) {
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(sslPath, 'key.pem')),
      cert: fs.readFileSync(path.join(sslPath, 'cert.pem'))
    };
    httpsServer = https.createServer(httpsOptions, app);
  } catch (error) {
    console.log('⚠️ SSL certificates found but could not be loaded:', error.message);
  }
}

// ===== START SERVER =====
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🎉 ========================================');
  console.log('🏥 HealthCare Management API Started!');
  console.log('🎉 ========================================');
  console.log('');
  console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
  if (httpsServer) {
    console.log(`� HTTPS Server: https://localhost:${HTTPS_PORT}`);
  }
  console.log(`�📚 Swagger: http://localhost:${PORT}/api-docs`);
  if (httpsServer) {
    console.log(`🔒 Swagger (HTTPS): https://localhost:${HTTPS_PORT}/api-docs`);
  }
  console.log(`✅ Health: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log('');
  console.log('📋 Module Architecture:');
  console.log('  🔐 Auth: /api/auth');
  console.log('  👥 Patients: /api/patients');
  console.log('  📅 Appointments: /api/appointments');
  console.log('  🔄 Sync: /api/sync');
  console.log('  ❤️ Health: /api/health');
  console.log('  📨 Notifications: /api/notifications');
  console.log('  🩺 Clinical: /api/clinical');
  console.log('  💰 Billing: /api/billing');
  console.log('  💬 Communication: /api/messaging');
  console.log('  📊 Analytics: /api/analytics');
  console.log('  🎯 Project Management: /api/project');
  console.log('');
  
  // Start HTTPS server if certificates are available
  if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, () => {
      console.log('🔒 HTTPS server started successfully!');
      console.log('');
    });
  } else {
    console.log('⚠️ HTTPS not available - SSL certificates not found');
    console.log('   Run: npm run generate-ssl-cert to create certificates');
    console.log('');
  }
  
  console.log('✅ Ready for healthcare management!');
  
  // Initialize WebSocket service for real-time features
  try {
    const websocketService = require('./src/shared/services/services/websocket.service');
    websocketService.initialize(server);
    if (httpsServer) {
      // Also initialize WebSocket on HTTPS server
      websocketService.initialize(httpsServer);
    }
    console.log('🔗 WebSocket service initialized for real-time dashboard updates');
  } catch (error) {
    console.log('⚠️ WebSocket service not available:', error.message);
  }
  
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down HealthCare API...');
  
  // Close WebSocket connections
  try {
    const websocketService = require('./src/shared/services/services/websocket.service');
    websocketService.close();
    console.log('✅ WebSocket connections closed');
  } catch (error) {
    // WebSocket service might not be initialized
  }
  
  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server stopped');
    
    // Close HTTPS server if it exists
    if (httpsServer) {
      httpsServer.close(() => {
        console.log('✅ HTTPS server stopped');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

module.exports = app;