const express = require('express');


const TestChecklist = require('../models/TestChecklist');
const TestExecution = require('../models/TestExecution');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const router = express.Router();
// ============================================
// TEST CHECKLIST ROUTES (Master Test List)
// ============================================

/**
 * GET /api/test-management/checklist
 * Get all test checklists with optional filters
 */
router.get('/checklist', authMiddleware, async (req, res) => {
  try {
    const { category, module, priority, isActive, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (module) query.module = module;
    if (priority) query.priority = priority;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (search) {
      query.$or = [
        { testName: { $regex: search, $options: 'i' } },
        { testDescription: { $regex: search, $options: 'i' } },
        { testId: { $regex: search, $options: 'i' } },
      ];
    }

    const tests = await TestChecklist.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .sort({ priority: -1, testId: 1 });

    res.json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error('Error fetching test checklists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test checklists',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/checklist/:id
 * Get single test checklist by ID
 */
router.get('/checklist/:id', authMiddleware, async (req, res) => {
  try {
    const test = await TestChecklist.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test checklist not found',
      });
    }

    res.json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.error('Error fetching test checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test checklist',
      error: error.message,
    });
  }
});

/**
 * POST /api/test-management/checklist
 * Create new test checklist (Admin/Manager only)
 */
router.post('/checklist', authMiddleware, requireRole(['admin', 'doctor']), async (req, res) => {
  try {
    const testData = {
      ...req.body,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
    };

    const test = new TestChecklist(testData);
    await test.save();

    res.status(201).json({
      success: true,
      message: 'Test checklist created successfully',
      data: test,
    });
  } catch (error) {
    console.error('Error creating test checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test checklist',
      error: error.message,
    });
  }
});

/**
 * PUT /api/test-management/checklist/:id
 * Update test checklist
 */
router.put('/checklist/:id', authMiddleware, requireRole(['admin', 'doctor']), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id,
    };

    const test = await TestChecklist.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test checklist not found',
      });
    }

    res.json({
      success: true,
      message: 'Test checklist updated successfully',
      data: test,
    });
  } catch (error) {
    console.error('Error updating test checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update test checklist',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/test-management/checklist/:id
 * Delete test checklist (soft delete - set isActive to false)
 */
router.delete('/checklist/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const test = await TestChecklist.findByIdAndUpdate(
      req.params.id,
      { isActive: false, lastModifiedBy: req.user._id },
      { new: true }
    );

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test checklist not found',
      });
    }

    res.json({
      success: true,
      message: 'Test checklist deactivated successfully',
      data: test,
    });
  } catch (error) {
    console.error('Error deleting test checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test checklist',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/checklist/module/:module
 * Get tests by module
 */
router.get('/checklist/module/:module', authMiddleware, async (req, res) => {
  try {
    const { priority } = req.query;
    const tests = await TestChecklist.getTestsByModule(req.params.module, priority);

    res.json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error('Error fetching tests by module:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/checklist/category/:category
 * Get tests by category
 */
router.get('/checklist/category/:category', authMiddleware, async (req, res) => {
  try {
    const tests = await TestChecklist.getTestsByCategory(req.params.category);

    res.json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error('Error fetching tests by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message,
    });
  }
});

// ============================================
// TEST EXECUTION ROUTES
// ============================================

/**
 * POST /api/test-management/execution/assign
 * Assign test to AI or operator
 */
router.post('/execution/assign', authMiddleware, async (req, res) => {
  try {
    const {
      testChecklistId,
      assignmentType, // 'ai' or 'operator'
      assignedTo, // User ID if operator
      testContext,
    } = req.body;

    // Validate test checklist exists
    const testChecklist = await TestChecklist.findById(testChecklistId);
    if (!testChecklist) {
      return res.status(404).json({
        success: false,
        message: 'Test checklist not found',
      });
    }

    // Generate execution ID
    const executionId = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const executionData = {
      testChecklist: testChecklistId,
      executionId,
      assignmentType,
      assignedTo: assignmentType === 'operator' ? assignedTo : null,
      assignedBy: req.user._id,
      testContext: testContext || {},
      status: 'assigned',
    };

    const execution = new TestExecution(executionData);
    await execution.save();

    // Populate for response
    await execution.populate('testChecklist');
    await execution.populate('assignedTo', 'firstName lastName');
    await execution.populate('assignedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: `Test assigned to ${assignmentType}`,
      data: execution,
    });
  } catch (error) {
    console.error('Error assigning test:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign test',
      error: error.message,
    });
  }
});

/**
 * POST /api/test-management/execution/bulk-assign
 * Assign multiple tests at once
 */
router.post('/execution/bulk-assign', authMiddleware, async (req, res) => {
  try {
    const { testChecklistIds, assignmentType, assignedTo, testContext } = req.body;

    const executions = [];

    for (const testId of testChecklistIds) {
      const executionId = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const execution = new TestExecution({
        testChecklist: testId,
        executionId,
        assignmentType,
        assignedTo: assignmentType === 'operator' ? assignedTo : null,
        assignedBy: req.user._id,
        testContext: testContext || {},
        status: 'assigned',
      });

      await execution.save();
      executions.push(execution);
    }

    res.status(201).json({
      success: true,
      message: `${executions.length} tests assigned successfully`,
      data: executions,
    });
  } catch (error) {
    console.error('Error bulk assigning tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign tests',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/execution/my-tests
 * Get tests assigned to current user
 */
router.get('/execution/my-tests', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const tests = await TestExecution.getMyTests(req.user._id, status);

    res.json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error('Error fetching my tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/execution
 * Get all test executions with filters
 */
router.get('/execution', authMiddleware, async (req, res) => {
  try {
    const { status, assignmentType, startDate, endDate } = req.query;

    const query = {};

    if (status) query.status = status;
    if (assignmentType) query.assignmentType = assignmentType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const executions = await TestExecution.find(query)
      .populate('testChecklist')
      .populate('assignedTo', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: executions.length,
      data: executions,
    });
  } catch (error) {
    console.error('Error fetching test executions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test executions',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/execution/:id
 * Get single test execution
 */
router.get('/execution/:id', authMiddleware, async (req, res) => {
  try {
    const execution = await TestExecution.findById(req.params.id)
      .populate('testChecklist')
      .populate('assignedTo', 'firstName lastName')
      .populate('assignedBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName');

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Test execution not found',
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    console.error('Error fetching test execution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test execution',
      error: error.message,
    });
  }
});

/**
 * POST /api/test-management/execution/:id/start
 * Start test execution
 */
router.post('/execution/:id/start', authMiddleware, async (req, res) => {
  try {
    const execution = await TestExecution.findById(req.params.id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Test execution not found',
      });
    }

    // Verify user is assigned to this test
    if (
      execution.assignmentType === 'operator' &&
      execution.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this test',
      });
    }

    await execution.startExecution();

    res.json({
      success: true,
      message: 'Test execution started',
      data: execution,
    });
  } catch (error) {
    console.error('Error starting test execution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start test execution',
      error: error.message,
    });
  }
});

/**
 * POST /api/test-management/execution/:id/complete
 * Complete test execution with results
 */
router.post('/execution/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { testResult, executionNotes, issuesFound } = req.body;

    const execution = await TestExecution.findById(req.params.id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Test execution not found',
      });
    }

    await execution.completeExecution(testResult, executionNotes);

    // Add issues if any
    if (issuesFound && issuesFound.length > 0) {
      for (const issue of issuesFound) {
        await execution.addIssue(issue);
      }
    }

    await execution.populate('testChecklist');

    res.json({
      success: true,
      message: 'Test execution completed',
      data: execution,
    });
  } catch (error) {
    console.error('Error completing test execution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete test execution',
      error: error.message,
    });
  }
});

/**
 * POST /api/test-management/execution/:id/add-issue
 * Add issue to test execution
 */
router.post('/execution/:id/add-issue', authMiddleware, async (req, res) => {
  try {
    const execution = await TestExecution.findById(req.params.id);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Test execution not found',
      });
    }

    await execution.addIssue(req.body);

    res.json({
      success: true,
      message: 'Issue added successfully',
      data: execution,
    });
  } catch (error) {
    console.error('Error adding issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add issue',
      error: error.message,
    });
  }
});

/**
 * POST /api/test-management/execution/:id/review
 * Review test execution results
 */
router.post(
  '/execution/:id/review',
  authMiddleware,
  requireRole(['admin', 'doctor']),
  async (req, res) => {
    try {
      const { reviewStatus, reviewNotes } = req.body;

      const execution = await TestExecution.findByIdAndUpdate(
        req.params.id,
        {
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
          reviewStatus,
          reviewNotes,
        },
        { new: true }
      ).populate('testChecklist');

      if (!execution) {
        return res.status(404).json({
          success: false,
          message: 'Test execution not found',
        });
      }

      res.json({
        success: true,
        message: 'Test execution reviewed',
        data: execution,
      });
    } catch (error) {
      console.error('Error reviewing test execution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review test execution',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/test-management/execution/status/:status
 * Get executions by status
 */
router.get('/execution/status/:status', authMiddleware, async (req, res) => {
  try {
    const { assignmentType } = req.query;
    const executions = await TestExecution.getByStatus(req.params.status, assignmentType);

    res.json({
      success: true,
      count: executions.length,
      data: executions,
    });
  } catch (error) {
    console.error('Error fetching executions by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch executions',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/execution/failed
 * Get all failed tests
 */
router.get('/execution/failed', authMiddleware, async (req, res) => {
  try {
    const { startDate } = req.query;
    const executions = await TestExecution.getFailedTests(startDate ? new Date(startDate) : null);

    res.json({
      success: true,
      count: executions.length,
      data: executions,
    });
  } catch (error) {
    console.error('Error fetching failed tests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed tests',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/execution/needs-review
 * Get tests that need review
 */
router.get('/execution/needs-review', authMiddleware, async (req, res) => {
  try {
    const executions = await TestExecution.getTestsNeedingReview();

    res.json({
      success: true,
      count: executions.length,
      data: executions,
    });
  } catch (error) {
    console.error('Error fetching tests needing review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tests',
      error: error.message,
    });
  }
});

/**
 * GET /api/test-management/statistics
 * Get test execution statistics
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, assignmentType } = req.query;

    const statistics = await TestExecution.getStatistics({
      startDate,
      endDate,
      assignmentType,
    });

    // Calculate additional metrics
    const totalTests = await TestExecution.countDocuments();
    const activeTests = await TestExecution.countDocuments({
      status: { $in: ['assigned', 'in_progress'] },
    });
    const completedTests = await TestExecution.countDocuments({
      status: { $in: ['passed', 'failed'] },
    });

    res.json({
      success: true,
      data: {
        statusBreakdown: statistics,
        summary: {
          total: totalTests,
          active: activeTests,
          completed: completedTests,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

module.exports = router;
