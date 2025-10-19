const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const { authMiddleware, requireRole } = require('../middleware/rolePermissions');
const claimsController = require('../controllers/claimsController');

/**
 * @swagger
 * components:
 *   schemas:
 *     InsuranceClaim:
 *       type: object
 *       required:
 *         - patient
 *         - provider
 *         - insurance
 *         - serviceDate
 *         - diagnosisCodes
 *         - procedures
 *       properties:
 *         id:
 *           type: string
 *           description: Unique claim identifier
 *           example: "claim_12345"
 *         claimNumber:
 *           type: string
 *           description: Insurance claim number
 *           example: "CLM-2024-001234"
 *         patient:
 *           type: object
 *           required: [firstName, lastName, dateOfBirth, gender]
 *           properties:
 *             firstName:
 *               type: string
 *               description: Patient's first name
 *               example: "John"
 *             lastName:
 *               type: string
 *               description: Patient's last name
 *               example: "Doe"
 *             dateOfBirth:
 *               type: string
 *               format: date
 *               description: Patient's date of birth
 *               example: "1980-05-15"
 *             gender:
 *               type: string
 *               enum: [M, F, U, male, female, unknown]
 *               description: Patient's gender
 *               example: "M"
 *             address:
 *               type: object
 *               properties:
 *                 street:
 *                   type: string
 *                   example: "123 Main St"
 *                 city:
 *                   type: string
 *                   example: "Anytown"
 *                 state:
 *                   type: string
 *                   example: "CA"
 *                 zipCode:
 *                   type: string
 *                   example: "12345"
 *             ssn:
 *               type: string
 *               description: Patient's social security number (last 4 digits)
 *               example: "1234"
 *         provider:
 *           type: object
 *           required: [npi, taxId]
 *           properties:
 *             npi:
 *               type: string
 *               description: National Provider Identifier (10 digits)
 *               example: "1234567890"
 *             taxId:
 *               type: string
 *               description: Provider's tax ID
 *               example: "12-3456789"
 *             name:
 *               type: string
 *               description: Provider's name
 *               example: "Dr. Smith Medical Practice"
 *             address:
 *               type: object
 *               properties:
 *                 street:
 *                   type: string
 *                   example: "456 Medical Center Dr"
 *                 city:
 *                   type: string
 *                   example: "Anytown"
 *                 state:
 *                   type: string
 *                   example: "CA"
 *                 zipCode:
 *                   type: string
 *                   example: "12345"
 *         insurance:
 *           type: object
 *           required: [payerId, policyNumber]
 *           properties:
 *             payerId:
 *               type: string
 *               description: Insurance payer identifier
 *               example: "AETNA001"
 *             policyNumber:
 *               type: string
 *               description: Insurance policy number
 *               example: "POL123456789"
 *             groupNumber:
 *               type: string
 *               description: Insurance group number
 *               example: "GRP987654"
 *             subscriberId:
 *               type: string
 *               description: Insurance subscriber ID
 *               example: "SUB123456"
 *             isPrimary:
 *               type: boolean
 *               description: Whether this is primary insurance
 *               example: true
 *         serviceDate:
 *           type: string
 *           format: date
 *           description: Date services were provided
 *           example: "2024-01-15"
 *         placeOfService:
 *           type: string
 *           description: Location where services were provided
 *           example: "11"
 *         diagnosisCodes:
 *           type: array
 *           description: ICD-10 diagnosis codes
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "I10"
 *               description:
 *                 type: string
 *                 example: "Essential hypertension"
 *               isPrimary:
 *                 type: boolean
 *                 example: true
 *         procedures:
 *           type: array
 *           description: CPT procedure codes and charges
 *           items:
 *             type: object
 *             required: [code, charge]
 *             properties:
 *               code:
 *                 type: string
 *                 description: CPT procedure code
 *                 example: "99213"
 *               description:
 *                 type: string
 *                 description: Procedure description
 *                 example: "Office visit, established patient"
 *               charge:
 *                 type: number
 *                 format: float
 *                 description: Procedure charge amount
 *                 example: 125.00
 *               units:
 *                 type: integer
 *                 description: Number of units
 *                 example: 1
 *               modifiers:
 *                 type: array
 *                 description: CPT modifiers
 *                 items:
 *                   type: string
 *                 example: ["25"]
 *         status:
 *           type: string
 *           enum: [draft, ready, submitted, pending, paid, denied, rejected, appeal]
 *           description: Current claim status
 *           example: "submitted"
 *         totalCharge:
 *           type: number
 *           format: float
 *           description: Total claim amount
 *           example: 125.00
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: When claim was submitted
 *           example: "2024-01-16T10:30:00Z"
 *         responseDate:
 *           type: string
 *           format: date-time
 *           description: When response was received
 *         paidAmount:
 *           type: number
 *           format: float
 *           description: Amount paid by insurance
 *           example: 100.00
 *         denialReason:
 *           type: string
 *           description: Reason for denial if applicable
 *         scrubResults:
 *           type: object
 *           description: Latest claim scrubbing results
 *           properties:
 *             hasErrors:
 *               type: boolean
 *               example: false
 *             errorCount:
 *               type: integer
 *               example: 0
 *             warningCount:
 *               type: integer
 *               example: 1
 *             lastScrubDate:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T14:30:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When claim was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When claim was last updated
 *     
 *     ClaimCreate:
 *       type: object
 *       required:
 *         - patient
 *         - provider
 *         - insurance
 *         - serviceDate
 *         - diagnosisCodes
 *         - procedures
 *       properties:
 *         patient:
 *           type: object
 *           required: [firstName, lastName, dateOfBirth, gender]
 *           properties:
 *             firstName:
 *               type: string
 *               example: "John"
 *             lastName:
 *               type: string
 *               example: "Doe"
 *             dateOfBirth:
 *               type: string
 *               format: date
 *               example: "1980-05-15"
 *             gender:
 *               type: string
 *               enum: [M, F, U, male, female, unknown]
 *               example: "M"
 *             address:
 *               type: object
 *               properties:
 *                 street:
 *                   type: string
 *                   example: "123 Main St"
 *                 city:
 *                   type: string
 *                   example: "Anytown"
 *                 state:
 *                   type: string
 *                   example: "CA"
 *                 zipCode:
 *                   type: string
 *                   example: "12345"
 *             ssn:
 *               type: string
 *               example: "1234"
 *         provider:
 *           type: object
 *           required: [npi, taxId]
 *           properties:
 *             npi:
 *               type: string
 *               description: National Provider Identifier (10 digits)
 *               example: "1234567890"
 *             taxId:
 *               type: string
 *               example: "12-3456789"
 *             name:
 *               type: string
 *               example: "Dr. Smith Medical Practice"
 *         insurance:
 *           type: object
 *           required: [payerId, policyNumber]
 *           properties:
 *             payerId:
 *               type: string
 *               example: "AETNA001"
 *             policyNumber:
 *               type: string
 *               example: "POL123456789"
 *             groupNumber:
 *               type: string
 *               example: "GRP987654"
 *             subscriberId:
 *               type: string
 *               example: "SUB123456"
 *             isPrimary:
 *               type: boolean
 *               example: true
 *         serviceDate:
 *           type: string
 *           format: date
 *           example: "2024-01-15"
 *         placeOfService:
 *           type: string
 *           example: "11"
 *         diagnosisCodes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "I10"
 *               description:
 *                 type: string
 *                 example: "Essential hypertension"
 *               isPrimary:
 *                 type: boolean
 *                 example: true
 *         procedures:
 *           type: array
 *           items:
 *             type: object
 *             required: [code, charge]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "99213"
 *               description:
 *                 type: string
 *                 example: "Office visit, established patient"
 *               charge:
 *                 type: number
 *                 format: float
 *                 example: 125.00
 *               units:
 *                 type: integer
 *                 example: 1
 *               modifiers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["25"]
 *     
 *     ScrubResult:
 *       type: object
 *       properties:
 *         claimId:
 *           type: string
 *           example: "claim_12345"
 *         hasErrors:
 *           type: boolean
 *           example: false
 *         errorCount:
 *           type: integer
 *           example: 0
 *         warningCount:
 *           type: integer
 *           example: 2
 *         issues:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [error, warning, info]
 *                 example: "warning"
 *               category:
 *                 type: string
 *                 example: "demographics"
 *               code:
 *                 type: string
 *                 example: "MISSING_SECONDARY_ADDRESS"
 *               message:
 *                 type: string
 *                 example: "Secondary address line is recommended"
 *               field:
 *                 type: string
 *                 example: "patient.address.line2"
 *               autoFixable:
 *                 type: boolean
 *                 example: false
 *         scrubDate:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T14:30:00Z"
 *         duration:
 *           type: integer
 *           description: Scrub duration in milliseconds
 *           example: 1250
 *     
 *     ClaimStats:
 *       type: object
 *       properties:
 *         totalClaims:
 *           type: integer
 *           example: 1250
 *         byStatus:
 *           type: object
 *           properties:
 *             draft:
 *               type: integer
 *               example: 25
 *             ready:
 *               type: integer
 *               example: 15
 *             submitted:
 *               type: integer
 *               example: 800
 *             paid:
 *               type: integer
 *               example: 350
 *             denied:
 *               type: integer
 *               example: 35
 *             rejected:
 *               type: integer
 *               example: 25
 *         totalCharges:
 *           type: number
 *           format: float
 *           example: 156750.00
 *         totalPaid:
 *           type: number
 *           format: float
 *           example: 142500.00
 *         averageProcessingTime:
 *           type: integer
 *           description: Average processing time in days
 *           example: 14
 *         denialRate:
 *           type: number
 *           format: float
 *           description: Denial rate as percentage
 *           example: 2.8
 */

/**
 * Claims API Routes
 *
 * Endpoints for managing insurance claims and scrubbing
 */
const router = express.Router();

// Validation rules
const createClaimValidation = [
  body('patient.firstName').trim().notEmpty().withMessage('Patient first name is required'),
  body('patient.lastName').trim().notEmpty().withMessage('Patient last name is required'),
  body('patient.dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('patient.gender')
    .isIn(['M', 'F', 'U', 'male', 'female', 'unknown'])
    .withMessage('Valid gender is required'),
  body('provider.npi')
    .trim()
    .notEmpty()
    .isLength({ min: 10, max: 10 })
    .withMessage('Valid NPI is required'),
  body('provider.taxId').trim().notEmpty().withMessage('Provider tax ID is required'),
  body('insurance.payerId').trim().notEmpty().withMessage('Insurance payer ID is required'),
  body('insurance.policyNumber').trim().notEmpty().withMessage('Policy number is required'),
  body('serviceDate').isISO8601().withMessage('Valid service date is required'),
  body('placeOfService').trim().notEmpty().withMessage('Place of service is required'),
  body('diagnosisCodes').isArray({ min: 1 }).withMessage('At least one diagnosis code is required'),
  body('procedures').isArray({ min: 1 }).withMessage('At least one procedure is required'),
  body('procedures.*.code').trim().notEmpty().withMessage('Procedure code is required'),
  body('procedures.*.charge').isFloat({ min: 0 }).withMessage('Valid procedure charge is required'),
];

const updateClaimValidation = [param('id').isMongoId().withMessage('Invalid claim ID')];

const scrubValidation = [
  param('id').isMongoId().withMessage('Invalid claim ID'),
  body('autoFix').optional().isBoolean().withMessage('autoFix must be boolean'),
  body('categories').optional().isArray().withMessage('categories must be an array'),
];

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Create new insurance claim
 *     description: Create a new insurance claim for healthcare services
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClaimCreate'
 *           examples:
 *             office_visit:
 *               summary: Office visit claim
 *               value:
 *                 patient:
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   dateOfBirth: "1980-05-15"
 *                   gender: "M"
 *                   address:
 *                     street: "123 Main St"
 *                     city: "Anytown"
 *                     state: "CA"
 *                     zipCode: "12345"
 *                   ssn: "1234"
 *                 provider:
 *                   npi: "1234567890"
 *                   taxId: "12-3456789"
 *                   name: "Dr. Smith Medical Practice"
 *                 insurance:
 *                   payerId: "AETNA001"
 *                   policyNumber: "POL123456789"
 *                   groupNumber: "GRP987654"
 *                   subscriberId: "SUB123456"
 *                   isPrimary: true
 *                 serviceDate: "2024-01-15"
 *                 placeOfService: "11"
 *                 diagnosisCodes:
 *                   - code: "I10"
 *                     description: "Essential hypertension"
 *                     isPrimary: true
 *                 procedures:
 *                   - code: "99213"
 *                     description: "Office visit, established patient"
 *                     charge: 125.00
 *                     units: 1
 *             preventive_care:
 *               summary: Preventive care claim
 *               value:
 *                 patient:
 *                   firstName: "Jane"
 *                   lastName: "Smith"
 *                   dateOfBirth: "1975-03-20"
 *                   gender: "F"
 *                 provider:
 *                   npi: "9876543210"
 *                   taxId: "98-7654321"
 *                   name: "Wellness Medical Center"
 *                 insurance:
 *                   payerId: "BCBS001"
 *                   policyNumber: "POL987654321"
 *                   isPrimary: true
 *                 serviceDate: "2024-01-20"
 *                 placeOfService: "11"
 *                 diagnosisCodes:
 *                   - code: "Z00.00"
 *                     description: "Encounter for general adult medical examination"
 *                     isPrimary: true
 *                 procedures:
 *                   - code: "99395"
 *                     description: "Periodic comprehensive preventive medicine"
 *                     charge: 200.00
 *                     units: 1
 *     responses:
 *       201:
 *         description: Claim successfully created
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
 *                   example: "Insurance claim created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/InsuranceClaim'
 *       400:
 *         description: Invalid claim data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest(createClaimValidation),
  claimsController.createClaim
);

/**
 * @swagger
 * /api/claims:
 *   get:
 *     summary: Get all insurance claims
 *     description: Retrieve a list of insurance claims with optional filtering
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, ready, submitted, pending, paid, denied, rejected, appeal]
 *         description: Filter by claim status
 *       - in: query
 *         name: patientName
 *         schema:
 *           type: string
 *         description: Filter by patient name (partial match)
 *       - in: query
 *         name: payerId
 *         schema:
 *           type: string
 *         description: Filter by insurance payer ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter claims from this service date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter claims up to this service date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of claims per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [serviceDate, submittedAt, totalCharge, status]
 *           default: serviceDate
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Successfully retrieved claims
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
 *                     $ref: '#/components/schemas/InsuranceClaim'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 8
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalCharges:
 *                       type: number
 *                       format: float
 *                       example: 15750.00
 *                     averageCharge:
 *                       type: number
 *                       format: float
 *                       example: 105.00
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/',
  authMiddleware,
  claimsController.getAllClaims
);

/**
 * @swagger
 * /api/claims/{id}:
 *   get:
 *     summary: Get claim by ID
 *     description: Retrieve detailed information about a specific insurance claim
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     responses:
 *       200:
 *         description: Successfully retrieved claim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/InsuranceClaim'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id',
  authMiddleware,
  validateRequest([param('id').isMongoId()]),
  claimsController.getClaimById
);

/**
 * @swagger
 * /api/claims/{id}:
 *   put:
 *     summary: Update insurance claim
 *     description: Update an existing insurance claim (only allowed for draft/ready status)
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClaimCreate'
 *     responses:
 *       200:
 *         description: Claim successfully updated
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
 *                   example: "Insurance claim updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/InsuranceClaim'
 *       400:
 *         description: Invalid claim data or claim cannot be updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest(updateClaimValidation),
  claimsController.updateClaim
);

/**
 * @swagger
 * /api/claims/{id}:
 *   delete:
 *     summary: Delete insurance claim
 *     description: Delete an insurance claim (only allowed for draft status)
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     responses:
 *       200:
 *         description: Claim successfully deleted
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
 *                   example: "Insurance claim deleted successfully"
 *       400:
 *         description: Claim cannot be deleted (not in draft status)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['admin', 'owner']),
  validateRequest([param('id').isMongoId()]),
  claimsController.deleteClaim
);

/**
 * @swagger
 * /api/claims/{id}/scrub:
 *   post:
 *     summary: Scrub insurance claim
 *     description: Perform claim scrubbing to identify errors and warnings before submission
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoFix:
 *                 type: boolean
 *                 description: Automatically fix issues that can be corrected
 *                 default: false
 *                 example: true
 *               categories:
 *                 type: array
 *                 description: Specific categories to scrub (if not provided, all categories)
 *                 items:
 *                   type: string
 *                   enum: [demographics, insurance, procedures, diagnosis, provider]
 *                 example: ["demographics", "insurance"]
 *           examples:
 *             full_scrub:
 *               summary: Full claim scrub with auto-fix
 *               value:
 *                 autoFix: true
 *             selective_scrub:
 *               summary: Scrub specific categories only
 *               value:
 *                 autoFix: false
 *                 categories: ["demographics", "insurance"]
 *     responses:
 *       200:
 *         description: Claim scrubbing completed
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
 *                   example: "Claim scrubbing completed"
 *                 data:
 *                   $ref: '#/components/schemas/ScrubResult'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/scrub',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest(scrubValidation),
  claimsController.scrubClaim
);

/**
 * @swagger
 * /api/claims/{id}/auto-fix:
 *   post:
 *     summary: Auto-fix claim issues
 *     description: Automatically fix common claim issues that can be corrected programmatically
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     responses:
 *       200:
 *         description: Auto-fix completed
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
 *                   example: "Auto-fix completed"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fixedIssues:
 *                       type: integer
 *                       description: Number of issues automatically fixed
 *                       example: 3
 *                     remainingIssues:
 *                       type: integer
 *                       description: Number of issues requiring manual attention
 *                       example: 1
 *                     fixes:
 *                       type: array
 *                       description: Details of fixes applied
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                             example: "patient.address.zipCode"
 *                           issue:
 *                             type: string
 *                             example: "Invalid ZIP code format"
 *                           fix:
 *                             type: string
 *                             example: "Reformatted to 5-digit ZIP code"
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/auto-fix',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([param('id').isMongoId()]),
  claimsController.autoFixClaim
);

/**
 * @swagger
 * /api/claims/{id}/scrub-reports:
 *   get:
 *     summary: Get claim scrub reports
 *     description: Retrieve historical scrub reports for a claim
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of reports to return
 *     responses:
 *       200:
 *         description: Successfully retrieved scrub reports
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
 *                     $ref: '#/components/schemas/ScrubResult'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id/scrub-reports',
  authMiddleware,
  validateRequest([param('id').isMongoId()]),
  claimsController.getScrubReports
);

/**
 * @swagger
 * /api/claims/{id}/scrub-reports/latest:
 *   get:
 *     summary: Get latest scrub report
 *     description: Retrieve the most recent scrub report for a claim
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     responses:
 *       200:
 *         description: Successfully retrieved latest scrub report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ScrubResult'
 *       404:
 *         description: Claim or scrub report not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/:id/scrub-reports/latest',
  authMiddleware,
  validateRequest([param('id').isMongoId()]),
  claimsController.getLatestScrubReport
);

/**
 * @swagger
 * /api/claims/{id}/submit:
 *   post:
 *     summary: Submit claim to insurance
 *     description: Submit a claim to the insurance payer for processing
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     responses:
 *       200:
 *         description: Claim successfully submitted
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
 *                   example: "Claim submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     claimId:
 *                       type: string
 *                       example: "claim_12345"
 *                     submissionId:
 *                       type: string
 *                       example: "sub_98765"
 *                     submittedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-16T10:30:00Z"
 *                     expectedResponseDate:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-30"
 *       400:
 *         description: Claim cannot be submitted (has errors or invalid status)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/submit',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([param('id').isMongoId()]),
  claimsController.submitClaim
);

/**
 * @swagger
 * /api/claims/{id}/resubmit:
 *   post:
 *     summary: Resubmit denied/rejected claim
 *     description: Resubmit a previously denied or rejected claim after corrections
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Claim ID
 *         example: "claim_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for resubmission
 *                 example: "Corrected diagnosis code per payer feedback"
 *               notes:
 *                 type: string
 *                 description: Additional resubmission notes
 *                 example: "Updated primary diagnosis from I10 to I25.10"
 *           examples:
 *             diagnosis_correction:
 *               summary: Resubmit with corrected diagnosis
 *               value:
 *                 reason: "Corrected diagnosis code per payer feedback"
 *                 notes: "Updated primary diagnosis from I10 to I25.10"
 *             procedure_modifier:
 *               summary: Resubmit with added procedure modifier
 *               value:
 *                 reason: "Added required procedure modifier"
 *                 notes: "Added modifier 25 to procedure code 99213"
 *     responses:
 *       200:
 *         description: Claim successfully resubmitted
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
 *                   example: "Claim resubmitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     claimId:
 *                       type: string
 *                       example: "claim_12345"
 *                     resubmissionId:
 *                       type: string
 *                       example: "resub_54321"
 *                     resubmittedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-02-01T14:30:00Z"
 *                     attemptNumber:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Invalid resubmission data or claim cannot be resubmitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Claim not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/:id/resubmit',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    param('id').isMongoId(),
    body('reason').trim().notEmpty().withMessage('Resubmission reason is required'),
  ]),
  claimsController.resubmitClaim
);

/**
 * @swagger
 * /api/claims/stats/overview:
 *   get:
 *     summary: Get claims statistics overview
 *     description: Retrieve comprehensive statistics about claims processing
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (defaults to 30 days ago)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (defaults to today)
 *       - in: query
 *         name: payerId
 *         schema:
 *           type: string
 *         description: Filter statistics by specific payer
 *     responses:
 *       200:
 *         description: Successfully retrieved claims statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ClaimStats'
 *                 trends:
 *                   type: object
 *                   properties:
 *                     weekOverWeek:
 *                       type: object
 *                       properties:
 *                         submissions:
 *                           type: number
 *                           description: Percentage change in submissions
 *                           example: 15.5
 *                         denials:
 *                           type: number
 *                           description: Percentage change in denials
 *                           example: -8.2
 *                     monthOverMonth:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: number
 *                           description: Percentage change in revenue
 *                           example: 12.3
 *                         processingTime:
 *                           type: number
 *                           description: Percentage change in processing time
 *                           example: -5.1
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/stats/overview',
  authMiddleware,
  requireRole(['admin', 'owner']),
  claimsController.getStatsOverview
);

/**
 * @swagger
 * /api/claims/batch/scrub:
 *   post:
 *     summary: Batch scrub multiple claims
 *     description: Perform claim scrubbing on multiple claims simultaneously
 *     tags: [Insurance Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - claimIds
 *             properties:
 *               claimIds:
 *                 type: array
 *                 description: Array of claim IDs to scrub
 *                 items:
 *                   type: string
 *                 example: ["claim_12345", "claim_67890", "claim_11111"]
 *               autoFix:
 *                 type: boolean
 *                 description: Automatically fix issues that can be corrected
 *                 default: false
 *                 example: true
 *               categories:
 *                 type: array
 *                 description: Specific categories to scrub
 *                 items:
 *                   type: string
 *                   enum: [demographics, insurance, procedures, diagnosis, provider]
 *                 example: ["demographics", "insurance"]
 *           examples:
 *             batch_scrub:
 *               summary: Batch scrub with auto-fix
 *               value:
 *                 claimIds: ["claim_12345", "claim_67890", "claim_11111"]
 *                 autoFix: true
 *             selective_batch:
 *               summary: Selective batch scrub
 *               value:
 *                 claimIds: ["claim_12345", "claim_67890"]
 *                 autoFix: false
 *                 categories: ["demographics", "insurance"]
 *     responses:
 *       200:
 *         description: Batch scrubbing initiated
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
 *                   example: "Batch scrubbing initiated for 3 claims"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batchId:
 *                       type: string
 *                       description: Batch operation identifier
 *                       example: "batch_98765"
 *                     claimCount:
 *                       type: integer
 *                       description: Number of claims being processed
 *                       example: 3
 *                     estimatedCompletion:
 *                       type: string
 *                       format: date-time
 *                       description: Estimated completion time
 *                       example: "2024-01-16T11:00:00Z"
 *       400:
 *         description: Invalid batch request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/batch/scrub',
  authMiddleware,
  requireRole(['admin', 'owner']),
  validateRequest([
    body('claimIds').isArray({ min: 1 }).withMessage('At least one claim ID is required'),
    body('claimIds.*').isMongoId().withMessage('Invalid claim ID'),
  ]),
  claimsController.batchScrubClaims
);

module.exports = router;
