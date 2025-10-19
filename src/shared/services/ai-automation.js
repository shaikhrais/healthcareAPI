const express = require('express');


const AutomationAgent = require('../models/AutomationAgent');
const AutomationTask = require('../models/AutomationTask');
const AutomationWorkflow = require('../models/AutomationWorkflow');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const router = express.Router();
// ============================================
// IDEA TO CODE - MAIN AUTOMATION ENDPOINT
// ============================================

/**
 * POST /api/ai-automation/implement
 * Main endpoint: Convert idea/thought process to implemented code
 * This is the "magic" endpoint that does everything automatically
 */
router.post('/implement', authMiddleware, async (req, res) => {
  try {
    const {
      idea,
      thoughtProcess,
      requirements,
      expectedBehavior,
      complexity,
      priority,
      autoApprove,
    } = req.body;

    // Step 1: Create Workflow
    const workflowId = `WF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const workflow = new AutomationWorkflow({
      workflowId,
      workflowName: idea.substring(0, 50),
      workflowType: 'end-to-end',
      originalRequest: {
        title: idea,
        description: idea,
        thoughtProcess: thoughtProcess || '',
        expectedOutcome: expectedBehavior || '',
        urgency: priority || 'medium',
      },
      settings: {
        autoProgress: true,
        requireHumanApproval: !autoApprove,
        autoDeploy: false,
      },
      createdBy: req.user._id,
    });

    await workflow.save();

    // Step 2: Find orchestrator agent
    const orchestrator = await AutomationAgent.findOne({
      agentType: 'orchestrator',
      status: 'idle',
      isActive: true,
    });

    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'No orchestrator agent available. Please try again later.',
      });
    }

    // Step 3: Start workflow
    await workflow.start();
    await workflow.addLog('info', 'system', 'Workflow initialized', {
      workflowId,
      idea,
      orchestrator: orchestrator.agentId,
    });

    // Step 4: Create analysis task for orchestrator
    const analysisTaskId = `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const analysisTask = new AutomationTask({
      taskId: analysisTaskId,
      taskName: `Analyze and plan: ${idea.substring(0, 40)}...`,
      taskType: 'analysis',
      complexity: complexity || 'moderate',
      priority: priority || 'medium',
      input: {
        description: idea,
        thoughtProcess: thoughtProcess || '',
        requirements: requirements || [],
        expectedBehavior: expectedBehavior || '',
      },
      createdBy: req.user._id,
    });

    await analysisTask.save();

    // Assign to orchestrator
    await analysisTask.assignToAgent(orchestrator._id);
    await orchestrator.assignTask(analysisTask._id);

    // Add to workflow
    workflow.tasks.push(analysisTask._id);
    await workflow.save();

    // Return immediate response
    res.status(202).json({
      success: true,
      message:
        'Implementation request received. AI agents are analyzing and will implement automatically.',
      data: {
        workflowId: workflow.workflowId,
        workflow,
        analysisTask,
        orchestrator: orchestrator.getCapabilitiesSummary(),
        estimatedTime: '5-30 minutes',
        status: 'analyzing',
        nextSteps: [
          'AI will analyze your requirements',
          'Generate implementation plan',
          'Write code automatically',
          'Run tests',
          'Generate documentation',
          autoApprove ? 'Deploy automatically' : 'Request your approval',
        ],
        monitoringEndpoints: {
          workflow: `/api/ai-automation/workflows/${workflow.workflowId}`,
          progress: `/api/ai-automation/workflows/${workflow.workflowId}/progress`,
          logs: `/api/ai-automation/workflows/${workflow.workflowId}/logs`,
        },
      },
    });

    // Note: Actual AI implementation would happen asynchronously
    // This would integrate with OpenAI, Claude, or custom AI models
    // For now, this demonstrates the architecture
  } catch (error) {
    console.error('Error starting automation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start automation',
      error: error.message,
    });
  }
});

// ============================================
// WORKFLOW ROUTES
// ============================================

/**
 * GET /api/ai-automation/workflows
 * Get all workflows
 */
router.get('/workflows', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;

    let workflows;
    if (status) {
      workflows = await AutomationWorkflow.getByStatus(status);
    } else {
      workflows = await AutomationWorkflow.find({ isArchived: false })
        .populate('createdBy', 'firstName lastName')
        .populate('agents.agent')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      count: workflows.length,
      data: workflows,
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/workflows/:workflowId
 * Get specific workflow
 */
router.get('/workflows/:workflowId', authMiddleware, async (req, res) => {
  try {
    const workflow = await AutomationWorkflow.findOne({
      workflowId: req.params.workflowId,
    })
      .populate('createdBy', 'firstName lastName')
      .populate('agents.agent')
      .populate('tasks');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/workflows/:workflowId/progress
 * Get workflow progress
 */
router.get('/workflows/:workflowId/progress', authMiddleware, async (req, res) => {
  try {
    const workflow = await AutomationWorkflow.findOne({
      workflowId: req.params.workflowId,
    }).populate('tasks');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      data: {
        workflowId: workflow.workflowId,
        status: workflow.status,
        progress: workflow.progress,
        currentPhase: workflow.phases[workflow.currentPhase],
        timeline: workflow.timeline,
        completionPercentage: workflow.completionPercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/workflows/:workflowId/logs
 * Get workflow logs
 */
router.get('/workflows/:workflowId/logs', authMiddleware, async (req, res) => {
  try {
    const { level, limit = 100 } = req.query;

    const workflow = await AutomationWorkflow.findOne({
      workflowId: req.params.workflowId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    let { logs } = workflow;

    if (level) {
      logs = logs.filter((log) => log.level === level);
    }

    // Get most recent logs
    logs = logs.slice(-parseInt(limit, 10));

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai-automation/workflows/:workflowId/approve
 * Approve workflow output
 */
router.post('/workflows/:workflowId/approve', authMiddleware, async (req, res) => {
  try {
    const { feedback, rating } = req.body;

    const workflow = await AutomationWorkflow.findOne({
      workflowId: req.params.workflowId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    workflow.validation.humanReview.completed = true;
    workflow.validation.humanReview.reviewedBy = req.user._id;
    workflow.validation.humanReview.reviewedAt = new Date();
    workflow.validation.humanReview.approved = true;
    workflow.validation.humanReview.feedback = feedback || '';
    workflow.validation.humanReview.score = rating || 5;

    await workflow.save();
    await workflow.addLog('info', 'human', `Workflow approved by ${req.user.firstName}`);

    res.json({
      success: true,
      message: 'Workflow approved successfully',
      data: workflow,
    });
  } catch (error) {
    console.error('Error approving workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai-automation/workflows/:workflowId/pause
 * Pause workflow execution
 */
router.post('/workflows/:workflowId/pause', authMiddleware, async (req, res) => {
  try {
    const workflow = await AutomationWorkflow.findOne({
      workflowId: req.params.workflowId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    await workflow.pause();
    await workflow.addLog('info', 'human', `Workflow paused by ${req.user.firstName}`);

    res.json({
      success: true,
      message: 'Workflow paused',
      data: workflow,
    });
  } catch (error) {
    console.error('Error pausing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai-automation/workflows/:workflowId/resume
 * Resume paused workflow
 */
router.post('/workflows/:workflowId/resume', authMiddleware, async (req, res) => {
  try {
    const workflow = await AutomationWorkflow.findOne({
      workflowId: req.params.workflowId,
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    await workflow.resume();
    await workflow.addLog('info', 'human', `Workflow resumed by ${req.user.firstName}`);

    res.json({
      success: true,
      message: 'Workflow resumed',
      data: workflow,
    });
  } catch (error) {
    console.error('Error resuming workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume workflow',
      error: error.message,
    });
  }
});

// ============================================
// AGENT ROUTES
// ============================================

/**
 * GET /api/ai-automation/agents
 * Get all agents
 */
router.get('/agents', authMiddleware, async (req, res) => {
  try {
    const { agentType, status, specialization } = req.query;

    const query = { isActive: true };
    if (agentType) query.agentType = agentType;
    if (status) query.status = status;
    if (specialization) query['capabilities.specializations'] = specialization;

    const agents = await AutomationAgent.find(query).sort({ 'metrics.qualityScore': -1 });

    res.json({
      success: true,
      count: agents.length,
      data: agents,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/agents/:agentId
 * Get specific agent
 */
router.get('/agents/:agentId', authMiddleware, async (req, res) => {
  try {
    const agent = await AutomationAgent.findOne({
      agentId: req.params.agentId,
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent',
      error: error.message,
    });
  }
});

/**
 * POST /api/ai-automation/agents
 * Create new agent
 */
router.post('/agents', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const agentData = {
      ...req.body,
      createdBy: req.user._id,
    };

    if (!agentData.agentId) {
      agentData.agentId = `AGENT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    const agent = new AutomationAgent(agentData);
    await agent.save();

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: agent,
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/agents/available
 * Get available agents for assignment
 */
router.get('/agents/available', authMiddleware, async (req, res) => {
  try {
    const { agentType, specialization, language } = req.query;

    const agents = await AutomationAgent.findAvailableAgents({
      agentType,
      specialization,
      language,
    });

    res.json({
      success: true,
      count: agents.length,
      data: agents.map((agent) => agent.getCapabilitiesSummary()),
    });
  } catch (error) {
    console.error('Error fetching available agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available agents',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/agents/top-performers
 * Get top performing agents
 */
router.get('/agents/top-performers', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const agents = await AutomationAgent.getTopPerformers(parseInt(limit, 10));

    res.json({
      success: true,
      count: agents.length,
      data: agents,
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performers',
      error: error.message,
    });
  }
});

// ============================================
// TASK ROUTES
// ============================================

/**
 * GET /api/ai-automation/tasks
 * Get all tasks
 */
router.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const { status, taskType, complexity } = req.query;

    const query = { isArchived: false };
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (complexity) query.complexity = complexity;

    const tasks = await AutomationTask.find(query)
      .populate('assignedAgent')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/tasks/:taskId
 * Get specific task
 */
router.get('/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await AutomationTask.findOne({
      taskId: req.params.taskId,
    })
      .populate('assignedAgent')
      .populate('createdBy', 'firstName lastName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-automation/tasks/pending
 * Get pending tasks
 */
router.get('/tasks/pending', authMiddleware, async (req, res) => {
  try {
    const tasks = await AutomationTask.getPendingTasks();

    res.json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending tasks',
      error: error.message,
    });
  }
});

// ============================================
// STATISTICS & MONITORING
// ============================================

/**
 * GET /api/ai-automation/statistics
 * Get automation statistics
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const workflowStats = await AutomationWorkflow.getStatistics();
    const taskStats = await AutomationTask.getStatistics();

    const totalAgents = await AutomationAgent.countDocuments({ isActive: true });
    const idleAgents = await AutomationAgent.countDocuments({ status: 'idle', isActive: true });
    const busyAgents = await AutomationAgent.countDocuments({ status: 'busy', isActive: true });

    const totalWorkflows = await AutomationWorkflow.countDocuments({ isArchived: false });
    const activeWorkflows = await AutomationWorkflow.countDocuments({
      status: { $in: ['analyzing', 'planning', 'executing', 'testing', 'reviewing'] },
      isArchived: false,
    });

    res.json({
      success: true,
      data: {
        workflows: {
          total: totalWorkflows,
          active: activeWorkflows,
          breakdown: workflowStats,
        },
        tasks: {
          breakdown: taskStats,
        },
        agents: {
          total: totalAgents,
          idle: idleAgents,
          busy: busyAgents,
          utilizationRate: totalAgents > 0 ? Math.round((busyAgents / totalAgents) * 100) : 0,
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

/**
 * GET /api/ai-automation/dashboard
 * Get automation dashboard data
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const activeWorkflows = await AutomationWorkflow.getActiveWorkflows();
    const recentlyCompleted = await AutomationWorkflow.find({
      status: 'completed',
      isArchived: false,
    })
      .sort({ 'timeline.completedAt': -1 })
      .limit(5)
      .populate('createdBy', 'firstName lastName');

    const topAgents = await AutomationAgent.getTopPerformers(5);

    const pendingTasks = await AutomationTask.getPendingTasks();

    res.json({
      success: true,
      data: {
        activeWorkflows,
        recentlyCompleted,
        topPerformingAgents: topAgents.map((a) => a.getCapabilitiesSummary()),
        pendingTasksCount: pendingTasks.length,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard',
      error: error.message,
    });
  }
});

module.exports = router;
