const fs = require('fs');
const path = require('path');
const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
/**
 * BATCH UPLOAD ROUTE - Uploads 5 tasks at a time
 * Use query param: ?batch=1 for tasks 1-5, ?batch=2 for tasks 6-10, etc.
 */

// GET - Shows current progress and next batch info
router.get('/', async (req, res) => {
  try {
    const currentCount = await Task.countDocuments({});
    const jsonPath = path.join(__dirname, '../all-387-tasks-extracted.json');
    const allData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const totalTasks = allData.tasks.length;

    const batchesComplete = Math.floor(currentCount / 5);
    const nextBatchNumber = batchesComplete + 1;
    const tasksRemaining = totalTasks - currentCount;

    res.json({
      success: true,
      progress: {
        currentTasks: currentCount,
        totalTasks,
        tasksRemaining,
        percentComplete: Math.round((currentCount / totalTasks) * 100),
      },
      nextBatch: {
        batchNumber: nextBatchNumber,
        startIndex: currentCount,
        endIndex: Math.min(currentCount + 5, totalTasks),
        uploadUrl: `/api/seed/tasks-batch?batch=${nextBatchNumber}`,
      },
      instruction: `To upload next batch: POST /api/seed/tasks-batch?batch=${nextBatchNumber}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Upload a specific batch of 5 tasks
router.post('/', async (req, res) => {
  try {
    const batchNumber = parseInt(req.query.batch, 10) || 1;
    const batchSize = 5;

    console.log(`\n📦 Starting batch ${batchNumber} upload...`);

    // Load all tasks
    const jsonPath = path.join(__dirname, '../all-387-tasks-extracted.json');
    const allData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const allTasks = allData.tasks;

    // Calculate batch range
    const startIndex = (batchNumber - 1) * batchSize;
    const endIndex = Math.min(startIndex + batchSize, allTasks.length);
    const batchTasks = allTasks.slice(startIndex, endIndex);

    if (batchTasks.length === 0) {
      return res.json({
        success: true,
        message: '✅ All tasks already uploaded!',
        totalTasks: await Task.countDocuments({}),
      });
    }

    console.log(`📊 Batch ${batchNumber}: Uploading tasks ${startIndex + 1} to ${endIndex}`);

    // Ensure sprints exist
    const sprintNumbers = [...new Set(batchTasks.map((t) => t.sprint_number))];
    for (const sprintNum of sprintNumbers) {
      let sprint = await Sprint.findOne({ sprintNumber: sprintNum });
      if (!sprint) {
        // Create sprint if it doesn't exist
        const startDate = new Date('2025-01-06');
        startDate.setDate(startDate.getDate() + (sprintNum - 1) * 14);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);

        sprint = await Sprint.create({
          sprintId: `SPRINT-${String(sprintNum).padStart(3, '0')}`,
          sprintNumber: sprintNum,
          name: `Sprint ${sprintNum}`,
          startDate,
          endDate,
          status: 'planning',
          goals: [{ description: `Complete Sprint ${sprintNum}`, completed: false }],
        });
        console.log(`  ✓ Created Sprint ${sprintNum}`);
      }
    }

    // Upload tasks (ONLY title and description, NO tech details)
    const uploadedTasks = [];
    for (const taskData of batchTasks) {
      const sprint = await Sprint.findOne({ sprintNumber: taskData.sprint_number });

      // Check if task already exists
      const existingTask = await Task.findOne({
        title: taskData.title,
        sprint: sprint._id,
      });

      if (existingTask) {
        console.log(`  ⏭️  Skipped ${taskData.task_id} (already exists)`);
        continue;
      }

      // Get or create system user for createdBy
      const User = require('../models/User');
      let systemUser = await User.findOne({ email: 'system@expojane.com' });
      if (!systemUser) {
        systemUser = await User.create({
          email: 'system@expojane.com',
          password: 'system123!',
          firstName: 'System',
          lastName: 'Admin',
          role: 'owner',
        });
      }

      const newTask = await Task.create({
        title: taskData.title,
        description: taskData.description || taskData.title,
        sprint: sprint._id,
        sprintNumber: taskData.sprint_number,
        createdBy: systemUser._id,
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        storyPoints: taskData.story_points || 0,
        tags: [taskData.task_id], // Store task ID in tags for reference
        category: 'other',
        // NO technicalDetails added yet - that's a separate step
      });

      uploadedTasks.push({
        task_id: taskData.task_id,
        title: taskData.title,
        sprint: taskData.sprint_number,
      });

      console.log(`  ✅ ${taskData.task_id}: ${taskData.title}`);
    }

    const totalCount = await Task.countDocuments({});
    const percentComplete = Math.round((totalCount / allTasks.length) * 100);

    console.log(`\n📊 Batch ${batchNumber} complete!`);
    console.log(`   Tasks uploaded in this batch: ${uploadedTasks.length}`);
    console.log(
      `   Total tasks in database: ${totalCount}/${allTasks.length} (${percentComplete}%)`
    );

    const nextBatch = batchNumber + 1;
    const hasMore = totalCount < allTasks.length;

    res.json({
      success: true,
      message: `✅ Batch ${batchNumber} uploaded: ${uploadedTasks.length} tasks`,
      batch: {
        batchNumber,
        tasksUploaded: uploadedTasks.length,
        tasks: uploadedTasks,
      },
      progress: {
        totalTasks: totalCount,
        targetTotal: allTasks.length,
        percentComplete,
        tasksRemaining: allTasks.length - totalCount,
      },
      nextBatch: hasMore
        ? {
            batchNumber: nextBatch,
            uploadUrl: `/api/seed/tasks-batch?batch=${nextBatch}`,
            message: `To continue: POST /api/seed/tasks-batch?batch=${nextBatch}`,
          }
        : null,
      allComplete: !hasMore,
    });
  } catch (error) {
    console.error('❌ Error uploading batch:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// DELETE - Clear all tasks (for starting fresh)
router.delete('/', async (req, res) => {
  try {
    const deletedCount = await Task.deleteMany({});
    console.log(`🗑️  Deleted ${deletedCount.deletedCount} tasks`);

    res.json({
      success: true,
      message: `Deleted ${deletedCount.deletedCount} tasks`,
      instruction: 'Ready to start fresh. Use POST /api/seed/tasks-batch?batch=1',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
