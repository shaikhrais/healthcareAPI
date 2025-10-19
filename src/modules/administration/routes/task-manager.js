const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
// GET /api/task-manager/all - Get all tasks
router.get('/all', async (req, res) => {
  try {
    const tasks = await Task.find().populate('sprint');
    res.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t._id,
        taskId: t.metadata?.taskId || t.taskId,
        title: t.title,
        description: t.description,
        status: t.status,
        executionStatus: t.executionStatus,
        priority: t.priority,
        storyPoints: t.metadata?.storyPoints,
        sprint: t.sprint,
        flags: t.flags,
        progressTracking: t.progressTracking,
        qualityMetrics: t.qualityMetrics,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/task-manager/task/:id - Get single task
router.get('/task/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('sprint');
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/task-manager/task/:id/execute - Execute a task
router.post('/task/:id/execute', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Mark as executing
    task.executionStatus = 'executing';
    task.status = 'in-progress';
    task.executionDetails = task.executionDetails || {};
    task.executionDetails.startedAt = new Date();
    await task.save();

    // Simulate execution
    setTimeout(async () => {
      task.executionStatus = 'executed';
      task.status = 'completed';
      task.completedAt = new Date();
      task.executionDetails.completedAt = new Date();
      task.progressTracking = task.progressTracking || {};
      task.progressTracking.percentComplete = 100;
      await task.save();
    }, 1000);

    res.json({ success: true, message: 'Task execution started', task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/task-manager/execute-all - Execute all pending tasks
router.post('/execute-all', async (req, res) => {
  try {
    const pendingTasks = await Task.find({
      status: { $ne: 'completed' },
    });

    const results = {
      total: pendingTasks.length,
      executing: 0,
      failed: 0,
    };

    for (const task of pendingTasks) {
      try {
        task.executionStatus = 'executing';
        task.status = 'in-progress';
        task.executionDetails = task.executionDetails || {};
        task.executionDetails.startedAt = new Date();
        await task.save();
        results.executing += 1;
      } catch (error) {
        results.failed += 1;
      }
    }

    res.json({
      success: true,
      message: `Started execution of ${results.executing} tasks`,
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/task-manager/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await Task.countDocuments();
    const completed = await Task.countDocuments({ status: 'completed' });
    const executing = await Task.countDocuments({ executionStatus: 'executing' });
    const pending = await Task.countDocuments({
      status: { $ne: 'completed' },
      executionStatus: { $ne: 'executing' },
    });

    res.json({
      success: true,
      stats: {
        total,
        completed,
        executing,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
