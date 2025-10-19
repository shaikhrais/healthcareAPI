const express = require('express');

const authMiddleware = require('../../auth/middleware/authMiddleware');
const appointmentController = require('../controllers/appointmentController');
const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       required:
 *         - patientId
 *         - providerId
 *         - startTime
 *         - endTime
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           description: Unique appointment identifier
 *           example: "apt_12345"
 *         patientId:
 *           type: string
 *           description: ID of the patient
 *           example: "pat_67890"
 *         providerId:
 *           type: string
 *           description: ID of the healthcare provider
 *           example: "doc_54321"
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Appointment start time
 *           example: "2024-01-15T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Appointment end time
 *           example: "2024-01-15T11:00:00Z"
 *         status:
 *           type: string
 *           enum: [scheduled, confirmed, in-progress, completed, cancelled, no-show]
 *           description: Current appointment status
 *           example: "scheduled"
 *         type:
 *           type: string
 *           enum: [consultation, follow-up, urgent-care, preventive, specialist]
 *           description: Type of appointment
 *           example: "consultation"
 *         reason:
 *           type: string
 *           description: Reason for the appointment
 *           example: "Annual checkup"
 *         notes:
 *           type: string
 *           description: Additional notes or instructions
 *           example: "Patient has allergies to penicillin"
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [in-person, telehealth, phone]
 *               example: "in-person"
 *             room:
 *               type: string
 *               example: "Room 105"
 *             address:
 *               type: string
 *               example: "123 Medical Center Dr, Suite 200"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the appointment was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the appointment was last updated
 *     
 *     AppointmentCreate:
 *       type: object
 *       required:
 *         - patientId
 *         - providerId
 *         - startTime
 *         - endTime
 *       properties:
 *         patientId:
 *           type: string
 *           description: ID of the patient
 *           example: "pat_67890"
 *         providerId:
 *           type: string
 *           description: ID of the healthcare provider
 *           example: "doc_54321"
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Appointment start time
 *           example: "2024-01-15T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Appointment end time
 *           example: "2024-01-15T11:00:00Z"
 *         type:
 *           type: string
 *           enum: [consultation, follow-up, urgent-care, preventive, specialist]
 *           description: Type of appointment
 *           example: "consultation"
 *         reason:
 *           type: string
 *           description: Reason for the appointment
 *           example: "Annual checkup"
 *         notes:
 *           type: string
 *           description: Additional notes or instructions
 *           example: "Patient has allergies to penicillin"
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [in-person, telehealth, phone]
 *               example: "in-person"
 *             room:
 *               type: string
 *               example: "Room 105"
 *     
 *     AvailabilityCheck:
 *       type: object
 *       required:
 *         - providerId
 *         - startTime
 *         - endTime
 *       properties:
 *         providerId:
 *           type: string
 *           description: ID of the healthcare provider
 *           example: "doc_54321"
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Requested start time
 *           example: "2024-01-15T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Requested end time
 *           example: "2024-01-15T11:00:00Z"
 *     
 *     AvailableSlot:
 *       type: object
 *       properties:
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Available slot start time
 *           example: "2024-01-15T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: Available slot end time
 *           example: "2024-01-15T11:00:00Z"
 *         providerId:
 *           type: string
 *           description: ID of the available provider
 *           example: "doc_54321"
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [in-person, telehealth, phone]
 *               example: "in-person"
 *             room:
 *               type: string
 *               example: "Room 105"
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get all appointments
 *     description: Retrieve a list of appointments with optional filtering and pagination
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Filter by provider ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, in-progress, completed, cancelled, no-show]
 *         description: Filter by appointment status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by appointment date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of appointments per page
 *     responses:
 *       200:
 *         description: Successfully retrieved appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     pages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', appointmentController.getAll);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     description: Retrieve a specific appointment by its unique identifier
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique appointment identifier
 *         example: "apt_12345"
 *     responses:
 *       200:
 *         description: Successfully retrieved appointment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', appointmentController.getById);

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create new appointment
 *     description: Schedule a new appointment for a patient with a healthcare provider
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentCreate'
 *           examples:
 *             consultation:
 *               summary: Regular consultation appointment
 *               value:
 *                 patientId: "pat_67890"
 *                 providerId: "doc_54321"
 *                 startTime: "2024-01-15T10:00:00Z"
 *                 endTime: "2024-01-15T11:00:00Z"
 *                 type: "consultation"
 *                 reason: "Annual checkup"
 *                 location:
 *                   type: "in-person"
 *                   room: "Room 105"
 *             telehealth:
 *               summary: Telehealth appointment
 *               value:
 *                 patientId: "pat_67890"
 *                 providerId: "doc_54321"
 *                 startTime: "2024-01-15T14:00:00Z"
 *                 endTime: "2024-01-15T14:30:00Z"
 *                 type: "follow-up"
 *                 reason: "Follow up on test results"
 *                 location:
 *                   type: "telehealth"
 *     responses:
 *       201:
 *         description: Appointment successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid appointment data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Time slot conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Time slot already booked"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/', appointmentController.create);

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Update appointment
 *     description: Update an existing appointment's details
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique appointment identifier
 *         example: "apt_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentCreate'
 *     responses:
 *       200:
 *         description: Appointment successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid appointment data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.put('/:id', appointmentController.update);

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Cancel appointment
 *     description: Cancel an existing appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique appointment identifier
 *         example: "apt_12345"
 *     responses:
 *       200:
 *         description: Appointment successfully cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment cancelled successfully"
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/:id', appointmentController.delete);

/**
 * @swagger
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status
 *     description: Change the status of an existing appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique appointment identifier
 *         example: "apt_12345"
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
 *                 enum: [scheduled, confirmed, in-progress, completed, cancelled, no-show]
 *                 description: New appointment status
 *                 example: "confirmed"
 *               notes:
 *                 type: string
 *                 description: Optional status change notes
 *                 example: "Patient confirmed via phone"
 *           examples:
 *             confirm:
 *               summary: Confirm appointment
 *               value:
 *                 status: "confirmed"
 *                 notes: "Patient confirmed via phone"
 *             complete:
 *               summary: Mark as completed
 *               value:
 *                 status: "completed"
 *                 notes: "Appointment completed successfully"
 *             cancel:
 *               summary: Cancel appointment
 *               value:
 *                 status: "cancelled"
 *                 notes: "Patient requested cancellation"
 *     responses:
 *       200:
 *         description: Appointment status successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment status updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.patch('/:id/status', appointmentController.changeStatus);

/**
 * @swagger
 * /api/appointments/check-availability:
 *   post:
 *     summary: Check appointment availability
 *     description: Check if a specific time slot is available for scheduling
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AvailabilityCheck'
 *           examples:
 *             check_slot:
 *               summary: Check time slot availability
 *               value:
 *                 providerId: "doc_54321"
 *                 startTime: "2024-01-15T10:00:00Z"
 *                 endTime: "2024-01-15T11:00:00Z"
 *     responses:
 *       200:
 *         description: Availability check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 available:
 *                   type: boolean
 *                   description: Whether the time slot is available
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Time slot is available"
 *                 conflicts:
 *                   type: array
 *                   description: List of conflicting appointments (if any)
 *                   items:
 *                     type: object
 *                     properties:
 *                       appointmentId:
 *                         type: string
 *                         example: "apt_98765"
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00Z"
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T11:30:00Z"
 *       400:
 *         description: Invalid availability check data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/check-availability', appointmentController.checkAvailability);

/**
 * @swagger
 * /api/appointments/available-slots:
 *   get:
 *     summary: Get available appointment slots
 *     description: Retrieve available time slots for scheduling appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Filter by provider ID
 *         example: "doc_54321"
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check for available slots (YYYY-MM-DD)
 *         example: "2024-01-15"
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *           minimum: 15
 *           maximum: 240
 *           default: 60
 *         description: Appointment duration in minutes
 *         example: 60
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [in-person, telehealth, phone]
 *         description: Type of appointment location
 *         example: "in-person"
 *     responses:
 *       200:
 *         description: Successfully retrieved available slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AvailableSlot'
 *                 totalSlots:
 *                   type: integer
 *                   description: Total number of available slots
 *                   example: 8
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/available-slots', appointmentController.getAvailableSlots);

/**
 * @swagger
 * /api/appointments/schedule/range:
 *   get:
 *     summary: Get schedule for date range
 *     description: Retrieve appointments within a specified date range
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the range (YYYY-MM-DD)
 *         example: "2024-01-15"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the range (YYYY-MM-DD)
 *         example: "2024-01-22"
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Filter by provider ID
 *         example: "doc_54321"
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *         example: "pat_67890"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, in-progress, completed, cancelled, no-show]
 *         description: Filter by appointment status
 *         example: "scheduled"
 *     responses:
 *       200:
 *         description: Successfully retrieved schedule
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Appointment'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalAppointments:
 *                       type: integer
 *                       example: 25
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         scheduled:
 *                           type: integer
 *                           example: 15
 *                         confirmed:
 *                           type: integer
 *                           example: 8
 *                         completed:
 *                           type: integer
 *                           example: 2
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date
 *                           example: "2024-01-15"
 *                         endDate:
 *                           type: string
 *                           format: date
 *                           example: "2024-01-22"
 *       400:
 *         description: Invalid date range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/schedule/range', appointmentController.getScheduleRange);

module.exports = router;
