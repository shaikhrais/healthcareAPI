/**
 * ============================================
 * REPORTS ENDPOINTS (4)
 * ============================================
 */

/**
 * @swagger
 * /api/reports/appointments:
 *   get:
 *     tags: [Reports]
 *     summary: Get appointments report
 *     description: Generate appointments report with statistics (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *     responses:
 *       200:
 *         description: Appointments report with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                     byType:
 *                       type: object
 *                     totalRevenue:
 *                       type: number
 *                 period:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/reports/revenue:
 *   get:
 *     tags: [Reports]
 *     summary: Get revenue report
 *     description: Generate revenue report with payment statistics (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *     responses:
 *       200:
 *         description: Revenue report with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalPayments:
 *                       type: integer
 *                     totalRevenue:
 *                       type: number
 *                     byMethod:
 *                       type: object
 *                     averagePayment:
 *                       type: number
 *                 period:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/reports/practitioners:
 *   get:
 *     tags: [Reports]
 *     summary: Get practitioners performance report
 *     description: Generate performance report for all practitioners (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Practitioners performance report
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
 *                     type: object
 *                     properties:
 *                       practitioner:
 *                         type: object
 *                       appointments:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: integer
 *                           completed:
 *                             type: integer
 *                           upcoming:
 *                             type: integer
 *                           completionRate:
 *                             type: string
 *                 totalPractitioners:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/reports/patients:
 *   get:
 *     tags: [Reports]
 *     summary: Get patients report
 *     description: Generate patients report with statistics (Admin/Billing)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patients report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     newThisMonth:
 *                       type: integer
 *                 data:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */

module.exports = {};
