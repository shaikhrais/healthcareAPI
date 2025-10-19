const express = require('express');


const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const router = express.Router();
// Helper function to generate tech stack based on task context
function generateTechStack(title, tags = []) {
  const techMap = {
    authentication: ['JWT', 'bcrypt', 'Passport.js'],
    backend: ['Node.js', 'Express', 'MongoDB'],
    frontend: ['React Native', 'Expo', 'Redux'],
    security: ['bcrypt', 'helmet', 'rate-limiting'],
    docker: ['Docker', 'Docker Compose'],
    cicd: ['GitHub Actions', 'Jest'],
    database: ['MongoDB', 'Mongoose'],
    api: ['REST API', 'Express', 'Swagger'],
    mobile: ['React Native', 'Expo', 'AsyncStorage'],
  };

  let stack = [];
  tags.forEach((tag) => {
    if (techMap[tag]) {
      stack = stack.concat(techMap[tag]);
    }
  });

  // Add defaults if empty
  if (stack.length === 0) {
    stack = ['Node.js', 'React Native', 'MongoDB'];
  }

  return [...new Set(stack)]; // Remove duplicates
}

// Helper function to generate acceptance criteria
function generateAcceptanceCriteria(title) {
  return `${title} is implemented → All features work correctly → Tests pass → Documentation complete`;
}

// Update ALL existing tasks with technical details (from HTML or generated)
router.post('/', async (req, res) => {
  try {
    console.log('Updating ALL tasks with technical details...');

    let updatedCount = 0;

    // Get ALL tasks from database
    const allTasks = await Task.find({});
    console.log(`Found ${allTasks.length} total tasks to update`);

    // Sprint 2 Tasks (from HTML documentation)
    const sprint2Updates = [
      {
        title: 'Role-Based Access Control (RBAC)',
        technicalDetails: {
          whatItDoes:
            'Implements RBAC system with roles (Admin, Doctor, Nurse, Receptionist, Patient) and granular permissions. Controls access to features based on user roles.',
          techStack: ['Permission middleware', 'role hierarchy', 'database role models'],
          acceptanceCriteria:
            'Roles assigned → Permissions enforced → Unauthorized access blocked → Admin can manage roles',
        },
      },
      {
        title: 'User Management Interface',
        technicalDetails: {
          whatItDoes:
            'Creates Express middleware to check permissions on every protected route. Validates JWT tokens and verifies user has required permissions.',
          techStack: ['Express middleware', 'JWT verification'],
          acceptanceCriteria:
            'Protected routes check permissions → 403 if unauthorized → Different access levels work',
        },
      },
      {
        title: 'Audit Logging System',
        technicalDetails: {
          whatItDoes:
            'CRUD operations for user profiles. Users can view/edit their profiles, upload profile pictures, update personal information.',
          techStack: ['File upload (Multer)', 'image processing', 'profile API'],
          acceptanceCriteria: 'View profile → Update info → Upload photo → Changes saved',
        },
      },
      {
        title: 'Session Management',
        technicalDetails: {
          whatItDoes:
            'Implements 2FA using TOTP (Time-based One-Time Password). Users can enable 2FA, scan QR codes with authenticator apps, and verify with 6-digit codes.',
          techStack: ['Speakeasy (TOTP)', 'QR code generation'],
          acceptanceCriteria: 'Enable 2FA → Scan QR → Enter code → Login requires 2FA',
        },
      },
      {
        title: 'Two-Factor Authentication (2FA)',
        technicalDetails: {
          whatItDoes:
            'Enforces strong password requirements: minimum length, complexity rules, password history, expiration policies.',
          techStack: ['Password validation', 'bcrypt', 'policy enforcement'],
          acceptanceCriteria:
            "Weak passwords rejected → Must meet complexity → Can't reuse old passwords",
        },
      },
    ];

    // Update Sprint 2 tasks from HTML
    for (const update of sprint2Updates) {
      const result = await Task.findOneAndUpdate(
        { title: update.title, sprintNumber: 2 },
        { $set: { technicalDetails: update.technicalDetails } },
        { new: true }
      );
      if (result) updatedCount += 1;
    }

    // Update remaining tasks with generated technical details
    for (const task of allTasks) {
      // Skip if already has technical details
      if (task.technicalDetails && Object.keys(task.technicalDetails).length > 0) {
        continue;
      }

      // Generate technical details based on task title and description
      const generatedDetails = {
        whatItDoes: task.description || `Implements ${task.title} functionality`,
        techStack: generateTechStack(task.title, task.tags),
        acceptanceCriteria: generateAcceptanceCriteria(task.title),
        implementation: `Build ${task.title} with best practices and modern architecture`,
      };

      await Task.findByIdAndUpdate(task._id, { $set: { technicalDetails: generatedDetails } });
      updatedCount += 1;
    }

    // Update ALL sprints with technical overview
    const allSprints = await Sprint.find({});

    // Predefined sprint technical details from HTML
    const sprintUpdates = [
      {
        sprintNumber: 2,
        technicalDetails: {
          focus: 'User Management & Authorization',
          goal: 'Implement role-based access control (RBAC) and advanced user management features including multi-factor authentication',
          keyTechnologies: ['Express middleware', 'JWT', 'TOTP', 'bcrypt', 'Role hierarchy'],
          deliverables: [
            'Role-Based Access Control System',
            'Permission Middleware',
            'User Profile Management',
            'Multi-Factor Authentication',
            'Password Security Policies',
          ],
        },
      },
      {
        sprintNumber: 3,
        technicalDetails: {
          focus: 'Patient Management Part 1',
          goal: 'Build comprehensive patient profile management system with demographics, medical history, and insurance information tracking',
          keyTechnologies: [
            'React Native forms',
            'MongoDB nested documents',
            'Image upload',
            'Text search indexes',
          ],
          deliverables: [
            'Patient Profile Creation',
            'Medical History Tracking',
            'Insurance Information Management',
            'Patient Search & Filtering',
          ],
        },
      },
    ];

    // Update Sprint technical details from HTML
    for (const sprintUpdate of sprintUpdates) {
      await Sprint.findOneAndUpdate(
        { sprintNumber: sprintUpdate.sprintNumber },
        { $set: { technicalDetails: sprintUpdate.technicalDetails } },
        { new: true }
      );
    }

    // Generate technical details for remaining sprints
    for (const sprint of allSprints) {
      if (!sprint.technicalDetails || Object.keys(sprint.technicalDetails).length === 0) {
        await Sprint.findByIdAndUpdate(sprint._id, {
          $set: {
            technicalDetails: {
              focus: sprint.name || sprint.focus || `Sprint ${sprint.sprintNumber}`,
              goal: sprint.focus || `Complete Sprint ${sprint.sprintNumber} objectives`,
              keyTechnologies: ['Node.js', 'React Native', 'MongoDB', 'Express'],
              deliverables: [`Sprint ${sprint.sprintNumber} deliverables`],
            },
          },
        });
      }
    }

    // Count all tasks with technical details
    const tasksWithDetails = await Task.countDocuments({
      technicalDetails: { $exists: true, $ne: null },
    });

    const sprintsWithDetails = await Sprint.countDocuments({
      technicalDetails: { $exists: true, $ne: null },
    });

    res.status(200).json({
      message: 'All technical details updated successfully',
      stats: {
        tasksUpdatedNow: updatedCount,
        totalTasksWithDetails: tasksWithDetails,
        totalSprintsWithDetails: sprintsWithDetails,
        totalTasks: allTasks.length,
        totalSprints: allSprints.length,
      },
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      error: 'Failed to update all technical details',
      details: error.message,
    });
  }
});

module.exports = router;
