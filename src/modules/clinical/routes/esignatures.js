const express = require('express');
const esignaturesController = require('../controllers/esignaturesController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();


router.get('/templates', protect, esignaturesController.getTemplates);
router.get('/templates/:id', protect, esignaturesController.getTemplateById);

/**
 * @route   POST /api/esignatures/templates
 * @desc    Create document template
 * @access  Private (Admin, Staff)
 */
router.post('/templates', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
// ...existing code...
});

/**
 * @route   PUT /api/esignatures/templates/:id
 * @desc    Update template (creates new version)
 * @access  Private (Admin, Staff)
 */
router.put(
  '/templates/:id',
  protect,
  authorize('full_access', 'admin_billing'),
  esignaturesController.updateTemplate
);

/**
 * @route   DELETE /api/esignatures/templates/:id
 * @desc    Deactivate template
 * @access  Private (Admin)
 */
router.delete(
  '/templates/:id',
  protect,
  authorize('full_access'),
  esignaturesController.deactivateTemplate
);

// ==================== E-SIGNATURES ====================

/**
 * @route   GET /api/esignatures
 * @desc    Get e-signatures with filters
 * @access  Private
 */
router.get('/', protect, esignaturesController.getSignatures);

/**
 * @route   GET /api/esignatures/:id
 * @desc    Get single e-signature
 * @access  Private
 */
router.get('/:id', protect, esignaturesController.getSignatureById);

/**
 * @route   POST /api/esignatures
 * @desc    Create e-signature request
 * @access  Private
 */
router.post('/', protect, esignaturesController.createSignature);

/**
 * @route   POST /api/esignatures/from-template
 * @desc    Create e-signature from template
 * @access  Private
 */
router.post('/from-template', protect, esignaturesController.createSignatureFromTemplate);

/**
 * @route   POST /api/esignatures/:id/sign
 * @desc    Add signature to document
 * @access  Private
 */
// The following line has been refactored to delegate to the controller
// to remove business logic from the route handler.
router.post('/:id/sign', protect, esignaturesController.addSignature);

/**
 * @route   POST /api/esignatures/:id/decline
 * @desc    Decline signature request
 * @access  Private
 */
router.post('/:id/decline', protect, esignaturesController.declineSignature);

/**
 * @route   POST /api/esignatures/:id/void
 * @desc    Void signature document
 * @access  Private (Admin, Staff)
 */
router.post('/:id/void', protect, authorize('full_access', 'admin_billing'), esignaturesController.voidSignature);

/**
 * @route   POST /api/esignatures/:id/send-reminder
 * @desc    Send reminder for pending signature
 * @access  Private
 */
router.post('/:id/send-reminder', protect, esignaturesController.sendReminder);

/**
 * @route   GET /api/esignatures/:id/verify
 * @desc    Verify document integrity
 * @access  Private
 */
router.get('/:id/verify', protect, esignaturesController.verifySignature);

/**
 * @route   GET /api/esignatures/:id/download
 * @desc    Download signed document
 * @access  Private
 */
router.get('/:id/download', protect, esignaturesController.downloadSignature);

router.get('/patient/:patientId/pending', protect, esignaturesController.getPendingForPatient);
router.get('/appointment/:appointmentId', protect, esignaturesController.getForAppointment);
router.get('/expired', protect, authorize('full_access'), esignaturesController.getExpired);
router.get('/statistics', protect, authorize('full_access', 'admin_billing'), esignaturesController.getStatistics);
module.exports = router;
