/**
 * ============================================
 * CLINICAL NOTES ENDPOINTS (13)
 * ============================================
 */

/**
 * @swagger
 * /api/clinical-notes:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Get all clinical notes
 *     description: Retrieve clinical notes with pagination and filters (Practitioner/Admin)
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of clinical notes
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Clinical Notes]
 *     summary: Create a new clinical note
 *     description: Create a clinical note for a patient (Practitioner/Admin)
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
 *               - noteType
 *             properties:
 *               patientId:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               noteType:
 *                 type: string
 *               templateId:
 *                 type: string
 *               content:
 *                 type: object
 *     responses:
 *       201:
 *         description: Clinical note created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/{id}:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Get a specific clinical note
 *     description: Retrieve a clinical note by ID (Practitioner/Admin)
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
 *         description: Clinical note details
 *       404:
 *         description: Clinical note not found
 *       500:
 *         description: Server error
 *   put:
 *     tags: [Clinical Notes]
 *     summary: Update a clinical note
 *     description: Update a clinical note (Creator or Admin only)
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
 *         description: Clinical note updated
 *       400:
 *         description: Cannot edit signed notes
 *       403:
 *         description: Access denied
 *       404:
 *         description: Clinical note not found
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Clinical Notes]
 *     summary: Delete a clinical note
 *     description: Soft delete a clinical note (Creator or Admin only)
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
 *         description: Clinical note deleted
 *       400:
 *         description: Cannot delete signed notes
 *       403:
 *         description: Access denied
 *       404:
 *         description: Clinical note not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/{id}/sign:
 *   post:
 *     tags: [Clinical Notes]
 *     summary: Sign a clinical note
 *     description: Electronically sign a clinical note (Creator only)
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
 *               - signature
 *             properties:
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note signed successfully
 *       400:
 *         description: Note already signed
 *       403:
 *         description: Only author can sign
 *       404:
 *         description: Clinical note not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/{id}/amend:
 *   post:
 *     tags: [Clinical Notes]
 *     summary: Amend a signed clinical note
 *     description: Create an amendment to a signed note (Creator or Admin)
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
 *               - updates
 *             properties:
 *               reason:
 *                 type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Amendment added
 *       403:
 *         description: Access denied
 *       404:
 *         description: Clinical note not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/{id}/addendum:
 *   post:
 *     tags: [Clinical Notes]
 *     summary: Add an addendum to a clinical note
 *     description: Add additional information to a note (Practitioner/Admin)
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Addendum added
 *       404:
 *         description: Clinical note not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/patient/{patientId}:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Get clinical notes for a patient
 *     description: Retrieve patient's clinical note history (Practitioner/Admin)
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
 *         description: Patient's clinical notes
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/practitioner/my-notes:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Get practitioner's notes
 *     description: Retrieve notes created by current practitioner
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
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Practitioner's notes
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/unsigned:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Get unsigned notes for practitioner
 *     description: Retrieve practitioner's unsigned notes requiring signature
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unsigned notes
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/follow-up-required:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Get notes requiring follow-up
 *     description: Retrieve notes flagged for follow-up (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notes requiring follow-up
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/clinical-notes/diagnosis/{code}:
 *   get:
 *     tags: [Clinical Notes]
 *     summary: Search notes by diagnosis code
 *     description: Find notes containing specific diagnosis code (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notes with diagnosis code
 *       500:
 *         description: Server error
 */

module.exports = {};
