const express = require('express');

/**
 * @swagger
 * components:
 *   schemas:
 *     Sprint:
 *       type: object
 *       required:
 *         - sprintId
 *         - sprintNumber
 *         - name
 *         - startDate
 *         - endDate
 *         - goals
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique sprint identifier
 *         sprintId:
 *           type: string
 *           description: Sprint ID (e.g., SPR-2025-001)
 *           example: "SPR-2025-001"
 *         sprintNumber:
 *           type: integer
 *           description: Sequential sprint number
 *           example: 42
 *         name:
 *           type: string
 *           description: Sprint name/title
 *           example: "API Documentation Sprint"
 *         description:
 *           type: string
 *           description: Sprint description and objectives
 *         status:
 *           type: string
 *           enum: [planning, active, completed, cancelled]
 *           description: Current sprint status
 *         startDate:
 *           type: string
 *           format: date-time
 *           description: Sprint start date
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: Sprint end date
 *         goals:
 *           type: array
 *           items:
 *             type: string
 *           description: Sprint goals and objectives
 *         team:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               member:
 *                 type: string
 *                 description: Team member user ID
 *               role:
 *                 type: string
 *                 enum: [developer, tester, reviewer, manager]
 *               capacity:
 *                 type: number
 *                 description: Member capacity percentage
 *         capacity:
 *           type: object
 *           properties:
 *             totalStoryPoints:
 *               type: number
 *             plannedVelocity:
 *               type: number
 *             actualVelocity:
 *               type: number
 *         taskSummary:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             completed:
 *               type: integer
 *             inProgress:
 *               type: integer
 *             blocked:
 *               type: integer
 *         metrics:
 *           type: object
 *           properties:
 *             completionRate:
 *               type: number
 *             burndownData:
 *               type: array
 *               items:
 *                 type: object
 *         createdBy:
 *           type: string
 *           description: User who created the sprint
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     DevelopmentTask:
 *       type: object
 *       required:
 *         - taskId
 *         - title
 *         - moduleId
 *         - priority
 *         - storyPoints
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique task identifier
 *         taskId:
 *           type: string
 *           description: Task ID (e.g., TASK-1.1)
 *           example: "TASK-1.1"
 *         taskNumber:
 *           type: integer
 *           description: Sequential task number within module
 *         title:
 *           type: string
 *           description: Task title
 *           example: "Implement user authentication system"
 *         description:
 *           type: string
 *           description: Detailed task description
 *         moduleId:
 *           type: string
 *           description: Module identifier (1-10)
 *           example: "1"
 *         status:
 *           type: string
 *           enum: [todo, in-progress, code-review, qa-testing, done, blocked]
 *           description: Current task status
 *         priority:
 *           type: string
 *           enum: [critical, high, medium, low]
 *           description: Task priority level
 *         storyPoints:
 *           type: number
 *           description: Story points estimate
 *           minimum: 0.5
 *           maximum: 13
 *         assignedTo:
 *           type: string
 *           description: Assigned user ID
 *         assignedRole:
 *           type: string
 *           description: Role assignment (SDE1, SDE2, etc.)
 *         sprint:
 *           type: string
 *           description: Sprint ID this task belongs to
 *         dependencies:
 *           type: array
 *           items:
 *             type: string
 *           description: Task dependencies (other task IDs)
 *         blockers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               blockedAt:
 *                 type: string
 *                 format: date-time
 *               isResolved:
 *                 type: boolean
 *         timeTracking:
 *           type: object
 *           properties:
 *             estimatedHours:
 *               type: number
 *             totalHoursSpent:
 *               type: number
 *             timeEntries:
 *               type: array
 *               items:
 *                 type: object
 *         codeReview:
 *           type: object
 *           properties:
 *             reviewer:
 *               type: string
 *             status:
 *               type: string
 *               enum: [pending, approved, rejected]
 *             feedback:
 *               type: string
 *         qa:
 *           type: object
 *           properties:
 *             tester:
 *               type: string
 *             status:
 *               type: string
 *               enum: [pending, passed, failed]
 *             testNotes:
 *               type: string
 *         comments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               comment:
 *                 type: string
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *         createdBy:
 *           type: string
 *           description: User who created the task
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     SprintMetrics:
 *       type: object
 *       properties:
 *         sprintInfo:
 *           type: object
 *           properties:
 *             sprintId:
 *               type: string
 *             name:
 *               type: string
 *             status:
 *               type: string
 *             daysRemaining:
 *               type: integer
 *             healthStatus:
 *               type: string
 *               enum: [healthy, at-risk, critical]
 *         capacity:
 *           $ref: '#/components/schemas/Sprint/properties/capacity'
 *         taskSummary:
 *           $ref: '#/components/schemas/Sprint/properties/taskSummary'
 *         progress:
 *           type: object
 *           properties:
 *             percentage:
 *               type: number
 *             completionRate:
 *               type: number
 *         tasksByPriority:
 *           type: object
 *           properties:
 *             critical:
 *               type: integer
 *             high:
 *               type: integer
 *             medium:
 *               type: integer
 *             low:
 *               type: integer
 *         blockedTasks:
 *           type: integer
 *         teamUtilization:
 *           type: integer
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * security:
 *   - bearerAuth: []
 * 
 * tags:
 *   - name: Sprint Management
 *     description: Agile sprint planning and management operations
 *   - name: Task Management
 *     description: Development task lifecycle management
 *   - name: Sprint Analytics
 *     description: Sprint metrics, velocity, and performance analytics
 */

const Sprint = require('../models/Sprint');
const DevelopmentTask = require('../models/DevelopmentTask');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
// Apply auth middleware to all routes
router.use(authMiddleware);

// ============================================================================
// SPRINT CRUD OPERATIONS
// ============================================================================

/**
 * @swagger
 * /api/administration/sprint-management/sprints:
 *   get:
 *     summary: Get all sprints with optional filtering
 *     description: Retrieve a list of sprints with optional filters for status, sprint number, and date range. Includes team member and creator information.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, completed, cancelled]
 *         description: Filter by sprint status
 *       - in: query
 *         name: sprintNumber
 *         schema:
 *           type: integer
 *         description: Filter by specific sprint number
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sprints starting from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sprints ending before this date
 *     responses:
 *       200:
 *         description: List of sprints retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of sprints returned
 *                 sprints:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sprint'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/sprints', async (req, res) => {
  try {
    const { status, sprintNumber, fromDate, toDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (sprintNumber) filter.sprintNumber = parseInt(sprintNumber, 10);
    if (fromDate || toDate) {
      filter.startDate = {};
      if (fromDate) filter.startDate.$gte = new Date(fromDate);
      if (toDate) filter.startDate.$lte = new Date(toDate);
    }

    const sprints = await Sprint.find(filter)
      .populate('team.member', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName')
      .sort({ sprintNumber: -1 });

    res.json({
      success: true,
      count: sprints.length,
      sprints,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/sprints/{id}:
 *   get:
 *     summary: Get single sprint by ID with full details
 *     description: Retrieve detailed information about a specific sprint including tasks, team members, and health status.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Sprint details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sprint:
 *                   $ref: '#/components/schemas/Sprint'
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DevelopmentTask'
 *                 healthStatus:
 *                   type: string
 *                   enum: [healthy, at-risk, critical]
 *                   description: Sprint health assessment
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/sprints/:id', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate('tasks')
      .populate('team.member', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName')
      .populate({
        path: 'review.attendees',
        select: 'firstName lastName email',
      })
      .populate({
        path: 'retrospective.actionItems.assignedTo',
        select: 'firstName lastName',
      });

    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    // Get task breakdown
    const tasks = await DevelopmentTask.find({ sprint: sprint._id })
      .populate('assignedTo', 'firstName lastName')
      .select('taskId title status priority storyPoints assignedTo');

    res.json({
      success: true,
      sprint,
      tasks,
      healthStatus: sprint.getHealthStatus(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/sprints/number/{number}:
 *   get:
 *     summary: Get sprint by sprint number
 *     description: Retrieve sprint information using the sequential sprint number.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: number
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sequential sprint number
 *         example: 42
 *     responses:
 *       200:
 *         description: Sprint retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sprint:
 *                   $ref: '#/components/schemas/Sprint'
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/sprints/number/:number', async (req, res) => {
  try {
    const sprint = await Sprint.getBySprintNumber(parseInt(req.params.number, 10));

    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    res.json({ success: true, sprint });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/sprints:
 *   post:
 *     summary: Create new sprint
 *     description: Create a new sprint for the development team with specified goals, timeline, and team assignments.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sprintId
 *               - sprintNumber
 *               - name
 *               - startDate
 *               - endDate
 *               - goals
 *             properties:
 *               sprintId:
 *                 type: string
 *                 description: Unique sprint identifier
 *                 example: "SPR-2025-001"
 *               sprintNumber:
 *                 type: integer
 *                 description: Sequential sprint number
 *                 example: 42
 *               name:
 *                 type: string
 *                 description: Sprint name
 *                 example: "API Documentation Sprint"
 *               description:
 *                 type: string
 *                 description: Sprint description and objectives
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Sprint start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Sprint end date
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Sprint goals and objectives
 *                 example: ["Complete 100% Swagger documentation", "Implement authentication system"]
 *               team:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     member:
 *                       type: string
 *                       description: Team member user ID
 *                     role:
 *                       type: string
 *                       enum: [developer, tester, reviewer, manager]
 *                     capacity:
 *                       type: number
 *                       description: Member capacity percentage (0-100)
 *               capacity:
 *                 type: object
 *                 properties:
 *                   plannedVelocity:
 *                     type: number
 *                     description: Planned story points for sprint
 *     responses:
 *       201:
 *         description: Sprint created successfully
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
 *                   example: "Sprint created successfully"
 *                 sprint:
 *                   $ref: '#/components/schemas/Sprint'
 *       400:
 *         description: Bad request - Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/sprints', async (req, res) => {
  try {
    const sprint = new Sprint({
      ...req.body,
      createdBy: req.user.userId,
    });

    await sprint.save();

    res.status(201).json({
      success: true,
      message: 'Sprint created successfully',
      sprint,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/sprints/{id}:
 *   put:
 *     summary: Update sprint
 *     description: Update sprint information including goals, timeline, team assignments, and capacity planning.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint MongoDB ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Sprint name
 *               description:
 *                 type: string
 *                 description: Sprint description
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               goals:
 *                 type: array
 *                 items:
 *                   type: string
 *               team:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     member:
 *                       type: string
 *                     role:
 *                       type: string
 *                     capacity:
 *                       type: number
 *               capacity:
 *                 type: object
 *                 properties:
 *                   plannedVelocity:
 *                     type: number
 *     responses:
 *       200:
 *         description: Sprint updated successfully
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
 *                   example: "Sprint updated successfully"
 *                 sprint:
 *                   $ref: '#/components/schemas/Sprint'
 *       400:
 *         description: Bad request - Validation error
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/sprints/:id', async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    res.json({
      success: true,
      message: 'Sprint updated successfully',
      sprint,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/sprint-management/sprints/:id
 * Delete sprint (only if no tasks assigned)
 */
router.delete('/sprints/:id', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    // Check if sprint has tasks
    const taskCount = await DevelopmentTask.countDocuments({ sprint: sprint._id });
    if (taskCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete sprint with assigned tasks. Remove tasks first.',
      });
    }

    await sprint.deleteOne();

    res.json({
      success: true,
      message: 'Sprint deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SPRINT STATUS MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/administration/sprint-management/active:
 *   get:
 *     summary: Get currently active sprint
 *     description: Retrieve the currently active sprint with task statistics, health status, and remaining days.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sprint retrieved successfully (or no active sprint)
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
 *                   example: "Active sprint found"
 *                 sprint:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Sprint'
 *                     - type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [active]
 *                 healthStatus:
 *                   type: string
 *                   enum: [healthy, at-risk, critical]
 *                 daysRemaining:
 *                   type: integer
 *                   description: Days remaining in sprint
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/active', async (req, res) => {
  try {
    const sprint = await Sprint.getActiveSprint();

    if (!sprint) {
      return res.json({
        success: true,
        message: 'No active sprint',
        sprint: null,
      });
    }

    // Get task statistics
    await sprint.updateTaskSummary();

    res.json({
      success: true,
      sprint,
      healthStatus: sprint.getHealthStatus(),
      daysRemaining: sprint.daysRemaining,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/sprints/upcoming
 * Get upcoming sprints
 */
router.get('/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const sprints = await Sprint.getUpcomingSprints(limit);

    res.json({
      success: true,
      count: sprints.length,
      sprints,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/sprints/{id}/start:
 *   post:
 *     summary: Start a sprint
 *     description: Transition a sprint from planning to active status and initialize sprint tracking.
 *     tags:
 *       - Sprint Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Sprint started successfully
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
 *                   example: "Sprint started successfully"
 *                 sprint:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Sprint'
 *                     - type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [active]
 *       400:
 *         description: Bad request - Sprint cannot be started (wrong status, etc.)
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/sprints/:id/start', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    await sprint.startSprint();

    res.json({
      success: true,
      message: 'Sprint started successfully',
      sprint,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sprint-management/sprints/:id/complete
 * Complete a sprint
 */
router.post('/sprints/:id/complete', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    await sprint.completeSprint();

    res.json({
      success: true,
      message: 'Sprint completed successfully',
      sprint,
      summary: {
        totalTasks: sprint.taskSummary.total,
        completed: sprint.taskSummary.completed,
        velocity: sprint.capacity.actualVelocity,
        completionRate: sprint.metrics.completionRate,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

/**
 * @swagger
 * /api/administration/sprint-management/tasks:
 *   get:
 *     summary: Get all development tasks with filtering
 *     description: Retrieve development tasks with optional filtering by status, priority, module, sprint, and assignee.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in-progress, code-review, qa-testing, done, blocked]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [critical, high, medium, low]
 *         description: Filter by task priority
 *       - in: query
 *         name: moduleId
 *         schema:
 *           type: string
 *         description: Filter by module ID (1-10)
 *       - in: query
 *         name: sprintId
 *         schema:
 *           type: string
 *         description: Filter by sprint ID
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of tasks returned
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DevelopmentTask'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/tasks', async (req, res) => {
  try {
    const { status, priority, moduleId, sprintId, assignedTo } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (moduleId) filter.moduleId = moduleId;
    if (sprintId) filter.sprint = sprintId;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await DevelopmentTask.find(filter)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('sprint', 'sprintId sprintNumber name status')
      .sort({ moduleId: 1, taskNumber: 1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/:id
 * Get single task with full details
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await DevelopmentTask.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('sprint', 'sprintId sprintNumber name status startDate endDate')
      .populate('codeReview.reviewer', 'firstName lastName email')
      .populate('qa.tester', 'firstName lastName email')
      .populate('comments.user', 'firstName lastName')
      .populate('timeTracking.timeEntries.user', 'firstName lastName');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({
      success: true,
      task,
      canStart: await task.canStart(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/taskId/:taskId
 * Get task by taskId (e.g., TASK-1.1)
 */
router.get('/tasks/taskId/:taskId', async (req, res) => {
  try {
    const task = await DevelopmentTask.findOne({ taskId: req.params.taskId })
      .populate('assignedTo', 'firstName lastName email')
      .populate('sprint', 'sprintId name status');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks:
 *   post:
 *     summary: Create new development task
 *     description: Create a new development task and optionally assign it to a sprint. Automatically updates sprint capacity when assigned.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - title
 *               - moduleId
 *               - priority
 *               - storyPoints
 *             properties:
 *               taskId:
 *                 type: string
 *                 description: Unique task identifier
 *                 example: "TASK-1.1"
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: "Implement user authentication system"
 *               description:
 *                 type: string
 *                 description: Detailed task description
 *               moduleId:
 *                 type: string
 *                 description: Module identifier (1-10)
 *                 example: "1"
 *               priority:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *                 description: Task priority level
 *               storyPoints:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 13
 *                 description: Story points estimate
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign task to
 *               assignedRole:
 *                 type: string
 *                 description: Role assignment (SDE1, SDE2, etc.)
 *               sprint:
 *                 type: string
 *                 description: Sprint ID to assign task to
 *               dependencies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Task dependencies (other task IDs)
 *               timeTracking:
 *                 type: object
 *                 properties:
 *                   estimatedHours:
 *                     type: number
 *                     description: Estimated hours to complete
 *     responses:
 *       201:
 *         description: Task created successfully
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
 *                   example: "Task created successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       400:
 *         description: Bad request - Validation error
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks', async (req, res) => {
  try {
    const task = new DevelopmentTask({
      ...req.body,
      createdBy: req.user.userId,
    });

    await task.save();

    // Update sprint if assigned
    if (task.sprint) {
      const sprint = await Sprint.findById(task.sprint);
      if (sprint) {
        sprint.tasks.push(task._id);
        sprint.capacity.totalStoryPoints += task.storyPoints;
        await sprint.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}:
 *   put:
 *     summary: Update development task
 *     description: Update an existing development task. Status changes trigger workflow actions and notifications.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *         example: "TASK-1.1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [not-started, in-progress, code-review, testing, blocked, completed]
 *               priority:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               storyPoints:
 *                 type: number
 *                 minimum: 0.5
 *                 maximum: 13
 *               assignedTo:
 *                 type: string
 *               assignedRole:
 *                 type: string
 *               sprint:
 *                 type: string
 *               dependencies:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeTracking:
 *                 type: object
 *                 properties:
 *                   estimatedHours:
 *                     type: number
 *                   actualHours:
 *                     type: number
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
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
 *                   example: "Task updated successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       400:
 *         description: Bad request - Validation error
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/tasks/:id', async (req, res) => {
  try {
    const task = await DevelopmentTask.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('assignedTo sprint');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}/start:
 *   post:
 *     summary: Start working on a task
 *     description: Mark a task as in-progress and start time tracking. Creates work session and updates task status.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *         example: "TASK-1.1"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Optional start comments
 *     responses:
 *       200:
 *         description: Task started successfully
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
 *                   example: "Task started successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       400:
 *         description: Bad request - Task already in progress
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks/:id/start', async (req, res) => {
  try {
    const task = await DevelopmentTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await task.startTask(req.user.userId);

    res.json({
      success: true,
      message: 'Task started successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sprint-management/tasks/:id/complete
 * Mark task as complete
 */
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const task = await DevelopmentTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await task.completeTask();

    // Update sprint metrics
    if (task.sprint) {
      const sprint = await Sprint.findById(task.sprint);
      if (sprint) {
        await sprint.updateTaskSummary();
      }
    }

    res.json({
      success: true,
      message: 'Task completed successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}/block:
 *   post:
 *     summary: Block a task
 *     description: Mark a task as blocked with a specific reason. Updates task status and creates blocking record.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for blocking the task
 *                 example: "Waiting for API specification from backend team"
 *               blockedBy:
 *                 type: string
 *                 description: User ID who blocked the task
 *     responses:
 *       200:
 *         description: Task blocked successfully
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
 *                   example: "Task blocked successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       400:
 *         description: Bad request - Reason required
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks/:id/block', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason required' });
    }

    const task = await DevelopmentTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await task.blockTask(reason);

    res.json({
      success: true,
      message: 'Task blocked successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}/unblock:
 *   post:
 *     summary: Unblock a task
 *     description: Remove blocking status from a task and resume normal workflow. Clears blocking record and updates task status.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *                 description: Optional unblock comments
 *               newStatus:
 *                 type: string
 *                 enum: [not-started, in-progress]
 *                 description: Status to set after unblocking
 *                 default: "not-started"
 *     responses:
 *       200:
 *         description: Task unblocked successfully
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
 *                   example: "Task unblocked successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       404:
 *         description: Task not found
 *       400:
 *         description: Bad request - Task not blocked
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks/:id/unblock', async (req, res) => {
  try {
    const task = await DevelopmentTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await task.unblockTask();

    res.json({
      success: true,
      message: 'Task unblocked successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}/assign:
 *   post:
 *     summary: Assign task to user
 *     description: Assign a task to a specific user with an optional role specification. Updates assignee and sends notifications.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to assign task to
 *               role:
 *                 type: string
 *                 description: Optional role specification (SDE1, SDE2, etc.)
 *               comments:
 *                 type: string
 *                 description: Optional assignment comments
 *     responses:
 *       200:
 *         description: Task assigned successfully
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
 *                   example: "Task assigned successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       400:
 *         description: Bad request - Invalid user ID
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks/:id/assign', async (req, res) => {
  try {
    const { userId, role } = req.body;
    const task = await DevelopmentTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    task.assignedTo = userId;
    if (role) task.assignedRole = role;

    await task.save();
    await task.populate('assignedTo', 'firstName lastName email role');

    res.json({
      success: true,
      message: 'Task assigned successfully',
      task,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}/time:
 *   post:
 *     summary: Log time spent on task
 *     description: Record time spent working on a task. Updates total time tracking and maintains work session records.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hours
 *             properties:
 *               hours:
 *                 type: number
 *                 minimum: 0.1
 *                 maximum: 24
 *                 description: Hours spent on task
 *                 example: 2.5
 *               description:
 *                 type: string
 *                 description: Description of work performed
 *                 example: "Implemented user authentication logic"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date of work (defaults to today)
 *     responses:
 *       200:
 *         description: Time logged successfully
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
 *                   example: "Time logged successfully"
 *                 totalHours:
 *                   type: number
 *                   description: Total hours spent on task
 *       400:
 *         description: Bad request - Invalid hours value
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks/:id/time', async (req, res) => {
  try {
    const { hours, description } = req.body;
    const task = await DevelopmentTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await task.logTime(req.user.userId, hours, description);

    res.json({
      success: true,
      message: 'Time logged successfully',
      totalHours: task.timeTracking.totalHoursSpent,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks/{id}/comments:
 *   post:
 *     summary: Add comment to task
 *     description: Add a comment or update to a task. Creates activity record and optionally notifies team members.
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Comment text
 *                 example: "Updated the database schema as requested"
 *               type:
 *                 type: string
 *                 enum: [comment, update, issue, resolution]
 *                 description: Type of comment
 *                 default: "comment"
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: User IDs to mention/notify
 *     responses:
 *       200:
 *         description: Comment added successfully
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
 *                   example: "Comment added successfully"
 *                 task:
 *                   $ref: '#/components/schemas/DevelopmentTask'
 *       400:
 *         description: Bad request - Comment required
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/tasks/:id/comments', async (req, res) => {
  try {
    const { comment } = req.body;
    const task = await DevelopmentTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    task.comments.push({
      user: req.user.userId,
      comment,
    });

    await task.save();
    await task.populate('comments.user', 'firstName lastName');

    res.json({
      success: true,
      message: 'Comment added successfully',
      comments: task.comments,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TASK QUERIES
// ============================================================================

/**
 * @swagger
 * /api/administration/sprint-management/my-tasks:
 *   get:
 *     summary: Get tasks assigned to current user
 *     description: Retrieve all tasks assigned to the authenticated user with optional status filtering
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [not-started, in-progress, code-review, testing, blocked, completed]
 *         description: Filter tasks by status
 *     responses:
 *       200:
 *         description: User tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DevelopmentTask'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/my-tasks', async (req, res) => {
  try {
    const { status } = req.query;
    const tasks = await DevelopmentTask.getMyTasks(req.user.userId, status);

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/blocked
 * Get all blocked tasks
 */
router.get('/blocked-tasks', async (req, res) => {
  try {
    const { sprintId } = req.query;
    const tasks = await DevelopmentTask.getBlockedTasks(sprintId);

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/review
 * Get tasks ready for code review
 */
router.get('/tasks-for-review', async (req, res) => {
  try {
    const tasks = await DevelopmentTask.getTasksForReview();

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/tasks-for-qa:
 *   get:
 *     summary: Get tasks ready for QA testing
 *     description: Retrieve all tasks that are ready for quality assurance testing
 *     tags:
 *       - Task Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QA tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DevelopmentTask'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/tasks-for-qa', async (req, res) => {
  try {
    const tasks = await DevelopmentTask.getTasksForQA();

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/critical
 * Get critical priority tasks
 */
router.get('/critical-tasks', async (req, res) => {
  try {
    const { sprintId } = req.query;
    const tasks = await DevelopmentTask.getCriticalTasks(sprintId);

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/module/:moduleId
 * Get tasks by module
 */
router.get('/tasks/module/:moduleId', async (req, res) => {
  try {
    const { status } = req.query;
    const tasks = await DevelopmentTask.getByModule(req.params.moduleId, status);

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/tasks/sprint/:sprintId
 * Get tasks for a specific sprint
 */
router.get('/tasks/sprint/:sprintId', async (req, res) => {
  try {
    const { status } = req.query;
    const tasks = await DevelopmentTask.getBySprint(req.params.sprintId, status);

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SPRINT METRICS & ANALYTICS
// ============================================================================

/**
 * GET /api/sprint-management/metrics/velocity
 * Get team velocity trend
 */
router.get('/metrics/velocity', async (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 6;
    const velocityData = await Sprint.getVelocityTrend(count);

    res.json({
      success: true,
      velocityData,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/metrics/burndown/{sprintId}:
 *   get:
 *     summary: Get burndown chart data for sprint
 *     description: Retrieve burndown chart data including story points progress and timeline for sprint analytics
 *     tags:
 *       - Sprint Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint identifier
 *     responses:
 *       200:
 *         description: Burndown data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 burndownData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       remainingPoints:
 *                         type: number
 *                       idealRemaining:
 *                         type: number
 *                 totalPoints:
 *                   type: number
 *                 completedPoints:
 *                   type: number
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/metrics/burndown/:sprintId', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    res.json({
      success: true,
      burndownData: sprint.metrics.burndownData,
      totalPoints: sprint.capacity.totalStoryPoints,
      completedPoints: sprint.capacity.actualVelocity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/metrics/burndown/{sprintId}/update:
 *   post:
 *     summary: Add burndown data point for sprint
 *     description: Add a new data point to the sprint burndown chart. Usually called daily to track progress.
 *     tags:
 *       - Sprint Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint identifier
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for data point (defaults to today)
 *               forceUpdate:
 *                 type: boolean
 *                 description: Force update even if data point exists for date
 *     responses:
 *       200:
 *         description: Burndown data updated successfully
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
 *                   example: "Burndown data updated"
 *                 latestPoint:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     remainingPoints:
 *                       type: number
 *                     idealRemaining:
 *                       type: number
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/metrics/burndown/:sprintId/update', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    await sprint.addBurndownDataPoint();

    res.json({
      success: true,
      message: 'Burndown data updated',
      latestPoint: sprint.metrics.burndownData[sprint.metrics.burndownData.length - 1],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/administration/sprint-management/metrics/summary/{sprintId}:
 *   get:
 *     summary: Get comprehensive sprint metrics
 *     description: Retrieve detailed sprint analytics including velocity, completion rates, team utilization, and performance indicators
 *     tags:
 *       - Sprint Analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint identifier
 *     responses:
 *       200:
 *         description: Sprint metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 metrics:
 *                   $ref: '#/components/schemas/SprintMetrics'
 *                 sprint:
 *                   $ref: '#/components/schemas/Sprint'
 *       404:
 *         description: Sprint not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/metrics/summary/:sprintId', async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    await sprint.updateTaskSummary();

    const tasks = await DevelopmentTask.find({ sprint: sprint._id });

    const metrics = {
      sprintInfo: {
        sprintId: sprint.sprintId,
        name: sprint.name,
        status: sprint.status,
        daysRemaining: sprint.daysRemaining,
        healthStatus: sprint.getHealthStatus(),
      },
      capacity: sprint.capacity,
      taskSummary: sprint.taskSummary,
      progress: {
        percentage: sprint.progressPercentage,
        completionRate: sprint.metrics.completionRate,
      },
      tasksByPriority: {
        critical: tasks.filter((t) => t.priority === 'critical').length,
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
        low: tasks.filter((t) => t.priority === 'low').length,
      },
      blockedTasks: tasks.filter((t) => t.isBlocked).length,
      teamUtilization: sprint.team.length,
    };

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-management/history
 * Get sprint history with metrics
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const history = await Sprint.getSprintHistory(limit);

    res.json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
