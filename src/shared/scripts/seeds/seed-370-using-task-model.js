const fs = require('fs');
const path = require('path');
const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
// Seed ALL 370 tasks using Task model (compatible with verify-all-tasks)
router.post('/', async (req, res) => {
  try {
    console.log('🌱 Seeding 370 tasks using Task model...');

    // Load extracted JSON
    const jsonPath = path.join(__dirname, '../extracted-all-tasks.json');
    const extractedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`📊 Loaded ${extractedData.total_tasks} tasks from JSON`);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Task.deleteMany({});
    await Sprint.deleteMany({});
    console.log('✅ Cleared');

    // Create sprints
    console.log('🏃 Creating sprints...');
    const sprintMap = new Map();

    for (const sprintData of extractedData.sprints) {
      const startDate = new Date('2025-01-06'); // Base start date
      startDate.setDate(startDate.getDate() + (sprintData.sprint_number - 1) * 14); // Add 2 weeks per sprint
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13); // 2 weeks sprint (14 days, 0-13)

      const sprint = await Sprint.create({
        sprintId: `SPRINT-${String(sprintData.sprint_number).padStart(3, '0')}`,
        sprintNumber: sprintData.sprint_number,
        name: sprintData.name,
        startDate,
        endDate,
        goals: [{ description: `Complete ${sprintData.name}`, completed: false }],
        status: 'planning',
        technicalDetails: {},
      });

      sprintMap.set(sprintData.sprint_number, sprint);
      console.log(`  ✓ Sprint ${sprintData.sprint_number}: ${sprintData.name}`);
    }

    // Create tasks
    console.log('📝 Creating tasks...');
    let totalCreated = 0;

    for (const sprintData of extractedData.sprints) {
      const sprint = sprintMap.get(sprintData.sprint_number);

      for (const taskData of sprintData.tasks) {
        await Task.create({
          title: taskData.title,
          description: taskData.description || taskData.title,
          sprint: sprint._id,
          sprintNumber: sprintData.sprint_number,
          assignedTo: null,
          status: 'todo',
          priority: taskData.priority || 'medium',
          dueDate: null,
          storyPoints: taskData.points || 0,
          tags: [],
          category: 'development',
          technicalDetails: {
            techStack: taskData.tech_stack || 'Not specified',
            acceptanceCriteria: taskData.acceptance_criteria || 'To be defined',
            whatItDoes: taskData.description || taskData.title,
            implementation: `Implement ${taskData.title}`,
            storyPoints: taskData.points || 0,
          },
        });

        totalCreated += 1;
      }

      console.log(
        `  ✓ Sprint ${sprintData.sprint_number}: Created ${sprintData.tasks.length} tasks`
      );
    }

    console.log(`✅ Successfully created ${totalCreated} tasks!`);

    res.json({
      success: true,
      message: `🎉 Successfully seeded ${totalCreated} tasks using Task model!`,
      summary: {
        totalSprints: extractedData.total_sprints,
        totalTasks: totalCreated,
        totalStoryPoints: extractedData.total_story_points,
      },
    });
  } catch (error) {
    console.error('Error seeding tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
