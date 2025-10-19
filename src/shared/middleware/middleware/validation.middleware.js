const Joi = require('joi');

const logger = require('../config/logger.config');
/**
 * Validation Middleware using Joi
 * Centralized request validation for all endpoints
 */

// eslint-disable-next-line no-unused-vars
/**
 * Validate request using Joi schema
 */
const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false, // Return all errors
    allowUnknown: true, // Allow unknown keys (for middleware data)
    stripUnknown: true, // Remove unknown keys
  };

  const { error, value } = schema.validate(
    {
      body: req.body,
      query: req.query,
      params: req.params,
    },
    validationOptions
  );

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    logger.warn('Validation error', {
      url: req.url,
      errors,
      ip: req.ip,
    });

    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: errors,
    });
  }

  // Replace request data with validated data
  req.body = value.body || req.body;
  req.query = value.query || req.query;
  req.params = value.params || req.params;

  next();
};

// ===== Common Validation Schemas =====

const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');

const pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string(),
});

const dateRange = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
});

// ===== Authentication Schemas =====

const authSchemas = {
  register: Joi.object({
    body: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      lastName: Joi.string().trim().min(2).max(50).required(),
      email: Joi.string().trim().lowercase().email().required(),
      password: Joi.string()
        .min(8)
        .max(128)
        .required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .message(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        ),
      role: Joi.string().valid(
        'patient',
        'staff',
        'practitioner',
        'practitioner_limited',
        'associate',
        'admin'
      ),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    }),
  }),

  login: Joi.object({
    body: Joi.object({
      email: Joi.string().trim().lowercase().email().required(),
      password: Joi.string().required(),
    }),
  }),
};

// ===== Patient Schemas =====

const patientSchemas = {
  create: Joi.object({
    body: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      lastName: Joi.string().trim().min(2).max(50).required(),
      email: Joi.string().trim().lowercase().email().required(),
      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .required(),
      dateOfBirth: Joi.date().max('now').required(),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      address: Joi.object({
        street: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        zipCode: Joi.string(),
        country: Joi.string(),
      }),
      emergencyContact: Joi.object({
        name: Joi.string(),
        relationship: Joi.string(),
        phone: Joi.string(),
      }),
      medicalHistory: Joi.object({
        allergies: Joi.array().items(Joi.string()),
        medications: Joi.array().items(Joi.string()),
        conditions: Joi.array().items(Joi.string()),
      }),
      insurance: Joi.object({
        provider: Joi.string(),
        policyNumber: Joi.string(),
        groupNumber: Joi.string(),
        expiryDate: Joi.date(),
      }),
    }),
  }),

  update: Joi.object({
    params: Joi.object({
      id: objectId.required(),
    }),
    body: Joi.object({
      firstName: Joi.string().trim().min(2).max(50),
      lastName: Joi.string().trim().min(2).max(50),
      email: Joi.string().trim().lowercase().email(),
      phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
      dateOfBirth: Joi.date().max('now'),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
      active: Joi.boolean(),
      // ... other fields
    }),
  }),

  search: Joi.object({
    query: Joi.object({
      q: Joi.string().min(2).max(100),
      ...pagination.extract('query'),
    }),
  }),
};

// ===== Appointment Schemas =====

const appointmentSchemas = {
  create: Joi.object({
    body: Joi.object({
      patient: objectId.required(),
      practitioner: objectId.required(),
      treatment: objectId.required(),
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().min(Joi.ref('startTime')),
      duration: Joi.number().integer().min(15).max(480), // 15 min to 8 hours
      status: Joi.string().valid(
        'scheduled',
        'confirmed',
        'checked_in',
        'completed',
        'no_show',
        'cancelled'
      ),
      notes: Joi.string().max(1000),
      bookedVia: Joi.string().valid('admin', 'online', 'phone', 'walk_in'),
    }),
  }),

  update: Joi.object({
    params: Joi.object({
      id: objectId.required(),
    }),
    body: Joi.object({
      patient: objectId,
      practitioner: objectId,
      treatment: objectId,
      startTime: Joi.date().iso(),
      endTime: Joi.date().iso(),
      duration: Joi.number().integer().min(15).max(480),
      status: Joi.string().valid(
        'scheduled',
        'confirmed',
        'checked_in',
        'completed',
        'no_show',
        'cancelled'
      ),
      notes: Joi.string().max(1000),
    }),
  }),

  query: Joi.object({
    query: Joi.object({
      date: Joi.date().iso(),
      practitioner: objectId,
      patient: objectId,
      status: Joi.string(),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      ...pagination.extract('query'),
    }),
  }),
};

// ===== Treatment Schemas =====

const treatmentSchemas = {
  create: Joi.object({
    body: Joi.object({
      name: Joi.string().trim().min(2).max(100).required(),
      description: Joi.string().max(500),
      category: Joi.string().required(),
      duration: Joi.number().integer().min(15).max(480).required(),
      price: Joi.number().min(0).required(),
      color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      onlineBookingEnabled: Joi.boolean(),
      requiresDeposit: Joi.boolean(),
      depositAmount: Joi.number().min(0),
      bufferBefore: Joi.number().integer().min(0).max(60),
      bufferAfter: Joi.number().integer().min(0).max(60),
    }),
  }),

  update: Joi.object({
    params: Joi.object({
      id: objectId.required(),
    }),
    body: Joi.object({
      name: Joi.string().trim().min(2).max(100),
      description: Joi.string().max(500),
      category: Joi.string(),
      duration: Joi.number().integer().min(15).max(480),
      price: Joi.number().min(0),
      active: Joi.boolean(),
      // ... other fields
    }),
  }),
};

// ===== Shift Schemas =====

const shiftSchemas = {
  create: Joi.object({
    body: Joi.object({
      practitioner: objectId.required(),
      date: Joi.date().iso().required(),
      startTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(), // HH:mm
      endTime: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .required(),
      breaks: Joi.array().items(
        Joi.object({
          startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
          endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
          reason: Joi.string().max(100),
        })
      ),
      isRecurring: Joi.boolean(),
      recurrencePattern: Joi.object({
        frequency: Joi.string().valid('daily', 'weekly', 'biweekly', 'monthly'),
        daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
        endDate: Joi.date().iso(),
      }),
      bufferBefore: Joi.number().integer().min(0).max(60),
      bufferAfter: Joi.number().integer().min(0).max(60),
    }),
  }),
};

// ===== Public Booking Schemas =====

const publicSchemas = {
  quickRegister: Joi.object({
    body: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required(),
      lastName: Joi.string().trim().min(2).max(50).required(),
      email: Joi.string().trim().lowercase().email().required(),
      phone: Joi.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .required(),
      dateOfBirth: Joi.date().max('now').required(),
    }),
  }),

  book: Joi.object({
    body: Joi.object({
      patientId: objectId.required(),
      practitionerId: objectId.required(),
      treatmentId: objectId.required(),
      startTime: Joi.date().iso().required(),
      duration: Joi.number().integer().min(15).max(480).required(),
      notes: Joi.string().max(500),
    }),
  }),
};

module.exports = {
  validate,
  authSchemas,
  patientSchemas,
  appointmentSchemas,
  treatmentSchemas,
  shiftSchemas,
  publicSchemas,
};
