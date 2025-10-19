// SHIFTS ENDPOINTS (9)
// ============================================

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     tags: [Shifts]
 *     summary: Get practitioner shifts
 *     description: Retrieve shifts with filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: practitioner
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, cancelled, completed]
 *     responses:
 *       200:
 *         description: List of shifts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Shift'
 *   post:
 *     tags: [Shifts]
 *     summary: Create shift
 *     description: Create a new practitioner shift
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Shift'
 *     responses:
 *       201:
 *         description: Shift created
 */

/**
 * @swagger
 * /api/shifts/recurring:
 *   post:
 *     tags: [Shifts]
 *     summary: Create recurring shifts
 *     description: Generate multiple shifts based on recurrence pattern
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               practitioner:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "17:00"
 *               recurrencePattern:
 *                 type: object
 *                 properties:
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [1, 3, 5]
 *                   endDate:
 *                     type: string
 *                     format: date
 *                   exceptions:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: date
 *     responses:
 *       201:
 *         description: Recurring shifts created
 */

/**
 * @swagger
 * /api/shifts/{id}:
 *   get:
 *     tags: [Shifts]
 *     summary: Get single shift
 *     description: Retrieve a specific shift by ID
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
 *         description: Shift details
 *       404:
 *         description: Shift not found
 *   put:
 *     tags: [Shifts]
 *     summary: Update shift
 *     description: Update an existing shift
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
 *             $ref: '#/components/schemas/Shift'
 *     responses:
 *       200:
 *         description: Shift updated
 *       404:
 *         description: Shift not found
 *   delete:
 *     tags: [Shifts]
 *     summary: Delete shift
 *     description: Permanently delete a shift
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
 *         description: Shift deleted
 *       404:
 *         description: Shift not found
 */

/**
 * @swagger
 * /api/shifts/{id}/cancel:
 *   patch:
 *     tags: [Shifts]
 *     summary: Cancel shift
 *     description: Cancel a scheduled shift
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
 *         description: Shift cancelled
 *       404:
 *         description: Shift not found
 */

/**
 * @swagger
 * /api/shifts/{id}/slots:
 *   get:
 *     tags: [Shifts]
 *     summary: Get available time slots for shift
 *     description: Retrieve all available time slots within a shift
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: string
 */

/**
 * @swagger
 * /api/shifts/practitioner/{practitionerId}:
 *   get:
 *     tags: [Shifts]
 *     summary: Get practitioner's shifts
 *     description: Get shifts for a specific practitioner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: practitionerId
 *         required: true
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
 *         description: Practitioner's shifts
 */

// ============================================

module.exports = {};
