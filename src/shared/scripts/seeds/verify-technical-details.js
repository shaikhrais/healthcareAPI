const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
// Verify technical details were added
router.get('/', async (req, res) => {
  try {
    // Get Sprint 1 with technical details
    const sprint1 = await Sprint.findOne({ sprintNumber: 1 });

    // Get all Sprint 1 tasks with technical details
    const sprint1Tasks = await Task.find({ sprintNumber: 1 }).select('title technicalDetails');

    res.status(200).json({
      sprint: {
        name: sprint1?.name,
        hasTechnicalDetails: !!sprint1?.technicalDetails,
        technicalDetails: sprint1?.technicalDetails,
      },
      tasks: sprint1Tasks.map((task) => ({
        title: task.title,
        hasTechnicalDetails: !!task.technicalDetails,
        technicalDetailsKeys: task.technicalDetails ? Object.keys(task.technicalDetails) : [],
      })),
      summary: {
        totalTasks: sprint1Tasks.length,
        tasksWithDetails: sprint1Tasks.filter((t) => t.technicalDetails).length,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Failed to verify technical details',
      details: error.message,
    });
  }
});

module.exports = router;
