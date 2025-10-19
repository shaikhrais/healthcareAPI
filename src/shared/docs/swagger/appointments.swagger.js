/**
 * ============================================
 * APPOINTMENTS ENDPOINTS (9)
 * ============================================
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Get all appointments
 *     description: Retrieve appointments with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by specific date
 *       - in: query
 *         name: practitioner
 *         schema:
 *           type: string
 *         description: Filter by practitioner ID
 *       - in: query
 *         name: patient
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, completed, cancelled, no-show]
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Appointments]
 *     summary: Create appointment
 *     description: Create a new appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Appointment'
 *     responses:
 *       201:
 *         description: Appointment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get single appointment
 *     description: Retrieve a specific appointment by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *   put:
 *     tags: [Appointments]
 *     summary: Update appointment
 *     description: Update an existing appointment
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
 *             $ref: '#/components/schemas/Appointment'
 *     responses:
 *       200:
 *         description: Appointment updated
 *       404:
 *         description: Appointment not found
 *   delete:
 *     tags: [Appointments]
 *     summary: Delete appointment
 *     description: Delete an appointment
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
 *         description: Appointment deleted successfully
 *       404:
 *         description: Appointment not found
 */

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Change appointment status
 *     description: Update the status of an appointment
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
 *                 enum: [scheduled, confirmed, completed, cancelled, no-show]
 *               reason:
 *                 type: string
 *                 description: Cancellation reason (if status is cancelled)
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Appointment not found
 */

/**
 * @swagger
 * /api/appointments/check-availability:
 *   post:
 *     tags: [Appointments]
 *     summary: Check appointment availability
 *     description: Validate if a time slot is available for booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - practitioner
 *               - startTime
 *               - duration
 *             properties:
 *               practitioner:
 *                 type: string
 *                 description: Practitioner ID
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *                 example: 60
 *               excludeAppointmentId:
 *                 type: string
 *                 description: Exclude specific appointment from conflict check
 *     responses:
 *       200:
 *         description: Availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 reason:
 *                   type: string
 *                 shift:
 *                   type: object
 */

/**
 * @swagger
 * /api/appointments/available-slots:
 *   get:
 *     tags: [Appointments]
 *     summary: Get available time slots
 *     description: Retrieve all available time slots for a practitioner on a specific date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: practitioner
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
 *         description: Available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "09:00"
 *                 shift:
 *                   type: object
 */

/**
 * @swagger
 * /api/appointments/schedule/range:
 *   get:
 *     tags: [Appointments]
 *     summary: Get schedule for date range
 *     description: Retrieve appointments for a specific date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: practitioner
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointments in range
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 */

module.exports = {};
