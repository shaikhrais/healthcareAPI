const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const openApiDocsSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // OpenAPI Specification
    openApiSpec: {
      version: {
        type: String,
        default: '3.0.3',
        enum: ['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.1.0'],
      },
      info: {
        title: {
          type: String,
          default: 'ExpoJane API',
        },
        description: {
          type: String,
          default: 'Comprehensive API for healthcare practice management',
        },
        version: {
          type: String,
          default: '1.0.0',
        },
        termsOfService: String,
        contact: {
          name: String,
          email: String,
          url: String,
        },
        license: {
          name: {
            type: String,
            default: 'MIT',
          },
          url: String,
        },
      },
      servers: [
        {
          url: {
            type: String,
            required: true,
          },
          description: String,
          variables: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
          },
        },
      ],
      externalDocs: {
        description: String,
        url: String,
      },
    },

    // API Endpoints Documentation (simplified to avoid deep schema compile issues)
    endpoints: [
      {
        endpointId: { type: String, required: true, unique: true },
        path: { type: String, required: true },
        method: {
          type: String,
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
          required: true,
        },
        summary: { type: String },
        description: String,
        operationId: String,
        tags: [String],
        deprecated: { type: Boolean, default: false },
        deprecationDate: Date,
        deprecationReason: String,
        replacementEndpoint: String,

        // Use Mixed for complex nested request/response shapes
        parameters: [mongoose.Schema.Types.Mixed],
        requestBody: mongoose.Schema.Types.Mixed,
        responses: mongoose.Schema.Types.Mixed,
        security: mongoose.Schema.Types.Mixed,
        codeSamples: [mongoose.Schema.Types.Mixed],
        analytics: mongoose.Schema.Types.Mixed,

        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
      },
    ],

    // Schema Definitions
    schemas: [
      {
        schemaId: {
          type: String,
          required: true,
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: String,
        type: {
          type: String,
          enum: ['object', 'array', 'string', 'number', 'integer', 'boolean'],
          default: 'object',
        },
        properties: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
        required: [String],
        example: mongoose.Schema.Types.Mixed,
        deprecated: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Security Schemes
    securitySchemes: [
      {
        schemeId: {
          type: String,
          required: true,
          unique: true,
        },
        type: {
          type: String,
          enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'],
          required: true,
        },
        name: String, // For apiKey
        in: {
          type: String,
          enum: ['query', 'header', 'cookie'],
        }, // For apiKey
        scheme: String, // For http (bearer, basic, etc.)
        bearerFormat: String, // For http bearer
        flows: {
          implicit: {
            authorizationUrl: String,
            refreshUrl: String,
            scopes: {
              type: Map,
              of: String,
            },
          },
          password: {
            tokenUrl: String,
            refreshUrl: String,
            scopes: {
              type: Map,
              of: String,
            },
          },
          clientCredentials: {
            tokenUrl: String,
            refreshUrl: String,
            scopes: {
              type: Map,
              of: String,
            },
          },
          authorizationCode: {
            authorizationUrl: String,
            tokenUrl: String,
            refreshUrl: String,
            scopes: {
              type: Map,
              of: String,
            },
          },
        }, // For oauth2
        openIdConnectUrl: String, // For openIdConnect
        description: String,
      },
    ],

    // API Tags/Categories
    tags: [
      {
        name: {
          type: String,
          required: true,
          unique: true,
        },
        description: String,
        externalDocs: {
          description: String,
          url: String,
        },
        endpointCount: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Interactive Playground Settings
    playground: {
      enabled: {
        type: Boolean,
        default: true,
      },
      baseUrl: String,
      defaultHeaders: {
        type: Map,
        of: String,
      },
      allowedOrigins: [String],
      rateLimitPerHour: {
        type: Number,
        default: 100,
      },
      requireAuthentication: {
        type: Boolean,
        default: false,
      },
    },

    // Try It Out History
    tryItOutHistory: [
      {
        sessionId: String,
        endpointId: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        method: String,
        path: String,
        requestData: {
          headers: mongoose.Schema.Types.Mixed,
          query: mongoose.Schema.Types.Mixed,
          body: mongoose.Schema.Types.Mixed,
        },
        responseData: {
          status: Number,
          headers: mongoose.Schema.Types.Mixed,
          body: mongoose.Schema.Types.Mixed,
          duration: Number, // in ms
        },
        success: {
          type: Boolean,
          default: true,
        },
        error: String,
        ipAddress: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // API Changelog
    changelog: [
      {
        version: {
          type: String,
          required: true,
        },
        releaseDate: {
          type: Date,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        description: String,
        changes: [
          {
            type: {
              type: String,
              enum: ['added', 'changed', 'deprecated', 'removed', 'fixed', 'security'],
              required: true,
            },
            endpoint: String,
            description: {
              type: String,
              required: true,
            },
            breakingChange: {
              type: Boolean,
              default: false,
            },
            migrationGuide: String,
          },
        ],
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Documentation Settings
    settings: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light',
      },
      logo: String,
      favicon: String,
      primaryColor: {
        type: String,
        default: '#667eea',
      },
      showTryItOut: {
        type: Boolean,
        default: true,
      },
      showCodeSamples: {
        type: Boolean,
        default: true,
      },
      expandResponses: {
        type: String,
        enum: ['all', 'none', 'list'],
        default: 'list',
      },
      defaultModelExpandDepth: {
        type: Number,
        default: 1,
      },
      persistAuthorization: {
        type: Boolean,
        default: true,
      },
      syntaxHighlight: {
        type: Boolean,
        default: true,
      },
      layout: {
        type: String,
        enum: ['BaseLayout', 'StandaloneLayout'],
        default: 'StandaloneLayout',
      },
    },

    // Analytics
    analytics: {
      totalViews: {
        type: Number,
        default: 0,
      },
      uniqueVisitors: {
        type: Number,
        default: 0,
      },
      totalApiCalls: {
        type: Number,
        default: 0,
      },
      lastAccessed: Date,
      popularEndpoints: [
        {
          endpointId: String,
          path: String,
          method: String,
          viewCount: Number,
          tryCount: Number,
        },
      ],
    },

    // Export Formats
    exports: [
      {
        exportId: {
          type: String,
          required: true,
        },
        format: {
          type: String,
          enum: ['openapi-json', 'openapi-yaml', 'postman', 'insomnia', 'swagger-ui', 'redoc'],
          required: true,
        },
        version: String,
        url: String,
        size: Number, // in bytes
        generatedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],

    // Audit Trail
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// openApiDocsSchema.index({ organization: 1, isDeleted: 1 });
openApiDocsSchema.index({ 'endpoints.endpointId': 1 });
openApiDocsSchema.index({ 'endpoints.path': 1, 'endpoints.method': 1 });
openApiDocsSchema.index({ 'schemas.schemaId': 1 });
openApiDocsSchema.index({ 'tryItOutHistory.timestamp': -1 });

// Virtual: Total Endpoints
openApiDocsSchema.virtual('totalEndpoints').get(function () {
  return this.endpoints.length;
});

// Virtual: Deprecated Endpoints Count
openApiDocsSchema.virtual('deprecatedEndpointsCount').get(function () {
  return this.endpoints.filter((e) => e.deprecated).length;
});

// Virtual: Total Schemas
openApiDocsSchema.virtual('totalSchemas').get(function () {
  return this.schemas.length;
});

// Virtual: API Health Score (based on documentation completeness)
openApiDocsSchema.virtual('documentationScore').get(function () {
  if (this.endpoints.length === 0) return 0;

  let score = 0;
  const maxScore = this.endpoints.length * 10;

  this.endpoints.forEach((endpoint) => {
    if (endpoint.summary) score += 1;
    if (endpoint.description) score += 1;
    if (endpoint.parameters && endpoint.parameters.length > 0) score += 1;
    if (endpoint.responses && endpoint.responses.size > 0) score += 2;
    if (endpoint.codeSamples && endpoint.codeSamples.length > 0) score += 2;
    if (endpoint.requestBody && endpoint.requestBody.content) score += 1;
    if (endpoint.tags && endpoint.tags.length > 0) score += 1;
    if (endpoint.security && endpoint.security.length > 0) score += 1;
  });

  return Math.round((score / maxScore) * 100);
});

// Static Methods

// Get by Organization
openApiDocsSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Search Endpoints
openApiDocsSchema.statics.searchEndpoints = async function (organizationId, query) {
  const docs = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!docs) return [];

  const searchTerm = query.toLowerCase();
  return docs.endpoints.filter(
    (endpoint) =>
      endpoint.path.toLowerCase().includes(searchTerm) ||
      endpoint.summary.toLowerCase().includes(searchTerm) ||
      (endpoint.description && endpoint.description.toLowerCase().includes(searchTerm)) ||
      endpoint.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
  );
};

// Get Endpoints by Tag
openApiDocsSchema.statics.getEndpointsByTag = async function (organizationId, tagName) {
  const docs = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!docs) return [];

  return docs.endpoints.filter((endpoint) => endpoint.tags.includes(tagName));
};

// Get Analytics
openApiDocsSchema.statics.getAnalytics = async function (organizationId, period = '30d') {
  const docs = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!docs) return null;

  let startDate;
  const now = new Date();

  switch (period) {
    case '7d':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case '30d':
      startDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case '90d':
      startDate = new Date(now.setDate(now.getDate() - 90));
      break;
    default:
      startDate = new Date(0);
  }

  const filteredHistory = docs.tryItOutHistory.filter((h) => new Date(h.timestamp) >= startDate);

  const successfulCalls = filteredHistory.filter((h) => h.success).length;
  const failedCalls = filteredHistory.filter((h) => !h.success).length;

  return {
    period,
    totalApiCalls: filteredHistory.length,
    successfulCalls,
    failedCalls,
    successRate:
      filteredHistory.length > 0
        ? ((successfulCalls / filteredHistory.length) * 100).toFixed(2)
        : 0,
    averageResponseTime:
      filteredHistory.length > 0
        ? filteredHistory.reduce((sum, h) => sum + (h.responseData?.duration || 0), 0) /
          filteredHistory.length
        : 0,
    popularEndpoints: docs.analytics.popularEndpoints.slice(0, 10),
  };
};

// Instance Methods

// Add Endpoint
openApiDocsSchema.methods.addEndpoint = async function (endpointData) {
  const endpointId =
    endpointData.endpointId || `EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.endpoints.push({
    ...endpointData,
    endpointId,
  });

  // Update tag counts
  if (endpointData.tags) {
    endpointData.tags.forEach((tagName) => {
      const tag = this.tags.find((t) => t.name === tagName);
      if (tag) {
        tag.endpointCount += 1;
      } else {
        this.tags.push({ name: tagName, endpointCount: 1 });
      }
    });
  }

  return this.save();
};

// Update Endpoint
openApiDocsSchema.methods.updateEndpoint = async function (endpointId, updateData) {
  const endpoint = this.endpoints.find((e) => e.endpointId === endpointId);
  if (!endpoint) {
    throw new Error('Endpoint not found');
  }

  Object.assign(endpoint, updateData);
  endpoint.updatedAt = new Date();

  return this.save();
};

// Delete Endpoint
openApiDocsSchema.methods.deleteEndpoint = async function (endpointId) {
  const index = this.endpoints.findIndex((e) => e.endpointId === endpointId);
  if (index === -1) {
    throw new Error('Endpoint not found');
  }

  const endpoint = this.endpoints[index];

  // Update tag counts
  if (endpoint.tags) {
    endpoint.tags.forEach((tagName) => {
      const tag = this.tags.find((t) => t.name === tagName);
      if (tag) {
        tag.endpointCount = Math.max(0, tag.endpointCount - 1);
      }
    });
  }

  this.endpoints.splice(index, 1);
  return this.save();
};

// Add Schema
openApiDocsSchema.methods.addSchema = async function (schemaData) {
  const schemaId =
    schemaData.schemaId || `SCHEMA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.schemas.push({
    ...schemaData,
    schemaId,
  });

  return this.save();
};

// Add Code Sample to Endpoint
openApiDocsSchema.methods.addCodeSample = async function (endpointId, codeSampleData) {
  const endpoint = this.endpoints.find((e) => e.endpointId === endpointId);
  if (!endpoint) {
    throw new Error('Endpoint not found');
  }

  endpoint.codeSamples.push(codeSampleData);
  return this.save();
};

// Record Try It Out
openApiDocsSchema.methods.recordTryItOut = async function (tryData) {
  this.tryItOutHistory.push(tryData);

  // Update endpoint analytics
  const endpoint = this.endpoints.find((e) => e.endpointId === tryData.endpointId);
  if (endpoint) {
    endpoint.analytics.totalTries += 1;
    endpoint.analytics.lastTried = new Date();
  }

  // Update popular endpoints
  const popularIndex = this.analytics.popularEndpoints.findIndex(
    (p) => p.endpointId === tryData.endpointId
  );

  if (popularIndex > -1) {
    this.analytics.popularEndpoints[popularIndex].tryCount += 1;
  } else {
    this.analytics.popularEndpoints.push({
      endpointId: tryData.endpointId,
      path: tryData.path,
      method: tryData.method,
      viewCount: 0,
      tryCount: 1,
    });
  }

  this.analytics.totalApiCalls += 1;

  // Keep only last 10000 try history entries
  if (this.tryItOutHistory.length > 10000) {
    this.tryItOutHistory = this.tryItOutHistory.slice(-10000);
  }

  return this.save();
};

// Record Endpoint View
openApiDocsSchema.methods.recordEndpointView = async function (endpointId) {
  const endpoint = this.endpoints.find((e) => e.endpointId === endpointId);
  if (!endpoint) {
    throw new Error('Endpoint not found');
  }

  endpoint.analytics.totalViews += 1;
  endpoint.analytics.lastViewed = new Date();

  // Update popular endpoints
  const popularIndex = this.analytics.popularEndpoints.findIndex(
    (p) => p.endpointId === endpointId
  );

  if (popularIndex > -1) {
    this.analytics.popularEndpoints[popularIndex].viewCount += 1;
  } else {
    this.analytics.popularEndpoints.push({
      endpointId,
      path: endpoint.path,
      method: endpoint.method,
      viewCount: 1,
      tryCount: 0,
    });
  }

  this.analytics.totalViews += 1;
  this.analytics.lastAccessed = new Date();

  return this.save();
};

// Add Changelog Entry
openApiDocsSchema.methods.addChangelogEntry = async function (changelogData) {
  this.changelog.unshift(changelogData); // Add to beginning
  return this.save();
};

// Generate OpenAPI JSON
openApiDocsSchema.methods.generateOpenApiJson = function () {
  const spec = {
    openapi: this.openApiSpec.version,
    info: this.openApiSpec.info,
    servers: this.openApiSpec.servers,
    tags: this.tags.map((t) => ({
      name: t.name,
      description: t.description,
      externalDocs: t.externalDocs,
    })),
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {},
    },
  };

  // Add endpoints to paths
  this.endpoints.forEach((endpoint) => {
    if (!spec.paths[endpoint.path]) {
      spec.paths[endpoint.path] = {};
    }

    spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
      summary: endpoint.summary,
      description: endpoint.description,
      operationId: endpoint.operationId,
      tags: endpoint.tags,
      deprecated: endpoint.deprecated,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: Object.fromEntries(endpoint.responses || new Map()),
      security: endpoint.security,
    };
  });

  // Add schemas
  this.schemas.forEach((schema) => {
    spec.components.schemas[schema.name] = {
      type: schema.type,
      description: schema.description,
      properties: Object.fromEntries(schema.properties || new Map()),
      required: schema.required,
      example: schema.example,
      deprecated: schema.deprecated,
    };
  });

  // Add security schemes
  this.securitySchemes.forEach((scheme) => {
    spec.components.securitySchemes[scheme.schemeId] = {
      type: scheme.type,
      name: scheme.name,
      in: scheme.in,
      scheme: scheme.scheme,
      bearerFormat: scheme.bearerFormat,
      flows: scheme.flows,
      openIdConnectUrl: scheme.openIdConnectUrl,
      description: scheme.description,
    };
  });

  return spec;
};

// Export to Postman
openApiDocsSchema.methods.exportToPostman = function () {
  const collection = {
    info: {
      name: this.openApiSpec.info.title,
      description: this.openApiSpec.info.description,
      version: this.openApiSpec.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [],
  };

  // Group endpoints by tag
  const groupedEndpoints = {};
  this.endpoints.forEach((endpoint) => {
    const tag = endpoint.tags[0] || 'Default';
    if (!groupedEndpoints[tag]) {
      groupedEndpoints[tag] = [];
    }
    groupedEndpoints[tag].push(endpoint);
  });

  // Create Postman items
  Object.keys(groupedEndpoints).forEach((tag) => {
    const folder = {
      name: tag,
      item: groupedEndpoints[tag].map((endpoint) => ({
        name: endpoint.summary,
        request: {
          method: endpoint.method,
          header: [],
          url: {
            raw: `{{baseUrl}}${endpoint.path}`,
            host: ['{{baseUrl}}'],
            path: endpoint.path.split('/').filter((p) => p),
          },
          description: endpoint.description,
        },
      })),
    };
    collection.item.push(folder);
  });

  return collection;
};

// Soft Delete
openApiDocsSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore
openApiDocsSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

module.exports = mongoose.model('OpenApiDocs', openApiDocsSchema);
