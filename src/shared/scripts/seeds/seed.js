const express = require('express');


const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Task = require('../models/Task');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const DevelopmentTask = require('../models/DevelopmentTask');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    // Create sample patients
    const patients = await Patient.insertMany([
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@email.com',
        phone: '(555) 123-4567',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'male',
        address: {
          street: '123 Main St',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M5H 2N2',
          country: 'Canada',
        },
        emergencyContact: {
          name: 'Jane Smith',
          relationship: 'Spouse',
          phone: '(555) 123-4568',
        },
        medicalHistory: {
          allergies: ['Penicillin'],
          conditions: ['Hypertension'],
          medications: ['Lisinopril 10mg'],
        },
        createdBy: userId,
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@email.com',
        phone: '(555) 234-5678',
        dateOfBirth: new Date('1990-07-22'),
        gender: 'female',
        address: {
          street: '456 Oak Ave',
          city: 'Toronto',
          province: 'ON',
          postalCode: 'M4C 1M5',
          country: 'Canada',
        },
        emergencyContact: {
          name: 'Mike Johnson',
          relationship: 'Brother',
          phone: '(555) 234-5679',
        },
        medicalHistory: {
          allergies: [],
          conditions: ['Asthma'],
          medications: ['Albuterol inhaler'],
        },
        createdBy: userId,
      },
      {
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'mbrown@email.com',
        phone: '(555) 345-6789',
        dateOfBirth: new Date('1978-11-30'),
        gender: 'male',
        address: {
          street: '789 Elm St',
          city: 'Mississauga',
          province: 'ON',
          postalCode: 'L5B 1H7',
          country: 'Canada',
        },
        emergencyContact: {
          name: 'Lisa Brown',
          relationship: 'Wife',
          phone: '(555) 345-6790',
        },
        medicalHistory: {
          allergies: ['Latex'],
          conditions: [],
          medications: [],
        },
        createdBy: userId,
      },
      {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@email.com',
        phone: '(555) 456-7890',
        dateOfBirth: new Date('1995-05-18'),
        gender: 'female',
        address: {
          street: '321 Maple Dr',
          city: 'Brampton',
          province: 'ON',
          postalCode: 'L6T 3S4',
          country: 'Canada',
        },
        emergencyContact: {
          name: 'Robert Davis',
          relationship: 'Father',
          phone: '(555) 456-7891',
        },
        medicalHistory: {
          allergies: ['Peanuts'],
          conditions: ['Type 1 Diabetes'],
          medications: ['Insulin'],
        },
        createdBy: userId,
      },
    ]);

    // Create appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = [];
    appointments.push(
      {
        patient: patients[0]._id,
        practitioner: userId,
        appointmentType: 'consultation',
        startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
        endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
        duration: 60,
        status: 'confirmed',
        notes: 'New patient intake - hypertension follow-up',
        createdBy: userId,
      },
      {
        patient: patients[1]._id,
        practitioner: userId,
        appointmentType: 'follow-up',
        startTime: new Date(today.getTime() + 11 * 60 * 60 * 1000),
        endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000),
        duration: 60,
        status: 'confirmed',
        notes: 'Asthma management check-in',
        createdBy: userId,
      },
      {
        patient: patients[2]._id,
        practitioner: userId,
        appointmentType: 'checkup',
        startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
        endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),
        duration: 60,
        status: 'confirmed',
        notes: 'Annual physical examination',
        createdBy: userId,
      }
    );

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    appointments.push(
      {
        patient: patients[3]._id,
        practitioner: userId,
        appointmentType: 'follow-up',
        startTime: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000),
        endTime: new Date(tomorrow.getTime() + 11 * 60 * 60 * 1000),
        duration: 60,
        status: 'scheduled',
        notes: 'Diabetes management - check A1C results',
        createdBy: userId,
      },
      {
        patient: patients[0]._id,
        practitioner: userId,
        appointmentType: 'procedure',
        startTime: new Date(tomorrow.getTime() + 15 * 60 * 60 * 1000),
        endTime: new Date(tomorrow.getTime() + 16 * 60 * 60 * 1000),
        duration: 60,
        status: 'scheduled',
        notes: 'Blood pressure medication review',
        createdBy: userId,
      }
    );

    await Appointment.insertMany(appointments);

    // Create tasks
    const tasks = await Task.insertMany([
      {
        title: 'Review lab results for John Smith',
        description: 'Check cholesterol and blood sugar levels from recent tests',
        priority: 'high',
        dueDate: today,
        status: 'pending',
        assignedTo: userId,
        createdBy: userId,
      },
      {
        title: 'Call pharmacy about Emily Davis prescription',
        description: 'Verify insulin prescription renewal',
        priority: 'urgent',
        dueDate: today,
        status: 'pending',
        assignedTo: userId,
        createdBy: userId,
      },
      {
        title: 'Update patient records',
        description: 'Import recent consultation notes into system',
        priority: 'medium',
        dueDate: tomorrow,
        status: 'in_progress',
        assignedTo: userId,
        createdBy: userId,
      },
      {
        title: 'Prepare monthly health reports',
        description: 'Compile patient statistics and outcomes data',
        priority: 'low',
        dueDate: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'pending',
        assignedTo: userId,
        createdBy: userId,
      },
      {
        title: 'Schedule follow-up appointment',
        description: 'Contact Sarah Johnson for asthma follow-up in 2 weeks',
        priority: 'medium',
        dueDate: tomorrow,
        status: 'pending',
        assignedTo: userId,
        createdBy: userId,
      },
    ]);

    res.json({
      message: 'Database seeded successfully!',
      data: {
        patients: patients.length,
        appointments: appointments.length,
        tasks: tasks.length,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seed all role test users
router.post('/all-roles', async (req, res) => {
  try {
    // Create test users for all 13 roles
    const roleUsers = [
      {
        email: 'owner@expojane.com',
        password: 'password123',
        firstName: 'Owner',
        lastName: 'Admin',
        role: 'owner',
      },
      {
        email: 'fullaccess@expojane.com',
        password: 'password123',
        firstName: 'Full',
        lastName: 'Access',
        role: 'full_access',
      },
      {
        email: 'adminbilling@expojane.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Billing',
        role: 'admin_billing',
      },
      {
        email: 'adminscheduling@expojane.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Scheduling',
        role: 'admin_scheduling',
      },
      {
        email: 'adminreports@expojane.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Reports',
        role: 'admin_reports',
      },
      {
        email: 'pracfd@expojane.com',
        password: 'password123',
        firstName: 'Practitioner',
        lastName: 'FrontDesk',
        role: 'practitioner_frontdesk',
      },
      {
        email: 'praclimited@expojane.com',
        password: 'password123',
        firstName: 'Practitioner',
        lastName: 'Limited',
        role: 'practitioner_limited',
      },
      {
        email: 'frontdesk@expojane.com',
        password: 'password123',
        firstName: 'Front',
        lastName: 'Desk',
        role: 'frontdesk_only',
      },
      {
        email: 'billingonly@expojane.com',
        password: 'password123',
        firstName: 'Billing',
        lastName: 'Only',
        role: 'billing_only',
      },
      {
        email: 'scheduleronly@expojane.com',
        password: 'password123',
        firstName: 'Scheduler',
        lastName: 'Only',
        role: 'scheduler_only',
      },
      {
        email: 'supportstaff@expojane.com',
        password: 'password123',
        firstName: 'Support',
        lastName: 'Staff',
        role: 'support_staff',
      },
      {
        email: 'patient@expojane.com',
        password: 'password123',
        firstName: 'Patient',
        lastName: 'User',
        role: 'patient',
      },
    ];

    // Check if users already exist, if not create them
    const createdUsers = [];
    for (const userData of roleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = await User.create(userData);
        createdUsers.push({
          email: user.email,
          role: user.role,
          id: user._id,
        });
      } else {
        createdUsers.push({
          email: existingUser.email,
          role: existingUser.role,
          id: existingUser._id,
          existing: true,
        });
      }
    }

    res.status(201).json({
      message: 'All role test users created/verified successfully',
      users: createdUsers,
      total: createdUsers.length,
    });
  } catch (error) {
    console.error('All-roles seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seed Sprint and Task Management System
router.post('/sprints', async (req, res) => {
  try {
    console.log('🌱 Starting sprint and task seeding...\n');

    // Clear existing sprint data
    await Sprint.deleteMany({});
    await DevelopmentTask.deleteMany({});
    console.log('🗑️  Cleared existing sprints and tasks\n');

    // Helper function to calculate dates
    const getSprintDates = (sprintNumber) => {
      const startDate = new Date('2025-01-06');
      const sprintStartDate = new Date(startDate);
      sprintStartDate.setDate(startDate.getDate() + (sprintNumber - 1) * 14);
      const sprintEndDate = new Date(sprintStartDate);
      sprintEndDate.setDate(sprintStartDate.getDate() + 13);
      return { startDate: sprintStartDate, endDate: sprintEndDate };
    };

    // Sprint data (all 18 sprints)
    const sprintsData = [
      {
        sprintNumber: 1,
        name: 'Sprint 1: Foundation & Authentication',
        status: 'planning',
        duration: 14,
        focus: 'Authentication & Infrastructure',
        modules: ['Authentication'],
        goals: [{ description: 'Complete authentication', priority: 'critical', completed: false }],
        capacity: { plannedVelocity: 89, totalStoryPoints: 89 },
      },
      {
        sprintNumber: 2,
        name: 'Sprint 2: User Management & Authorization',
        status: 'planning',
        duration: 14,
        focus: 'User Management',
        modules: ['User Management'],
        goals: [],
        capacity: { plannedVelocity: 65, totalStoryPoints: 65 },
      },
      {
        sprintNumber: 3,
        name: 'Sprint 3: Patient Management - Part 1',
        status: 'planning',
        duration: 14,
        focus: 'Patient Records',
        modules: ['Patients'],
        goals: [],
        capacity: { plannedVelocity: 62, totalStoryPoints: 62 },
      },
      {
        sprintNumber: 4,
        name: 'Sprint 4: Patient Management - Part 2',
        status: 'planning',
        duration: 14,
        focus: 'Patient Portal',
        modules: ['Patients'],
        goals: [],
        capacity: { plannedVelocity: 62, totalStoryPoints: 62 },
      },
      {
        sprintNumber: 5,
        name: 'Sprint 5: Appointment Scheduling - Part 1',
        status: 'planning',
        duration: 14,
        focus: 'Basic Scheduling',
        modules: ['Appointments'],
        goals: [],
        capacity: { plannedVelocity: 84, totalStoryPoints: 84 },
      },
      {
        sprintNumber: 6,
        name: 'Sprint 6: Appointment Scheduling - Part 2',
        status: 'planning',
        duration: 14,
        focus: 'Advanced Scheduling',
        modules: ['Appointments'],
        goals: [],
        capacity: { plannedVelocity: 84, totalStoryPoints: 84 },
      },
      {
        sprintNumber: 7,
        name: 'Sprint 7: Clinical Notes & Documentation',
        status: 'planning',
        duration: 14,
        focus: 'Clinical Documentation',
        modules: ['Clinical Notes'],
        goals: [],
        capacity: { plannedVelocity: 98, totalStoryPoints: 98 },
      },
      {
        sprintNumber: 8,
        name: 'Sprint 8: Billing & Payments - Part 1',
        status: 'planning',
        duration: 14,
        focus: 'Invoicing',
        modules: ['Billing'],
        goals: [],
        capacity: { plannedVelocity: 71, totalStoryPoints: 71 },
      },
      {
        sprintNumber: 9,
        name: 'Sprint 9: Billing & Insurance',
        status: 'planning',
        duration: 14,
        focus: 'Insurance Claims',
        modules: ['Billing', 'Insurance'],
        goals: [],
        capacity: { plannedVelocity: 166, totalStoryPoints: 166 },
      },
      {
        sprintNumber: 10,
        name: 'Sprint 10: Messaging & Communication',
        status: 'planning',
        duration: 14,
        focus: 'HIPAA Messaging',
        modules: ['Messaging'],
        goals: [],
        capacity: { plannedVelocity: 78, totalStoryPoints: 78 },
      },
      {
        sprintNumber: 11,
        name: 'Sprint 11: Reporting & Analytics',
        status: 'planning',
        duration: 14,
        focus: 'Business Intelligence',
        modules: ['Analytics'],
        goals: [],
        capacity: { plannedVelocity: 112, totalStoryPoints: 112 },
      },
      {
        sprintNumber: 12,
        name: 'Sprint 12: Mobile App - Part 1',
        status: 'planning',
        duration: 14,
        focus: 'Mobile Foundation',
        modules: ['Mobile'],
        goals: [],
        capacity: { plannedVelocity: 78, totalStoryPoints: 78 },
      },
      {
        sprintNumber: 13,
        name: 'Sprint 13: Mobile App - Part 2',
        status: 'planning',
        duration: 14,
        focus: 'Mobile Advanced',
        modules: ['Mobile'],
        goals: [],
        capacity: { plannedVelocity: 78, totalStoryPoints: 78 },
      },
      {
        sprintNumber: 14,
        name: 'Sprint 14: Integrations',
        status: 'planning',
        duration: 14,
        focus: 'Third-Party Integrations',
        modules: ['Integrations'],
        goals: [],
        capacity: { plannedVelocity: 98, totalStoryPoints: 98 },
      },
      {
        sprintNumber: 15,
        name: 'Sprint 15: Security & Compliance - Part 1',
        status: 'planning',
        duration: 14,
        focus: 'HIPAA Compliance',
        modules: ['Security'],
        goals: [],
        capacity: { plannedVelocity: 62, totalStoryPoints: 62 },
      },
      {
        sprintNumber: 16,
        name: 'Sprint 16: Security & Compliance - Part 2',
        status: 'planning',
        duration: 14,
        focus: 'Advanced Security',
        modules: ['Security'],
        goals: [],
        capacity: { plannedVelocity: 62, totalStoryPoints: 62 },
      },
      {
        sprintNumber: 17,
        name: 'Sprint 17: Testing & Bug Fixes',
        status: 'planning',
        duration: 14,
        focus: 'QA & Testing',
        modules: ['Testing'],
        goals: [],
        capacity: { plannedVelocity: 114, totalStoryPoints: 114 },
      },
      {
        sprintNumber: 18,
        name: 'Sprint 18: Launch Preparation',
        status: 'planning',
        duration: 14,
        focus: 'Production Readiness',
        modules: ['Documentation'],
        goals: [],
        capacity: { plannedVelocity: 57, totalStoryPoints: 57 },
      },
    ];

    // Create sprints
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
    }

    // Sample tasks for Sprint 1
    const sprint1 = createdSprints[0];
    const sprint1Tasks = [
      {
        taskId: 'TASK-1.1', // Sprint 1, Task 1
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
        ],
        subtasks: [
          {
            title: 'Create User model with validation',
            estimatedHours: 4,
            completed: false,
            order: 1,
          },
          {
            title: 'Implement registration API endpoint',
            estimatedHours: 6,
            completed: false,
            order: 2,
          },
        ],
        testCases: [
          {
            testId: 'TEST-1.1.1',
            testName: 'User Registration - Valid Data',
            input: 'Valid email, strong password, valid role',
            expectedOutput: 'User created, verification email sent',
            acceptanceCriteria: ['User record in DB', 'Email in queue'],
            status: 'pending',
          },
        ],
        filesToCreate: [
          { path: 'models/User.js', type: 'model', status: 'pending' },
          { path: 'routes/auth.js', type: 'route', status: 'pending' },
        ],
      },
      {
        taskId: 'TASK-1.2', // Sprint 1, Task 2
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
          { requirement: 'JWT token generation', completed: false },
          { requirement: 'Refresh token mechanism', completed: false },
        ],
        subtasks: [
          { title: 'Create JWT service', estimatedHours: 6, completed: false, order: 1 },
          { title: 'Login endpoint', estimatedHours: 5, completed: false, order: 2 },
        ],
        testCases: [
          {
            testId: 'TEST-1.2.1',
            testName: 'Login - Valid Credentials',
            input: 'Valid email and password',
            expectedOutput: 'JWT tokens returned',
            acceptanceCriteria: ['Tokens generated', 'User authenticated'],
            status: 'pending',
          },
        ],
        filesToCreate: [{ path: 'services/jwtService.js', type: 'service', status: 'pending' }],
      },
      {
        taskId: 'TASK-1.3', // Sprint 1, Task 3
        moduleId: '1',
        moduleName: 'Authentication & Authorization',
        taskNumber: '1.3',
        title: 'Password Reset Flow',
        description: 'Implement secure password reset with email verification',
        priority: 'high',
        storyPoints: 3,
        estimatedDuration: { days: 2, hours: 16 },
        assignedRole: 'Mid Backend Engineer',
        technicalRequirements: [{ requirement: 'Password reset request', completed: false }],
        subtasks: [
          {
            title: 'Password reset request endpoint',
            estimatedHours: 4,
            completed: false,
            order: 1,
          },
        ],
        testCases: [
          {
            testId: 'TEST-1.3.1',
            testName: 'Password Reset Request',
            input: 'Valid email address',
            expectedOutput: 'Reset email sent',
            acceptanceCriteria: ['Token generated', 'Email delivered'],
            status: 'pending',
          },
        ],
      },
      {
        taskId: 'TASK-1.4', // Sprint 1, Task 4
        moduleId: '13',
        moduleName: 'DevOps & Infrastructure',
        taskNumber: '1.4',
        title: 'Docker Configuration',
        description: 'Set up Docker containers for development and production',
        priority: 'critical',
        storyPoints: 5,
        estimatedDuration: { days: 3, hours: 24 },
        assignedRole: 'DevOps Engineer',
        technicalRequirements: [{ requirement: 'Dockerfile for backend', completed: false }],
        subtasks: [
          { title: 'Create backend Dockerfile', estimatedHours: 4, completed: false, order: 1 },
        ],
        testCases: [],
        filesToCreate: [{ path: 'Dockerfile.backend', type: 'config', status: 'pending' }],
      },
      {
        taskId: 'TASK-1.5', // Sprint 1, Task 5
        moduleId: '13',
        moduleName: 'DevOps & Infrastructure',
        taskNumber: '1.5',
        title: 'CI/CD Pipeline Setup',
        description: 'Configure GitHub Actions for automated testing and deployment',
        priority: 'high',
        storyPoints: 8,
        estimatedDuration: { days: 4, hours: 32 },
        assignedRole: 'DevOps Engineer',
        technicalRequirements: [{ requirement: 'GitHub Actions workflows', completed: false }],
        subtasks: [{ title: 'Create CI workflow', estimatedHours: 6, completed: false, order: 1 }],
        testCases: [],
        filesToCreate: [{ path: '.github/workflows/ci.yml', type: 'config', status: 'pending' }],
      },
    ];

    // Create tasks for Sprint 1
    for (const taskData of sprint1Tasks) {
      const task = new DevelopmentTask({
        ...taskData,
        sprint: sprint1._id,
        sprintNumber: sprint1.sprintNumber,
      });
      await task.save();
      sprint1.tasks.push(task._id);
    }

    await sprint1.save();

    const totalPoints = sprintsData.reduce((sum, s) => sum + s.capacity.totalStoryPoints, 0);

    res.json({
      success: true,
      message: '🎉 Sprint Management System seeded successfully!',
      summary: {
        sprintsCreated: createdSprints.length,
        tasksCreated: sprint1Tasks.length,
        totalStoryPoints: totalPoints,
        timeline: '36 weeks (9 months)',
      },
      sprints: createdSprints.map((s) => ({
        sprintId: s.sprintId,
        name: s.name,
        points: s.capacity.totalStoryPoints,
        startDate: s.startDate.toISOString().split('T')[0],
        endDate: s.endDate.toISOString().split('T')[0],
      })),
      tasks: sprint1Tasks.map((t) => ({
        taskId: t.taskId,
        title: t.title,
        points: t.storyPoints,
        role: t.assignedRole,
      })),
      nextSteps: [
        '1. View sprints: GET /api/sprint-management/sprints',
        '2. View Sprint 1: GET /api/sprint-management/sprints/number/1',
        '3. Start Sprint 1: POST /api/sprint-management/sprints/:id/start',
        '4. View tasks: GET /api/sprint-management/tasks',
      ],
    });
  } catch (error) {
    console.error('❌ Error seeding sprints:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;
