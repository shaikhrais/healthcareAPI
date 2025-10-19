const express = require('express');

const { body, param, query } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const noteTemplatesController = require('../controllers/noteTemplatesController');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/note-templates
 * @desc    Create a new note template
 * @access  Practitioner, Admin
 */
router.post(
  '/',
  requireRole('practitioner_limited'),
  [
    body('name').isString().notEmpty().withMessage('Template name required'),
    body('noteType').isString().notEmpty().withMessage('Note type required'),
  ],
  noteTemplatesController.createTemplate
);

/**
 * @route   PUT /api/note-templates/:id
 * @desc    Update a note template
 * @access  Template creator, Admin
 */
router.put(
  '/:id',
  requireRole('practitioner_limited'),
  [param('id').isMongoId().withMessage('Valid template ID required')],
  noteTemplatesController.updateTemplate
);

/**
 * @route   POST /api/note-templates/:id/clone
 * @desc    Clone a template
 * @access  Practitioner, Admin
 */
router.post(
  '/:id/clone',
  requireRole('practitioner_limited'),
  [
    param('id').isMongoId().withMessage('Valid template ID required'),
    body('name').isString().notEmpty().withMessage('New template name required'),
  ],
  noteTemplatesController.cloneTemplate
);

/**
 * @route   GET /api/note-templates/public
 * @desc    Get public templates
 * @access  Authenticated users
 */
router.get('/public', [query('noteType').isString().optional()], noteTemplatesController.getPublicTemplates);

/**
 * @route   GET /api/note-templates/my-templates
 * @desc    Get user's templates
 * @access  Authenticated users
 */
router.get('/my-templates', noteTemplatesController.getUserTemplates);

/**
 * @route   GET /api/note-templates/specialty/:specialty
 * @desc    Get templates by specialty
 * @access  Authenticated users
 */
router.get(
  '/specialty/:specialty',
  [
    param('specialty').isString().notEmpty().withMessage('Specialty required'),
    query('noteType').isString().optional(),
  ],
  noteTemplatesController.getBySpecialty
);

/**
 * @route   GET /api/note-templates/most-used
 * @desc    Get most used templates
 * @access  Authenticated users
 */
router.get(
  '/most-used',
  [query('limit').isInt({ min: 1, max: 50 }).optional()],
  noteTemplatesController.getMostUsed
);

/**
 * @route   GET /api/note-templates/:id
 * @desc    Get a specific template
 * @access  Authenticated users
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid template ID required')],
  noteTemplatesController.getTemplateById
);

/**
 * @route   DELETE /api/note-templates/:id
 * @desc    Delete a template
 * @access  Template creator, Admin
 */
router.delete(
  '/:id',
  requireRole('practitioner_limited'),
  [param('id').isMongoId().withMessage('Valid template ID required')],
  noteTemplatesController.deleteTemplate
);

module.exports = router;
