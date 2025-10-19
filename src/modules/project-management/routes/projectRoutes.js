/**
 * Project Management Routes
 * Routes for managing project modules, components, and analytics
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../../auth/middleware/authMiddleware');
const projectController = require('../controllers/projectController');
const projectProfileController = require('../controllers/projectProfileController');

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectModule:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - description
 *       properties:
 *         name:
 *           type: string
 *           example: "authentication"
 *           description: "Module name"
 *         type:
 *           type: string
 *           enum: [API, UI, Database, Service, Middleware, Utility, Authentication, Integration]
 *           example: "API"
 *         description:
 *           type: string
 *           example: "User authentication and authorization module"
 *         version:
 *           type: string
 *           example: "1.0.0"
 *         status:
 *           type: string
 *           enum: [active, inactive, deprecated, development]
 *           example: "active"
 *         path:
 *           type: string
 *           example: "src/modules/auth"
 *         endpoints:
 *           type: array
 *           items:
 *             type: string
 *           example: ["/api/auth/login", "/api/auth/register"]
 *         components:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               path:
 *                 type: string
 *               size:
 *                 type: number
 *         size:
 *           type: object
 *           properties:
 *             files:
 *               type: number
 *             lines:
 *               type: number
 *             bytes:
 *               type: number
 */

/**
 * @swagger
 * /api/project/modules:
 *   post:
 *     tags: [Project Management]
 *     summary: Register a new project module
 *     description: Add a new module to the project registry with details about its components and endpoints
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectModule'
 *     responses:
 *       201:
 *         description: Module registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Module registered successfully"
 *                 module:
 *                   $ref: '#/components/schemas/ProjectModule'
 *       400:
 *         description: Validation error or module already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     tags: [Project Management]
 *     summary: Get all registered modules
 *     description: Retrieve a list of all modules in the project registry with filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter modules by type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter modules by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of modules to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of modules to skip
 *     responses:
 *       200:
 *         description: List of modules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 modules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProjectModule'
 *                 total:
 *                   type: number
 *                   example: 25
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *                     hasMore:
 *                       type: boolean
 */
// Module Management Routes
router.post('/modules', authMiddleware, projectController.registerModule);
router.get('/modules', authMiddleware, projectController.getModules);

/**
 * @swagger
 * /api/project/modules/{id}:
 *   get:
 *     tags: [Project Management]
 *     summary: Get specific module details
 *     description: Retrieve detailed information about a specific module by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 module:
 *                   $ref: '#/components/schemas/ProjectModule'
 *       404:
 *         description: Module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [Project Management]
 *     summary: Update module information
 *     description: Update details of an existing module
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectModule'
 *     responses:
 *       200:
 *         description: Module updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 module:
 *                   $ref: '#/components/schemas/ProjectModule'
 *       404:
 *         description: Module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Project Management]
 *     summary: Delete a module
 *     description: Remove a module from the project registry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Module ID
 *     responses:
 *       200:
 *         description: Module deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Module deleted successfully"
 *       404:
 *         description: Module not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/modules/:id', authMiddleware, projectController.getModuleById);
router.put('/modules/:id', authMiddleware, projectController.updateModule);
router.delete('/modules/:id', authMiddleware, projectController.deleteModule);

// Component and Endpoint Registration
router.post('/modules/endpoints', authMiddleware, projectController.registerEndpoint);
router.post('/modules/components', authMiddleware, projectController.registerComponent);

// Usage Analytics
router.post('/modules/usage', authMiddleware, projectController.updateUsageStats);
router.get('/analytics/report', authMiddleware, projectController.generateAnalyticsReport);

// Dashboard and Overview
router.get('/dashboard', authMiddleware, projectController.getProjectDashboard);

// Project Scanning
router.post('/scan', authMiddleware, projectController.scanAndRegisterProject);

// Project Profile Routes
router.post('/profiles', authMiddleware, projectProfileController.createOrUpdateProfile);
router.get('/profiles', authMiddleware, projectProfileController.getAllProfiles);
router.get('/profiles/:projectId', authMiddleware, projectProfileController.getProfile);

// Project Studies and Analysis
router.post('/profiles/:projectId/analysis/code', authMiddleware, projectProfileController.runCodeAnalysis);
router.post('/profiles/:projectId/analysis/performance', authMiddleware, projectProfileController.runPerformanceStudy);
router.post('/profiles/:projectId/analysis/security', authMiddleware, projectProfileController.runSecurityAssessment);

// Project Health and Reporting
router.get('/profiles/:projectId/health', authMiddleware, projectProfileController.getProjectHealth);
router.get('/profiles/:projectId/report', authMiddleware, projectProfileController.generateProjectReport);

// Business Metrics
router.post('/profiles/:projectId/metrics', authMiddleware, projectProfileController.updateBusinessMetrics);

// Automated Analysis Scheduling
router.post('/profiles/:projectId/schedule', authMiddleware, projectProfileController.scheduleAnalysis);

module.exports = router;