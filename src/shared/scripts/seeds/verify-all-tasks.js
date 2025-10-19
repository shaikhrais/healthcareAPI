const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
// Verify ALL tasks across ALL sprints have technical details
router.get('/', async (req, res) => {
  try {
    // Get ALL sprints
    const allSprints = await Sprint.find({}).sort({ sprintNumber: 1 });

    // Get ALL tasks grouped by sprint
    const allTasks = await Task.find({}).sort({ sprintNumber: 1 });

    const sprintSummary = [];

    for (const sprint of allSprints) {
      const sprintTasks = allTasks.filter(
        (t) => t.sprint && t.sprint.toString() === sprint._id.toString()
      );

      sprintSummary.push({
        sprintNumber: sprint.sprintNumber,
        sprintName: sprint.name,
        hasTechnicalDetails: !!sprint.technicalDetails,
        tasksCount: sprintTasks.length,
        tasksWithDetails: sprintTasks.filter((t) => t.technicalDetails).length,
        tasks: sprintTasks.map((t) => ({
          title: t.title,
          description: t.description,
          storyPoints: t.storyPoints,
          tags: t.tags || [],
          hasTechnicalDetails: !!t.technicalDetails,
          technicalKeys: t.technicalDetails ? Object.keys(t.technicalDetails) : [],
          technicalDetails: t.technicalDetails || null,
        })),
      });
    }

    // Overall statistics
    const totalTasks = await Task.countDocuments({});
    const tasksWithDetails = await Task.countDocuments({
      technicalDetails: { $exists: true, $ne: null },
    });
    const totalSprints = await Sprint.countDocuments({});
    const sprintsWithDetails = await Sprint.countDocuments({
      technicalDetails: { $exists: true, $ne: null },
    });

    res.status(200).json({
      summary: {
        totalSprints,
        sprintsWithDetails,
        totalTasks,
        tasksWithDetails,
        completionPercentage: {
          sprints: Math.round((sprintsWithDetails / totalSprints) * 100),
          tasks: Math.round((tasksWithDetails / totalTasks) * 100),
        },
      },
      sprints: sprintSummary,
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Failed to verify all tasks',
      details: error.message,
    });
  }
});

module.exports = router;
