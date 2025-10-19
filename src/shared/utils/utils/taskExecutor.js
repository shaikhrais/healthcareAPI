
const Task = require('../models/Task');
async function executeTask(taskId) {
  const task = await Task.findById(taskId);
  if (!task) throw new Error('Task not found');

  // Update to executing
  task.executionStatus = 'executing';
  task.status = 'in-progress';
  task.executionDetails = task.executionDetails || {};
  task.executionDetails.startedAt = new Date();
  await task.save();

  // Simulate work
  const execTime = (task.metadata?.storyPoints || 1) * 500;
  await new Promise((resolve) => setTimeout(resolve, execTime));

  // Mark as completed
  task.executionStatus = 'executed';
  task.status = 'completed';
  task.completedAt = new Date();
  task.executionDetails.completedAt = new Date();
  task.progressTracking = task.progressTracking || {};
  task.progressTracking.percentComplete = 100;
  await task.save();

  return task;
}

async function executeAllTasks() {
  const tasks = await Task.find({ status: { $ne: 'completed' } });
  const results = { success: [], failed: [] };

  for (const task of tasks) {
    try {
      await executeTask(task._id);
      results.success.push(task._id);
    } catch (error) {
      results.failed.push({ id: task._id, error: error.message });
    }
  }

  return results;
}

module.exports = { executeTask, executeAllTasks };
