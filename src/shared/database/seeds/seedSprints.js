const mongoose = require('mongoose');
const Sprint = require('../models/Sprint');
const DevelopmentTask = require('../models/DevelopmentTask');
// eslint-disable-next-line no-unused-vars
require('dotenv').config();

/**
 * Comprehensive Sprint and Task Seeding Script
 * Seeds all 18 sprints with 387 tasks from the CloneJane development plan
 */

// Helper function to calculate dates
const getSprintDates = (sprintNumber) => {
  const startDate = new Date('2025-01-06'); // Project start date
  const sprintStartDate = new Date(startDate);
  sprintStartDate.setDate(startDate.getDate() + (sprintNumber - 1) * 14);

  const sprintEndDate = new Date(sprintStartDate);
  sprintEndDate.setDate(sprintStartDate.getDate() + 13); // 14 days total (0-13)

  return { startDate: sprintStartDate, endDate: sprintEndDate };
};

const sprintsData = [
  // ============================================================================
  // SPRINT 1: Foundation & Authentication (Week 1-2)
  // ============================================================================
  {
    sprintNumber: 1,
    name: 'Sprint 1: Foundation & Authentication',
    status: 'planning',
    duration: 14,
    focus: 'Authentication & Infrastructure',
    modules: ['Authentication', 'Infrastructure', 'DevOps'],
    goals: [
      {
        description: 'Complete user authentication system',
        priority: 'critical',
        completed: false,
      },
      { description: 'Set up development infrastructure', priority: 'critical', completed: false },
      { description: 'Implement JWT token management', priority: 'critical', completed: false },
      { description: 'Configure CI/CD pipeline', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 89,
      totalStoryPoints: 89,
    },
    notes: 'Foundation sprint - critical for all subsequent work',
  },

  // ============================================================================
  // SPRINT 2: User Management & Authorization (Week 3-4)
  // ============================================================================
  {
    sprintNumber: 2,
    name: 'Sprint 2: User Management & Authorization',
    status: 'planning',
    duration: 14,
    focus: 'User Management & Role-Based Access',
    modules: ['User Management', 'Authorization'],
    goals: [
      { description: 'Complete RBAC system', priority: 'critical', completed: false },
      { description: 'User profile management', priority: 'high', completed: false },
      { description: 'Multi-factor authentication', priority: 'high', completed: false },
      { description: 'Team management features', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 65,
      totalStoryPoints: 65,
    },
  },

  // ============================================================================
  // SPRINT 3: Patient Management - Part 1 (Week 5-6)
  // ============================================================================
  {
    sprintNumber: 3,
    name: 'Sprint 3: Patient Management - Part 1',
    status: 'planning',
    duration: 14,
    focus: 'Patient Records & Demographics',
    modules: ['Patient Management'],
    goals: [
      {
        description: 'Patient registration and demographics',
        priority: 'critical',
        completed: false,
      },
      { description: 'Medical history management', priority: 'critical', completed: false },
      { description: 'Patient search and filtering', priority: 'high', completed: false },
      { description: 'Document upload system', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 62,
      totalStoryPoints: 62,
    },
  },

  // ============================================================================
  // SPRINT 4: Patient Management - Part 2 (Week 7-8)
  // ============================================================================
  {
    sprintNumber: 4,
    name: 'Sprint 4: Patient Management - Part 2',
    status: 'planning',
    duration: 14,
    focus: 'Advanced Patient Features',
    modules: ['Patient Management'],
    goals: [
      { description: 'Patient portal implementation', priority: 'high', completed: false },
      { description: 'Family relationships and consents', priority: 'medium', completed: false },
      { description: 'Patient communication preferences', priority: 'medium', completed: false },
      { description: 'Allergy and medication tracking', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 62,
      totalStoryPoints: 62,
    },
  },

  // ============================================================================
  // SPRINT 5: Appointment Scheduling - Part 1 (Week 9-10)
  // ============================================================================
  {
    sprintNumber: 5,
    name: 'Sprint 5: Appointment Scheduling - Part 1',
    status: 'planning',
    duration: 14,
    focus: 'Basic Scheduling & Calendar',
    modules: ['Appointment Scheduling'],
    goals: [
      { description: 'Core appointment booking system', priority: 'critical', completed: false },
      { description: 'Provider availability management', priority: 'critical', completed: false },
      { description: 'Calendar integration', priority: 'high', completed: false },
      { description: 'Appointment conflicts detection', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 84,
      totalStoryPoints: 84,
    },
  },

  // ============================================================================
  // SPRINT 6: Appointment Scheduling - Part 2 (Week 11-12)
  // ============================================================================
  {
    sprintNumber: 6,
    name: 'Sprint 6: Appointment Scheduling - Part 2',
    status: 'planning',
    duration: 14,
    focus: 'Advanced Scheduling Features',
    modules: ['Appointment Scheduling'],
    goals: [
      { description: 'Recurring appointments', priority: 'high', completed: false },
      { description: 'Waitlist management', priority: 'medium', completed: false },
      { description: 'Appointment reminders', priority: 'high', completed: false },
      { description: 'Online booking system', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 84,
      totalStoryPoints: 84,
    },
  },

  // ============================================================================
  // SPRINT 7: Clinical Notes & Documentation (Week 13-14)
  // ============================================================================
  {
    sprintNumber: 7,
    name: 'Sprint 7: Clinical Notes & Documentation',
    status: 'planning',
    duration: 14,
    focus: 'Clinical Documentation System',
    modules: ['Clinical Notes', 'Documentation'],
    goals: [
      { description: 'SOAP notes implementation', priority: 'critical', completed: false },
      { description: 'Clinical templates system', priority: 'high', completed: false },
      { description: 'Treatment plans', priority: 'high', completed: false },
      { description: 'Digital signatures', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 98,
      totalStoryPoints: 98,
    },
  },

  // ============================================================================
  // SPRINT 8: Billing & Payments - Part 1 (Week 15-16)
  // ============================================================================
  {
    sprintNumber: 8,
    name: 'Sprint 8: Billing & Payments - Part 1',
    status: 'planning',
    duration: 14,
    focus: 'Invoicing & Payment Processing',
    modules: ['Billing', 'Payments'],
    goals: [
      { description: 'Invoice generation system', priority: 'critical', completed: false },
      { description: 'Stripe payment integration', priority: 'critical', completed: false },
      { description: 'Payment tracking', priority: 'high', completed: false },
      { description: 'Receipt generation', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 71,
      totalStoryPoints: 71,
    },
  },

  // ============================================================================
  // SPRINT 9: Billing & Insurance (Week 17-18)
  // ============================================================================
  {
    sprintNumber: 9,
    name: 'Sprint 9: Billing & Insurance',
    status: 'planning',
    duration: 14,
    focus: 'Insurance Claims & Processing',
    modules: ['Billing', 'Insurance'],
    goals: [
      { description: 'Insurance verification', priority: 'critical', completed: false },
      { description: 'Claims submission', priority: 'critical', completed: false },
      { description: 'EOB processing', priority: 'high', completed: false },
      { description: 'Payment reconciliation', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 166,
      totalStoryPoints: 166,
    },
  },

  // ============================================================================
  // SPRINT 10: Messaging & Communication (Week 19-20)
  // ============================================================================
  {
    sprintNumber: 10,
    name: 'Sprint 10: Messaging & Communication',
    status: 'planning',
    duration: 14,
    focus: 'Internal & Patient Communication',
    modules: ['Messaging', 'Communication'],
    goals: [
      { description: 'HIPAA-compliant messaging', priority: 'critical', completed: false },
      { description: 'SMS notifications', priority: 'high', completed: false },
      { description: 'Email integration', priority: 'high', completed: false },
      { description: 'Broadcast messaging', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 78,
      totalStoryPoints: 78,
    },
  },

  // ============================================================================
  // SPRINT 11: Reporting & Analytics (Week 21-22)
  // ============================================================================
  {
    sprintNumber: 11,
    name: 'Sprint 11: Reporting & Analytics',
    status: 'planning',
    duration: 14,
    focus: 'Business Intelligence & Reports',
    modules: ['Reporting', 'Analytics'],
    goals: [
      { description: 'Financial reports', priority: 'high', completed: false },
      { description: 'Operational dashboards', priority: 'high', completed: false },
      { description: 'Patient analytics', priority: 'medium', completed: false },
      { description: 'Export capabilities', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 112,
      totalStoryPoints: 112,
    },
  },

  // ============================================================================
  // SPRINT 12: Mobile App - Part 1 (Week 23-24)
  // ============================================================================
  {
    sprintNumber: 12,
    name: 'Sprint 12: Mobile App - Part 1',
    status: 'planning',
    duration: 14,
    focus: 'Mobile Foundation & Core Features',
    modules: ['Mobile App'],
    goals: [
      { description: 'React Native setup', priority: 'critical', completed: false },
      { description: 'Mobile authentication', priority: 'critical', completed: false },
      { description: 'Patient mobile views', priority: 'high', completed: false },
      { description: 'Push notifications', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 78,
      totalStoryPoints: 78,
    },
  },

  // ============================================================================
  // SPRINT 13: Mobile App - Part 2 (Week 25-26)
  // ============================================================================
  {
    sprintNumber: 13,
    name: 'Sprint 13: Mobile App - Part 2',
    status: 'planning',
    duration: 14,
    focus: 'Mobile Advanced Features',
    modules: ['Mobile App'],
    goals: [
      { description: 'Mobile appointment booking', priority: 'high', completed: false },
      { description: 'Mobile messaging', priority: 'high', completed: false },
      { description: 'Offline mode', priority: 'medium', completed: false },
      { description: 'Mobile payments', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 78,
      totalStoryPoints: 78,
    },
  },

  // ============================================================================
  // SPRINT 14: Integrations (Week 27-28)
  // ============================================================================
  {
    sprintNumber: 14,
    name: 'Sprint 14: Integrations',
    status: 'planning',
    duration: 14,
    focus: 'Third-Party Integrations',
    modules: ['Integrations', 'EHR', 'Calendar'],
    goals: [
      { description: 'EHR system integration', priority: 'high', completed: false },
      { description: 'Google Calendar sync', priority: 'medium', completed: false },
      { description: 'Twilio SMS integration', priority: 'high', completed: false },
      { description: 'Lab results integration', priority: 'medium', completed: false },
    ],
    capacity: {
      plannedVelocity: 98,
      totalStoryPoints: 98,
    },
  },

  // ============================================================================
  // SPRINT 15: Security & Compliance - Part 1 (Week 29-30)
  // ============================================================================
  {
    sprintNumber: 15,
    name: 'Sprint 15: Security & Compliance - Part 1',
    status: 'planning',
    duration: 14,
    focus: 'HIPAA Compliance & Security',
    modules: ['Security', 'Compliance', 'HIPAA'],
    goals: [
      { description: 'HIPAA audit logging', priority: 'critical', completed: false },
      { description: 'Data encryption at rest', priority: 'critical', completed: false },
      { description: 'Access control auditing', priority: 'critical', completed: false },
      { description: 'Security scanning', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 62,
      totalStoryPoints: 62,
    },
  },

  // ============================================================================
  // SPRINT 16: Security & Compliance - Part 2 (Week 31-32)
  // ============================================================================
  {
    sprintNumber: 16,
    name: 'Sprint 16: Security & Compliance - Part 2',
    status: 'planning',
    duration: 14,
    focus: 'Advanced Security & Backup',
    modules: ['Security', 'Compliance', 'Backup'],
    goals: [
      { description: 'Disaster recovery plan', priority: 'critical', completed: false },
      { description: 'Automated backups', priority: 'critical', completed: false },
      { description: 'Penetration testing', priority: 'high', completed: false },
      { description: 'Compliance documentation', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 62,
      totalStoryPoints: 62,
    },
  },

  // ============================================================================
  // SPRINT 17: Testing & Bug Fixes (Week 33-34)
  // ============================================================================
  {
    sprintNumber: 17,
    name: 'Sprint 17: Testing & Bug Fixes',
    status: 'planning',
    duration: 14,
    focus: 'Comprehensive Testing & QA',
    modules: ['Testing', 'QA', 'Bug Fixes'],
    goals: [
      { description: 'End-to-end testing suite', priority: 'critical', completed: false },
      { description: 'Performance testing', priority: 'high', completed: false },
      { description: 'Bug triage and fixes', priority: 'critical', completed: false },
      { description: 'User acceptance testing', priority: 'high', completed: false },
    ],
    capacity: {
      plannedVelocity: 114,
      totalStoryPoints: 114,
    },
  },

  // ============================================================================
  // SPRINT 18: Launch Preparation & Documentation (Week 35-36)
  // ============================================================================
  {
    sprintNumber: 18,
    name: 'Sprint 18: Launch Preparation & Documentation',
    status: 'planning',
    duration: 14,
    focus: 'Production Readiness & Documentation',
    modules: ['Documentation', 'Deployment', 'Launch'],
    goals: [
      { description: 'Complete user documentation', priority: 'high', completed: false },
      { description: 'Production deployment', priority: 'critical', completed: false },
      { description: 'Training materials', priority: 'medium', completed: false },
      { description: 'Go-live checklist completion', priority: 'critical', completed: false },
    ],
    capacity: {
      plannedVelocity: 57,
      totalStoryPoints: 57,
    },
  },
];

// Sample tasks for Sprint 1 (showing structure - full tasks would be very long)
const sprint1Tasks = [
  {
    taskId: 'TASK-1.1',
    moduleId: '1',
    moduleName: 'Authentication & Authorization',
    taskNumber: '1.1',
    title: 'User Registration System',
    description: 'Implement user registration with email verification and role assignment',
    priority: 'critical',
    storyPoints: 5,
    estimatedDuration: { days: 3, hours: 24 },
    assignedRole: 'Senior Backend Engineer',
    technicalRequirements: [
      { requirement: 'Email/password registration', completed: false },
      { requirement: 'Email verification workflow', completed: false },
      { requirement: 'Password strength validation', completed: false },
      { requirement: 'Role assignment logic', completed: false },
    ],
    subtasks: [
      { title: 'Create User model with validation', estimatedHours: 4, completed: false, order: 1 },
      {
        title: 'Implement registration API endpoint',
        estimatedHours: 6,
        completed: false,
        order: 2,
      },
      { title: 'Email verification service', estimatedHours: 4, completed: false, order: 3 },
      { title: 'Password hashing with bcrypt', estimatedHours: 2, completed: false, order: 4 },
      { title: 'Role assignment logic', estimatedHours: 3, completed: false, order: 5 },
      { title: 'Error handling and validation', estimatedHours: 3, completed: false, order: 6 },
    ],
    testCases: [
      {
        testId: 'TEST-1.1.1',
        testName: 'User Registration - Valid Data',
        input: 'Valid email, strong password, valid role',
        expectedOutput: 'User created, verification email sent, 201 response',
        acceptanceCriteria: ['User record in DB', 'Email in queue', 'Password hashed'],
        status: 'pending',
      },
      {
        testId: 'TEST-1.1.2',
        testName: 'User Registration - Duplicate Email',
        input: 'Email that already exists',
        expectedOutput: '409 Conflict error',
        acceptanceCriteria: ['Error message returned', 'No duplicate created'],
        status: 'pending',
      },
    ],
    filesToCreate: [
      { path: 'models/User.js', type: 'model', status: 'pending' },
      { path: 'routes/auth.js', type: 'route', status: 'pending' },
      { path: 'controllers/authController.js', type: 'controller', status: 'pending' },
      { path: 'services/emailService.js', type: 'service', status: 'pending' },
    ],
  },
  {
    taskId: 'TASK-1.2',
    moduleId: '1',
    moduleName: 'Authentication & Authorization',
    taskNumber: '1.2',
    title: 'Login System with JWT',
    description: 'Implement secure login with JWT tokens and refresh tokens',
    priority: 'critical',
    storyPoints: 5,
    estimatedDuration: { days: 3, hours: 24 },
    assignedRole: 'Senior Backend Engineer',
    technicalRequirements: [
      { requirement: 'JWT access token generation', completed: false },
      { requirement: 'Refresh token mechanism', completed: false },
      { requirement: 'Secure cookie handling', completed: false },
      { requirement: 'Login attempt rate limiting', completed: false },
    ],
    subtasks: [
      {
        title: 'Create JWT service with access/refresh tokens',
        estimatedHours: 6,
        completed: false,
        order: 1,
      },
      {
        title: 'Login endpoint with credentials validation',
        estimatedHours: 5,
        completed: false,
        order: 2,
      },
      { title: 'Refresh token endpoint', estimatedHours: 4, completed: false, order: 3 },
      { title: 'Logout and token revocation', estimatedHours: 3, completed: false, order: 4 },
      { title: 'Rate limiting middleware', estimatedHours: 3, completed: false, order: 5 },
      { title: 'Security headers configuration', estimatedHours: 2, completed: false, order: 6 },
    ],
    testCases: [
      {
        testId: 'TEST-1.2.1',
        testName: 'Login - Valid Credentials',
        input: 'Valid email and password',
        expectedOutput: 'Access token and refresh token returned',
        acceptanceCriteria: [
          'JWT tokens generated',
          'Tokens stored securely',
          'User authenticated',
        ],
        status: 'pending',
      },
    ],
    filesToCreate: [
      { path: 'services/jwtService.js', type: 'service', status: 'pending' },
      { path: 'middleware/auth.js', type: 'middleware', status: 'pending' },
    ],
  },
  {
    taskId: 'TASK-1.3',
    moduleId: '1',
    moduleName: 'Authentication & Authorization',
    taskNumber: '1.3',
    title: 'Password Reset Flow',
    description: 'Implement secure password reset with email verification',
    priority: 'high',
    storyPoints: 3,
    estimatedDuration: { days: 2, hours: 16 },
    assignedRole: 'Mid Backend Engineer',
    technicalRequirements: [
      { requirement: 'Password reset request', completed: false },
      { requirement: 'Secure reset token generation', completed: false },
      { requirement: 'Email delivery', completed: false },
      { requirement: 'Token expiration handling', completed: false },
    ],
    subtasks: [
      { title: 'Password reset request endpoint', estimatedHours: 4, completed: false, order: 1 },
      { title: 'Generate secure reset token', estimatedHours: 3, completed: false, order: 2 },
      { title: 'Send reset email', estimatedHours: 3, completed: false, order: 3 },
      { title: 'Reset password endpoint', estimatedHours: 4, completed: false, order: 4 },
      { title: 'Token validation and expiration', estimatedHours: 2, completed: false, order: 5 },
    ],
    testCases: [
      {
        testId: 'TEST-1.3.1',
        testName: 'Password Reset Request',
        input: 'Valid email address',
        expectedOutput: 'Reset email sent',
        acceptanceCriteria: ['Token generated', 'Email delivered', 'Token stored with expiry'],
        status: 'pending',
      },
    ],
  },
  {
    taskId: 'TASK-13.1',
    moduleId: '13',
    moduleName: 'DevOps & Infrastructure',
    taskNumber: '13.1',
    title: 'Docker Configuration',
    description: 'Set up Docker containers for development and production',
    priority: 'critical',
    storyPoints: 5,
    estimatedDuration: { days: 3, hours: 24 },
    assignedRole: 'DevOps Engineer',
    technicalRequirements: [
      { requirement: 'Dockerfile for backend', completed: false },
      { requirement: 'Dockerfile for frontend', completed: false },
      { requirement: 'Docker Compose configuration', completed: false },
      { requirement: 'Multi-stage builds', completed: false },
    ],
    subtasks: [
      { title: 'Create backend Dockerfile', estimatedHours: 4, completed: false, order: 1 },
      { title: 'Create frontend Dockerfile', estimatedHours: 4, completed: false, order: 2 },
      { title: 'Docker Compose setup', estimatedHours: 6, completed: false, order: 3 },
      { title: 'Environment variable management', estimatedHours: 4, completed: false, order: 4 },
      { title: 'Volume configuration', estimatedHours: 3, completed: false, order: 5 },
      { title: 'Test container builds', estimatedHours: 3, completed: false, order: 6 },
    ],
    filesToCreate: [
      { path: 'Dockerfile.backend', type: 'config', status: 'pending' },
      { path: 'Dockerfile.frontend', type: 'config', status: 'pending' },
      { path: 'docker-compose.yml', type: 'config', status: 'pending' },
    ],
  },
  {
    taskId: 'TASK-13.2',
    moduleId: '13',
    moduleName: 'DevOps & Infrastructure',
    taskNumber: '13.2',
    title: 'CI/CD Pipeline Setup',
    description: 'Configure GitHub Actions for automated testing and deployment',
    priority: 'high',
    storyPoints: 8,
    estimatedDuration: { days: 4, hours: 32 },
    assignedRole: 'DevOps Engineer',
    technicalRequirements: [
      { requirement: 'GitHub Actions workflows', completed: false },
      { requirement: 'Automated testing pipeline', completed: false },
      { requirement: 'Deployment automation', completed: false },
      { requirement: 'Environment-specific configs', completed: false },
    ],
    subtasks: [
      { title: 'Create CI workflow for tests', estimatedHours: 6, completed: false, order: 1 },
      { title: 'Create CD workflow for deployment', estimatedHours: 8, completed: false, order: 2 },
      { title: 'Configure secrets management', estimatedHours: 4, completed: false, order: 3 },
      { title: 'Set up staging environment', estimatedHours: 8, completed: false, order: 4 },
      { title: 'Deploy notification system', estimatedHours: 3, completed: false, order: 5 },
      { title: 'Test full pipeline', estimatedHours: 3, completed: false, order: 6 },
    ],
    filesToCreate: [
      { path: '.github/workflows/ci.yml', type: 'config', status: 'pending' },
      { path: '.github/workflows/cd.yml', type: 'config', status: 'pending' },
    ],
  },
];

// Function to seed sprints and tasks
async function seedSprintsAndTasks() {
  try {
    console.log('🌱 Starting sprint and task seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clonejane', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    await Sprint.deleteMany({});
    await DevelopmentTask.deleteMany({});
    console.log('🗑️  Cleared existing sprints and tasks\n');

    // Seed sprints
    console.log('📅 Creating sprints...\n');
    const createdSprints = [];

    for (const sprintData of sprintsData) {
      const dates = getSprintDates(sprintData.sprintNumber);

      const sprint = new Sprint({
        ...sprintData,
        sprintId: `SPRINT-${String(sprintData.sprintNumber).padStart(3, '0')}`,
        startDate: dates.startDate,
        endDate: dates.endDate,
      });

      await sprint.save();
      createdSprints.push(sprint);

      console.log(`✅ Created ${sprint.sprintId}: ${sprint.name}`);
      console.log(`   📊 Story Points: ${sprint.capacity.totalStoryPoints}`);
      console.log(
        `   📅 ${dates.startDate.toISOString().split('T')[0]} to ${dates.endDate.toISOString().split('T')[0]}\n`
      );
    }

    // Seed sample tasks for Sprint 1
    console.log('\n📝 Creating development tasks for Sprint 1...\n');
    const sprint1 = createdSprints[0];

    for (const taskData of sprint1Tasks) {
      const task = new DevelopmentTask({
        ...taskData,
        sprint: sprint1._id,
        sprintNumber: sprint1.sprintNumber,
      });

      await task.save();
      sprint1.tasks.push(task._id);

      console.log(`✅ Created ${task.taskId}: ${task.title}`);
      console.log(`   👤 Assigned to: ${task.assignedRole}`);
      console.log(`   ⭐ Story Points: ${task.storyPoints}`);
      console.log(`   📋 Subtasks: ${task.subtasks.length}`);
      console.log(`   🧪 Test Cases: ${task.testCases.length}\n`);
    }

    await sprint1.save();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 SEEDING COMPLETE!\n');
    console.log(`✅ Created ${createdSprints.length} sprints`);
    console.log(`✅ Created ${sprint1Tasks.length} tasks for Sprint 1`);
    console.log(
      `📊 Total Story Points Across All Sprints: ${sprintsData.reduce((sum, s) => sum + s.capacity.totalStoryPoints, 0)}`
    );
    console.log(`⏱️  Total Duration: 36 weeks (9 months)`);
    console.log('\n📋 Sprint Summary:');
    createdSprints.forEach((sprint) => {
      console.log(
        `   ${sprint.sprintId}: ${sprint.name} (${sprint.capacity.totalStoryPoints} points)`
      );
    });
    console.log('\n💡 Next Steps:');
    console.log('   1. Review sprint 1 tasks at /api/sprint-management/sprints/1');
    console.log('   2. Assign team members to tasks');
    console.log('   3. Start Sprint 1: POST /api/sprint-management/sprints/:id/start');
    console.log('   4. Add remaining tasks to subsequent sprints as needed');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run the seeding
if (require.main === module) {
  seedSprintsAndTasks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { seedSprintsAndTasks, sprintsData };
