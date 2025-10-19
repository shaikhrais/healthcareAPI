// CHECK-IN ENDPOINTS (11)
// ============================================

/**
 * @swagger
 * /api/checkin:
 *   post:
 *     tags: [Check-In]
 *     summary: Check in patient
 *     description: Check in a patient for their appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: string
 *               checkInMethod:
 *                 type: string
 *                 enum: [front_desk, self_service, mobile_app]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient checked in
 *       400:
 *         description: Patient already checked in
 */

/**
 * @swagger
 * /api/checkin/{id}/status:
 *   patch:
 *     tags: [Check-In]
 *     summary: Update check-in status
 *     description: Update status of a check-in
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
 *                 enum: [waiting, in_room, with_practitioner, completed, no_show]
 *               roomNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */

/**
 * @swagger
 * /api/checkin/{id}/vitals:
 *   post:
 *     tags: [Check-In]
 *     summary: Add vitals
 *     description: Add or update vital signs for checked-in patient
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
 *               bloodPressure:
 *                 type: string
 *               heartRate:
 *                 type: integer
 *               temperature:
 *                 type: number
 *               weight:
 *                 type: number
 *               height:
 *                 type: number
 *     responses:
 *       200:
 *         description: Vitals updated
 */

/**
 * @swagger
 * /api/checkin/{id}/symptoms:
 *   post:
 *     tags: [Check-In]
 *     summary: Add symptoms
 *     description: Add symptoms to check-in record
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
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Symptoms added
 */

/**
 * @swagger
 * /api/checkin/queue/{practitionerId}:
 *   get:
 *     tags: [Check-In]
 *     summary: Get waiting queue
 *     description: Get waiting queue for a practitioner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practitionerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Waiting queue
 */

/**
 * @swagger
 * /api/checkin/waiting-room:
 *   get:
 *     tags: [Check-In]
 *     summary: Get waiting room status
 *     description: Get overall waiting room status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting room status
 */

/**
 * @swagger
 * /api/checkin/today:
 *   get:
 *     tags: [Check-In]
 *     summary: Get today's check-ins
 *     description: Get all check-ins for today
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's check-ins
 */

/**
 * @swagger
 * /api/checkin/stats/wait-time/{practitionerId}:
 *   get:
 *     tags: [Check-In]
 *     summary: Get wait time statistics
 *     description: Get average wait time stats for a practitioner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practitionerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Wait time statistics
 */

/**
 * @swagger
 * /api/checkin/{id}:
 *   get:
 *     tags: [Check-In]
 *     summary: Get check-in details
 *     description: Get specific check-in details
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
 *         description: Check-in details
 */

/**
 * @swagger
 * /api/checkin/patient/{patientId}:
 *   get:
 *     tags: [Check-In]
 *     summary: Get patient check-in history
 *     description: Get check-in history for a patient
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Patient check-in history
 */

// ============================================

module.exports = {};
