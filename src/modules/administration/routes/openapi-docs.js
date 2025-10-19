/**
 * @swagger
 * components:
 *   schemas:
 *     OpenApiDocs:
 *       type: object
 *       properties:
 *         docId:
 *           type: string
 *           description: Documentation identifier
 *         organization:
 *           type: string
 *           description: Organization ID
 *         openApiSpec:
 *           type: object
 *           description: OpenAPI specification metadata
 *           properties:
 *             version:
 *               type: string
 *               example: "3.0.3"
 *             info:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   example: "ExpoJane API"
 *                 description:
 *                   type: string
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 contact:
 *                   type: object
 *                 license:
 *                   type: object
 *             servers:
 *               type: array
 *               items:
 *                 type: object
 *         endpoints:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ApiEndpoint'
 *         schemas:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ApiSchema'
 *         tags:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               endpointCount:
 *                 type: integer
 *         totalEndpoints:
 *           type: integer
 *         totalSchemas:
 *           type: integer
 *         documentationScore:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         isPublic:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     ApiEndpoint:
 *       type: object
 *       properties:
 *         endpointId:
 *           type: string
 *         method:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         path:
 *           type: string
 *         summary:
 *           type: string
 *         description:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         deprecated:
 *           type: boolean
 *         parameters:
 *           type: array
 *         requestBody:
 *           type: object
 *         responses:
 *           type: object
 *         security:
 *           type: array
 *         views:
 *           type: integer
 *         lastViewed:
 *           type: string
 *           format: date-time
 * 
 *     ApiSchema:
 *       type: object
 *       properties:
 *         schemaId:
 *           type: string
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         properties:
 *           type: object
 *         required:
 *           type: array
 *           items:
 *             type: string
 *         example:
 *           type: object
 * 
 *     TryItOutRequest:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *         endpointId:
 *           type: string
 *         userId:
 *           type: string
 *         method:
 *           type: string
 *         path:
 *           type: string
 *         requestData:
 *           type: object
 *           properties:
 *             headers:
 *               type: object
 *             query:
 *               type: object
 *             body:
 *               type: object
 *         responseData:
 *           type: object
 *           properties:
 *             status:
 *               type: integer
 *             headers:
 *               type: object
 *             body:
 *               type: object
 *             duration:
 *               type: number
 *         success:
 *           type: boolean
 *         timestamp:
 *           type: string
 *           format: date-time
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * security:
 *   - bearerAuth: []
 * 
 * tags:
 *   - name: OpenAPI Documentation
 *     description: Comprehensive OpenAPI documentation management system
 *   - name: API Endpoints
 *     description: Endpoint documentation and management operations
 *   - name: API Schemas
 *     description: Schema definition and management operations
 *   - name: Documentation Analytics
 *     description: Usage analytics and performance metrics for API documentation
 */

const express = require('express');
const OpenApiDocs = require('../models/OpenApiDocs');
const router = express.Router();
// Middleware to extract user and organization from headers
const extractContext = (req, res, next) => {
  req.userId = req.headers['x-user-id'];
  req.organizationId = req.headers['x-organization-id'];
  next();
};

router.use(extractContext);

/**
 * @swagger
 * /api/administration/openapi-docs/initialize:
 *   post:
 *     summary: Initialize OpenAPI documentation
 *     description: Set up OpenAPI documentation system for an organization with default configuration and metadata
 *     tags:
 *       - OpenAPI Documentation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               version:
 *                 type: string
 *                 description: OpenAPI specification version
 *                 default: "3.0.3"
 *               title:
 *                 type: string
 *                 description: API title
 *                 default: "ExpoJane API"
 *               description:
 *                 type: string
 *                 description: API description
 *               apiVersion:
 *                 type: string
 *                 description: API version
 *                 default: "1.0.0"
 *               contact:
 *                 type: object
 *                 description: Contact information
 *               license:
 *                 type: object
 *                 description: License information
 *               servers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     description:
 *                       type: string
 *               playground:
 *                 type: object
 *                 description: API playground configuration
 *               settings:
 *                 type: object
 *                 description: Documentation settings
 *     responses:
 *       200:
 *         description: Documentation already initialized
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
 *                   example: "OpenAPI documentation already initialized"
 *                 data:
 *                   $ref: '#/components/schemas/OpenApiDocs'
 *       201:
 *         description: Documentation initialized successfully
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
 *                   example: "OpenAPI documentation initialized successfully"
 *                 data:
 *                   $ref: '#/components/schemas/OpenApiDocs'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/initialize', async (req, res) => {
  try {
    const { organizationId } = req;

    // Check if already initialized
    let docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (docs) {
      return res.status(200).json({
        success: true,
        message: 'OpenAPI documentation already initialized',
        data: docs,
      });
    }

    // Create new documentation
    docs = await OpenApiDocs.create({
      organization: organizationId,
      openApiSpec: {
        version: req.body.version || '3.0.3',
        info: {
          title: req.body.title || 'ExpoJane API',
          description:
            req.body.description || 'Comprehensive API for healthcare practice management',
          version: req.body.apiVersion || '1.0.0',
          contact: req.body.contact,
          license: req.body.license,
        },
        servers: req.body.servers || [
          {
            url: 'http://localhost:3001',
            description: 'Development server',
          },
        ],
        externalDocs: req.body.externalDocs,
      },
      playground: req.body.playground || {},
      settings: req.body.settings || {},
      createdBy: req.userId,
    });

    res.status(201).json({
      success: true,
      message: 'OpenAPI documentation initialized successfully',
      data: docs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize OpenAPI documentation',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/config:
 *   get:
 *     summary: Get documentation configuration
 *     description: Retrieve current OpenAPI documentation configuration including specifications, settings, and statistics
 *     tags:
 *       - OpenAPI Documentation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     openApiSpec:
 *                       type: object
 *                       description: OpenAPI specification
 *                     settings:
 *                       type: object
 *                       description: Documentation settings
 *                     playground:
 *                       type: object
 *                       description: Playground configuration
 *                     totalEndpoints:
 *                       type: integer
 *                     totalSchemas:
 *                       type: integer
 *                     documentationScore:
 *                       type: number
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/config', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    res.json({
      success: true,
      data: {
        openApiSpec: docs.openApiSpec,
        settings: docs.settings,
        playground: docs.playground,
        totalEndpoints: docs.totalEndpoints,
        totalSchemas: docs.totalSchemas,
        documentationScore: docs.documentationScore,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get documentation configuration',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/config:
 *   put:
 *     summary: Update documentation configuration
 *     description: Update OpenAPI documentation configuration including specifications, settings, and playground options
 *     tags:
 *       - OpenAPI Documentation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openApiSpec:
 *                 type: object
 *                 description: OpenAPI specification updates
 *               settings:
 *                 type: object
 *                 description: Documentation settings updates
 *               playground:
 *                 type: object
 *                 description: Playground configuration updates
 *     responses:
 *       200:
 *         description: Configuration updated successfully
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
 *                   example: "Documentation configuration updated"
 *                 data:
 *                   $ref: '#/components/schemas/OpenApiDocs'
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/config', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    if (req.body.openApiSpec) {
      Object.assign(docs.openApiSpec, req.body.openApiSpec);
    }
    if (req.body.settings) {
      Object.assign(docs.settings, req.body.settings);
    }
    if (req.body.playground) {
      Object.assign(docs.playground, req.body.playground);
    }

    docs.lastModifiedBy = userId;
    await docs.save();

    res.json({
      success: true,
      message: 'Documentation configuration updated',
      data: docs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/endpoints:
 *   post:
 *     summary: Add new endpoint documentation
 *     description: Add a new API endpoint to the documentation with comprehensive details including parameters, responses, and examples
 *     tags:
 *       - API Endpoints
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *               - path
 *               - summary
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *                 description: HTTP method
 *               path:
 *                 type: string
 *                 description: API endpoint path
 *                 example: "/api/patients"
 *               summary:
 *                 type: string
 *                 description: Brief endpoint description
 *               description:
 *                 type: string
 *                 description: Detailed endpoint description
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Endpoint tags for categorization
 *               parameters:
 *                 type: array
 *                 description: Request parameters
 *               requestBody:
 *                 type: object
 *                 description: Request body schema
 *               responses:
 *                 type: object
 *                 description: Response schemas by status code
 *               security:
 *                 type: array
 *                 description: Security requirements
 *               deprecated:
 *                 type: boolean
 *                 description: Whether endpoint is deprecated
 *     responses:
 *       201:
 *         description: Endpoint added successfully
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
 *                   example: "Endpoint added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ApiEndpoint'
 *       400:
 *         description: Bad request - Invalid endpoint data
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/endpoints', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.addEndpoint(req.body);

    res.status(201).json({
      success: true,
      message: 'Endpoint added successfully',
      data: docs.endpoints[docs.endpoints.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add endpoint',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/endpoints:
 *   get:
 *     summary: Get all documented endpoints
 *     description: Retrieve all API endpoints with optional filtering by tag, method, deprecation status, or search term
 *     tags:
 *       - API Endpoints
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by endpoint tag
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         description: Filter by HTTP method
 *       - in: query
 *         name: deprecated
 *         schema:
 *           type: boolean
 *         description: Filter by deprecation status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in path, summary, or description
 *     responses:
 *       200:
 *         description: Endpoints retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiEndpoint'
 *                 count:
 *                   type: integer
 *                   description: Number of endpoints returned
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/endpoints', async (req, res) => {
  try {
    const { organizationId } = req;
    const { tag, method, deprecated, search } = req.query;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    let { endpoints } = docs;

    // Apply filters
    if (tag) {
      endpoints = endpoints.filter((e) => e.tags.includes(tag));
    }
    if (method) {
      endpoints = endpoints.filter((e) => e.method === method.toUpperCase());
    }
    if (deprecated !== undefined) {
      endpoints = endpoints.filter((e) => e.deprecated === (deprecated === 'true'));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      endpoints = endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(searchLower) ||
          e.summary.toLowerCase().includes(searchLower) ||
          (e.description && e.description.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      success: true,
      data: endpoints,
      count: endpoints.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get endpoints',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/endpoints/{endpointId}:
 *   get:
 *     summary: Get specific endpoint documentation
 *     description: Retrieve detailed documentation for a specific API endpoint including full specifications and view tracking
 *     tags:
 *       - API Endpoints
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: endpointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique endpoint identifier
 *     responses:
 *       200:
 *         description: Endpoint documentation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiEndpoint'
 *       404:
 *         description: Endpoint or documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/endpoints/:endpointId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { endpointId } = req.params;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const endpoint = docs.endpoints.find((e) => e.endpointId === endpointId);

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        message: 'Endpoint not found',
      });
    }

    // Record view
    await docs.recordEndpointView(endpointId);

    res.json({
      success: true,
      data: endpoint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get endpoint',
      error: error.message,
    });
  }
});

// PUT /api/openapi-docs/endpoints/:endpointId - Update endpoint
router.put('/endpoints/:endpointId', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { endpointId } = req.params;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.updateEndpoint(endpointId, req.body);
    docs.lastModifiedBy = userId;
    await docs.save();

    const updatedEndpoint = docs.endpoints.find((e) => e.endpointId === endpointId);

    res.json({
      success: true,
      message: 'Endpoint updated successfully',
      data: updatedEndpoint,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update endpoint',
      error: error.message,
    });
  }
});

// DELETE /api/openapi-docs/endpoints/:endpointId - Delete endpoint
router.delete('/endpoints/:endpointId', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { endpointId } = req.params;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.deleteEndpoint(endpointId);
    docs.lastModifiedBy = userId;
    await docs.save();

    res.json({
      success: true,
      message: 'Endpoint deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete endpoint',
      error: error.message,
    });
  }
});

// POST /api/openapi-docs/endpoints/:endpointId/deprecate - Deprecate endpoint
router.post('/endpoints/:endpointId/deprecate', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { endpointId } = req.params;
    const { reason, replacementEndpoint } = req.body;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.updateEndpoint(endpointId, {
      deprecated: true,
      deprecationDate: new Date(),
      deprecationReason: reason,
      replacementEndpoint,
    });

    docs.lastModifiedBy = userId;
    await docs.save();

    res.json({
      success: true,
      message: 'Endpoint deprecated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deprecate endpoint',
      error: error.message,
    });
  }
});

// POST /api/openapi-docs/endpoints/:endpointId/code-samples - Add code sample
router.post('/endpoints/:endpointId/code-samples', async (req, res) => {
  try {
    const { organizationId } = req;
    const { endpointId } = req.params;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.addCodeSample(endpointId, req.body);

    res.status(201).json({
      success: true,
      message: 'Code sample added successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add code sample',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/schemas:
 *   post:
 *     summary: Add schema definition
 *     description: Add a new data schema definition to the OpenAPI documentation for reusable component schemas
 *     tags:
 *       - API Schemas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: Schema name
 *                 example: "Patient"
 *               type:
 *                 type: string
 *                 description: Schema type
 *                 example: "object"
 *               properties:
 *                 type: object
 *                 description: Schema properties definition
 *               required:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required property names
 *               example:
 *                 type: object
 *                 description: Example data
 *               description:
 *                 type: string
 *                 description: Schema description
 *     responses:
 *       201:
 *         description: Schema added successfully
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
 *                   example: "Schema added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ApiSchema'
 *       400:
 *         description: Bad request - Invalid schema data
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/schemas', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.addSchema(req.body);

    res.status(201).json({
      success: true,
      message: 'Schema added successfully',
      data: docs.schemas[docs.schemas.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add schema',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/schemas - Get all schemas
router.get('/schemas', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    res.json({
      success: true,
      data: docs.schemas,
      count: docs.schemas.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get schemas',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/schemas/:schemaId - Get specific schema
router.get('/schemas/:schemaId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { schemaId } = req.params;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const schema = docs.schemas.find((s) => s.schemaId === schemaId);

    if (!schema) {
      return res.status(404).json({
        success: false,
        message: 'Schema not found',
      });
    }

    res.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get schema',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/tags - Get all tags
router.get('/tags', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    res.json({
      success: true,
      data: docs.tags,
      count: docs.tags.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get tags',
      error: error.message,
    });
  }
});

// POST /api/openapi-docs/tags - Add new tag
router.post('/tags', async (req, res) => {
  try {
    const { organizationId } = req;
    const { name, description, externalDocs } = req.body;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    // Check if tag already exists
    const existingTag = docs.tags.find((t) => t.name === name);
    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag already exists',
      });
    }

    docs.tags.push({
      name,
      description,
      externalDocs,
      endpointCount: 0,
    });

    await docs.save();

    res.status(201).json({
      success: true,
      message: 'Tag added successfully',
      data: docs.tags[docs.tags.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add tag',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/try-it-out:
 *   post:
 *     summary: Execute API call from playground
 *     description: Test an API endpoint directly from the documentation playground. Records execution history and performance metrics.
 *     tags:
 *       - OpenAPI Documentation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpointId
 *               - method
 *               - path
 *             properties:
 *               endpointId:
 *                 type: string
 *                 description: Endpoint identifier to test
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *                 description: HTTP method
 *               path:
 *                 type: string
 *                 description: API endpoint path
 *               headers:
 *                 type: object
 *                 description: Request headers
 *               query:
 *                 type: object
 *                 description: Query parameters
 *               body:
 *                 type: object
 *                 description: Request body
 *     responses:
 *       200:
 *         description: API call executed successfully
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
 *                   example: "API call executed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     request:
 *                       type: object
 *                       description: Request data sent
 *                     response:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: integer
 *                         headers:
 *                           type: object
 *                         body:
 *                           type: object
 *                         duration:
 *                           type: number
 *       400:
 *         description: Bad request - Invalid parameters
 *       403:
 *         description: Playground disabled
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/try-it-out', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { endpointId, method, path, headers, query, body } = req.body;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    if (!docs.playground.enabled) {
      return res.status(403).json({
        success: false,
        message: 'Playground is disabled',
      });
    }

    const startTime = Date.now();

    // Record the try-it-out attempt
    const tryData = {
      sessionId: `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      endpointId,
      userId,
      method,
      path,
      requestData: { headers, query, body },
      ipAddress: req.ip || req.connection.remoteAddress,
      timestamp: new Date(),
    };

    // Simulate API call (in real implementation, this would make actual HTTP request)
    // For now, we'll just record the attempt
    const duration = Date.now() - startTime;

    tryData.responseData = {
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: { message: 'This is a simulated response' },
      duration,
    };
    tryData.success = true;

    await docs.recordTryItOut(tryData);

    res.json({
      success: true,
      message: 'API call executed successfully',
      data: {
        request: tryData.requestData,
        response: tryData.responseData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to execute API call',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/try-it-out/history - Get playground history
router.get('/try-it-out/history', async (req, res) => {
  try {
    const { organizationId } = req;
    const { limit = 50, endpointId } = req.query;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    let history = docs.tryItOutHistory;

    if (endpointId) {
      history = history.filter((h) => h.endpointId === endpointId);
    }

    // Sort by timestamp descending and limit
    history = history
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get playground history',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/analytics:
 *   get:
 *     summary: Get documentation analytics
 *     description: Retrieve comprehensive analytics data for API documentation including usage patterns, popular endpoints, and performance metrics
 *     tags:
 *       - Documentation Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: "30d"
 *         description: Analytics period
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalViews:
 *                       type: integer
 *                     uniqueVisitors:
 *                       type: integer
 *                     totalApiCalls:
 *                       type: integer
 *                     popularEndpoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           endpointId:
 *                             type: string
 *                           path:
 *                             type: string
 *                           views:
 *                             type: integer
 *                     viewsByDay:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           views:
 *                             type: integer
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/analytics', async (req, res) => {
  try {
    const { organizationId } = req;
    const { period = '30d' } = req.query;

    const analytics = await OpenApiDocs.getAnalytics(organizationId, period);

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/stats:
 *   get:
 *     summary: Get overall documentation statistics
 *     description: Retrieve comprehensive statistics about the API documentation including endpoint counts, usage metrics, and quality scores
 *     tags:
 *       - Documentation Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEndpoints:
 *                       type: integer
 *                       description: Total number of documented endpoints
 *                     deprecatedEndpoints:
 *                       type: integer
 *                       description: Number of deprecated endpoints
 *                     totalSchemas:
 *                       type: integer
 *                       description: Total number of schema definitions
 *                     totalTags:
 *                       type: integer
 *                       description: Total number of tags
 *                     documentationScore:
 *                       type: number
 *                       description: Documentation quality score (0-100)
 *                     analytics:
 *                       type: object
 *                       properties:
 *                         totalViews:
 *                           type: integer
 *                         uniqueVisitors:
 *                           type: integer
 *                         totalApiCalls:
 *                           type: integer
 *                         lastAccessed:
 *                           type: string
 *                           format: date-time
 *                     popularEndpoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           endpointId:
 *                             type: string
 *                           path:
 *                             type: string
 *                           views:
 *                             type: integer
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/stats', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    res.json({
      success: true,
      data: {
        totalEndpoints: docs.totalEndpoints,
        deprecatedEndpoints: docs.deprecatedEndpointsCount,
        totalSchemas: docs.totalSchemas,
        totalTags: docs.tags.length,
        documentationScore: docs.documentationScore,
        analytics: {
          totalViews: docs.analytics.totalViews,
          uniqueVisitors: docs.analytics.uniqueVisitors,
          totalApiCalls: docs.analytics.totalApiCalls,
          lastAccessed: docs.analytics.lastAccessed,
        },
        popularEndpoints: docs.analytics.popularEndpoints.slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message,
    });
  }
});

// POST /api/openapi-docs/changelog - Add changelog entry
router.post('/changelog', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    await docs.addChangelogEntry({
      ...req.body,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Changelog entry added successfully',
      data: docs.changelog[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add changelog entry',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/changelog - Get changelog
router.get('/changelog', async (req, res) => {
  try {
    const { organizationId } = req;
    const { limit = 20 } = req.query;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const changelog = docs.changelog.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: changelog,
      count: changelog.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get changelog',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/export/openapi.json:
 *   get:
 *     summary: Export OpenAPI specification as JSON
 *     description: Generate and download a complete OpenAPI 3.0 specification file in JSON format
 *     tags:
 *       - OpenAPI Documentation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OpenAPI specification exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Complete OpenAPI 3.0 specification
 *         headers:
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: 'attachment; filename="openapi.json"'
 *       404:
 *         description: OpenAPI documentation not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/export/openapi.json', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const spec = docs.generateOpenApiJson();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
    res.json(spec);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export OpenAPI spec',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/export/openapi.yaml - Export OpenAPI spec as YAML
router.get('/export/openapi.yaml', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const spec = docs.generateOpenApiJson();

    // Convert to YAML (would require yaml package in real implementation)
    const yaml = JSON.stringify(spec, null, 2); // Placeholder

    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="openapi.yaml"');
    res.send(yaml);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export OpenAPI spec as YAML',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/export/postman - Export as Postman collection
router.get('/export/postman', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const collection = docs.exportToPostman();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="postman-collection.json"');
    res.json(collection);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export Postman collection',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/search:
 *   get:
 *     summary: Search API endpoints
 *     description: Search through API endpoints by path, summary, description, or tags using full-text search
 *     tags:
 *       - API Endpoints
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *         example: "patients"
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiEndpoint'
 *                 count:
 *                   type: integer
 *                   description: Number of search results
 *       400:
 *         description: Bad request - Search query required
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/search', async (req, res) => {
  try {
    const { organizationId } = req;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query (q) is required',
      });
    }

    const results = await OpenApiDocs.searchEndpoints(organizationId, q);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search endpoints',
      error: error.message,
    });
  }
});

// POST /api/openapi-docs/security-schemes - Add security scheme
router.post('/security-schemes', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    const schemeId =
      req.body.schemeId || `SCHEME-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    docs.securitySchemes.push({
      ...req.body,
      schemeId,
    });

    await docs.save();

    res.status(201).json({
      success: true,
      message: 'Security scheme added successfully',
      data: docs.securitySchemes[docs.securitySchemes.length - 1],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add security scheme',
      error: error.message,
    });
  }
});

// GET /api/openapi-docs/security-schemes - Get all security schemes
router.get('/security-schemes', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    res.json({
      success: true,
      data: docs.securitySchemes,
      count: docs.securitySchemes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get security schemes',
      error: error.message,
    });
  }
});

// PUT /api/openapi-docs/visibility - Toggle public/private visibility
router.put('/visibility', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { isPublic } = req.body;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.status(404).json({
        success: false,
        message: 'OpenAPI documentation not found',
      });
    }

    docs.isPublic = isPublic;
    docs.lastModifiedBy = userId;
    await docs.save();

    res.json({
      success: true,
      message: `Documentation is now ${isPublic ? 'public' : 'private'}`,
      data: { isPublic: docs.isPublic },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update visibility',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/openapi-docs/health:
 *   get:
 *     summary: Health check for documentation system
 *     description: Check the health and status of the OpenAPI documentation system including initialization status and key metrics
 *     tags:
 *       - OpenAPI Documentation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 initialized:
 *                   type: boolean
 *                   description: Whether documentation is initialized
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEndpoints:
 *                       type: integer
 *                     totalSchemas:
 *                       type: integer
 *                     documentationScore:
 *                       type: number
 *                     isActive:
 *                       type: boolean
 *                     isPublic:
 *                       type: boolean
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Health check failed
 */
router.get('/health', async (req, res) => {
  try {
    const { organizationId } = req;

    const docs = await OpenApiDocs.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!docs) {
      return res.json({
        success: true,
        initialized: false,
        message: 'Documentation not initialized',
      });
    }

    res.json({
      success: true,
      initialized: true,
      data: {
        totalEndpoints: docs.totalEndpoints,
        totalSchemas: docs.totalSchemas,
        documentationScore: docs.documentationScore,
        isActive: docs.isActive,
        isPublic: docs.isPublic,
        lastUpdated: docs.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    });
  }
});

module.exports = router;
