// PAYMENTS ENDPOINTS (11)
// ============================================

/**
 * @swagger
 * /api/payments:
 *   get:
 *     tags: [Payments]
 *     summary: Get all payments
 *     description: Get payments with pagination and filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Payments list with pagination
 *   post:
 *     tags: [Payments]
 *     summary: Process payment
 *     description: Process a new payment
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
 *               - amount
 *               - paymentMethod
 *             properties:
 *               patientId:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment processed
 */

/**
 * @swagger
 * /api/payments/stripe/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: Confirm Stripe payment
 *     description: Confirm a Stripe payment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *               - paymentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 */

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     tags: [Payments]
 *     summary: Process refund
 *     description: Process a refund for a payment
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
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed
 */

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment details
 *     description: Get details of a specific payment
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
 *         description: Payment details
 */

/**
 * @swagger
 * /api/payments/patient/{patientId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get patient payment history
 *     description: Get payment history for a patient
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Patient payment history
 */

/**
 * @swagger
 * /api/payments/patient/{patientId}/balance:
 *   get:
 *     tags: [Payments]
 *     summary: Get patient balance
 *     description: Get outstanding balance for a patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient balance
 */

/**
 * @swagger
 * /api/payments/{id}/invoice:
 *   get:
 *     tags: [Payments]
 *     summary: Generate invoice
 *     description: Generate invoice for a payment
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
 *         description: Invoice generated
 */

/**
 * @swagger
 * /api/payments/stats/daily:
 *   get:
 *     tags: [Payments]
 *     summary: Get daily payment statistics
 *     description: Get payment statistics for a specific day
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily payment statistics
 */

/**
 * @swagger
 * /api/payments/stats/range:
 *   get:
 *     tags: [Payments]
 *     summary: Get payment statistics for date range
 *     description: Get payment statistics for a date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Payment statistics for range
 */

module.exports = {};
