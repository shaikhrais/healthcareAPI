const express = require('express');


const DataImportWizard = require('../models/DataImportWizard');
const router = express.Router();
// Middleware to extract user and organization from headers
const extractContext = (req, res, next) => {
  req.userId = req.headers['x-user-id'];
  req.organizationId = req.headers['x-organization-id'];
  next();
};

router.use(extractContext);

// POST /api/data-import/initialize - Initialize data import wizard
router.post('/initialize', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    // Check if already initialized
    let wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (wizard) {
      return res.status(200).json({
        success: true,
        message: 'Data import wizard already initialized',
        data: wizard,
      });
    }

    // Create new wizard
    wizard = await DataImportWizard.create({
      organization: organizationId,
      importJobs: [],
      templates: [],
      fieldMappings: req.body.fieldMappings || {},
      settings: req.body.settings || {},
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Data import wizard initialized successfully',
      data: wizard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize data import wizard',
      error: error.message,
    });
  }
});

// POST /api/data-import/jobs - Create new import job
router.post('/jobs', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.createImportJob({
      ...req.body,
      uploadedBy: userId,
    });

    const newJob = wizard.importJobs[wizard.importJobs.length - 1];

    res.status(201).json({
      success: true,
      message: 'Import job created successfully',
      data: newJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create import job',
      error: error.message,
    });
  }
});

// GET /api/data-import/jobs - Get all import jobs
router.get('/jobs', async (req, res) => {
  try {
    const { organizationId } = req;
    const { status, targetEntity, limit = 50, offset = 0 } = req.query;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    let jobs = wizard.importJobs;

    // Apply filters
    if (status) {
      jobs = jobs.filter((j) => j.progress.status === status);
    }
    if (targetEntity) {
      jobs = jobs.filter((j) => j.targetEntity === targetEntity);
    }

    // Sort by created date descending
    jobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    // Pagination
    const total = jobs.length;
    jobs = jobs.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
      total,
      offset: parseInt(offset, 10),
      limit: parseInt(limit, 10),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get import jobs',
      error: error.message,
    });
  }
});

// GET /api/data-import/jobs/:jobId - Get specific job
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    const job = wizard.importJobs.find((j) => j.jobId === jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Import job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get import job',
      error: error.message,
    });
  }
});

// PUT /api/data-import/jobs/:jobId/analysis - Update job analysis
router.put('/jobs/:jobId/analysis', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.updateJobAnalysis(jobId, req.body);

    const updatedJob = wizard.importJobs.find((j) => j.jobId === jobId);

    res.json({
      success: true,
      message: 'Job analysis updated',
      data: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update job analysis',
      error: error.message,
    });
  }
});

// PUT /api/data-import/jobs/:jobId/mapping - Update job mapping
router.put('/jobs/:jobId/mapping', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.updateJobMapping(jobId, req.body.mapping);

    const updatedJob = wizard.importJobs.find((j) => j.jobId === jobId);

    res.json({
      success: true,
      message: 'Job mapping updated',
      data: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update job mapping',
      error: error.message,
    });
  }
});

// POST /api/data-import/jobs/:jobId/validate - Validate job
router.post('/jobs/:jobId/validate', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    // Simulate validation (in real implementation, this would perform actual validation)
    const validationResults = {
      isValid: req.body.isValid !== undefined ? req.body.isValid : true,
      totalRecords: req.body.totalRecords || 100,
      validRecords: req.body.validRecords || 95,
      invalidRecords: req.body.invalidRecords || 5,
      errors: req.body.errors || [],
      warnings: req.body.warnings || [],
      summary: req.body.summary || {
        missingRequiredFields: 2,
        invalidDataTypes: 1,
        duplicateRecords: 2,
        outOfRangeValues: 0,
      },
    };

    await wizard.validateJob(jobId, validationResults);

    const validatedJob = wizard.importJobs.find((j) => j.jobId === jobId);

    res.json({
      success: true,
      message: 'Job validated successfully',
      data: validatedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate job',
      error: error.message,
    });
  }
});

// POST /api/data-import/jobs/:jobId/import - Start import
router.post('/jobs/:jobId/import', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.startImport(jobId);

    const job = wizard.importJobs.find((j) => j.jobId === jobId);

    res.json({
      success: true,
      message: 'Import started successfully',
      data: job,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start import',
      error: error.message,
    });
  }
});

// PUT /api/data-import/jobs/:jobId/progress - Update import progress
router.put('/jobs/:jobId/progress', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.updateImportProgress(jobId, req.body);

    const updatedJob = wizard.importJobs.find((j) => j.jobId === jobId);

    res.json({
      success: true,
      message: 'Import progress updated',
      data: updatedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update import progress',
      error: error.message,
    });
  }
});

// POST /api/data-import/jobs/:jobId/complete - Complete import
router.post('/jobs/:jobId/complete', async (req, res) => {
  try {
    const { organizationId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.completeImport(jobId, req.body.results);

    const completedJob = wizard.importJobs.find((j) => j.jobId === jobId);

    res.json({
      success: true,
      message: 'Import completed successfully',
      data: completedJob,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete import',
      error: error.message,
    });
  }
});

// POST /api/data-import/jobs/:jobId/cancel - Cancel import
router.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.cancelImport(jobId, userId);

    res.json({
      success: true,
      message: 'Import cancelled successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel import',
      error: error.message,
    });
  }
});

// POST /api/data-import/jobs/:jobId/rollback - Rollback import
router.post('/jobs/:jobId/rollback', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.rollbackImport(jobId, userId);

    res.json({
      success: true,
      message: 'Import rolled back successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to rollback import',
      error: error.message,
    });
  }
});

// DELETE /api/data-import/jobs/:jobId - Delete job
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { jobId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.deleteJob(jobId, userId);

    res.json({
      success: true,
      message: 'Import job deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message,
    });
  }
});

// GET /api/data-import/templates - Get all templates
router.get('/templates', async (req, res) => {
  try {
    const { organizationId } = req;
    const { targetEntity } = req.query;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    let { templates } = wizard;

    if (targetEntity) {
      templates = templates.filter((t) => t.targetEntity === targetEntity);
    }

    // Sort by usage count descending
    templates.sort((a, b) => b.usageCount - a.usageCount);

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message,
    });
  }
});

// POST /api/data-import/templates - Create template
router.post('/templates', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.createTemplate({
      ...req.body,
      createdBy: userId,
    });

    const newTemplate = wizard.templates[wizard.templates.length - 1];

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message,
    });
  }
});

// GET /api/data-import/templates/:templateId - Get specific template
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { templateId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    const template = wizard.templates.find((t) => t.templateId === templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get template',
      error: error.message,
    });
  }
});

// PUT /api/data-import/templates/:templateId - Update template
router.put('/templates/:templateId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { templateId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.updateTemplate(templateId, req.body);

    const updatedTemplate = wizard.templates.find((t) => t.templateId === templateId);

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message,
    });
  }
});

// DELETE /api/data-import/templates/:templateId - Delete template
router.delete('/templates/:templateId', async (req, res) => {
  try {
    const { organizationId } = req;
    const { templateId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.deleteTemplate(templateId);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message,
    });
  }
});

// POST /api/data-import/templates/:templateId/use - Use template
router.post('/templates/:templateId/use', async (req, res) => {
  try {
    const { organizationId } = req;
    const { templateId } = req.params;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    await wizard.useTemplate(templateId);

    const template = wizard.templates.find((t) => t.templateId === templateId);

    res.json({
      success: true,
      message: 'Template usage recorded',
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to use template',
      error: error.message,
    });
  }
});

// GET /api/data-import/field-mappings - Get field mappings for entity
router.get('/field-mappings', async (req, res) => {
  try {
    const { organizationId } = req;
    const { targetEntity } = req.query;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    if (targetEntity && wizard.fieldMappings[targetEntity]) {
      res.json({
        success: true,
        data: Object.fromEntries(wizard.fieldMappings[targetEntity]),
      });
    } else {
      res.json({
        success: true,
        data: {
          patients: Object.fromEntries(wizard.fieldMappings.patients || new Map()),
          appointments: Object.fromEntries(wizard.fieldMappings.appointments || new Map()),
          treatments: Object.fromEntries(wizard.fieldMappings.treatments || new Map()),
          staff: Object.fromEntries(wizard.fieldMappings.staff || new Map()),
          inventory: Object.fromEntries(wizard.fieldMappings.inventory || new Map()),
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get field mappings',
      error: error.message,
    });
  }
});

// PUT /api/data-import/field-mappings - Update field mappings
router.put('/field-mappings', async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const { targetEntity, mappings } = req.body;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    if (!wizard.fieldMappings[targetEntity]) {
      wizard.fieldMappings[targetEntity] = new Map();
    }

    // Update mappings
    Object.entries(mappings).forEach(([key, value]) => {
      wizard.fieldMappings[targetEntity].set(key, value);
    });

    wizard.lastModifiedBy = userId;
    await wizard.save();

    res.json({
      success: true,
      message: 'Field mappings updated',
      data: Object.fromEntries(wizard.fieldMappings[targetEntity]),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update field mappings',
      error: error.message,
    });
  }
});

// GET /api/data-import/history - Get import history
router.get('/history', async (req, res) => {
  try {
    const { organizationId } = req;
    const { action, limit = 50 } = req.query;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    let { history } = wizard;

    if (action) {
      history = history.filter((h) => h.action === action);
    }

    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    history = history.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get import history',
      error: error.message,
    });
  }
});

// GET /api/data-import/analytics - Get import analytics
router.get('/analytics', async (req, res) => {
  try {
    const { organizationId } = req;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    res.json({
      success: true,
      data: {
        ...wizard.analytics,
        successRate: wizard.successRate,
        activeJobs: wizard.activeJobs.length,
        completedJobs: wizard.completedJobs.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message,
    });
  }
});

// GET /api/data-import/stats - Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const { organizationId } = req;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    const stats = {
      totalJobs: wizard.importJobs.length,
      activeJobs: wizard.activeJobs.length,
      completedJobs: wizard.completedJobs.length,
      failedJobs: wizard.importJobs.filter((j) => j.progress.status === 'failed').length,
      totalTemplates: wizard.templates.length,
      totalRecordsImported: wizard.analytics.totalRecordsImported,
      averageImportTime: wizard.analytics.averageImportTime,
      successRate: wizard.successRate,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message,
    });
  }
});

// GET /api/data-import/settings - Get import settings
router.get('/settings', async (req, res) => {
  try {
    const { organizationId } = req;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    res.json({
      success: true,
      data: wizard.settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message,
    });
  }
});

// PUT /api/data-import/settings - Update import settings
router.put('/settings', async (req, res) => {
  try {
    const { organizationId, userId } = req;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    Object.assign(wizard.settings, req.body);
    wizard.lastModifiedBy = userId;
    await wizard.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: wizard.settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
});

// POST /api/data-import/validate-file - Validate file before upload
router.post('/validate-file', async (req, res) => {
  try {
    const { organizationId } = req;
    const { fileName, fileSize, fileType } = req.body;

    const wizard = await DataImportWizard.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!wizard) {
      return res.status(404).json({
        success: false,
        message: 'Data import wizard not found',
      });
    }

    const errors = [];

    // Check file size
    if (fileSize > wizard.settings.maxFileSize) {
      errors.push({
        field: 'fileSize',
        message: `File size exceeds maximum allowed size of ${wizard.settings.maxFileSize} bytes`,
      });
    }

    // Check file type
    if (!wizard.settings.allowedFileTypes.includes(fileType)) {
      errors.push({
        field: 'fileType',
        message: `File type ${fileType} is not allowed. Allowed types: ${wizard.settings.allowedFileTypes.join(', ')}`,
      });
    }

    const isValid = errors.length === 0;

    res.json({
      success: true,
      data: {
        isValid,
        errors,
        maxFileSize: wizard.settings.maxFileSize,
        allowedFileTypes: wizard.settings.allowedFileTypes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate file',
      error: error.message,
    });
  }
});

// GET /api/data-import/entities - Get available target entities
router.get('/entities', async (req, res) => {
  try {
    const entities = [
      {
        value: 'patients',
        label: 'Patients',
        description: 'Import patient records',
        icon: 'user',
        requiredFields: ['firstName', 'lastName', 'email'],
      },
      {
        value: 'appointments',
        label: 'Appointments',
        description: 'Import appointment schedules',
        icon: 'calendar',
        requiredFields: ['patientId', 'date', 'time'],
      },
      {
        value: 'treatments',
        label: 'Treatments',
        description: 'Import treatment records',
        icon: 'medical',
        requiredFields: ['name', 'cost'],
      },
      {
        value: 'staff',
        label: 'Staff',
        description: 'Import staff members',
        icon: 'people',
        requiredFields: ['firstName', 'lastName', 'role'],
      },
      {
        value: 'inventory',
        label: 'Inventory',
        description: 'Import inventory items',
        icon: 'box',
        requiredFields: ['name', 'quantity'],
      },
      {
        value: 'invoices',
        label: 'Invoices',
        description: 'Import invoice data',
        icon: 'receipt',
        requiredFields: ['invoiceNumber', 'amount', 'patientId'],
      },
    ];

    res.json({
      success: true,
      data: entities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get entities',
      error: error.message,
    });
  }
});

// GET /api/data-import/transformations - Get available transformations
router.get('/transformations', async (req, res) => {
  try {
    const transformations = [
      {
        value: 'none',
        label: 'None',
        description: 'No transformation',
      },
      {
        value: 'uppercase',
        label: 'Uppercase',
        description: 'Convert to uppercase',
      },
      {
        value: 'lowercase',
        label: 'Lowercase',
        description: 'Convert to lowercase',
      },
      {
        value: 'trim',
        label: 'Trim',
        description: 'Remove leading and trailing whitespace',
      },
      {
        value: 'date_format',
        label: 'Date Format',
        description: 'Convert date to standard format',
      },
      {
        value: 'number_format',
        label: 'Number Format',
        description: 'Format as number',
      },
      {
        value: 'phone_format',
        label: 'Phone Format',
        description: 'Format phone number',
      },
      {
        value: 'email_normalize',
        label: 'Email Normalize',
        description: 'Normalize email address',
      },
      {
        value: 'custom',
        label: 'Custom',
        description: 'Custom JavaScript transformation',
      },
    ];

    res.json({
      success: true,
      data: transformations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get transformations',
      error: error.message,
    });
  }
});

module.exports = router;
