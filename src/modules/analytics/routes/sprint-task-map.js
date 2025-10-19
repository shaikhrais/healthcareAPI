const express = require('express');


const Sprint = require('../models/Sprint');
const DevelopmentTask = require('../models/DevelopmentTask');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/sprint-task-map
 * Get complete mapping of sprints to tasks - shows which tasks belong to which sprint
 *
 * This endpoint clearly shows the relationship between sprints and tasks:
 * - Sprint 1 contains tasks: TASK-1.1, TASK-1.2, TASK-1.3, TASK-13.1, TASK-13.2
 * - Sprint 2 contains tasks: TASK-2.1, TASK-2.2, etc.
 */
router.get('/', async (req, res) => {
  try {
    const sprints = await Sprint.find({})
      .sort({ sprintNumber: 1 })
      .select('sprintId sprintNumber name startDate endDate capacity.totalStoryPoints status');

    const sprintMap = [];

    for (const sprint of sprints) {
      const tasks = await DevelopmentTask.find({ sprint: sprint._id })
        .select(
          'taskId taskNumber moduleId moduleName title priority storyPoints status assignedRole'
        )
        .sort({ moduleId: 1, taskNumber: 1 });

      sprintMap.push({
        sprint: {
          sprintId: sprint.sprintId,
          sprintNumber: sprint.sprintNumber,
          name: sprint.name,
          startDate: sprint.startDate.toISOString().split('T')[0],
          endDate: sprint.endDate.toISOString().split('T')[0],
          totalPoints: sprint.capacity.totalStoryPoints,
          status: sprint.status,
        },
        tasks: tasks.map((t) => ({
          taskId: t.taskId, // e.g., TASK-1.1
          taskNumber: t.taskNumber, // e.g., "1.1"
          moduleId: t.moduleId, // e.g., "1"
          moduleName: t.moduleName, // e.g., "Authentication"
          title: t.title,
          priority: t.priority,
          storyPoints: t.storyPoints,
          status: t.status,
          assignedRole: t.assignedRole,
          belongsToSprint: sprint.sprintNumber,
        })),
        taskCount: tasks.length,
        taskIds: tasks.map((t) => t.taskId).join(', '),
      });
    }

    res.json({
      success: true,
      message: 'Sprint-Task mapping retrieved successfully',
      totalSprints: sprintMap.length,
      totalTasks: sprintMap.reduce((sum, s) => sum + s.taskCount, 0),
      sprintTaskMap: sprintMap,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-task-map/lookup/:taskId
 * Look up which sprint a task belongs to by task ID
 *
 * Example: GET /api/sprint-task-map/lookup/TASK-1.1
 * Returns: Sprint 1 information
 */
router.get('/lookup/:taskId', async (req, res) => {
  try {
    const task = await DevelopmentTask.findOne({ taskId: req.params.taskId })
      .populate('sprint', 'sprintId sprintNumber name startDate endDate status capacity')
      .select(
        'taskId taskNumber moduleId moduleName title priority storyPoints status sprintNumber'
      );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        searchedFor: req.params.taskId,
        hint: 'Use format like: TASK-1.1, TASK-2.3, etc.',
      });
    }

    res.json({
      success: true,
      message: `✅ ${task.taskId} belongs to Sprint ${task.sprintNumber}`,
      task: {
        taskId: task.taskId,
        taskNumber: task.taskNumber,
        title: task.title,
        moduleId: task.moduleId,
        moduleName: task.moduleName,
        priority: task.priority,
        storyPoints: task.storyPoints,
        status: task.status,
      },
      sprint: task.sprint
        ? {
            sprintId: task.sprint.sprintId,
            sprintNumber: task.sprint.sprintNumber,
            name: task.sprint.name,
            startDate: task.sprint.startDate.toISOString().split('T')[0],
            endDate: task.sprint.endDate.toISOString().split('T')[0],
            status: task.sprint.status,
            totalPoints: task.sprint.capacity.totalStoryPoints,
          }
        : null,
      relationship: {
        taskBelongsTo: `Sprint ${task.sprintNumber}`,
        sprintContains: task.taskId,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-task-map/sprint/:sprintNumber
 * Get all tasks for a specific sprint by sprint number
 *
 * Example: GET /api/sprint-task-map/sprint/1
 * Returns: All tasks in Sprint 1
 */
router.get('/sprint/:sprintNumber', async (req, res) => {
  try {
    const sprintNumber = parseInt(req.params.sprintNumber, 10);

    if (isNaN(sprintNumber) || sprintNumber < 1 || sprintNumber > 18) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sprint number. Must be between 1 and 18.',
      });
    }

    const sprint = await Sprint.findOne({ sprintNumber });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: `Sprint ${sprintNumber} not found`,
      });
    }

    const tasks = await DevelopmentTask.find({ sprint: sprint._id })
      .populate('assignedTo', 'firstName lastName email')
      .sort({ moduleId: 1, taskNumber: 1 });

    res.json({
      success: true,
      message: `📋 Sprint ${sprintNumber} contains ${tasks.length} tasks`,
      sprint: {
        sprintId: sprint.sprintId,
        sprintNumber: sprint.sprintNumber,
        name: sprint.name,
        startDate: sprint.startDate.toISOString().split('T')[0],
        endDate: sprint.endDate.toISOString().split('T')[0],
        status: sprint.status,
        totalPoints: sprint.capacity.totalStoryPoints,
      },
      taskCount: tasks.length,
      taskIds: tasks.map((t) => t.taskId),
      tasks: tasks.map((t) => ({
        taskId: t.taskId,
        taskNumber: t.taskNumber,
        moduleId: t.moduleId,
        moduleName: t.moduleName,
        title: t.title,
        description: t.description,
        priority: t.priority,
        storyPoints: t.storyPoints,
        status: t.status,
        assignedTo: t.assignedTo,
        assignedRole: t.assignedRole,
        estimatedDuration: t.estimatedDuration,
        subtaskCount: t.subtasks ? t.subtasks.length : 0,
        testCaseCount: t.testCases ? t.testCases.length : 0,
        belongsToSprint: sprintNumber,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sprint-task-map/summary
 * Get summary showing how many tasks in each sprint
 */
router.get('/summary', async (req, res) => {
  try {
    const sprints = await Sprint.find({}).sort({ sprintNumber: 1 });

    const summary = [];
    for (const sprint of sprints) {
      const taskCount = await DevelopmentTask.countDocuments({ sprint: sprint._id });
      const tasks = await DevelopmentTask.find({ sprint: sprint._id }).select('taskId');

      summary.push({
        sprintNumber: sprint.sprintNumber,
        sprintId: sprint.sprintId,
        name: sprint.name,
        taskCount,
        taskIds: tasks.map((t) => t.taskId),
        dates: `${sprint.startDate.toISOString().split('T')[0]} to ${sprint.endDate.toISOString().split('T')[0]}`,
      });
    }

    res.json({
      success: true,
      message: 'Sprint-Task summary',
      totalSprints: summary.length,
      totalTasks: summary.reduce((sum, s) => sum + s.taskCount, 0),
      summary,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
