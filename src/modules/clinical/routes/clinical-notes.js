const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const clinicalNotesController = require('../controllers/clinicalNotesController');
const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     ClinicalNote:
 *       type: object
 *       required:
 *         - patientId
 *         - practitionerId
 *         - noteType
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           description: Unique clinical note identifier
 *           example: "note_12345"
 *         patientId:
 *           type: string
 *           description: ID of the patient
 *           example: "pat_67890"
 *         practitionerId:
 *           type: string
 *           description: ID of the practitioner who created the note
 *           example: "doc_54321"
 *         encounterDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of the clinical encounter
 *           example: "2024-01-15T10:30:00Z"
 *         noteType:
 *           type: string
 *           enum: [progress-note, history-physical, discharge-summary, consultation, procedure-note, operative-note]
 *           description: Type of clinical note
 *           example: "progress-note"
 *         status:
 *           type: string
 *           enum: [draft, unsigned, signed, amended, archived]
 *           description: Current status of the note
 *           example: "signed"
 *         content:
 *           type: object
 *           description: Structured clinical note content
 *           properties:
 *             subjective:
 *               type: string
 *               description: Patient's subjective information
 *               example: "Patient reports feeling better since starting medication"
 *             objective:
 *               type: string
 *               description: Objective clinical findings
 *               example: "Blood pressure 120/80, heart rate 72, temperature 98.6°F"
 *             assessment:
 *               type: string
 *               description: Clinical assessment and diagnosis
 *               example: "Hypertension well controlled with current medication"
 *             plan:
 *               type: string
 *               description: Treatment plan and next steps
 *               example: "Continue current medication, follow up in 3 months"
 *             chiefComplaint:
 *               type: string
 *               description: Primary reason for visit
 *               example: "Follow-up for hypertension"
 *         diagnoses:
 *           type: array
 *           description: Associated diagnosis codes
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
 *         medications:
 *           type: array
 *           description: Medications mentioned in the note
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Lisinopril"
 *               dosage:
 *                 type: string
 *                 example: "10mg daily"
 *               instructions:
 *                 type: string
 *                 example: "Take with food"
 *         vitalSigns:
 *           type: object
 *           description: Vital signs recorded during encounter
 *           properties:
 *             bloodPressure:
 *               type: string
 *               example: "120/80"
 *             heartRate:
 *               type: integer
 *               example: 72
 *             temperature:
 *               type: number
 *               example: 98.6
 *             respiratoryRate:
 *               type: integer
 *               example: 16
 *             oxygenSaturation:
 *               type: integer
 *               example: 98
 *         templates:
 *           type: array
 *           description: Templates used to create this note
 *           items:
 *             type: string
 *           example: ["annual-physical", "hypertension-followup"]
 *         amendments:
 *           type: array
 *           description: History of amendments to this note
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-16T14:30:00Z"
 *               practitionerId:
 *                 type: string
 *                 example: "doc_54321"
 *               reason:
 *                 type: string
 *                 example: "Corrected medication dosage"
 *               changes:
 *                 type: object
 *                 description: Original and updated values
 *         addenda:
 *           type: array
 *           description: Additional notes added after initial documentation
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-17T09:00:00Z"
 *               practitionerId:
 *                 type: string
 *                 example: "doc_54321"
 *               content:
 *                 type: string
 *                 example: "Lab results received - all within normal limits"
 *         followUpRequired:
 *           type: boolean
 *           description: Whether follow-up is needed
 *           example: true
 *         followUpDate:
 *           type: string
 *           format: date
 *           description: Recommended follow-up date
 *           example: "2024-04-15"
 *         signedAt:
 *           type: string
 *           format: date-time
 *           description: When the note was electronically signed
 *           example: "2024-01-15T11:30:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the note was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the note was last updated
 *     
 *     ClinicalNoteCreate:
 *       type: object
 *       required:
 *         - patientId
 *         - noteType
 *         - content
 *       properties:
 *         patientId:
 *           type: string
 *           description: ID of the patient
 *           example: "pat_67890"
 *         encounterDate:
 *           type: string
 *           format: date-time
 *           description: Date and time of the clinical encounter
 *           example: "2024-01-15T10:30:00Z"
 *         noteType:
 *           type: string
 *           enum: [progress-note, history-physical, discharge-summary, consultation, procedure-note, operative-note]
 *           description: Type of clinical note
 *           example: "progress-note"
 *         content:
 *           type: object
 *           description: Structured clinical note content
 *           properties:
 *             subjective:
 *               type: string
 *               example: "Patient reports feeling better since starting medication"
 *             objective:
 *               type: string
 *               example: "Blood pressure 120/80, heart rate 72, temperature 98.6°F"
 *             assessment:
 *               type: string
 *               example: "Hypertension well controlled with current medication"
 *             plan:
 *               type: string
 *               example: "Continue current medication, follow up in 3 months"
 *             chiefComplaint:
 *               type: string
 *               example: "Follow-up for hypertension"
 *         diagnoses:
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
 *         medications:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Lisinopril"
 *               dosage:
 *                 type: string
 *                 example: "10mg daily"
 *               instructions:
 *                 type: string
 *                 example: "Take with food"
 *         vitalSigns:
 *           type: object
 *           properties:
 *             bloodPressure:
 *               type: string
 *               example: "120/80"
 *             heartRate:
 *               type: integer
 *               example: 72
 *             temperature:
 *               type: number
 *               example: 98.6
 *             respiratoryRate:
 *               type: integer
 *               example: 16
 *             oxygenSaturation:
 *               type: integer
 *               example: 98
 *         followUpRequired:
 *           type: boolean
 *           example: true
 *         followUpDate:
 *           type: string
 *           format: date
 *           example: "2024-04-15"
 *     
 *     Amendment:
 *       type: object
 *       required:
 *         - reason
 *         - updates
 *       properties:
 *         reason:
 *           type: string
 *           description: Reason for the amendment
 *           example: "Corrected medication dosage information"
 *         updates:
 *           type: object
 *           description: Fields being updated with original and new values
 *           example:
 *             medications:
 *               original: [{"name": "Lisinopril", "dosage": "5mg daily"}]
 *               updated: [{"name": "Lisinopril", "dosage": "10mg daily"}]
 *     
 *     Addendum:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: Additional information to add to the note
 *           example: "Lab results received - all values within normal limits"
 */

/**
 * @swagger
 * /api/clinical-notes:
 *   get:
 *     summary: Get all clinical notes
 *     description: Retrieve clinical notes with optional filtering and pagination
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of notes to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, unsigned, signed, amended, archived]
 *         description: Filter by note status
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *           enum: [progress-note, history-physical, discharge-summary, consultation, procedure-note, operative-note]
 *         description: Filter by note type
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: Filter by practitioner ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes up to this date
 *     responses:
 *       200:
 *         description: Successfully retrieved clinical notes
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
 *                     $ref: '#/components/schemas/ClinicalNote'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       example: 1
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
  '/',
  requireRole('practitioner_limited'),
  [
    query('limit').isInt({ min: 1, max: 200 }).optional(),
    query('status').isString().optional(),
    query('noteType').isString().optional(),
  ],
  clinicalNotesController.getAllClinicalNotes
);

/**
 * @swagger
 * /api/clinical-notes:
 *   post:
 *     summary: Create a new clinical note
 *     description: Create a new clinical note for a patient encounter
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClinicalNoteCreate'
 *           examples:
 *             progress_note:
 *               summary: Progress note example
 *               value:
 *                 patientId: "pat_67890"
 *                 noteType: "progress-note"
 *                 encounterDate: "2024-01-15T10:30:00Z"
 *                 content:
 *                   subjective: "Patient reports improved energy levels and reduced fatigue since starting medication"
 *                   objective: "BP 125/82, HR 68, Temp 98.4°F, RR 16, O2 sat 98%"
 *                   assessment: "Hypertension well controlled, patient responding well to current regimen"
 *                   plan: "Continue Lisinopril 10mg daily, recheck BP in 3 months"
 *                   chiefComplaint: "Follow-up for hypertension management"
 *                 diagnoses:
 *                   - code: "I10"
 *                     description: "Essential hypertension"
 *                     isPrimary: true
 *                 medications:
 *                   - name: "Lisinopril"
 *                     dosage: "10mg daily"
 *                     instructions: "Take in the morning with food"
 *                 vitalSigns:
 *                   bloodPressure: "125/82"
 *                   heartRate: 68
 *                   temperature: 98.4
 *                   respiratoryRate: 16
 *                   oxygenSaturation: 98
 *                 followUpRequired: true
 *                 followUpDate: "2024-04-15"
 *             history_physical:
 *               summary: History and Physical examination
 *               value:
 *                 patientId: "pat_67890"
 *                 noteType: "history-physical"
 *                 encounterDate: "2024-01-15T09:00:00Z"
 *                 content:
 *                   subjective: "45-year-old male presents for annual physical, no acute complaints"
 *                   objective: "Well-appearing male in no acute distress. All systems reviewed and normal"
 *                   assessment: "Healthy adult male, all screening up to date"
 *                   plan: "Continue current lifestyle, return in 1 year for routine follow-up"
 *                   chiefComplaint: "Annual physical examination"
 *                 vitalSigns:
 *                   bloodPressure: "118/78"
 *                   heartRate: 65
 *                   temperature: 98.6
 *                   respiratoryRate: 14
 *                   oxygenSaturation: 99
 *                 followUpRequired: true
 *                 followUpDate: "2025-01-15"
 *     responses:
 *       201:
 *         description: Clinical note successfully created
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
 *                   example: "Clinical note created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ClinicalNote'
 *       400:
 *         description: Invalid note data
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
  requireRole('practitioner_limited'),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID required'),
    body('noteType').isString().notEmpty().withMessage('Note type required'),
  ],
  clinicalNotesController.createClinicalNote
);

/**
 * @swagger
 * /api/clinical-notes/{id}:
 *   put:
 *     summary: Update a clinical note
 *     description: Update an existing clinical note (only allowed for unsigned notes)
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical note ID
 *         example: "note_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClinicalNoteCreate'
 *     responses:
 *       200:
 *         description: Clinical note successfully updated
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
 *                   example: "Clinical note updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ClinicalNote'
 *       400:
 *         description: Invalid note data or note is already signed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Clinical note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions or not note owner
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
  requireRole('practitioner_limited'),
  [param('id').isMongoId().withMessage('Valid note ID required')],
  clinicalNotesController.updateClinicalNote
);

/**
 * @swagger
 * /api/clinical-notes/{id}/amend:
 *   post:
 *     summary: Amend a signed clinical note
 *     description: Create an amendment to a previously signed clinical note for corrections
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical note ID to amend
 *         example: "note_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Amendment'
 *           examples:
 *             medication_correction:
 *               summary: Correct medication dosage
 *               value:
 *                 reason: "Corrected medication dosage after pharmacy consultation"
 *                 updates:
 *                   medications:
 *                     original:
 *                       - name: "Lisinopril"
 *                         dosage: "5mg daily"
 *                         instructions: "Take in morning"
 *                     updated:
 *                       - name: "Lisinopril"
 *                         dosage: "10mg daily"
 *                         instructions: "Take in morning with food"
 *             vital_signs_correction:
 *               summary: Correct vital signs
 *               value:
 *                 reason: "Corrected blood pressure reading due to equipment calibration error"
 *                 updates:
 *                   vitalSigns:
 *                     original:
 *                       bloodPressure: "140/90"
 *                       heartRate: 75
 *                     updated:
 *                       bloodPressure: "130/85"
 *                       heartRate: 72
 *     responses:
 *       200:
 *         description: Amendment successfully added
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
 *                   example: "Clinical note amended successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ClinicalNote'
 *       400:
 *         description: Invalid amendment data or note cannot be amended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Clinical note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions or not note owner
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
  '/:id/amend',
  requireRole('practitioner_limited'),
  [
    param('id').isMongoId().withMessage('Valid note ID required'),
    body('reason').isString().notEmpty().withMessage('Amendment reason required'),
    body('updates').isObject().withMessage('Updates object required'),
  ],
  clinicalNotesController.amendClinicalNote
);

/**
 * @swagger
 * /api/clinical-notes/{id}/addendum:
 *   post:
 *     summary: Add an addendum to a clinical note
 *     description: Add additional information to an existing clinical note without changing original content
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical note ID
 *         example: "note_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Addendum'
 *           examples:
 *             lab_results:
 *               summary: Add lab results
 *               value:
 *                 content: "Lab results received: CBC normal, BMP normal, HbA1c 6.2%. All values within acceptable range for patient's current condition."
 *             patient_call:
 *               summary: Document patient phone call
 *               value:
 *                 content: "Patient called to report mild dizziness. Advised to monitor BP at home and call if symptoms worsen. Follow-up appointment scheduled."
 *     responses:
 *       200:
 *         description: Addendum successfully added
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
 *                   example: "Addendum added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ClinicalNote'
 *       400:
 *         description: Invalid addendum content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Clinical note not found
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
  '/:id/addendum',
  requireRole('practitioner_limited'),
  [
    param('id').isMongoId().withMessage('Valid note ID required'),
    body('content').isString().notEmpty().withMessage('Addendum content required'),
  ],
  clinicalNotesController.addAddendum
);

/**
 * @swagger
 * /api/clinical-notes/patient/{patientId}:
 *   get:
 *     summary: Get clinical notes for a patient
 *     description: Retrieve all clinical notes for a specific patient
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient ID
 *         example: "pat_67890"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of notes to return
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *           enum: [progress-note, history-physical, discharge-summary, consultation, procedure-note, operative-note]
 *         description: Filter by note type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, unsigned, signed, amended, archived]
 *         description: Filter by note status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes up to this date
 *     responses:
 *       200:
 *         description: Successfully retrieved patient clinical notes
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
 *                     $ref: '#/components/schemas/ClinicalNote'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalNotes:
 *                       type: integer
 *                       example: 25
 *                     byType:
 *                       type: object
 *                       properties:
 *                         progress-note:
 *                           type: integer
 *                           example: 15
 *                         history-physical:
 *                           type: integer
 *                           example: 5
 *                         consultation:
 *                           type: integer
 *                           example: 5
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         signed:
 *                           type: integer
 *                           example: 20
 *                         unsigned:
 *                           type: integer
 *                           example: 3
 *                         draft:
 *                           type: integer
 *                           example: 2
 *       404:
 *         description: Patient not found
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
router.get(
  '/patient/:patientId',
  requireRole('practitioner_limited'),
  [
    param('patientId').isMongoId().withMessage('Valid patient ID required'),
    query('limit').isInt({ min: 1, max: 200 }).optional(),
  ],
  clinicalNotesController.getPatientNotes
);

/**
 * @swagger
 * /api/clinical-notes/practitioner/my-notes:
 *   get:
 *     summary: Get practitioner's notes
 *     description: Retrieve clinical notes created by the authenticated practitioner
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of notes to return
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, unsigned, signed, amended, archived]
 *         description: Filter by note status
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *           enum: [progress-note, history-physical, discharge-summary, consultation, procedure-note, operative-note]
 *         description: Filter by note type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes up to this date
 *     responses:
 *       200:
 *         description: Successfully retrieved practitioner's notes
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
 *                     $ref: '#/components/schemas/ClinicalNote'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalNotes:
 *                       type: integer
 *                       example: 150
 *                     unsignedCount:
 *                       type: integer
 *                       example: 5
 *                     draftCount:
 *                       type: integer
 *                       example: 3
 *                     followUpRequired:
 *                       type: integer
 *                       example: 12
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
  '/practitioner/my-notes',
  requireRole('practitioner_limited'),
  [
    query('limit').isInt({ min: 1, max: 200 }).optional(),
    query('status').isString().optional(),
    query('noteType').isString().optional(),
  ],
  clinicalNotesController.getPractitionerNotes
);

/**
 * @swagger
 * /api/clinical-notes/unsigned:
 *   get:
 *     summary: Get unsigned notes for practitioner
 *     description: Retrieve all unsigned clinical notes requiring practitioner signature
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved unsigned notes
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
 *                     $ref: '#/components/schemas/ClinicalNote'
 *                 count:
 *                   type: integer
 *                   description: Total number of unsigned notes
 *                   example: 7
 *                 urgent:
 *                   type: array
 *                   description: Notes older than 24 hours requiring immediate attention
 *                   items:
 *                     $ref: '#/components/schemas/ClinicalNote'
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
router.get('/unsigned', requireRole('practitioner_limited'), clinicalNotesController.getUnsignedNotes);

/**
 * @swagger
 * /api/clinical-notes/follow-up-required:
 *   get:
 *     summary: Get notes requiring follow-up
 *     description: Retrieve clinical notes that have follow-up requirements
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: overdue
 *         schema:
 *           type: boolean
 *         description: Filter for overdue follow-ups only
 *       - in: query
 *         name: daysFromNow
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Follow-ups due within this many days
 *     responses:
 *       200:
 *         description: Successfully retrieved follow-up notes
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
 *                     $ref: '#/components/schemas/ClinicalNote'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalFollowUps:
 *                       type: integer
 *                       example: 25
 *                     overdue:
 *                       type: integer
 *                       example: 3
 *                     thisWeek:
 *                       type: integer
 *                       example: 8
 *                     thisMonth:
 *                       type: integer
 *                       example: 14
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
router.get('/follow-up-required', requireRole('practitioner_limited'), clinicalNotesController.getFollowUpNotes);

/**
 * @swagger
 * /api/clinical-notes/diagnosis/{code}:
 *   get:
 *     summary: Search notes by diagnosis code
 *     description: Find clinical notes associated with a specific diagnosis code
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: ICD-10 diagnosis code
 *         example: "I10"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           default: 50
 *         description: Maximum number of notes to return
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter notes up to this date
 *     responses:
 *       200:
 *         description: Successfully retrieved notes with diagnosis
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
 *                     $ref: '#/components/schemas/ClinicalNote'
 *                 diagnosisInfo:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "I10"
 *                     description:
 *                       type: string
 *                       example: "Essential hypertension"
 *                     occurrences:
 *                       type: integer
 *                       example: 15
 *       400:
 *         description: Invalid diagnosis code
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
router.get(
  '/diagnosis/:code',
  requireRole('practitioner_limited'),
  [param('code').isString().notEmpty().withMessage('Diagnosis code required')],
  clinicalNotesController.searchByDiagnosis
);

/**
 * @swagger
 * /api/clinical-notes/{id}:
 *   get:
 *     summary: Get a specific clinical note
 *     description: Retrieve detailed information about a specific clinical note
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical note ID
 *         example: "note_12345"
 *     responses:
 *       200:
 *         description: Successfully retrieved clinical note
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ClinicalNote'
 *       404:
 *         description: Clinical note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions or access denied
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
  requireRole('practitioner_limited'),
  [param('id').isMongoId().withMessage('Valid note ID required')],
  clinicalNotesController.getClinicalNoteById
);

/**
 * @swagger
 * /api/clinical-notes/{id}:
 *   delete:
 *     summary: Delete a clinical note (soft delete)
 *     description: Soft delete a clinical note (marks as archived, does not permanently remove)
 *     tags: [Clinical Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical note ID
 *         example: "note_12345"
 *     responses:
 *       200:
 *         description: Clinical note successfully archived
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
 *                   example: "Clinical note archived successfully"
 *       404:
 *         description: Clinical note not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions or not note owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Cannot delete signed note
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
  requireRole('practitioner_limited'),
  [param('id').isMongoId().withMessage('Valid note ID required')],
  clinicalNotesController.deleteClinicalNote
);

module.exports = router;
