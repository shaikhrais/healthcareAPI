const express = require('express');

const { body, param, query } = require('express-validator');

const insuranceController = require('../controllers/insuranceController');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/insurance
 * @desc    Get all insurance records (with pagination)
 * @access  Practitioner, Admin
 */
router.get(
  '/',
  requireRole('practitioner_limited'),
  [query('limit').isInt({ min: 1, max: 200 }).optional(), query('status').isString().optional()],
  insuranceController.getAllInsurances
);

/**
 * @route   POST /api/insurance
 * @desc    Add insurance for a patient
 * @access  Front Desk, Admin
 */
router.post(
  '/',
  requireRole('practitioner_front_desk'),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID required'),
    body('provider').notEmpty().withMessage('Provider required'),
    body('policyNumber').notEmpty().withMessage('Policy number required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date required'),
  ],
  insuranceController.createInsurance
);

/**
 * @route   PUT /api/insurance/:id
 * @desc    Update insurance information
 * @access  Front Desk, Admin
 */
router.put(
  '/:id',
  requireRole('practitioner_front_desk'),
  [param('id').isMongoId().withMessage('Valid insurance ID required')],
  insuranceController.updateInsurance
);

/**
 * @route   POST /api/insurance/:id/verify
 * @desc    Verify insurance eligibility
 * @access  Front Desk, Admin
 */
router.post(
  '/:id/verify',
  requireRole('practitioner_front_desk'),
  [param('id').isMongoId().withMessage('Valid insurance ID required')],
  insuranceController.verifyEligibility
);

/**
 * @route   POST /api/insurance/batch-verify
 * @desc    Batch verify insurances needing verification
 * @access  Admin
 */
router.post('/batch-verify', requireRole('admin_billing'), insuranceController.batchVerifyInsurances);

/**
 * @route   GET /api/insurance/patient/:patientId
 * @desc    Get all insurances for a patient
 * @access  Practitioner, Admin
 */
router.get(
  '/patient/:patientId',
  requireRole('practitioner_limited'),
  [param('patientId').isMongoId().withMessage('Valid patient ID required')],
  insuranceController.getPatientInsurances
);

/**
 * @route   GET /api/insurance/patient/:patientId/summary
 * @desc    Get patient insurance summary with claims
 * @access  Practitioner, Admin
 */
router.get(
  '/patient/:patientId/summary',
  requireRole('practitioner_limited'),
  [param('patientId').isMongoId().withMessage('Valid patient ID required')],
  insuranceController.getPatientInsuranceSummary
);

/**
 * @route   GET /api/insurance/expiring-soon
 * @desc    Get insurances expiring soon
 * @access  Admin
 */
router.get(
  '/expiring-soon',
  requireRole('admin_billing'),
  [query('days').isInt({ min: 1, max: 365 }).optional()],
  insuranceController.getExpiringSoon
);

/**
 * @route   GET /api/insurance/needs-verification
 * @desc    Get insurances needing verification
 * @access  Admin
 */
router.get('/needs-verification', requireRole('admin_billing'), insuranceController.getNeedingVerification);

// ========== CLAIMS ROUTES ==========

/**
 * @route   POST /api/insurance/claims
 * @desc    Create insurance claim
 * @access  Admin, Billing
 */
router.post(
  '/claims',
  requireRole('admin_billing'),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID required'),
    body('insuranceId').isMongoId().withMessage('Valid insurance ID required'),
    body('practitionerId').isMongoId().withMessage('Valid practitioner ID required'),
    body('serviceDate').isISO8601().withMessage('Valid service date required'),
    body('diagnosisCodes').isArray().withMessage('Diagnosis codes must be an array'),
    body('procedureCodes').isArray().withMessage('Procedure codes must be an array'),
  ],
  insuranceController.createClaim
);

/**
 * @route   POST /api/insurance/claims/:id/submit
 * @desc    Submit claim electronically
 * @access  Admin, Billing
 */
router.post(
  '/claims/:id/submit',
  requireRole('admin_billing'),
  [param('id').isMongoId().withMessage('Valid claim ID required')],
  insuranceController.submitClaim
);

/**
 * @route   GET /api/insurance/claims/:id/status
 * @desc    Check claim status with clearinghouse
 * @access  Admin, Billing
 */
router.get(
  '/claims/:id/status',
  requireRole('admin_billing'),
  [param('id').isMongoId().withMessage('Valid claim ID required')],
  insuranceController.checkClaimStatus
);

/**
 * @route   POST /api/insurance/claims/batch-check
 * @desc    Batch check status for pending claims
 * @access  Admin
 */
router.post('/claims/batch-check', requireRole('admin_billing'), insuranceController.batchCheckClaimStatus);

/**
 * @route   POST /api/insurance/claims/:id/payment
 * @desc    Process claim payment
 * @access  Admin, Billing
 */
router.post(
  '/claims/:id/payment',
  requireRole('admin_billing'),
  [
    param('id').isMongoId().withMessage('Valid claim ID required'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
  ],
  insuranceController.processClaimPayment
);

/**
 * @route   POST /api/insurance/claims/:id/appeal
 * @desc    Appeal denied claim
 * @access  Admin, Billing
 */
router.post(
  '/claims/:id/appeal',
  requireRole('admin_billing'),
  [
    param('id').isMongoId().withMessage('Valid claim ID required'),
    body('reason').notEmpty().withMessage('Appeal reason required'),
  ],
  insuranceController.appealClaim
);

/**
 * @route   GET /api/insurance/claims/pending
 * @desc    Get all pending claims
 * @access  Admin, Billing
 */
router.get('/claims/pending', requireRole('admin_billing'), insuranceController.getPendingClaims);

/**
 * @route   GET /api/insurance/claims/overdue
 * @desc    Get overdue claims
 * @access  Admin, Billing
 */
router.get('/claims/overdue', requireRole('admin_billing'), insuranceController.getOverdueClaims);

/**
 * @route   GET /api/insurance/claims/denied
 * @desc    Get denied claims
 * @access  Admin, Billing
 */
router.get('/claims/denied', requireRole('admin_billing'), insuranceController.getDeniedClaims);

/**
 * @route   GET /api/insurance/claims/patient/:patientId
 * @desc    Get patient's claim history
 * @access  Practitioner, Admin
 */
router.get(
  '/claims/patient/:patientId',
  requireRole('practitioner_limited'),
  [
    param('patientId').isMongoId().withMessage('Valid patient ID required'),
    query('limit').isInt({ min: 1, max: 200 }).optional(),
  ],
  insuranceController.getPatientClaims
);

/**
 * @route   GET /api/insurance/analytics
 * @desc    Get insurance analytics
 * @access  Admin
 */
router.get(
  '/analytics',
  requireRole('admin_billing'),
  [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required'),
  ],
  insuranceController.getInsuranceAnalytics
);

/**
 * @route   GET /api/insurance/:id
 * @desc    Get specific insurance details
 * @access  Practitioner, Admin
 */
router.get(
  '/:id',
  requireRole('practitioner_limited'),
  [param('id').isMongoId().withMessage('Valid insurance ID required')],
  insuranceController.getInsuranceById
);

module.exports = router;
