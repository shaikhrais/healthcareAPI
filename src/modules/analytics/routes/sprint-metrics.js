const express = require('express');


const Sprint = require('../models/Sprint');
const DevelopmentTask = require('../models/DevelopmentTask');
const router = express.Router();
/**
 * Sprint Metrics API
 * Provides chart-ready data for sprint analytics and visualization
 */

/**
 * @swagger
 * /api/sprint-metrics/{sprintId}:
 *   get:
 *     tags:
 *       - Sprint Metrics & Analytics
 *     summary: Get comprehensive metrics for a specific sprint
 *     description: Returns chart-ready data including task status, team contributions, and progress
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint ID (e.g., SPRINT-001)
 *     responses:
 *       200:
 *         description: Sprint metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sprint:
 *                   type: object
 *                   properties:
 *                     sprintId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     progress:
 *                       type: number
 *                     storyPoints:
 *                       type: object
 *                 taskStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       value:
 *                         type: number
 *                       color:
 *                         type: string
 *                 teamMembers:
 *                   type: array
 *                 summary:
 *                   type: object
 *       404:
 *         description: Sprint not found
 */
router.get('/:sprintId', async (req, res) => {
  try {
    const { sprintId } = req.params;

    // Find sprint
    const sprint = await Sprint.findOne({ sprintId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Get all tasks for this sprint
    const tasks = await DevelopmentTask.find({ sprint: sprint._id });

    // Calculate task status distribution
    const statusCounts = {
      completed: 0,
      inProgress: 0,
      blocked: 0,
      notStarted: 0,
    };

    tasks.forEach((task) => {
      const status = task.status.toLowerCase().replace(/\s+/g, '');
      if (status === 'completed' || status === 'done') {
        statusCounts.completed += 1;
      } else if (status === 'inprogress' || status === 'active') {
        statusCounts.inProgress += 1;
      } else if (status === 'blocked') {
        statusCounts.blocked += 1;
      } else {
        statusCounts.notStarted += 1;
      }
    });

    // Task status data for pie/donut charts
    const taskStatusData = [
      { label: 'Completed', value: statusCounts.completed, color: '#4CAF50' },
      { label: 'In Progress', value: statusCounts.inProgress, color: '#2196F3' },
      { label: 'Blocked', value: statusCounts.blocked, color: '#F44336' },
      { label: 'Not Started', value: statusCounts.notStarted, color: '#9E9E9E' },
    ].filter((item) => item.value > 0); // Only include non-zero values

    // Calculate story points
    const completedPoints = tasks
      .filter((t) => ['completed', 'done'].includes(t.status.toLowerCase()))
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const progress = totalPoints > 0 ? completedPoints / totalPoints : 0;

    // Team member contributions (story points by assignee)
    const teamContributions = {};
    tasks.forEach((task) => {
      const assignee = task.assignedTo || 'Unassigned';
      if (!teamContributions[assignee]) {
        teamContributions[assignee] = 0;
      }
      teamContributions[assignee] += task.storyPoints || 0;
    });

    const teamMembersData = Object.entries(teamContributions)
      .map(([label, value], index) => ({
        label,
        value,
        color: getColorForIndex(index),
      }))
      .sort((a, b) => b.value - a.value); // Sort by story points descending

    // Response
    res.json({
      sprint: {
        sprintId: sprint.sprintId,
        name: sprint.name,
        sprintNumber: sprint.sprintNumber,
        progress,
        storyPoints: {
          completed: completedPoints,
          total: totalPoints,
        },
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      },
      taskStatus: taskStatusData,
      teamMembers: teamMembersData,
      summary: {
        totalTasks: tasks.length,
        completedTasks: statusCounts.completed,
        blockedTasks: statusCounts.blocked,
        averageStoryPoints: tasks.length > 0 ? totalPoints / tasks.length : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching sprint metrics:', error);
    res.status(500).json({ error: 'Failed to fetch sprint metrics' });
  }
});

/**
 * @swagger
 * /api/sprint-metrics/velocity/all:
 *   get:
 *     tags:
 *       - Sprint Metrics & Analytics
 *     summary: Get velocity trend across all sprints
 *     description: Returns completed story points for each sprint for line chart visualization
 *     responses:
 *       200:
 *         description: Velocity data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 velocity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       value:
 *                         type: number
 *                       sprintId:
 *                         type: string
 *                 totalSprints:
 *                   type: number
 *                 averageVelocity:
 *                   type: number
 */
router.get('/velocity/all', async (req, res) => {
  try {
    const sprints = await Sprint.find({}).sort({ sprintNumber: 1 });

    const velocityData = [];

    for (const sprint of sprints) {
      const tasks = await DevelopmentTask.find({ sprint: sprint._id });
      const completedPoints = tasks
        .filter((t) => ['completed', 'done'].includes(t.status.toLowerCase()))
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      velocityData.push({
        label: `Sprint ${sprint.sprintNumber}`,
        value: completedPoints,
        sprintId: sprint.sprintId,
      });
    }

    res.json({
      velocity: velocityData,
      totalSprints: sprints.length,
      averageVelocity:
        velocityData.length > 0
          ? velocityData.reduce((sum, v) => sum + v.value, 0) / velocityData.length
          : 0,
    });
  } catch (error) {
    console.error('Error fetching velocity data:', error);
    res.status(500).json({ error: 'Failed to fetch velocity data' });
  }
});

/**
 * @swagger
 * /api/sprint-metrics/burndown/{sprintId}:
 *   get:
 *     tags:
 *       - Sprint Metrics & Analytics
 *     summary: Get burndown chart data for a sprint
 *     description: Returns ideal and actual burndown data for sprint progress tracking
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sprint ID (e.g., SPRINT-001)
 *     responses:
 *       200:
 *         description: Burndown data retrieved successfully
 *       404:
 *         description: Sprint not found
 */
router.get('/burndown/:sprintId', async (req, res) => {
  try {
    const { sprintId } = req.params;

    const sprint = await Sprint.findOne({ sprintId });
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const tasks = await DevelopmentTask.find({ sprint: sprint._id });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Calculate sprint duration in days
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Ideal burndown (linear)
    const idealBurndown = [];
    for (let day = 0; day <= durationDays; day += 1) {
      idealBurndown.push({
        label: `Day ${day}`,
        value: totalPoints - (totalPoints / durationDays) * day,
      });
    }

    // TODO: Actual burndown would require task completion timestamps
    // For now, return ideal burndown and placeholder for actual

    res.json({
      sprint: {
        sprintId: sprint.sprintId,
        name: sprint.name,
        totalPoints,
        durationDays,
      },
      ideal: idealBurndown,
      // actual: actualBurndown, // TODO: Implement with task completion tracking
    });
  } catch (error) {
    console.error('Error fetching burndown data:', error);
    res.status(500).json({ error: 'Failed to fetch burndown data' });
  }
});

/**
 * @swagger
 * /api/sprint-metrics/summary/all:
 *   get:
 *     tags:
 *       - Sprint Metrics & Analytics
 *     summary: Get overall project summary metrics
 *     description: Returns aggregated metrics across all sprints and tasks
 *     responses:
 *       200:
 *         description: Summary metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sprints:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     active:
 *                       type: number
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     inProgress:
 *                       type: number
 *                     blocked:
 *                       type: number
 *                 storyPoints:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     remaining:
 *                       type: number
 *                     progress:
 *                       type: number
 */
router.get('/summary/all', async (req, res) => {
  try {
    const sprints = await Sprint.find({});
    const allTasks = await DevelopmentTask.find({});

    const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = allTasks
      .filter((t) => ['completed', 'done'].includes(t.status.toLowerCase()))
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) =>
      ['completed', 'done'].includes(t.status.toLowerCase())
    ).length;

    res.json({
      sprints: {
        total: sprints.length,
        completed: sprints.filter((s) => s.status === 'Completed').length,
        active: sprints.filter((s) => s.status === 'Active').length,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: allTasks.filter((t) =>
          ['inprogress', 'active'].includes(t.status.toLowerCase().replace(/\s+/g, ''))
        ).length,
        blocked: allTasks.filter((t) => t.status.toLowerCase() === 'blocked').length,
      },
      storyPoints: {
        total: totalPoints,
        completed: completedPoints,
        remaining: totalPoints - completedPoints,
        progress: totalPoints > 0 ? completedPoints / totalPoints : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching summary metrics:', error);
    res.status(500).json({ error: 'Failed to fetch summary metrics' });
  }
});

// Helper function to generate colors for team members
function getColorForIndex(index) {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
    '#F8B739',
    '#52B788',
  ];
  return colors[index % colors.length];
}

module.exports = router;
