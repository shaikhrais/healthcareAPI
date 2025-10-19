/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         projectId:
 *           type: string
 *           description: Unique project identifier
 *         projectName:
 *           type: string
 *           description: Project name
 *         description:
 *           type: string
 *           description: Project description
 *         status:
 *           type: string
 *           enum: [planning, active, on-hold, completed, cancelled]
 *           description: Current project status
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *           description: Project priority level
 *         healthStatus:
 *           type: string
 *           enum: [green, yellow, red]
 *           description: Project health indicator
 *         department:
 *           type: string
 *           description: Associated department
 *         projectOwner:
 *           type: string
 *           description: Project owner user ID
 *         projectManager:
 *           type: string
 *           description: Project manager user ID
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         budget:
 *           type: object
 *           properties:
 *             allocated:
 *               type: number
 *             spent:
 *               type: number
 *             remaining:
 *               type: number
 *         progress:
 *           type: object
 *           properties:
 *             percentage:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *             completedTasks:
 *               type: integer
 *             totalTasks:
 *               type: integer
 *         teamMembers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               role:
 *                 type: string
 *               allocation:
 *                 type: number
 *         risks:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProjectRisk'
 *         issues:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProjectIssue'
 *         isArchived:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     ProjectStage:
 *       type: object
 *       properties:
 *         stageId:
 *           type: string
 *         stageName:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [not-started, in-progress, completed, blocked]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         dependencies:
 *           type: array
 *           items:
 *             type: string
 *         deliverables:
 *           type: array
 *           items:
 *             type: string
 *         milestones:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *               completed:
 *                 type: boolean
 *         progress:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 * 
 *     ProjectRisk:
 *       type: object
 *       properties:
 *         riskId:
 *           type: string
 *         description:
 *           type: string
 *         probability:
 *           type: string
 *           enum: [low, medium, high]
 *         impact:
 *           type: string
 *           enum: [low, medium, high]
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         mitigation:
 *           type: string
 *         mitigationOwner:
 *           type: string
 *         status:
 *           type: string
 *           enum: [identified, assessed, mitigated, closed]
 * 
 *     ProjectIssue:
 *       type: object
 *       properties:
 *         issueId:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         status:
 *           type: string
 *           enum: [open, in-progress, resolved, closed]
 *         assignedTo:
 *           type: string
 *         resolution:
 *           type: string
 *         createdDate:
 *           type: string
 *           format: date-time
 *         resolvedDate:
 *           type: string
 *           format: date-time
 * 
 *     ProjectReport:
 *       type: object
 *       properties:
 *         reportId:
 *           type: string
 *         reportType:
 *           type: string
 *           enum: [status, milestone, budget, risk, performance]
 *         title:
 *           type: string
 *         period:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *         data:
 *           type: object
 *           description: Report-specific data and metrics
 *         generatedBy:
 *           type: string
 *         generatedAt:
 *           type: string
 *           format: date-time
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * security:
 *   - bearerAuth: []
 * 
 * tags:
 *   - name: Project Management
 *     description: Project lifecycle management operations
 *   - name: Project Stages
 *     description: Project stage and milestone management
 *   - name: Project Reports
 *     description: Project reporting and analytics
 *   - name: Project Dashboard
 *     description: Project dashboard and overview operations
 */

const express = require('express');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const ProjectReport = require('../models/ProjectReport');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const router = express.Router();
// ============================================
// PROJECT ROUTES
// ============================================

/**
 * @swagger
 * /api/administration/project-management/projects:
 *   get:
 *     summary: Get all projects with filters
 *     description: Retrieve a list of projects with optional filtering by status, priority, department, health status, and search parameters
 *     tags:
 *       - Project Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, on-hold, completed, cancelled]
 *         description: Filter by project status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by project priority
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: healthStatus
 *         schema:
 *           type: string
 *           enum: [green, yellow, red]
 *         description: Filter by project health status
 *       - in: query
 *         name: projectOwner
 *         schema:
 *           type: string
 *         description: Filter by project owner ID
 *       - in: query
 *         name: projectManager
 *         schema:
 *           type: string
 *         description: Filter by project manager ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in project name, ID, or description
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of projects returned
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/projects', authMiddleware, async (req, res) => {
  try {
    const { status, priority, department, healthStatus, projectOwner, projectManager, search } =
      req.query;

    const query = { isArchived: false };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.department = department;
    if (healthStatus) query.healthStatus = healthStatus;
    if (projectOwner) query.projectOwner = projectOwner;
    if (projectManager) query.projectManager = projectManager;

    if (search) {
      query.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { projectId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Project.find(query)
      .populate('projectOwner', 'firstName lastName email')
      .populate('projectManager', 'firstName lastName email')
      .populate('currentStage')
      .populate('teamMembers.user', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/project-management/projects/{id}:
 *   get:
 *     summary: Get single project by ID
 *     description: Retrieve detailed information about a specific project including team members, stakeholders, risks, and issues
 *     tags:
 *       - Project Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('projectOwner', 'firstName lastName email')
      .populate('projectManager', 'firstName lastName email')
      .populate('currentStage')
      .populate('teamMembers.user', 'firstName lastName email')
      .populate('stakeholders.user', 'firstName lastName email')
      .populate('risks.mitigationOwner', 'firstName lastName')
      .populate('issues.assignedTo', 'firstName lastName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/project-management/projects:
 *   post:
 *     summary: Create new project
 *     description: Create a new project with comprehensive details including budget, timeline, and team assignment. Requires admin or doctor role.
 *     tags:
 *       - Project Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *               - description
 *               - projectOwner
 *               - projectManager
 *             properties:
 *               projectName:
 *                 type: string
 *                 description: Project name
 *                 example: "Electronic Health Records Upgrade"
 *               description:
 *                 type: string
 *                 description: Project description
 *               department:
 *                 type: string
 *                 description: Associated department
 *               projectOwner:
 *                 type: string
 *                 description: Project owner user ID
 *               projectManager:
 *                 type: string
 *                 description: Project manager user ID
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Project priority
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: object
 *                 properties:
 *                   allocated:
 *                     type: number
 *               teamMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: string
 *                     role:
 *                       type: string
 *                     allocation:
 *                       type: number
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Project created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Invalid project data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/projects', authMiddleware, requireRole(['admin', 'doctor']), async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      createdBy: req.user._id,
    };

    // Auto-generate project ID if not provided
    if (!projectData.projectId) {
      projectData.projectId = `PROJ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    const project = new Project(projectData);
    await project.save();

    await project.populate('projectOwner', 'firstName lastName email');
    await project.populate('projectManager', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/project-management/projects/{id}:
 *   put:
 *     summary: Update project
 *     description: Update an existing project with new information including status, budget, timeline, and team changes
 *     tags:
 *       - Project Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planning, active, on-hold, completed, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               healthStatus:
 *                 type: string
 *                 enum: [green, yellow, red]
 *               endDate:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: object
 *                 properties:
 *                   allocated:
 *                     type: number
 *                   spent:
 *                     type: number
 *               progress:
 *                 type: object
 *                 properties:
 *                   percentage:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Project updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Invalid update data
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.put('/projects/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id,
      lastUpdated: new Date(),
    };

    const project = await Project.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('projectOwner', 'firstName lastName email')
      .populate('projectManager', 'firstName lastName email')
      .populate('currentStage');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/project-management/projects/:id
 * Archive project (soft delete)
 */
router.delete('/projects/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        lastModifiedBy: req.user._id,
      },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project archived successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive project',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/projects/owner/:userId
 * Get projects by owner
 */
router.get('/projects/owner/:userId', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const projects = await Project.getByOwner(req.params.userId, status);

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects by owner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/projects/manager/:userId
 * Get projects by manager
 */
router.get('/projects/manager/:userId', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const projects = await Project.getByManager(req.params.userId, status);

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects by manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/projects/stakeholder/:userId
 * Get projects where user is a stakeholder
 */
router.get('/projects/stakeholder/:userId', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.getByStakeholder(req.params.userId);

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects for stakeholder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/project-management/projects/active:
 *   get:
 *     summary: Get all active projects
 *     description: Retrieve all projects with active status for dashboard and management overview
 *     tags:
 *       - Project Management
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/projects/active', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.getActiveProjects();

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching active projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active projects',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/projects/at-risk
 * Get projects at risk
 */
router.get('/projects/at-risk', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.getAtRiskProjects();

    res.json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching at-risk projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch at-risk projects',
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/administration/project-management/projects/{id}/team-member:
 *   post:
 *     summary: Add team member to project
 *     description: Add a new team member to an existing project with specified role and allocation percentage
 *     tags:
 *       - Project Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to add as team member
 *               role:
 *                 type: string
 *                 description: Team member role
 *                 example: "Developer"
 *               allocation:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Percentage allocation to project
 *                 example: 75
 *     responses:
 *       200:
 *         description: Team member added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Team member added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Bad request - Invalid team member data
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.post('/projects/:id/team-member', authMiddleware, async (req, res) => {
  try {
    const { userId, role, allocation } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    await project.addTeamMember(userId, role, allocation);

    res.json({
      success: true,
      message: 'Team member added successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member',
      error: error.message,
    });
  }
});

/**
 * POST /api/project-management/projects/:id/risk
 * Add risk to project
 */
router.post('/projects/:id/risk', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    await project.addRisk(req.body);

    res.json({
      success: true,
      message: 'Risk added successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error adding risk:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add risk',
      error: error.message,
    });
  }
});

/**
 * POST /api/project-management/projects/:id/issue
 * Add issue to project
 */
router.post('/projects/:id/issue', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    await project.addIssue(req.body);

    res.json({
      success: true,
      message: 'Issue added successfully',
      data: project,
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
 * POST /api/project-management/projects/:id/update-progress
 * Update project progress
 */
router.post('/projects/:id/update-progress', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    await project.updateProgress();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      data: project,
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message,
    });
  }
});

// ============================================
// PROJECT STAGE ROUTES
// ============================================

/**
 * @swagger
 * /api/administration/project-management/projects/{projectId}/stages:
 *   get:
 *     summary: Get all stages for a project
 *     description: Retrieve all stages for a specific project including progress, milestones, and dependencies
 *     tags:
 *       - Project Stages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project stages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProjectStage'
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/projects/:projectId/stages', authMiddleware, async (req, res) => {
  try {
    const stages = await ProjectStage.getByProject(req.params.projectId);

    res.json({
      success: true,
      count: stages.length,
      data: stages,
    });
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stages',
      error: error.message,
    });
  }
});

/**
 * POST /api/project-management/projects/:projectId/stages
 * Create new stage for project
 */
router.post('/projects/:projectId/stages', authMiddleware, async (req, res) => {
  try {
    const stageData = {
      ...req.body,
      project: req.params.projectId,
      createdBy: req.user._id,
    };

    const stage = new ProjectStage(stageData);
    await stage.save();

    res.status(201).json({
      success: true,
      message: 'Stage created successfully',
      data: stage,
    });
  } catch (error) {
    console.error('Error creating stage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stage',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/stages/:id
 * Get single stage
 */
router.get('/stages/:id', authMiddleware, async (req, res) => {
  try {
    const stage = await ProjectStage.findById(req.params.id)
      .populate('project', 'projectName projectId')
      .populate('assignedTeam.user', 'firstName lastName')
      .populate('gateReview.reviewedBy', 'firstName lastName');

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    res.json({
      success: true,
      data: stage,
    });
  } catch (error) {
    console.error('Error fetching stage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stage',
      error: error.message,
    });
  }
});

/**
 * PUT /api/project-management/stages/:id
 * Update stage
 */
router.put('/stages/:id', authMiddleware, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id,
    };

    const stage = await ProjectStage.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    res.json({
      success: true,
      message: 'Stage updated successfully',
      data: stage,
    });
  } catch (error) {
    console.error('Error updating stage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stage',
      error: error.message,
    });
  }
});

/**
 * POST /api/project-management/stages/:id/start
 * Start stage execution
 */
router.post('/stages/:id/start', authMiddleware, async (req, res) => {
  try {
    const stage = await ProjectStage.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    await stage.startStage(req.user._id);

    // Update project's current stage
    await Project.findByIdAndUpdate(stage.project, {
      currentStage: stage._id,
    });

    res.json({
      success: true,
      message: 'Stage started successfully',
      data: stage,
    });
  } catch (error) {
    console.error('Error starting stage:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/project-management/stages/:id/complete
 * Complete stage
 */
router.post('/stages/:id/complete', authMiddleware, async (req, res) => {
  try {
    const stage = await ProjectStage.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    await stage.completeStage(req.user._id);

    res.json({
      success: true,
      message: 'Stage completed successfully',
      data: stage,
    });
  } catch (error) {
    console.error('Error completing stage:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/project-management/stages/:id/milestone
 * Add milestone to stage
 */
router.post('/stages/:id/milestone', authMiddleware, async (req, res) => {
  try {
    const stage = await ProjectStage.findById(req.params.id);
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    await stage.addMilestone(req.body);

    res.json({
      success: true,
      message: 'Milestone added successfully',
      data: stage,
    });
  } catch (error) {
    console.error('Error adding milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add milestone',
      error: error.message,
    });
  }
});

// ============================================
// REPORTING ROUTES
// ============================================

/**
 * @swagger
 * /api/administration/project-management/reports:
 *   get:
 *     summary: Get all project reports with filters
 *     description: Retrieve project reports with optional filtering by type, project, date range, and other criteria
 *     tags:
 *       - Project Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [status, milestone, budget, risk, performance]
 *         description: Filter by report type
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report period
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProjectReport'
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    const { project, reportType, status } = req.query;

    const query = {};
    if (project) query.project = project;
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const reports = await ProjectReport.find(query)
      .populate('project', 'projectName projectId')
      .populate('generatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/reports/:id
 * Get single report
 */
router.get('/reports/:id', authMiddleware, async (req, res) => {
  try {
    const report = await ProjectReport.findById(req.params.id)
      .populate('project')
      .populate('generatedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('distribution.recipients', 'firstName lastName email')
      .populate('risksAndIssues.topRisks.owner', 'firstName lastName')
      .populate('risksAndIssues.topIssues.assignedTo', 'firstName lastName');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Mark as viewed
    await report.markAsViewed(req.user._id);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message,
    });
  }
});

/**
 * POST /api/project-management/reports/generate
 * Generate new report
 */
router.post('/reports/generate', authMiddleware, async (req, res) => {
  try {
    const { projectId, reportType } = req.body;

    let report;

    if (reportType === 'executive-summary') {
      report = await ProjectReport.generateExecutiveSummary(projectId, req.user._id);
    } else {
      // Create custom report
      const reportData = {
        ...req.body,
        generatedBy: req.user._id,
      };

      if (!reportData.reportId) {
        reportData.reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      }

      report = new ProjectReport(reportData);
      await report.save();
    }

    await report.populate('project', 'projectName projectId');

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message,
    });
  }
});

/**
 * POST /api/project-management/reports/:id/publish
 * Publish report
 */
router.post(
  '/reports/:id/publish',
  authMiddleware,
  requireRole(['admin', 'doctor']),
  async (req, res) => {
    try {
      const report = await ProjectReport.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      await report.publish(req.user._id);

      res.json({
        success: true,
        message: 'Report published successfully',
        data: report,
      });
    } catch (error) {
      console.error('Error publishing report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish report',
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/project-management/reports/:id/approve
 * Approve report
 */
router.post(
  '/reports/:id/approve',
  authMiddleware,
  requireRole(['admin', 'doctor']),
  async (req, res) => {
    try {
      const report = await ProjectReport.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      await report.approve(req.user._id);

      res.json({
        success: true,
        message: 'Report approved successfully',
        data: report,
      });
    } catch (error) {
      console.error('Error approving report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve report',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/project-management/reports/project/:projectId
 * Get reports for specific project
 */
router.get('/reports/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const { reportType } = req.query;
    const reports = await ProjectReport.getByProject(req.params.projectId, reportType);

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching project reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
});

/**
 * GET /api/project-management/reports/stakeholder/:userId
 * Get reports for stakeholder
 */
router.get('/reports/stakeholder/:userId', authMiddleware, async (req, res) => {
  try {
    const reports = await ProjectReport.getForStakeholder(req.params.userId);

    res.json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error('Error fetching stakeholder reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message,
    });
  }
});

// ============================================
// EXECUTIVE DASHBOARD & STATISTICS
// ============================================

/**
 * GET /api/project-management/dashboard/executive
 * Get executive dashboard data
 */
router.get(
  '/dashboard/executive',
  authMiddleware,
  requireRole(['admin', 'doctor']),
  async (req, res) => {
    try {
      const { department } = req.query;

      // Get executive summary
      const summary = await Project.getExecutiveSummary({ department });

      // Get active projects count
      const activeProjects = await Project.countDocuments({
        status: 'active',
        isArchived: false,
      });

      // Get at-risk projects
      const atRiskProjects = await Project.getAtRiskProjects();

      // Get overbudget projects
      const overbudgetProjects = await Project.getOverbudgetProjects();

      // Get total budget stats
      const budgetStats = await Project.aggregate([
        { $match: { isArchived: false, status: { $in: ['planning', 'active'] } } },
        {
          $group: {
            _id: null,
            totalBudget: { $sum: '$budget.total' },
            totalSpent: { $sum: '$budget.spent' },
            totalRemaining: { $sum: '$budget.remaining' },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          summary,
          activeProjectsCount: activeProjects,
          atRiskProjectsCount: atRiskProjects.length,
          overbudgetProjectsCount: overbudgetProjects.length,
          budgetStats: budgetStats[0] || {
            totalBudget: 0,
            totalSpent: 0,
            totalRemaining: 0,
          },
          atRiskProjects: atRiskProjects.slice(0, 5), // Top 5
          overbudgetProjects: overbudgetProjects.slice(0, 5), // Top 5
        },
      });
    } catch (error) {
      console.error('Error fetching executive dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/administration/project-management/dashboard/manager:
 *   get:
 *     summary: Get project manager dashboard
 *     description: Retrieve comprehensive dashboard data for project managers including active projects, team performance, upcoming milestones, and key metrics
 *     tags:
 *       - Project Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeProjects:
 *                       type: integer
 *                       description: Number of active projects
 *                     totalBudget:
 *                       type: number
 *                       description: Total allocated budget
 *                     overdueProjects:
 *                       type: integer
 *                       description: Number of overdue projects
 *                     teamUtilization:
 *                       type: number
 *                       description: Team utilization percentage
 *                     upcomingMilestones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectName:
 *                             type: string
 *                           milestone:
 *                             type: string
 *                           dueDate:
 *                             type: string
 *                             format: date
 *                     riskProjects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectId:
 *                             type: string
 *                           projectName:
 *                             type: string
 *                           healthStatus:
 *                             type: string
 *                             enum: [red, yellow]
 *                     recentActivities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           activity:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/manager', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get projects managed by user
    const myProjects = await Project.getByManager(userId);

    // Count by status
    const statusCounts = myProjects.reduce((acc, proj) => {
      acc[proj.status] = (acc[proj.status] || 0) + 1;
      return acc;
    }, {});

    // Get overdue projects
    const overdueProjects = myProjects.filter((p) => {
      if (!p.plannedEndDate || p.status === 'completed') return false;
      return new Date() > new Date(p.plannedEndDate);
    });

    // Get projects with critical issues
    const criticalIssueProjects = myProjects.filter((p) =>
      p.issues.some((i) => i.severity === 'critical' && i.status === 'open')
    );

    res.json({
      success: true,
      data: {
        totalProjects: myProjects.length,
        statusBreakdown: statusCounts,
        overdueProjects: overdueProjects.length,
        criticalIssueProjects: criticalIssueProjects.length,
        projects: myProjects,
      },
    });
  } catch (error) {
    console.error('Error fetching manager dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message,
    });
  }
});

module.exports = router;
