/**
 * ============================================
 * NOTE TEMPLATES ENDPOINTS (9)
 * ============================================
 */

/**
 * @swagger
 * /api/note-templates:
 *   post:
 *     tags: [Note Templates]
 *     summary: Create a new note template
 *     description: Create a custom note template for clinical notes (Practitioner/Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - noteType
 *             properties:
 *               name:
 *                 type: string
 *                 description: Template name
 *               noteType:
 *                 type: string
 *                 description: Type of note (e.g., SOAP, progress, initial)
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *               isPublic:
 *                 type: boolean
 *               specialty:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/note-templates/{id}:
 *   put:
 *     tags: [Note Templates]
 *     summary: Update a note template
 *     description: Update an existing note template (Creator or Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       400:
 *         description: Cannot edit system templates
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 *   get:
 *     tags: [Note Templates]
 *     summary: Get a specific template
 *     description: Retrieve a note template by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template details
 *       403:
 *         description: Access denied (private template)
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Note Templates]
 *     summary: Delete a template
 *     description: Archive a note template (Creator or Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template archived successfully
 *       400:
 *         description: Cannot delete system templates
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/note-templates/{id}/clone:
 *   post:
 *     tags: [Note Templates]
 *     summary: Clone a template
 *     description: Create a copy of an existing template
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the cloned template
 *     responses:
 *       201:
 *         description: Template cloned successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/note-templates/public:
 *   get:
 *     tags: [Note Templates]
 *     summary: Get public templates
 *     description: Retrieve all public note templates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *         description: Filter by note type
 *     responses:
 *       200:
 *         description: List of public templates
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/note-templates/my-templates:
 *   get:
 *     tags: [Note Templates]
 *     summary: Get user's templates
 *     description: Retrieve templates created by the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's templates
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/note-templates/specialty/{specialty}:
 *   get:
 *     tags: [Note Templates]
 *     summary: Get templates by specialty
 *     description: Retrieve templates filtered by specialty
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: specialty
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialty name
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *         description: Filter by note type
 *     responses:
 *       200:
 *         description: List of specialty templates
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/note-templates/most-used:
 *   get:
 *     tags: [Note Templates]
 *     summary: Get most used templates
 *     description: Retrieve most frequently used templates
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of templates to return
 *     responses:
 *       200:
 *         description: List of most used templates
 *       500:
 *         description: Server error
 */

module.exports = {};
