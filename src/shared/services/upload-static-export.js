const fs = require('fs');
const path = require('path');
const express = require('express');


const router = express.Router();
/**
 * Upload data from static-data-export.json to MongoDB
 * Uses YOUR exact API models (Sprint and DevelopmentTask from models/DevelopmentTask.js)
 */

router.post('/', async (req, res) => {
  try {
    console.log('🚀 Starting upload from static-data-export.json...\n');

    // Load the JSON data
    const jsonPath = path.join(__dirname, '../static-data-export.json');
    const exportData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Import the correct models
    const Sprint = require('../models/Sprint');
    const DevelopmentTask = require('../models/DevelopmentTask');

    // Clear existing data
    console.log('🗑️  Clearing existing sprints and tasks...');
    await Sprint.deleteMany({});
    await DevelopmentTask.deleteMany({});
    console.log('✅ Cleared\n');

    const uploadedSprints = [];
    const uploadedTasks = [];

    // Upload each sprint
    for (const sprintData of exportData.sprints) {
      console.log(`📦 Processing Sprint ${sprintData.sprintNumber}: ${sprintData.sprintName}`);

      // Calculate dates (2-week sprints starting Jan 6, 2025)
      const startDate = new Date('2025-01-06');
      startDate.setDate(startDate.getDate() + (sprintData.sprintNumber - 1) * 14);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);

      // Create Sprint using YOUR model
      const sprint = await Sprint.create({
        sprintId: `SPRINT-${String(sprintData.sprintNumber).padStart(3, '0')}`,
        sprintNumber: sprintData.sprintNumber,
        name: sprintData.sprintName,
        goal: `Complete ${sprintData.sprintName}`,
        startDate,
        endDate,
        status: 'planning',
        totalStoryPoints: sprintData.storyPoints,
        modules: [], // Will be populated from tasks
      });

      uploadedSprints.push({
        sprintId: sprint.sprintId,
        name: sprint.name,
        tasks: sprintData.tasks.length,
      });

      // Upload tasks for this sprint
      let taskCount = 0;
      for (const taskData of sprintData.tasks) {
        // Calculate estimatedHours (1 story point ≈ 4-6 hours, using 5)
        const estimatedDays = Math.ceil(((taskData.storyPoints || 0) * 5) / 8); // 8 hours per day
        const estimatedHours = (taskData.storyPoints || 0) * 5;

        // Determine priority based on story points
        let priority = 'medium';
        if (taskData.storyPoints >= 13) priority = 'high';
        else if (taskData.storyPoints <= 3) priority = 'low';

        // Extract task number from taskId (e.g., "TASK-1.1" -> "1.1")
        const taskNumber = taskData.taskId.replace('TASK-', '');

        // Create Task using YOUR model
        const task = await DevelopmentTask.create({
          taskId: taskData.taskId,
          moduleId: `MOD-${sprintData.sprintNumber}`,
          moduleName: sprintData.sprintName,
          taskNumber,
          title: taskData.title,
          description: taskData.description || taskData.title,
          storyPoints: taskData.storyPoints || 0,
          estimatedDuration: {
            days: estimatedDays,
            hours: estimatedHours,
          },
          priority,
          status: 'todo',
          assignedTo: null,
          sprint: sprint._id,
          sprintNumber: sprintData.sprintNumber,
          dependencies: [],
          tags: [
            taskData.taskId,
            `sprint-${sprintData.sprintNumber}`,
            ...(taskData.techStack ? ['tech-details'] : []),
          ],
          // Store additional data in notes field as STRING
          notes: `Tech Stack: ${taskData.techStack || 'N/A'}\n\nAcceptance Criteria: ${taskData.acceptanceCriteria || 'N/A'}`,
        });

        taskCount += 1;
        uploadedTasks.push({
          taskId: task.taskId,
          title: task.title,
          sprint: sprintData.sprintNumber,
        });
      }

      console.log(`   ✅ Created ${taskCount} tasks\n`);
    }

    console.log('========================================');
    console.log('✅ UPLOAD COMPLETE!');
    console.log('========================================\n');
    console.log(`📊 Sprints: ${uploadedSprints.length}`);
    console.log(`📋 Tasks: ${uploadedTasks.length}`);
    console.log(`⭐ Total Story Points: ${exportData.project.totalStoryPoints}\n`);

    res.json({
      success: true,
      message: '✅ Static data uploaded successfully!',
      summary: {
        sprintsCreated: uploadedSprints.length,
        tasksCreated: uploadedTasks.length,
        totalStoryPoints: exportData.project.totalStoryPoints,
      },
      sprints: uploadedSprints.map((s) => ({
        sprintId: s.sprintId,
        name: s.name,
        tasksCount: s.tasks,
      })),
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// GET route to check upload status
router.get('/', async (req, res) => {
  try {
    const Sprint = require('../models/Sprint');
    const DevelopmentTask = require('../models/DevelopmentTask');

    const sprintCount = await Sprint.countDocuments({});
    const taskCount = await DevelopmentTask.countDocuments({});

    const sprints = await Sprint.find({})
      .sort({ sprintNumber: 1 })
      .select('sprintId name totalStoryPoints');

    res.json({
      success: true,
      currentStatus: {
        sprints: sprintCount,
        tasks: taskCount,
        sprintsList: sprints,
      },
      instruction: 'POST to this endpoint to upload data from static-data-export.json',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
