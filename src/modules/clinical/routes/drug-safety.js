
const express = require('express');

/**
 * @swagger
 * components:
 *   schemas:
 *     DrugInteraction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Interaction ID
 *         drug1:
 *           type: string
 *           description: First drug name
 *           example: "Warfarin"
 *         drug2:
 *           type: string
 *           description: Second drug name
 *           example: "Aspirin"
 *         severity:
 *           type: string
 *           enum: [minor, moderate, major, contraindicated]
 *           description: Interaction severity level
 *         description:
 *           type: string
 *           description: Interaction description
 *           example: "Increased risk of bleeding"
 *         mechanism:
 *           type: string
 *           description: Mechanism of interaction
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *           description: Clinical recommendations
 *         source:
 *           type: string
 *           description: Information source
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     DrugAllergy:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Allergy ID
 *         drugName:
 *           type: string
 *           description: Drug name
 *           example: "Penicillin"
 *         allergyType:
 *           type: string
 *           enum: [mild, moderate, severe, anaphylactic]
 *           description: Allergy severity
 *         symptoms:
 *           type: array
 *           items:
 *             type: string
 *           description: Common symptoms
 *           example: ["rash", "itching", "swelling"]
 *         crossReactivity:
 *           type: array
 *           items:
 *             type: string
 *           description: Cross-reactive drugs
 *         alternatives:
 *           type: array
 *           items:
 *             type: string
 *           description: Alternative medications
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     SafetyCheck:
 *       type: object
 *       properties:
 *         interactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [drug-drug, drug-allergy]
 *               severity:
 *                 type: string
 *                 enum: [minor, moderate, major, contraindicated]
 *               message:
 *                 type: string
 *               recommendations:
 *                 type: array
 *                 items:
 *                   type: string
 *         allergies:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               allergen:
 *                 type: string
 *               severity:
 *                 type: string
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *         overallRisk:
 *           type: string
 *           enum: [low, moderate, high, critical]
 *         recommendation:
 *           type: string
 *           enum: [proceed, caution, contraindicated]
 *         timestamp:
 *           type: string
 *           format: date-time
 *     
 *     DrugSafetyStats:
 *       type: object
 *       properties:
 *         totalInteractions:
 *           type: integer
 *           description: Total drug interactions in database
 *         totalAllergies:
 *           type: integer
 *           description: Total allergy records
 *         checksPerformed:
 *           type: integer
 *           description: Total safety checks performed
 *         alertsGenerated:
 *           type: integer
 *           description: Total alerts generated
 *         severityBreakdown:
 *           type: object
 *           properties:
 *             minor:
 *               type: integer
 *             moderate:
 *               type: integer
 *             major:
 *               type: integer
 *             contraindicated:
 *               type: integer
 *         recentChecks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               count:
 *                 type: integer
 */

const drugSafetyController = require('../controllers/drugSafetyController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/permissions');
const router = express.Router();


/**
 * @swagger
 * /api/drug-safety/check-interaction:
 *   post:
 *     tags: [Drug Safety]
 *     summary: Check drug-drug interactions
 *     description: Check for potential interactions between two or more medications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drugs
 *             properties:
 *               drugs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 2
 *                 description: List of drug names to check for interactions
 *                 example: ["Warfarin", "Aspirin"]
 *               patientId:
 *                 type: string
 *                 description: Patient ID for context
 *     responses:
 *       200:
 *         description: Interaction check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SafetyCheck'
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to prescribe medications
 *       500:
 *         description: Failed to check interactions
 */
router.post('/check-interaction', protect, authorize('prescribe_medications'), drugSafetyController.checkInteraction);

/**
 * @swagger
 * /api/drug-safety/check-allergies:
 *   post:
 *     tags: [Drug Safety]
 *     summary: Check drug allergies
 *     description: Check for potential allergic reactions to medications for a patient
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
 *               - medications
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: Patient ID
 *               medications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of medications to check
 *                 example: ["Penicillin", "Amoxicillin"]
 *     responses:
 *       200:
 *         description: Allergy check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     allergies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           medication:
 *                             type: string
 *                           allergyType:
 *                             type: string
 *                           severity:
 *                             type: string
 *                           symptoms:
 *                             type: array
 *                             items:
 *                               type: string
 *                     overallRisk:
 *                       type: string
 *                     recommendation:
 *                       type: string
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to prescribe medications
 *       500:
 *         description: Failed to check allergies
 */
router.post('/check-allergies', protect, authorize('prescribe_medications'), drugSafetyController.checkAllergies);

/**
 * @swagger
 * /api/drug-safety/comprehensive-check:
 *   post:
 *     tags: [Drug Safety]
 *     summary: Comprehensive drug safety check
 *     description: Perform complete safety check including interactions, allergies, and contraindications
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
 *               - medications
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: Patient ID
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
 *                 description: Medications to check
 *               currentMedications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Patient's current medications
 *     responses:
 *       200:
 *         description: Comprehensive check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SafetyCheck'
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to prescribe medications
 *       500:
 *         description: Failed to perform comprehensive check
 */
router.post('/comprehensive-check', protect, authorize('prescribe_medications'), drugSafetyController.comprehensiveCheck);

/**
 * @swagger
 * /api/drug-safety/patient/{patientId}/medications:
 *   get:
 *     tags: [Drug Safety]
 *     summary: Check all patient medications
 *     description: Check all medications for a specific patient for interactions and allergies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *     responses:
 *       200:
 *         description: Patient medication check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientId:
 *                       type: string
 *                     medications:
 *                       type: array
 *                       items:
 *                         type: string
 *                     safetyCheck:
 *                       $ref: '#/components/schemas/SafetyCheck'
 *       404:
 *         description: Patient not found
 *       403:
 *         description: Not authorized to view patients
 *       500:
 *         description: Failed to check patient medications
 */
router.get('/patient/:patientId/medications', protect, authorize('view_patients'), drugSafetyController.checkAllMedications);

/**
 * @swagger
 * /api/drug-safety/interactions:
 *   get:
 *     tags: [Drug Safety]
 *     summary: Get all drug interactions
 *     description: Retrieve all drug interactions in the system (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [minor, moderate, major, contraindicated]
 *         description: Filter by severity level
 *       - in: query
 *         name: drug
 *         schema:
 *           type: string
 *         description: Filter by drug name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Drug interactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DrugInteraction'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       403:
 *         description: Not authorized to manage system
 *       500:
 *         description: Failed to retrieve interactions
 *   post:
 *     tags: [Drug Safety]
 *     summary: Add new drug interaction
 *     description: Add a new drug interaction to the database (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drug1
 *               - drug2
 *               - severity
 *               - description
 *             properties:
 *               drug1:
 *                 type: string
 *                 description: First drug name
 *                 example: "Warfarin"
 *               drug2:
 *                 type: string
 *                 description: Second drug name
 *                 example: "Aspirin"
 *               severity:
 *                 type: string
 *                 enum: [minor, moderate, major, contraindicated]
 *                 description: Interaction severity
 *               description:
 *                 type: string
 *                 description: Interaction description
 *               mechanism:
 *                 type: string
 *                 description: Mechanism of interaction
 *               recommendations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Clinical recommendations
 *               source:
 *                 type: string
 *                 description: Information source
 *     responses:
 *       201:
 *         description: Drug interaction added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/DrugInteraction'
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to manage system
 *       500:
 *         description: Failed to add interaction
 */
router.get('/interactions', protect, authorize('manage_system'), drugSafetyController.getInteractions);
router.post('/interactions', protect, authorize('manage_system'), drugSafetyController.addInteraction);

/**
 * @swagger
 * /api/drug-safety/allergies:
 *   get:
 *     tags: [Drug Safety]
 *     summary: Get all allergy alerts
 *     description: Get all allergy alerts for admin management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: allergyType
 *         schema:
 *           type: string
 *           enum: [mild, moderate, severe, anaphylactic]
 *         description: Filter by allergy type
 *       - in: query
 *         name: drug
 *         schema:
 *           type: string
 *         description: Filter by drug name
 *     responses:
 *       200:
 *         description: Allergy alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DrugAllergy'
 *       403:
 *         description: Not authorized to manage system
 *       500:
 *         description: Failed to retrieve allergies
 *   post:
 *     tags: [Drug Safety]
 *     summary: Add new allergy alert
 *     description: Add a new drug allergy alert to the database (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - drugName
 *               - allergyType
 *               - symptoms
 *             properties:
 *               drugName:
 *                 type: string
 *                 description: Drug name
 *                 example: "Penicillin"
 *               allergyType:
 *                 type: string
 *                 enum: [mild, moderate, severe, anaphylactic]
 *                 description: Allergy severity
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Common symptoms
 *                 example: ["rash", "itching", "swelling"]
 *               crossReactivity:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Cross-reactive drugs
 *               alternatives:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Alternative medications
 *     responses:
 *       201:
 *         description: Allergy alert added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/DrugAllergy'
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to manage system
 *       500:
 *         description: Failed to add allergy
 */
router.get('/allergies', protect, authorize('manage_system'), drugSafetyController.getAllergies);
router.post('/allergies', protect, authorize('manage_system'), drugSafetyController.addAllergy);

/**
 * @swagger
 * /api/drug-safety/stats:
 *   get:
 *     tags: [Drug Safety]
 *     summary: Get drug safety statistics
 *     description: Get comprehensive drug safety statistics and analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *     responses:
 *       200:
 *         description: Drug safety statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DrugSafetyStats'
 *       403:
 *         description: Not authorized to view analytics
 *       500:
 *         description: Failed to retrieve statistics
 */
router.get('/stats', protect, authorize('view_analytics'), drugSafetyController.getStats);

/**
 * @swagger
 * /api/drug-safety/seed:
 *   post:
 *     tags: [Drug Safety]
 *     summary: Seed common drug interactions and allergies
 *     description: Seed the database with common drug interactions and allergy data (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dataSource:
 *                 type: string
 *                 enum: [fda, nih, custom]
 *                 default: fda
 *                 description: Data source for seeding
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to overwrite existing data
 *     responses:
 *       200:
 *         description: Database seeded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     interactionsAdded:
 *                       type: integer
 *                     allergiesAdded:
 *                       type: integer
 *                     duration:
 *                       type: string
 *       403:
 *         description: Not authorized to manage system
 *       500:
 *         description: Failed to seed database
 */
router.post('/seed', protect, authorize('manage_system'), drugSafetyController.seedDatabase);

module.exports = router;