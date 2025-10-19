// SCHEDULE ENDPOINTS (1)
// ============================================

/**
 * @swagger
 * /api/schedule:
 *   get:
 *     tags: [Schedule]
 *     summary: Get schedule for a date
 *     description: Get all appointments and practitioners for a specific date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Schedule data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                 schedule:
 *                   type: array
 */

// ============================================

module.exports = {};
