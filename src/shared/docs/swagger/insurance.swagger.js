/**
 * ============================================
 * INSURANCE ENDPOINTS (21)
 * ============================================
 */

/**
 * @swagger
 * /api/insurance:
 *   get:
 *     tags: [Insurance]
 *     summary: Get all insurance records
 *     description: Retrieve insurance records with pagination (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of insurance records
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Insurance]
 *     summary: Add insurance for a patient
 *     description: Create new insurance record (Front Desk/Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - provider
 *               - policyNumber
 *               - effectiveDate
 *             properties:
 *               patientId:
 *                 type: string
 *               provider:
 *                 type: string
 *               policyNumber:
 *                 type: string
 *               groupNumber:
 *                 type: string
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *               expirationDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Insurance created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/{id}:
 *   get:
 *     tags: [Insurance]
 *     summary: Get specific insurance details
 *     description: Retrieve insurance record by ID (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Insurance details
 *       404:
 *         description: Insurance not found
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Insurance]
 *     summary: Update insurance information
 *     description: Update existing insurance record (Front Desk/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Insurance updated
 *       404:
 *         description: Insurance not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/{id}/verify:
 *   post:
 *     tags: [Insurance]
 *     summary: Verify insurance eligibility
 *     description: Check insurance eligibility and coverage (Front Desk/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/batch-verify:
 *   post:
 *     tags: [Insurance]
 *     summary: Batch verify insurances needing verification
 *     description: Verify multiple insurance records at once (Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch verification results
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/patient/{patientId}:
 *   get:
 *     tags: [Insurance]
 *     summary: Get all insurances for a patient
 *     description: Retrieve patient's insurance records (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient's insurance records
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/patient/{patientId}/summary:
 *   get:
 *     tags: [Insurance]
 *     summary: Get patient insurance summary with claims
 *     description: Comprehensive insurance and claims summary for patient (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient insurance summary
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/expiring-soon:
 *   get:
 *     tags: [Insurance]
 *     summary: Get insurances expiring soon
 *     description: Retrieve insurance records expiring within specified days (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Expiring insurance records
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/needs-verification:
 *   get:
 *     tags: [Insurance]
 *     summary: Get insurances needing verification
 *     description: Retrieve insurance records requiring verification (Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance records needing verification
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims:
 *   post:
 *     tags: [Insurance Claims]
 *     summary: Create insurance claim
 *     description: Submit new insurance claim (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - insuranceId
 *               - practitionerId
 *               - serviceDate
 *               - diagnosisCodes
 *               - procedureCodes
 *             properties:
 *               patientId:
 *                 type: string
 *               insuranceId:
 *                 type: string
 *               practitionerId:
 *                 type: string
 *               serviceDate:
 *                 type: string
 *                 format: date
 *               diagnosisCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *               procedureCodes:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Claim created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/{id}/submit:
 *   post:
 *     tags: [Insurance Claims]
 *     summary: Submit claim electronically
 *     description: Submit claim to clearinghouse (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim submitted
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/{id}/status:
 *   get:
 *     tags: [Insurance Claims]
 *     summary: Check claim status with clearinghouse
 *     description: Query current claim status (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Claim status
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/batch-check:
 *   post:
 *     tags: [Insurance Claims]
 *     summary: Batch check status for pending claims
 *     description: Check status for multiple pending claims (Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch status check results
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/{id}/payment:
 *   post:
 *     tags: [Insurance Claims]
 *     summary: Process claim payment
 *     description: Record payment received for claim (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               paymentDate:
 *                 type: string
 *                 format: date
 *               checkNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/{id}/appeal:
 *   post:
 *     tags: [Insurance Claims]
 *     summary: Appeal denied claim
 *     description: Submit appeal for denied or rejected claim (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               additionalDocumentation:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Appeal submitted
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/pending:
 *   get:
 *     tags: [Insurance Claims]
 *     summary: Get all pending claims
 *     description: Retrieve pending insurance claims (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending claims
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/overdue:
 *   get:
 *     tags: [Insurance Claims]
 *     summary: Get overdue claims
 *     description: Retrieve claims past expected payment date (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue claims
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/denied:
 *   get:
 *     tags: [Insurance Claims]
 *     summary: Get denied claims
 *     description: Retrieve denied or rejected claims (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Denied claims
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/claims/patient/{patientId}:
 *   get:
 *     tags: [Insurance Claims]
 *     summary: Get patient's claim history
 *     description: Retrieve claim history for specific patient (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Patient claim history
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/insurance/analytics:
 *   get:
 *     tags: [Insurance]
 *     summary: Get insurance analytics
 *     description: Comprehensive insurance and claims analytics (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Insurance analytics
 *       400:
 *         description: Invalid date range
 *       500:
 *         description: Server error
 */

module.exports = {};
