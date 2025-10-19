const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const attachmentsController = require('../controllers/attachmentsController');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /api/attachments/upload
 * @desc    Upload attachment(s) for a claim
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.post(
  '/upload',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  uploadMiddleware.array('files', 10),
  [
    body('claimId').isMongoId().withMessage('Valid claim ID required'),
    body('attachmentType').isIn([
      'medical_records','lab_results','radiology_report','operative_report','pathology_report','consultation_report','prescription','authorization','referral','eob','correspondence','billing_statement','patient_consent','insurance_card','photo_id','other',
    ]).withMessage('Valid attachment type required'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('documentDate').optional().isISO8601(),
    body('pwkReportType').optional().trim(),
    body('pwkTransmissionCode').optional().isIn(['AA', 'BM', 'EL', 'EM', 'FT', 'FX']),
    body('isConfidential').optional().isBoolean(),
    body('tags').optional().isArray(),
  ],
  attachmentsController.uploadAttachments
);

/**
 * @route   GET /api/attachments/:id
 * @desc    Get attachment metadata
 * @access  Private
 */
router.get('/:id', authMiddleware, [param('id').isMongoId()], attachmentsController.getAttachmentMetadata);

/**
 * @route   GET /api/attachments/:id/download
 * @desc    Download attachment file
 * @access  Private
 */
router.get('/:id/download', authMiddleware, [param('id').isMongoId()], attachmentsController.downloadAttachment);

/**
 * @route   DELETE /api/attachments/:id
 * @desc    Delete attachment
 * @access  Private (Owner, Admin)
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [param('id').isMongoId()],
  attachmentsController.deleteAttachment
);

/**
 * @route   GET /api/claims/:claimId/attachments
 * @desc    List attachments for a claim
 * @access  Private
 */
router.get(
  '/claims/:claimId/attachments',
  authMiddleware,
  [
    param('claimId').isMongoId(),
    query('attachmentType').optional().trim(),
    query('status').optional().trim(),
    query('includeArchived').optional().isBoolean(),
  ],
  attachmentsController.listClaimAttachments
);

/**
 * @route   POST /api/attachments/:id/validate
 * @desc    Validate attachment
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/validate',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [param('id').isMongoId()],
  attachmentsController.validateAttachment
);

/**
 * @route   POST /api/attachments/:id/submit
 * @desc    Mark attachment as submitted
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/submit',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('submissionMethod').isIn(['electronic', 'fax', 'mail', 'portal']).withMessage('Valid submission method required'),
    body('trackingNumber').optional().trim(),
  ],
  attachmentsController.submitAttachment
);

/**
 * @route   POST /api/attachments/:id/archive
 * @desc    Archive attachment
 * @access  Private (Owner, Admin)
 */
router.post(
  '/:id/archive',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [param('id').isMongoId()],
  attachmentsController.archiveAttachment
);

/**
 * @route   GET /api/attachments/stats
 * @desc    Get attachment statistics
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  attachmentsController.getAttachmentStats
);

/**
 * @route   GET /api/attachments/pending
 * @desc    Get pending submissions
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/pending',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  attachmentsController.getPendingSubmissions
);

/**
 * @route   POST /api/attachments/batch/validate
 * @desc    Validate multiple attachments
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/batch/validate',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    body('attachmentIds').isArray({ min: 1, max: 100 }).withMessage('Provide 1-100 attachment IDs'),
    body('attachmentIds.*').isMongoId(),
  ],
  attachmentsController.batchValidateAttachments
);

/**
 * @route   PUT /api/attachments/:id
 * @desc    Update attachment metadata
 * @access  Private (Owner, Admin, Billing)
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('description').optional().trim().isLength({ max: 500 }),
    body('attachmentType').optional().isIn([
      'medical_records','lab_results','radiology_report','operative_report','pathology_report','consultation_report','prescription','authorization','referral','eob','correspondence','billing_statement','patient_consent','insurance_card','photo_id','other',
    ]),
    body('documentDate').optional().isISO8601(),
    body('pwkReportType').optional().trim(),
    body('tags').optional().isArray(),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ],
  attachmentsController.updateAttachment
);

module.exports = router;
