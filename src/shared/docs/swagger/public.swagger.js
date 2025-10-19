// PUBLIC BOOKING ENDPOINTS (8)
// ============================================

/**
 * @swagger
 * /api/public/services:
 *   get:
 *     tags: [Public Booking]
 *     summary: Get available services (public)
 *     description: List all services available for online booking
 *     responses:
 *       200:
 *         description: Available services
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Treatment'
 */

/**
 * @swagger
 * /api/public/practitioners:
 *   get:
 *     tags: [Public Booking]
 *     summary: Get practitioners (public)
 *     description: List practitioners available for booking
 *     parameters:
 *       - in: query
 *         name: treatmentId
 *         schema:
 *           type: string
 *         description: Filter by treatment
 *     responses:
 *       200:
 *         description: Available practitioners
 */

/**
 * @swagger
 * /api/public/available-dates:
 *   get:
 *     tags: [Public Booking]
 *     summary: Get available dates (public)
 *     description: Get dates with availability for next 30 days
 *     parameters:
 *       - in: query
 *         name: practitionerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: duration
 *         schema:
 *           type: number
 *           default: 30
 *     responses:
 *       200:
 *         description: Dates with availability
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   slotsAvailable:
 *                     type: number
 */

/**
 * @swagger
 * /api/public/available-slots:
 *   get:
 *     tags: [Public Booking]
 *     summary: Get available time slots (public)
 *     description: Get available time slots for specific date
 *     parameters:
 *       - in: query
 *         name: practitionerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: duration
 *         schema:
 *           type: number
 *           default: 30
 *     responses:
 *       200:
 *         description: Available time slots
 */

/**
 * @swagger
 * /api/public/register-patient:
 *   post:
 *     tags: [Public Booking]
 *     summary: Register patient (public)
 *     description: Quick patient registration for online booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - dateOfBirth
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Patient registered
 *       400:
 *         description: Patient already exists
 */

/**
 * @swagger
 * /api/public/book:
 *   post:
 *     tags: [Public Booking]
 *     summary: Create booking (public)
 *     description: Book an appointment online
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - practitionerId
 *               - treatmentId
 *               - startTime
 *               - duration
 *             properties:
 *               patientId:
 *                 type: string
 *               practitionerId:
 *                 type: string
 *               treatmentId:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 confirmationNumber:
 *                   type: string
 *                 appointment:
 *                   $ref: '#/components/schemas/Appointment'
 */

/**
 * @swagger
 * /api/public/booking/{id}:
 *   get:
 *     tags: [Public Booking]
 *     summary: Get booking confirmation (public)
 *     description: Retrieve booking details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */

/**
 * @swagger
 * /api/public/booking/{id}/cancel:
 *   post:
 *     tags: [Public Booking]
 *     summary: Cancel booking (public)
 *     description: Cancel an online booking
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Cancellation requires 24 hours notice
 */

// ============================================

module.exports = {};
