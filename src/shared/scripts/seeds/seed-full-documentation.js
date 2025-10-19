const fs = require('fs');
const path = require('path');
const express = require('express');


const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const router = express.Router();
/**
 * Comprehensive seed script that extracts ALL tasks from project-api-docs.html
 * Creates 18 sprints with 86+ tasks including full technical details
 */
router.post('/', async (req, res) => {
  try {
    console.log('Starting comprehensive documentation seed from HTML file...');

    // Get or create system user for task creation
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

    // Clear existing data
    await Sprint.deleteMany({});
    await Task.deleteMany({});
    console.log('Cleared existing sprints and tasks');

    // Load parsed sprint data
    const parsedDataPath = path.join(__dirname, '../scripts/parsed-sprints.json');
    const sprintsData = JSON.parse(fs.readFileSync(parsedDataPath, 'utf-8'));

    console.log(`Loaded ${sprintsData.length} sprints from parsed data`);

    let totalTasksCreated = 0;
    const createdSprints = [];

    // Helper function to parse timeline dates
    const parseTimeline = (timeline) => {
      const match = timeline.match(/([A-Za-z]+\s+\d+)\s*-\s*([A-Za-z]+\s+\d+),\s*(\d{4})/);
      if (match) {
        const [, startStr, endStr, year] = match;
        const startDate = new Date(`${startStr}, ${year}`);
        const endDate = new Date(`${endStr}, ${year}`);
        return { startDate, endDate };
      }
      // Fallback
      return { startDate: new Date(), endDate: new Date() };
    };

    // Process each sprint from parsed data
    for (const sprintData of sprintsData) {
      const { startDate, endDate } = parseTimeline(sprintData.timeline);

      // Create sprint
      const sprint = await Sprint.create({
        sprintId: `SPRINT-${String(sprintData.number).padStart(3, '0')}`,
        sprintNumber: sprintData.number,
        name: sprintData.name,
        focus: sprintData.goal || '',
        startDate,
        endDate,
        status: 'planning',
        capacity: {
          totalStoryPoints: sprintData.storyPoints,
          plannedVelocity: sprintData.storyPoints,
          actualVelocity: 0,
        },
      });

      createdSprints.push(sprint);

      // Create tasks for this sprint
      const tasks = [];
      for (const taskData of sprintData.tasks) {
        const task = {
          title: taskData.title,
          description: taskData.description,
          sprint: sprint._id,
          sprintNumber: sprintData.number,
          status: 'todo',
          priority:
            taskData.storyPoints >= 13 ? 'high' : taskData.storyPoints >= 8 ? 'medium' : 'low',
          tags: taskData.techStack ? taskData.techStack.split(',').map((t) => t.trim()) : [],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: taskData.storyPoints * 60, // story points to minutes (rough estimate)
          technicalDetails: {
            storyPoints: taskData.storyPoints,
            techStack: taskData.techStack,
            acceptanceCriteria: taskData.acceptanceCriteria,
            hasDetailedTech: taskData.hasDetailedTech || false,
            extractedFromHTML: true,
          },
        };
        tasks.push(task);
      }

      if (tasks.length > 0) {
        await Task.insertMany(tasks);
        totalTasksCreated += tasks.length;
        console.log(
          `Created Sprint ${sprintData.number}: ${sprintData.name} with ${tasks.length} tasks`
        );
      } else {
        console.log(
          `Created Sprint ${sprintData.number}: ${sprintData.name} (no tasks in parsed data)`
        );
      }
    }

    // Add grouped tasks for Sprint 17 (Testing & QA) - 8 tasks per HTML
    const sprint17 = createdSprints.find((s) => s.sprintNumber === 17);
    if (sprint17) {
      const sprint17Tasks = [
        {
          title: 'Unit Testing Suite',
          description:
            'Unit tests for all services and utilities with 80%+ code coverage using Jest and React Testing Library.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'high',
          tags: ['testing', 'jest', 'unit-tests'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 520,
          technicalDetails: {
            storyPoints: 13,
            techStack: 'Jest, React Testing Library, test database, mocking libraries',
            acceptanceCriteria:
              '80%+ code coverage → All services tested → Component tests → Mock external APIs → CI integration',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Integration Testing',
          description:
            'Integration tests for API endpoints and database operations with Supertest.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'high',
          tags: ['testing', 'integration', 'supertest'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 480,
          technicalDetails: {
            storyPoints: 8,
            techStack: 'Supertest, test database, API testing',
            acceptanceCriteria:
              'All API endpoints tested → Database operations verified → Error handling tested',
            extractedFromHTML: true,
          },
        },
        {
          title: 'End-to-End Testing',
          description:
            'E2E user flows with Cypress covering critical paths and visual regression testing.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'high',
          tags: ['testing', 'e2e', 'cypress'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 780,
          technicalDetails: {
            storyPoints: 13,
            techStack: 'Cypress, Percy (visual regression)',
            acceptanceCriteria:
              'Test critical flows → Visual regression → Mobile/desktop → All user journeys covered',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Performance & Load Testing',
          description:
            'Load testing for 1000+ concurrent users with k6/Artillery, performance benchmarking.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'high',
          tags: ['testing', 'performance', 'load-testing'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 780,
          technicalDetails: {
            storyPoints: 13,
            techStack: 'k6, Artillery, performance monitoring',
            acceptanceCriteria:
              'Load test 1000+ users → <500ms response time → No memory leaks → Performance benchmarks → Bottleneck identification',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Security Testing & OWASP Audit',
          description:
            'OWASP Top 10 security audit and penetration testing with vulnerability remediation.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'high',
          tags: ['testing', 'security', 'owasp'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 480,
          technicalDetails: {
            storyPoints: 8,
            techStack: 'OWASP ZAP, Snyk, Burp Suite',
            acceptanceCriteria:
              'Security audit report → Pen test findings → No critical vulnerabilities → Remediation complete',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Accessibility Testing (WCAG 2.1 AA)',
          description:
            'WCAG 2.1 AA accessibility compliance testing with screen readers and keyboard navigation.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'medium',
          tags: ['testing', 'accessibility', 'wcag'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 480,
          technicalDetails: {
            storyPoints: 8,
            techStack: 'axe DevTools, NVDA/JAWS screen readers',
            acceptanceCriteria:
              'WCAG 2.1 AA compliance → Keyboard navigation → Screen reader support → Color contrast → ARIA labels',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Cross-Browser & Device Testing',
          description:
            'Testing across Chrome, Firefox, Safari, Edge on desktop and mobile devices (iOS/Android).',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'medium',
          tags: ['testing', 'cross-browser', 'mobile'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 360,
          technicalDetails: {
            storyPoints: 6,
            techStack: 'BrowserStack, real device testing, responsive design testing',
            acceptanceCriteria:
              'Chrome/Firefox/Safari/Edge tested → iOS/Android devices → Various screen sizes → No layout issues',
            extractedFromHTML: true,
          },
        },
        {
          title: 'UAT & Final QA Sign-off',
          description:
            'User acceptance testing with beta clinics, bug bash sessions, and final QA checklist sign-off.',
          sprint: sprint17._id,
          sprintNumber: 17,
          status: 'todo',
          priority: 'high',
          tags: ['testing', 'uat', 'quality-assurance'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 600,
          technicalDetails: {
            storyPoints: 10,
            techStack: 'Beta testing program, bug tracking, QA checklists',
            acceptanceCriteria:
              'UAT with beta clinics → Bug bash sessions → Regression test suite → Smoke tests → Final QA sign-off',
            extractedFromHTML: true,
          },
        },
      ];
      await Task.insertMany(sprint17Tasks);
      totalTasksCreated += sprint17Tasks.length;
      console.log(`Added ${sprint17Tasks.length} grouped tasks to Sprint 17`);
    }

    // Add grouped tasks for Sprint 18 (Launch Preparation) - 5 tasks per HTML
    const sprint18 = createdSprints.find((s) => s.sprintNumber === 18);
    if (sprint18) {
      const sprint18Tasks = [
        {
          title: 'Production Infrastructure Setup',
          description:
            'Production environment setup on AWS/Azure with Kubernetes, Docker, load balancers, and auto-scaling.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['infrastructure', 'devops', 'production'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 600,
          technicalDetails: {
            storyPoints: 10,
            techStack: 'AWS/Azure, Kubernetes, Docker, load balancers, auto-scaling',
            acceptanceCriteria:
              'Production servers → Database clusters → CDN → SSL certificates → DNS → Load balancers → Auto-scaling → Health checks',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Monitoring & Alerting Setup',
          description:
            'APM monitoring with Datadog/New Relic, error tracking with Sentry, automated alerts.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['monitoring', 'observability', 'alerting'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 600,
          technicalDetails: {
            storyPoints: 10,
            techStack: 'Datadog, New Relic, Sentry, PagerDuty',
            acceptanceCriteria:
              'APM monitoring → Error tracking → Performance metrics → Automated alerts → Dashboards → On-call rotation',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Backup & Disaster Recovery',
          description:
            'Automated daily backups, geo-replication, disaster recovery plan with RTO < 4 hours.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['backup', 'disaster-recovery', 'reliability'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 540,
          technicalDetails: {
            storyPoints: 9,
            techStack: 'Automated backups, geo-replication, backup testing',
            acceptanceCriteria:
              'Daily backups → Geo-replication → DR plan tested → RTO < 4 hours → Backup restoration tested',
            extractedFromHTML: true,
          },
        },
        {
          title: 'HIPAA/PIPEDA Compliance Audit',
          description:
            'Complete compliance audit for HIPAA/PIPEDA, BAA agreements, security hardening, penetration testing.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['compliance', 'security', 'hipaa'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 840,
          technicalDetails: {
            storyPoints: 14,
            techStack:
              'Compliance checklists, penetration testing, firewall rules, WAF, DDoS protection',
            acceptanceCriteria:
              'Compliance audit passed → BAA agreements signed → Security hardening complete → Firewall configured → Rate limiting',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Performance Optimization',
          description:
            'Database query optimization, caching strategies, CDN optimization, page load < 2s.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['performance', 'optimization', 'caching'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 720,
          technicalDetails: {
            storyPoints: 12,
            techStack: 'Database indexing, Redis caching, CDN, query optimization',
            acceptanceCriteria:
              'Database indexes optimized → Caching strategies → CDN optimized → Page load < 2s → API response < 500ms',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Documentation & Training Materials',
          description:
            'User guides, admin manual, 20+ video tutorials, API documentation, staff training sessions.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['documentation', 'training', 'knowledge-base'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 960,
          technicalDetails: {
            storyPoints: 16,
            techStack: 'Documentation platform, video recording, training LMS, knowledge base',
            acceptanceCriteria:
              'User guide complete → Admin manual → 20+ video tutorials → API docs complete → Training sessions conducted → Knowledge base articles',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Marketing Site & App Store Submission',
          description:
            'Marketing website launch, iOS/Android app store submission, app store optimization.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'medium',
          tags: ['marketing', 'app-store', 'launch'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 840,
          technicalDetails: {
            storyPoints: 14,
            techStack: 'Marketing website, app store optimization, screenshots, descriptions',
            acceptanceCriteria:
              'Marketing site live → iOS/Android apps submitted → App store listings optimized → Screenshots → Support portal setup',
            extractedFromHTML: true,
          },
        },
        {
          title: 'Go-Live Checklist & Launch',
          description:
            'Final go-live checklist completion, rollback plan, customer onboarding, launch communications, stakeholder sign-off.',
          sprint: sprint18._id,
          sprintNumber: 18,
          status: 'todo',
          priority: 'high',
          tags: ['launch', 'go-live', 'deployment'],
          createdBy: systemUser._id,
          category: 'other',
          estimatedTime: 600,
          technicalDetails: {
            storyPoints: 10,
            techStack: 'Go-live checklist, rollback procedures, onboarding workflows',
            acceptanceCriteria:
              'Go-live checklist complete → Rollback plan documented → Support team trained → Customer onboarding workflow → Launch communications → Final stakeholder sign-off',
            extractedFromHTML: true,
          },
        },
      ];
      await Task.insertMany(sprint18Tasks);
      totalTasksCreated += sprint18Tasks.length;
      console.log(`Added ${sprint18Tasks.length} grouped tasks to Sprint 18`);
    }

    // Calculate statistics
    const stats = {
      totalSprints: await Sprint.countDocuments(),
      totalTasks: await Task.countDocuments(),
      totalStoryPoints: await Sprint.aggregate([
        { $group: { _id: null, total: { $sum: '$capacity.totalStoryPoints' } } },
      ]),
      tasksBySprint: await Task.aggregate([
        { $group: { _id: '$sprintNumber', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    };

    // Get sample tasks from first 5 sprints for verification
    const sampleTasks = await Task.find()
      .limit(5)
      .populate('sprint', 'sprintNumber name')
      .select(
        'title sprintNumber description technicalDetails.storyPoints technicalDetails.techStack'
      );

    res.status(201).json({
      success: true,
      message: 'Full documentation seeded successfully from HTML file',
      stats: {
        sprints: stats.totalSprints,
        tasks: stats.totalTasks,
        storyPoints: stats.totalStoryPoints[0]?.total || 0,
        tasksBySprint: stats.tasksBySprint,
      },
      sampleTasks: sampleTasks.map((t) => ({
        title: t.title,
        sprintNumber: t.sprintNumber,
        sprintName: t.sprint?.name,
        description: t.description?.substring(0, 100) + '...',
        storyPoints: t.technicalDetails?.storyPoints,
        techStack: t.technicalDetails?.techStack?.substring(0, 50) + '...',
      })),
      note: 'All sprints and tasks have been extracted from project-api-docs.html with full technical details',
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed documentation',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

module.exports = router;
