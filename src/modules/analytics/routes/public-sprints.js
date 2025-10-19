const express = require('express');


const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const router = express.Router();
/**
 * GET /api/public-sprints/all
 * Get all sprints with task counts (no auth required)
 */
router.get('/all', async (req, res) => {
  try {
    const sprints = await Sprint.find()
      .select(
        'sprintId sprintNumber name description status executionStatus executionDetails flags startDate endDate capacity taskSummary metrics'
      )
      .sort({ sprintNumber: 1 });

    res.json({
      success: true,
      count: sprints.length,
      sprints: sprints.map((sprint) => ({
        id: sprint._id,
        sprintId: sprint.sprintId,
        sprintNumber: sprint.sprintNumber,
        name: sprint.name,
        description: sprint.description,
        status: sprint.status,
        executionStatus: sprint.executionStatus || 'pending',
        executionDetails: sprint.executionDetails || {},
        flags: sprint.flags || {},
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        totalTasks: sprint.taskSummary?.total || 0,
        completedTasks: sprint.taskSummary?.completed || 0,
        inProgressTasks: sprint.taskSummary?.inProgress || 0,
        blockedTasks: sprint.taskSummary?.blocked || 0,
        storyPoints: sprint.capacity?.totalStoryPoints || 0,
        completionRate: sprint.metrics?.completionRate || 0,
        healthStatus: sprint.getHealthStatus ? sprint.getHealthStatus() : 'unknown',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/public-sprints/sprint/:sprintNumber
 * Get specific sprint by number with all tasks
 */
router.get('/sprint/:sprintNumber', async (req, res) => {
  try {
    const sprint = await Sprint.findOne({
      sprintNumber: parseInt(req.params.sprintNumber, 10),
    }).populate('tasks');

    if (!sprint) {
      return res.status(404).json({ success: false, error: 'Sprint not found' });
    }

    res.json({
      success: true,
      sprint: {
        id: sprint._id,
        sprintId: sprint.sprintId,
        sprintNumber: sprint.sprintNumber,
        name: sprint.name,
        description: sprint.description,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        tasks: sprint.tasks,
        taskSummary: sprint.taskSummary,
        capacity: sprint.capacity,
        metrics: sprint.metrics,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/public-sprints/tasks/all
 * Get all tasks across all sprints (no auth required)
 */
router.get('/tasks/all', async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('sprint', 'sprintNumber name')
      .sort({ sprint: 1, taskNumber: 1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map((task) => ({
        id: task._id,
        taskId: task.metadata?.taskId || task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        executionStatus: task.executionStatus || 'pending',
        priority: task.priority,
        storyPoints: task.metadata?.storyPoints || task.storyPoints,
        sprint: task.sprint,
        flags: task.flags || {},
        blockingInfo: task.blockingInfo || {},
        progressTracking: task.progressTracking || {},
        qualityMetrics: task.qualityMetrics || {},
        technicalDetails: task.technicalDetails,
        acceptanceCriteria: task.metadata?.acceptanceCriteria || task.acceptanceCriteria,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/public-sprints/task/:taskId
 * Get specific task by taskId (e.g., TASK-18.1)
 */
router.get('/task/:taskId', async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.taskId }).populate(
      'sprint',
      'sprintNumber name status'
    );

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({
      success: true,
      task: {
        id: task._id,
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        storyPoints: task.storyPoints,
        sprint: task.sprint,
        technicalDetails: task.technicalDetails,
        acceptanceCriteria: task.acceptanceCriteria,
        dependencies: task.dependencies,
        estimatedHours: task.estimatedHours,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/public-sprints/stats
 * Get overall project statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalSprints = await Sprint.countDocuments();
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });

    const sprints = await Sprint.find().select('capacity');
    const totalStoryPoints = sprints.reduce(
      (sum, s) => sum + (s.capacity?.totalStoryPoints || 0),
      0
    );

    res.json({
      success: true,
      stats: {
        totalSprints,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        totalStoryPoints,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
