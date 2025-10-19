const fs = require('fs');
const path = require('path');
const express = require('express');


const Sprint = require('../models/Sprint');
const DevelopmentTask = require('../models/DevelopmentTask');
const router = express.Router();
/**
 * Seed Complete 370 Tasks from Extracted JSON
 * POST /api/seed/complete-370-tasks
 *
 * Loads all 370 tasks from extracted-all-tasks.json and creates:
 * - 18 sprints with metadata
 * - 370 development tasks with proper sprint references
 * - Complete technical details and acceptance criteria
 */
router.post('/', async (req, res) => {
  try {
    console.log('🌱 Starting comprehensive seeding of 370 tasks from extracted JSON...');

    // Load the extracted JSON file
    const jsonPath = path.join(__dirname, '..', 'extracted-all-tasks.json');

    if (!fs.existsSync(jsonPath)) {
      return res.status(404).json({
        error: 'JSON file not found',
        message: `Could not find file at: ${jsonPath}`,
        hint: 'Make sure extracted-all-tasks.json exists in the backend directory',
      });
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const projectData = JSON.parse(rawData);

    console.log(
      `📊 Loaded project data: ${projectData.total_tasks} tasks across ${projectData.total_sprints} sprints`
    );

    // Step 1: Clear existing data
    console.log('🗑️  Clearing existing sprints and tasks...');
    await Sprint.deleteMany({});
    await DevelopmentTask.deleteMany({});
    console.log('✅ Cleared existing data');

    // Step 2: Create all sprints
    console.log('🏃 Creating sprints...');
    const sprintMap = new Map(); // Map sprint_number to Sprint ObjectId
    const sprintStats = [];

    for (const sprintData of projectData.sprints) {
      // Parse timeline to get dates
      const timelineMatch = sprintData.timeline.match(/(\w+\s+\d+)\s*-\s*(\w+\s+\d+),\s*(\d{4})/);
      let startDate = new Date();
      let endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later

      if (timelineMatch) {
        const [_, start, end, year] = timelineMatch;
        startDate = new Date(`${start}, ${year}`);
        endDate = new Date(`${end}, ${year}`);
      }

      const sprint = await Sprint.create({
        sprintId: `SPRINT-${String(sprintData.sprint_number).padStart(3, '0')}`,
        sprintNumber: sprintData.sprint_number,
        name: sprintData.name,
        status: sprintData.sprint_number === 1 ? 'active' : 'planning',
        startDate,
        endDate,
        duration: 14,
        focus: sprintData.name,
        modules: [sprintData.name],
        capacity: {
          totalStoryPoints: sprintData.story_points,
          plannedVelocity: sprintData.story_points,
          actualVelocity: 0,
          teamCapacity: sprintData.story_points * 4, // Rough estimate: 4 hours per story point
        },
        goals: [
          {
            description: `Complete all ${sprintData.story_points} story points for ${sprintData.name}`,
            completed: false,
            priority: 'high',
          },
        ],
        technicalDetails: {
          sprintOverview: sprintData.name,
          totalTasks: sprintData.tasks.length,
          estimatedStoryPoints: sprintData.story_points,
          timeline: sprintData.timeline,
        },
        taskSummary: {
          total: sprintData.tasks.length,
          completed: 0,
          inProgress: 0,
          todo: sprintData.tasks.length,
          blocked: 0,
        },
      });

      sprintMap.set(sprintData.sprint_number, sprint._id);
      sprintStats.push({
        sprintNumber: sprintData.sprint_number,
        name: sprintData.name,
        tasksCount: sprintData.tasks.length,
        storyPoints: sprintData.story_points,
      });

      console.log(
        `  ✓ Sprint ${sprintData.sprint_number}: ${sprintData.name} (${sprintData.tasks.length} tasks, ${sprintData.story_points} points)`
      );
    }

    console.log(`✅ Created ${sprintMap.size} sprints`);

    // Step 3: Create all tasks
    console.log('📝 Creating tasks...');
    let totalTasksCreated = 0;
    let totalStoryPoints = 0;
    const tasksByStatus = {
      planned: 0,
      todo: 0,
      in_progress: 0,
      completed: 0,
    };

    for (const sprintData of projectData.sprints) {
      const sprintId = sprintMap.get(sprintData.sprint_number);

      if (!sprintId) {
        console.error(`⚠️  Sprint ${sprintData.sprint_number} not found, skipping tasks`);
        continue;
      }

      for (const taskData of sprintData.tasks) {
        try {
          // Map status from JSON to DevelopmentTask enum
          let mappedStatus = 'todo';
          if (taskData.status === 'planned') mappedStatus = 'todo';
          else if (taskData.status === 'in_progress') mappedStatus = 'in_progress';
          else if (taskData.status === 'completed') mappedStatus = 'completed';
          else if (taskData.status === 'blocked') mappedStatus = 'blocked';

          // Map priority from JSON to DevelopmentTask enum (lowercase to match enum)
          let mappedPriority = 'medium';
          if (taskData.priority) {
            mappedPriority = taskData.priority.toLowerCase();
          }

          // Extract module info from task_id (e.g., "TASK-1.1" -> module "1")
          const taskIdParts = taskData.task_id.split('-')[1].split('.');
          const moduleId = taskIdParts[0];
          const taskNumber = taskData.task_id.split('-')[1];

          // Parse acceptance criteria (can be string or undefined)
          const acceptanceCriteriaArray = [];
          if (taskData.acceptance_criteria) {
            if (typeof taskData.acceptance_criteria === 'string') {
              acceptanceCriteriaArray.push(
                ...taskData.acceptance_criteria
                  .split('→')
                  .map((s) => s.trim())
                  .filter((s) => s)
              );
            }
          }

          // Add default criteria if none provided
          if (acceptanceCriteriaArray.length === 0) {
            acceptanceCriteriaArray.push(
              `${taskData.title} is fully implemented`,
              'All tests pass',
              'Code is reviewed and approved',
              'Documentation is complete'
            );
          }

          const task = await DevelopmentTask.create({
            taskId: taskData.task_id,
            moduleId,
            moduleName: `Module ${moduleId}`,
            taskNumber,
            title: taskData.title,
            description: taskData.description || taskData.title,
            technicalRequirements: [
              {
                requirement: `Implement ${taskData.title}`,
                completed: false,
              },
              {
                requirement: `Test ${taskData.title} functionality`,
                completed: false,
              },
              {
                requirement: `Document ${taskData.title} implementation`,
                completed: false,
              },
            ],
            sprint: sprintId,
            sprintNumber: sprintData.sprint_number,
            priority: mappedPriority,
            status: mappedStatus,
            storyPoints: taskData.points || 0,
            estimatedDuration: {
              days: Math.ceil((taskData.points || 0) / 2),
              hours: (taskData.points || 0) * 4,
            },
            assignedRole: determineRole(taskData.points, taskData.title),
            isBlocked: false,
            progress: {
              percentage: mappedStatus === 'completed' ? 100 : 0,
              lastUpdated: new Date(),
            },
            codeReview: {
              required: true,
              status: mappedStatus === 'completed' ? 'approved' : 'pending',
            },
            qa: {
              required: true,
              status: mappedStatus === 'completed' ? 'passed' : 'pending',
            },
            documentation: {
              required: taskData.points >= 5,
              status: mappedStatus === 'completed' ? 'completed' : 'pending',
            },
            tags: determineTags(taskData.title, taskData.tech_stack),
            labels: [
              {
                name: `Sprint ${sprintData.sprint_number}`,
                color: getSprintColor(sprintData.sprint_number),
              },
              {
                name: mappedPriority,
                color: getPriorityColor(mappedPriority),
              },
            ],
            // Store original data in notes for reference
            notes: JSON.stringify(
              {
                techStack: taskData.tech_stack || 'Not specified',
                acceptanceCriteria: acceptanceCriteriaArray,
                originalDescription: taskData.description,
                originalStatus: taskData.status,
                originalPriority: taskData.priority,
              },
              null,
              2
            ),
          });

          totalTasksCreated += 1;
          totalStoryPoints += taskData.points || 0;

          if (taskData.status && tasksByStatus[taskData.status] !== undefined) {
            tasksByStatus[taskData.status]++;
          }
        } catch (taskError) {
          console.error(`⚠️  Error creating task ${taskData.task_id}:`, taskError.message);
        }
      }

      console.log(
        `  ✓ Sprint ${sprintData.sprint_number}: Created ${sprintData.tasks.length} tasks`
      );
    }

    console.log(
      `✅ Created ${totalTasksCreated} tasks with ${totalStoryPoints} total story points`
    );

    // Step 4: Update sprint task references
    console.log('🔗 Linking tasks to sprints...');
    for (const [sprintNumber, sprintId] of sprintMap.entries()) {
      const tasks = await DevelopmentTask.find({ sprint: sprintId });
      const taskIds = tasks.map((t) => t._id);

      await Sprint.findByIdAndUpdate(sprintId, {
        tasks: taskIds,
      });
    }
    console.log('✅ Linked all tasks to their sprints');

    // Step 5: Generate statistics
    const stats = {
      success: true,
      message: `🎉 Successfully seeded ${totalTasksCreated} tasks across ${sprintMap.size} sprints!`,
      summary: {
        totalSprints: sprintMap.size,
        totalTasks: totalTasksCreated,
        totalStoryPoints,
        averagePointsPerTask: Math.round((totalStoryPoints / totalTasksCreated) * 10) / 10,
        tasksByStatus,
      },
      sprintBreakdown: sprintStats,
      dataSource: {
        file: 'extracted-all-tasks.json',
        projectName: projectData.project_name,
        durationWeeks: projectData.duration_weeks,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('\n🎊 Seeding completed successfully!');
    console.log(`📊 Total Sprints: ${stats.summary.totalSprints}`);
    console.log(`📋 Total Tasks: ${stats.summary.totalTasks}`);
    console.log(`⭐ Total Story Points: ${stats.summary.totalStoryPoints}`);
    console.log(`📈 Average Points per Task: ${stats.summary.averagePointsPerTask}`);

    res.json(stats);
  } catch (error) {
    console.error('❌ Error seeding complete 370 tasks:', error);
    res.status(500).json({
      error: 'Failed to seed tasks',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * Helper function to determine role based on task complexity
 */
function determineRole(points, title) {
  const titleLower = title.toLowerCase();

  // Frontend/UI tasks
  if (
    titleLower.includes('ui') ||
    titleLower.includes('frontend') ||
    titleLower.includes('component')
  ) {
    return points >= 8 ? 'Senior Frontend Engineer' : 'Mid-Level Frontend Engineer';
  }

  // Backend/API tasks
  if (
    titleLower.includes('api') ||
    titleLower.includes('backend') ||
    titleLower.includes('database')
  ) {
    return points >= 8 ? 'Senior Backend Engineer' : 'Mid-Level Backend Engineer';
  }

  // Full-stack tasks
  if (titleLower.includes('integration') || titleLower.includes('system')) {
    return points >= 8 ? 'Senior Full-Stack Engineer' : 'Mid-Level Full-Stack Engineer';
  }

  // DevOps tasks
  if (
    titleLower.includes('deploy') ||
    titleLower.includes('docker') ||
    titleLower.includes('ci/cd')
  ) {
    return 'DevOps Engineer';
  }

  // Testing tasks
  if (titleLower.includes('test') || titleLower.includes('qa')) {
    return 'QA Engineer';
  }

  // Default based on complexity
  if (points >= 13) return 'Senior Full-Stack Engineer';
  if (points >= 8) return 'Senior Backend Engineer';
  if (points >= 5) return 'Mid-Level Backend Engineer';
  return 'Junior Backend Engineer';
}

/**
 * Helper function to determine tags based on title and tech stack
 */
function determineTags(title, techStack) {
  const tags = ['development'];
  const titleLower = title.toLowerCase();
  const techStackLower = (techStack || '').toLowerCase();

  // Feature type tags
  if (
    titleLower.includes('auth') ||
    titleLower.includes('login') ||
    titleLower.includes('registration')
  ) {
    tags.push('authentication');
  }
  if (titleLower.includes('api') || titleLower.includes('endpoint')) {
    tags.push('api');
  }
  if (
    titleLower.includes('ui') ||
    titleLower.includes('component') ||
    titleLower.includes('screen')
  ) {
    tags.push('frontend', 'ui');
  }
  if (
    titleLower.includes('database') ||
    titleLower.includes('model') ||
    titleLower.includes('schema')
  ) {
    tags.push('database');
  }
  if (titleLower.includes('test') || titleLower.includes('qa')) {
    tags.push('testing');
  }
  if (titleLower.includes('security') || titleLower.includes('encryption')) {
    tags.push('security');
  }
  if (titleLower.includes('payment') || titleLower.includes('billing')) {
    tags.push('payments', 'billing');
  }
  if (titleLower.includes('integration')) {
    tags.push('integration');
  }
  if (
    titleLower.includes('docker') ||
    titleLower.includes('deploy') ||
    titleLower.includes('ci/cd')
  ) {
    tags.push('devops');
  }

  // Tech stack tags
  if (techStackLower.includes('react')) tags.push('react');
  if (techStackLower.includes('node')) tags.push('nodejs');
  if (techStackLower.includes('mongodb')) tags.push('mongodb');
  if (techStackLower.includes('jwt')) tags.push('jwt');
  if (techStackLower.includes('stripe')) tags.push('stripe');
  if (techStackLower.includes('docker')) tags.push('docker');

  // Remove duplicates and return
  return [...new Set(tags)];
}

/**
 * Helper function to get color for sprint labels
 */
function getSprintColor(sprintNumber) {
  const colors = [
    '#667eea',
    '#764ba2',
    '#f093fb',
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#fee140',
    '#30cfd0',
    '#a8edea',
    '#fed6e3',
    '#c471ed',
    '#f64f59',
    '#12c2e9',
    '#c471f5',
    '#fa709a',
    '#feca57',
    '#48dbfb',
    '#ff9ff3',
  ];
  return colors[(sprintNumber - 1) % colors.length];
}

/**
 * Helper function to get color for priority labels
 */
function getPriorityColor(priority) {
  const colors = {
    critical: '#e74c3c',
    high: '#e67e22',
    medium: '#f39c12',
    low: '#95a5a6',
  };
  return colors[priority] || colors.medium;
}

/**
 * GET endpoint to verify seeded data
 * GET /api/seed/complete-370-tasks/verify
 */
router.get('/verify', async (req, res) => {
  try {
    const sprintCount = await Sprint.countDocuments();
    const taskCount = await DevelopmentTask.countDocuments();

    const sprints = await Sprint.find({})
      .select('sprintNumber name capacity.totalStoryPoints taskSummary')
      .sort({ sprintNumber: 1 });

    const tasksByStatus = await DevelopmentTask.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPoints: { $sum: '$storyPoints' },
        },
      },
    ]);

    const tasksBySprint = await DevelopmentTask.aggregate([
      {
        $group: {
          _id: '$sprintNumber',
          count: { $sum: 1 },
          totalPoints: { $sum: '$storyPoints' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      verification: {
        totalSprints: sprintCount,
        totalTasks: taskCount,
        expectedSprints: 18,
        expectedTasks: 370,
        isComplete: sprintCount === 18 && taskCount === 370,
      },
      sprints: sprints.map((s) => ({
        sprintNumber: s.sprintNumber,
        name: s.name,
        storyPoints: s.capacity.totalStoryPoints,
        tasksTotal: s.taskSummary.total,
      })),
      tasksByStatus,
      tasksBySprint,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to verify seeded data',
      message: error.message,
    });
  }
});

module.exports = router;
