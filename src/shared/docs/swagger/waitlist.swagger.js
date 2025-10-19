// WAITLIST ENDPOINTS (7)
// ============================================

/**
 * @swagger
 * /api/waitlist:
 *   get:
 *     tags: [Waitlist]
 *     summary: Get waitlist entries
 *     description: Retrieve waitlist with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patient
 *         schema:
 *           type: string
 *       - in: query
 *         name: practitioner
 *         schema:
 *           type: string
 *       - in: query
 *         name: treatment
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, contacted, booked, expired, cancelled]
 *     responses:
 *       200:
 *         description: Waitlist entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Waitlist'
 *   post:
 *     tags: [Waitlist]
 *     summary: Add to waitlist
 *     description: Add patient to waitlist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Waitlist'
 *     responses:
 *       201:
 *         description: Added to waitlist
 */

/**
 * @swagger
 * /api/waitlist/{id}:
 *   get:
 *     tags: [Waitlist]
 *     summary: Get single waitlist entry
 *     description: Retrieve a specific waitlist entry
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
 *         description: Waitlist entry details
 *       404:
 *         description: Waitlist entry not found
 *   put:
 *     tags: [Waitlist]
 *     summary: Update waitlist entry
 *     description: Update an existing waitlist entry
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
 *             $ref: '#/components/schemas/Waitlist'
 *     responses:
 *       200:
 *         description: Waitlist entry updated
 *   delete:
 *     tags: [Waitlist]
 *     summary: Delete waitlist entry
 *     description: Remove a waitlist entry
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
 *         description: Waitlist entry deleted
 */

/**
 * @swagger
 * /api/waitlist/{id}/status:
 *   patch:
 *     tags: [Waitlist]
 *     summary: Change waitlist status
 *     description: Update the status of a waitlist entry
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, contacted, booked, expired, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 */

/**
 * @swagger
 * /api/waitlist/{id}/notify:
 *   patch:
 *     tags: [Waitlist]
 *     summary: Mark as notified
 *     description: Mark a waitlist entry as contacted
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
 *         description: Marked as notified
 */

/**
 * @swagger
 * /api/waitlist/{id}/matching-slots:
 *   get:
 *     tags: [Waitlist]
 *     summary: Find matching slots
 *     description: Find available slots matching waitlist preferences
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
 *         description: Matching slots found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   type: object
 *                 matchingSlots:
 *                   type: array
 *                 count:
 *                   type: number
 */

// ============================================

module.exports = {};
