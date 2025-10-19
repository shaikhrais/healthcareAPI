// STAFF ENDPOINTS (3)
// ============================================

/**
 * @swagger
 * /api/staff:
 *   get:
 *     tags: [Staff]
 *     summary: Get all staff/practitioners
 *     description: Retrieve list of staff members
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of staff
 */

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     tags: [Staff]
 *     summary: Get single staff member
 *     description: Retrieve a specific staff member
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
 *         description: Staff member details
 *       404:
 *         description: Staff member not found
 */

/**
 * @swagger
 * /api/staff/{id}/services:
 *   put:
 *     tags: [Staff]
 *     summary: Update staff services
 *     description: Update services offered by a staff member
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
 *             properties:
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Services updated
 */

// ============================================

module.exports = {};
