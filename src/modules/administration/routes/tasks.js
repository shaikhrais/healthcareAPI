const express = require('express');


const Task = require('../models/Task');
const NotificationService = require('../services/notification.service');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { status, assignedTo, priority, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ dueDate: 1, priority: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my tasks
router.get('/my-tasks', async (req, res) => {
  try {
    const { status } = req.query;
    const tasks = await Task.getMyTasks(req.user.userId, status);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const userId = req.query.userId || req.user.userId;
    const tasks = await Task.getOverdueTasks(userId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks due soon
router.get('/due-soon', async (req, res) => {
  try {
    const userId = req.query.userId || req.user.userId;
    const hours = parseInt(req.query.hours, 10) || 24;
    const tasks = await Task.getTasksDueSoon(userId, hours);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks by category
router.get('/category/:category', async (req, res) => {
  try {
    const { userId } = req.query;
    const tasks = await Task.getByCategory(req.params.category, userId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team tasks
router.get('/team', async (req, res) => {
  try {
    const { status } = req.query;
    const tasks = await Task.getTeamTasks(status);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      createdBy: req.user.userId,
    });

    await task.save();
    await task.populate('assignedTo createdBy');

    // Send notification to assigned user
    if (task.assignedTo && task.assignedTo._id.toString() !== req.user.userId) {
      await NotificationService.sendTaskAssignedNotification(task.assignedTo._id, task);
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;

    if (updates.status === 'completed' && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('assignedTo createdBy');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Notify watchers of update
    if (task.watchers && task.watchers.length > 0) {
      for (const watcherId of task.watchers) {
        await NotificationService.sendNotification(watcherId, {
          title: 'Task Updated',
          message: `Task "${task.title}" has been updated`,
          type: 'task_assigned',
          data: { taskId: task._id.toString() },
          channels: ['in_app'],
        });
      }
    }

    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add comment to task
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.comments.push({
      userId: req.user.userId,
      comment: req.body.comment,
    });

    await task.save();
    await task.populate('comments.userId', 'firstName lastName');

    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add subtask
router.post('/:id/subtasks', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.subtasks.push({
      title: req.body.title,
      order: task.subtasks.length,
    });

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle subtask completion
router.patch('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    subtask.completed = !subtask.completed;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add watcher
router.post('/:id/watchers', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { watchers: req.body.userId } },
      { new: true }
    ).populate('watchers', 'firstName lastName');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
