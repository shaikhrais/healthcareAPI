const express = require('express');


const DevelopmentTask = require('../models/DevelopmentTask');
const router = express.Router();
/**
 * GET /api/tasks-1-10/list
 * Get tasks 1-10 with full details
 */
router.get('/list', async (req, res) => {
  try {
    const tasks = await DevelopmentTask.find().limit(10).populate('sprint');

    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map((task, index) => ({
        number: index + 1,
        id: task._id,
        taskId: task.taskId || `Task ${index + 1}`,
        title: task.title,
        description: task.description || 'No description',
        status: task.status,
        executionStatus:
          task.status === 'in_progress'
            ? 'executing'
            : task.status === 'completed'
              ? 'executed'
              : 'pending',
        priority: task.priority,
        storyPoints: task.storyPoints || 0,
        sprint: task.sprint
          ? {
              name: task.sprint.name,
              number: task.sprint.sprintNumber,
            }
          : null,
        acceptanceCriteria: task.technicalRequirements?.map((r) => r.requirement) || [],
        technicalDetails: {
          assignedRole: task.assignedRole,
          estimatedDuration: task.estimatedDuration,
          actualDuration: task.actualDuration,
        },
        flags: {
          isBlocked: task.isBlocked,
          needsReview: task.codeReview?.status === 'in_review',
          needsTesting: task.qa?.status === 'in_testing',
        },
        progressTracking: {
          percentComplete: task.progress?.percentage || 0,
        },
        qualityMetrics: {
          codeReviewStatus: task.codeReview?.status || 'pending',
          testingStatus: task.qa?.status || 'pending',
        },
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tasks-1-10/task/:number
 * Get specific task by number (1-10)
 */
router.get('/task/:number', async (req, res) => {
  try {
    const taskNumber = parseInt(req.params.number, 10);
    if (taskNumber < 1 || taskNumber > 10) {
      return res.status(400).json({
        success: false,
        error: 'Task number must be between 1 and 10',
      });
    }

    const tasks = await DevelopmentTask.find().limit(10).populate('sprint');
    const task = tasks[taskNumber - 1];

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({
      success: true,
      task: {
        number: taskNumber,
        id: task._id,
        taskId: task.metadata?.taskId || task.taskId,
        title: task.title,
        description: task.description,
        status: task.status,
        executionStatus: task.executionStatus,
        priority: task.priority,
        storyPoints: task.metadata?.storyPoints,
        sprint: task.sprint,
        acceptanceCriteria: task.metadata?.acceptanceCriteria,
        technicalDetails: task.technicalDetails,
        flags: task.flags,
        progressTracking: task.progressTracking,
        qualityMetrics: task.qualityMetrics,
        executionDetails: task.executionDetails,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks-1-10/task/:number/execute
 * Execute specific task
 */
router.post('/task/:number/execute', async (req, res) => {
  try {
    const taskNumber = parseInt(req.params.number, 10);
    if (taskNumber < 1 || taskNumber > 10) {
      return res.status(400).json({
        success: false,
        error: 'Task number must be between 1 and 10',
      });
    }

    const tasks = await DevelopmentTask.find().limit(10);
    const task = tasks[taskNumber - 1];

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Start execution
    task.status = 'in_progress';
    task.timeTracking = task.timeTracking || {};
    task.timeTracking.startedAt = new Date();
    await task.save();

    // Simulate execution async
    setTimeout(async () => {
      try {
        task.status = 'completed';
        task.timeTracking.completedAt = new Date();

        task.progress = task.progress || {};
        task.progress.percentage = 100;
        task.progress.lastUpdated = new Date();

        task.codeReview = task.codeReview || {};
        task.codeReview.status = 'approved';
        task.codeReview.approvedAt = new Date();

        task.qa = task.qa || {};
        task.qa.status = 'passed';
        task.qa.passedAt = new Date();

        await task.save();
      } catch (error) {
        console.error('Error completing task:', error);
      }
    }, 2000);

    res.json({
      success: true,
      message: `Task ${taskNumber} execution started`,
      task: {
        number: taskNumber,
        title: task.title,
        executionStatus: 'executing',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tasks-1-10/execute-all
 * Execute all tasks 1-10
 */
router.post('/execute-all', async (req, res) => {
  try {
    const tasks = await DevelopmentTask.find().limit(10);
    let started = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        task.status = 'in_progress';
        task.timeTracking = task.timeTracking || {};
        task.timeTracking.startedAt = new Date();
        await task.save();
        started += 1;

        // Async completion
        setTimeout(
          async () => {
            task.status = 'completed';
            task.timeTracking.completedAt = new Date();
            task.progress = task.progress || {};
            task.progress.percentage = 100;
            task.progress.lastUpdated = new Date();
            task.codeReview = task.codeReview || {};
            task.codeReview.status = 'approved';
            task.qa = task.qa || {};
            task.qa.status = 'passed';
            await task.save();
          },
          2000 + started * 500
        );
      } catch (error) {
        failed += 1;
      }
    }

    res.json({
      success: true,
      message: `Started execution of ${started} tasks`,
      results: { started, failed, total: tasks.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tasks-1-10/stats
 * Get statistics for tasks 1-10
 */
router.get('/stats', async (req, res) => {
  try {
    const tasks = await DevelopmentTask.find().limit(10);

    const stats = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      executing: tasks.filter((t) => t.status === 'in_progress').length,
      pending: tasks.filter((t) => t.status === 'todo').length,
      completionRate: 0,
    };

    stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
