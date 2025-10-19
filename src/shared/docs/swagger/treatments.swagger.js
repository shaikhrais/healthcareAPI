// TREATMENTS ENDPOINTS (5)
// ============================================

/**
 * @swagger
 * /api/treatments:
 *   get:
 *     tags: [Treatments]
 *     summary: Get all treatments
 *     description: Retrieve treatment/service list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: bookingEnabled
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: practitioner
 *         schema:
 *           type: string
 *         description: Filter by practitioner ID
 *     responses:
 *       200:
 *         description: List of treatments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Treatment'
 *   post:
 *     tags: [Treatments]
 *     summary: Create treatment
 *     description: Create a new treatment/service
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Treatment'
 *     responses:
 *       201:
 *         description: Treatment created
 */

/**
 * @swagger
 * /api/treatments/{id}:
 *   get:
 *     tags: [Treatments]
 *     summary: Get single treatment
 *     description: Retrieve a specific treatment by ID
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
 *         description: Treatment details
 *       404:
 *         description: Treatment not found
 *   put:
 *     tags: [Treatments]
 *     summary: Update treatment
 *     description: Update an existing treatment
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
 *             $ref: '#/components/schemas/Treatment'
 *     responses:
 *       200:
 *         description: Treatment updated
 *       404:
 *         description: Treatment not found
 *   delete:
 *     tags: [Treatments]
 *     summary: Delete treatment
 *     description: Soft delete by setting active to false
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
 *         description: Treatment deactivated
 *       404:
 *         description: Treatment not found
 */

// ============================================

module.exports = {};
