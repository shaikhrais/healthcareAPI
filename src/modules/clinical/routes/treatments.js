const express = require('express');

/**
 * @swagger
 * components:
 *   schemas:
 *     Treatment:
 *       type: object
 *       required:
 *         - patientId
 *         - treatmentType
 *         - description
 *         - providerId
 *       properties:
 *         _id:
 *           type: string
 *           description: Treatment ID
 *         patientId:
 *           type: string
 *           description: Patient ID
 *         treatmentType:
 *           type: string
 *           enum: [medication, therapy, surgery, procedure, consultation, followup]
 *           description: Type of treatment
 *         description:
 *           type: string
 *           description: Treatment description
 *         providerId:
 *           type: string
 *           description: Healthcare provider ID
 *         diagnosis:
 *           type: string
 *           description: Associated diagnosis
 *         startDate:
 *           type: string
 *           format: date
 *           description: Treatment start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Treatment end date
 *         status:
 *           type: string
 *           enum: [planned, active, completed, cancelled, on_hold]
 *           description: Treatment status
 *         medications:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               dosage:
 *                 type: string
 *               frequency:
 *                 type: string
 *         instructions:
 *           type: string
 *           description: Treatment instructions
 *         notes:
 *           type: string
 *           description: Additional notes
 *         cost:
 *           type: number
 *           minimum: 0
 *           description: Treatment cost
 *         active:
 *           type: boolean
 *           default: true
 *           description: Whether treatment is active
 *         createdAt:
 *           type: string
 *           format: date-time
         updatedAt:
           type: string
           format: date-time
 */

const { authMiddleware } = require('../middleware/auth');
const treatmentsController = require('../controllers/treatmentsController');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/clinical/treatments:
 *   get:
 *     tags: [Clinical]
 *     summary: Get all treatments
 *     description: Retrieve all treatments with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: treatmentType
 *         schema:
 *           type: string
 *           enum: [medication, therapy, surgery, procedure, consultation, followup]
 *         description: Filter by treatment type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planned, active, completed, cancelled, on_hold]
 *         description: Filter by treatment status
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Filter by provider ID
 *     responses:
 *       200:
 *         description: Treatments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Treatment'
 *       500:
 *         description: Failed to retrieve treatments
 */
router.get('/', treatmentsController.getAllTreatments);

/**
 * @swagger
 * /api/clinical/treatments/{id}:
 *   get:
 *     tags: [Clinical]
 *     summary: Get treatment by ID
 *     description: Retrieve a specific treatment with all details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Treatment ID
 *     responses:
 *       200:
 *         description: Treatment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Treatment'
 *       404:
 *         description: Treatment not found
 *       500:
 *         description: Failed to retrieve treatment
 */
router.get('/:id', treatmentsController.getTreatmentById);

/**
 * @swagger
 * /api/clinical/treatments:
 *   post:
 *     tags: [Clinical]
 *     summary: Create new treatment
 *     description: Create a new treatment plan for a patient
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
 *               - treatmentType
 *               - description
 *               - providerId
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: Patient ID
 *               treatmentType:
 *                 type: string
 *                 enum: [medication, therapy, surgery, procedure, consultation, followup]
 *                 description: Type of treatment
 *               description:
 *                 type: string
 *                 description: Treatment description
 *               providerId:
 *                 type: string
 *                 description: Healthcare provider ID
 *               diagnosis:
 *                 type: string
 *                 description: Associated diagnosis
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Treatment start date
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Treatment end date
 *               status:
 *                 type: string
 *                 enum: [planned, active, completed, cancelled, on_hold]
 *                 default: planned
 *                 description: Treatment status
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *               instructions:
 *                 type: string
 *                 description: Treatment instructions
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *               cost:
 *                 type: number
 *                 minimum: 0
 *                 description: Treatment cost
 *     responses:
 *       201:
 *         description: Treatment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Treatment'
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Failed to create treatment
 */
router.post('/', treatmentsController.createTreatment);

/**
 * @swagger
 * /api/clinical/treatments/{id}:
 *   put:
 *     tags: [Clinical]
 *     summary: Update treatment
 *     description: Update treatment details and status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Treatment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               treatmentType:
 *                 type: string
 *                 enum: [medication, therapy, surgery, procedure, consultation, followup]
 *               description:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [planned, active, completed, cancelled, on_hold]
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *               instructions:
 *                 type: string
 *               notes:
 *                 type: string
 *               cost:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Treatment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Treatment'
 *       404:
 *         description: Treatment not found
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Failed to update treatment
 *   delete:
 *     tags: [Clinical]
 *     summary: Delete treatment
 *     description: Soft delete a treatment (sets active to false)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Treatment ID
 *     responses:
 *       200:
 *         description: Treatment deleted successfully
 *       404:
 *         description: Treatment not found
 *       500:
 *         description: Failed to delete treatment
 */
router.put('/:id', treatmentsController.updateTreatment);

// Delete treatment (soft delete by setting active: false)
router.delete('/:id', treatmentsController.deleteTreatment);


module.exports = router;
