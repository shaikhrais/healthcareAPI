/**
 * Sample Project Data for Testing
 * Demonstrates project management capabilities
 */

const sampleProjects = [
  {
    projectId: 'PROJ-2024-001',
    projectCode: 'JANE-EHR',
    projectName: 'Electronic Health Records Integration',
    description:
      'Integrate comprehensive EHR system with existing Jane platform to improve patient data management and clinical workflows',
    projectType: 'software',
    status: 'active',
    priority: 'critical',
    healthStatus: 'green',
    startDate: new Date('2024-01-15'),
    plannedEndDate: new Date('2024-12-31'),
    department: 'engineering',
    budget: {
      total: 250000,
      spent: 125000,
      remaining: 125000,
      currency: 'USD',
    },
    progress: {
      overall: 50,
      milestones: {
        total: 8,
        completed: 4,
      },
      tasks: {
        total: 45,
        completed: 23,
        inProgress: 12,
        blocked: 2,
      },
    },
    objectives: [
      {
        title: 'Seamless Data Integration',
        description: 'Achieve 100% data synchronization between EHR and Jane platform',
        completed: false,
        kpi: {
          metric: 'Data Sync Accuracy',
          target: 100,
          actual: 95,
          unit: '%',
        },
      },
      {
        title: 'Improve Clinical Efficiency',
        description: 'Reduce documentation time by 40%',
        completed: false,
        kpi: {
          metric: 'Time Savings',
          target: 40,
          actual: 28,
          unit: '%',
        },
      },
      {
        title: 'HIPAA Compliance',
        description: 'Ensure full HIPAA compliance for all data transfers',
        completed: true,
        completedDate: new Date('2024-03-20'),
        kpi: {
          metric: 'Compliance Score',
          target: 100,
          actual: 100,
          unit: '%',
        },
      },
    ],
    risks: [
      {
        description: 'Third-party EHR vendor API changes could impact integration',
        severity: 'high',
        probability: 'medium',
        mitigation: 'Maintain regular communication with vendor and implement abstraction layer',
        status: 'identified',
        identifiedDate: new Date('2024-02-01'),
      },
      {
        description: 'Potential data migration issues with legacy patient records',
        severity: 'medium',
        probability: 'high',
        mitigation: 'Comprehensive data validation and backup procedures in place',
        status: 'mitigated',
        identifiedDate: new Date('2024-01-20'),
      },
    ],
    issues: [
      {
        title: 'Performance degradation during peak hours',
        description: 'System slows down significantly when processing large data batches',
        severity: 'high',
        status: 'in-progress',
        reportedDate: new Date('2024-10-01'),
      },
    ],
    deliverables: [
      {
        name: 'EHR Integration Module',
        description: 'Core integration layer for EHR connectivity',
        dueDate: new Date('2024-06-30'),
        completed: true,
        completedDate: new Date('2024-06-25'),
      },
      {
        name: 'Patient Data Migration Tool',
        description: 'Automated tool for migrating existing patient data',
        dueDate: new Date('2024-09-30'),
        completed: true,
        completedDate: new Date('2024-09-28'),
      },
      {
        name: 'Clinical Dashboard',
        description: 'Real-time dashboard for clinicians',
        dueDate: new Date('2024-11-30'),
        completed: false,
      },
    ],
    tags: ['integration', 'ehr', 'clinical', 'high-priority'],
    reportingSettings: {
      frequency: 'weekly',
      includeFinancials: true,
      includeRisks: true,
    },
  },

  {
    projectId: 'PROJ-2024-002',
    projectCode: 'JANE-MOBILE',
    projectName: 'Mobile App Development',
    description:
      'Develop native mobile applications for iOS and Android to enhance patient engagement and provide on-the-go access',
    projectType: 'software',
    status: 'active',
    priority: 'high',
    healthStatus: 'yellow',
    startDate: new Date('2024-03-01'),
    plannedEndDate: new Date('2024-10-31'),
    department: 'engineering',
    budget: {
      total: 180000,
      spent: 95000,
      remaining: 85000,
      currency: 'USD',
    },
    progress: {
      overall: 65,
      milestones: {
        total: 6,
        completed: 4,
      },
      tasks: {
        total: 38,
        completed: 25,
        inProgress: 10,
        blocked: 3,
      },
    },
    objectives: [
      {
        title: 'Cross-Platform Compatibility',
        description: 'Ensure consistent experience across iOS and Android',
        completed: false,
        kpi: {
          metric: 'Feature Parity',
          target: 100,
          actual: 85,
          unit: '%',
        },
      },
      {
        title: 'User Adoption Rate',
        description: 'Achieve 60% patient adoption within first 3 months',
        completed: false,
        kpi: {
          metric: 'Adoption Rate',
          target: 60,
          actual: 0,
          unit: '%',
        },
      },
    ],
    risks: [
      {
        description: 'iOS App Store approval may delay launch',
        severity: 'medium',
        probability: 'medium',
        mitigation: 'Submit for review early and maintain app store guidelines compliance',
        status: 'identified',
        identifiedDate: new Date('2024-04-15'),
      },
    ],
    issues: [
      {
        title: 'Push notification reliability issues on Android',
        description: 'Some Android devices not receiving push notifications consistently',
        severity: 'medium',
        status: 'open',
        reportedDate: new Date('2024-09-15'),
      },
    ],
    tags: ['mobile', 'patient-engagement', 'ios', 'android'],
    reportingSettings: {
      frequency: 'bi-weekly',
      includeFinancials: true,
      includeRisks: true,
    },
  },

  {
    projectId: 'PROJ-2024-003',
    projectCode: 'JANE-AI',
    projectName: 'AI-Powered Clinical Decision Support',
    description:
      'Implement AI/ML models to provide clinical decision support and predictive analytics for patient outcomes',
    projectType: 'research',
    status: 'planning',
    priority: 'high',
    healthStatus: 'green',
    startDate: new Date('2024-11-01'),
    plannedEndDate: new Date('2025-06-30'),
    department: 'clinical',
    budget: {
      total: 300000,
      spent: 15000,
      remaining: 285000,
      currency: 'USD',
    },
    progress: {
      overall: 10,
      milestones: {
        total: 10,
        completed: 1,
      },
      tasks: {
        total: 52,
        completed: 5,
        inProgress: 8,
        blocked: 0,
      },
    },
    objectives: [
      {
        title: 'Develop Predictive Models',
        description: 'Create ML models for patient risk assessment',
        completed: false,
        kpi: {
          metric: 'Model Accuracy',
          target: 90,
          actual: 0,
          unit: '%',
        },
      },
      {
        title: 'Clinical Validation',
        description: 'Validate AI recommendations with clinical team',
        completed: false,
        kpi: {
          metric: 'Validation Score',
          target: 95,
          actual: 0,
          unit: '%',
        },
      },
    ],
    risks: [
      {
        description: 'Insufficient historical data for model training',
        severity: 'critical',
        probability: 'medium',
        mitigation: 'Partner with research institutions for additional datasets',
        status: 'identified',
        identifiedDate: new Date('2024-10-01'),
      },
    ],
    tags: ['ai', 'machine-learning', 'clinical', 'research'],
    reportingSettings: {
      frequency: 'monthly',
      includeFinancials: true,
      includeRisks: true,
    },
  },

  {
    projectId: 'PROJ-2024-004',
    projectCode: 'JANE-INFRA',
    projectName: 'Infrastructure Modernization',
    description: 'Upgrade cloud infrastructure to improve scalability, reliability, and security',
    projectType: 'infrastructure',
    status: 'completed',
    priority: 'critical',
    healthStatus: 'green',
    startDate: new Date('2023-09-01'),
    plannedEndDate: new Date('2024-03-31'),
    actualEndDate: new Date('2024-03-28'),
    department: 'operations',
    budget: {
      total: 150000,
      spent: 145000,
      remaining: 5000,
      currency: 'USD',
    },
    progress: {
      overall: 100,
      milestones: {
        total: 5,
        completed: 5,
      },
      tasks: {
        total: 32,
        completed: 32,
        inProgress: 0,
        blocked: 0,
      },
    },
    objectives: [
      {
        title: 'Zero-Downtime Migration',
        description: 'Migrate all services without customer-facing downtime',
        completed: true,
        completedDate: new Date('2024-03-15'),
        kpi: {
          metric: 'Uptime During Migration',
          target: 99.9,
          actual: 99.98,
          unit: '%',
        },
      },
      {
        title: 'Cost Optimization',
        description: 'Reduce infrastructure costs by 30%',
        completed: true,
        completedDate: new Date('2024-03-28'),
        kpi: {
          metric: 'Cost Reduction',
          target: 30,
          actual: 35,
          unit: '%',
        },
      },
    ],
    deliverables: [
      {
        name: 'Cloud Migration Plan',
        description: 'Detailed migration strategy and timeline',
        dueDate: new Date('2023-10-15'),
        completed: true,
        completedDate: new Date('2023-10-12'),
      },
      {
        name: 'Disaster Recovery System',
        description: 'Automated backup and recovery system',
        dueDate: new Date('2024-02-28'),
        completed: true,
        completedDate: new Date('2024-02-25'),
      },
    ],
    tags: ['infrastructure', 'cloud', 'completed', 'success'],
    reportingSettings: {
      frequency: 'weekly',
      includeFinancials: true,
      includeRisks: true,
    },
  },

  {
    projectId: 'PROJ-2024-005',
    projectCode: 'JANE-ANALYTICS',
    projectName: 'Advanced Analytics Platform',
    description:
      'Build comprehensive analytics platform for business intelligence and clinical insights',
    projectType: 'business',
    status: 'on-hold',
    priority: 'medium',
    healthStatus: 'red',
    startDate: new Date('2024-05-01'),
    plannedEndDate: new Date('2024-12-31'),
    department: 'finance',
    budget: {
      total: 120000,
      spent: 35000,
      remaining: 85000,
      currency: 'USD',
    },
    progress: {
      overall: 20,
      milestones: {
        total: 7,
        completed: 1,
      },
      tasks: {
        total: 40,
        completed: 8,
        inProgress: 0,
        blocked: 5,
      },
    },
    objectives: [
      {
        title: 'Real-Time Reporting',
        description: 'Enable real-time reporting for key business metrics',
        completed: false,
        kpi: {
          metric: 'Report Latency',
          target: 5,
          actual: 0,
          unit: 'minutes',
        },
      },
    ],
    risks: [
      {
        description: 'Project on hold due to budget reallocation',
        severity: 'critical',
        probability: 'high',
        mitigation: 'Awaiting Q4 budget review',
        status: 'occurred',
        identifiedDate: new Date('2024-08-01'),
      },
    ],
    issues: [
      {
        title: 'Resource shortage',
        description: 'Key team members reassigned to higher priority projects',
        severity: 'critical',
        status: 'open',
        reportedDate: new Date('2024-08-15'),
      },
    ],
    tags: ['analytics', 'business-intelligence', 'on-hold'],
    reportingSettings: {
      frequency: 'monthly',
      includeFinancials: true,
      includeRisks: true,
    },
  },
];

const sampleStages = [
  // Stages for PROJ-2024-001 (EHR Integration)
  {
    projectRef: 'PROJ-2024-001',
    stageName: 'Requirements Gathering',
    stageOrder: 1,
    stageType: 'initiation',
    status: 'completed',
    plannedStartDate: new Date('2024-01-15'),
    plannedEndDate: new Date('2024-02-15'),
    actualStartDate: new Date('2024-01-15'),
    actualEndDate: new Date('2024-02-12'),
    description: 'Gather and document all requirements from stakeholders',
    progress: {
      percentage: 100,
      tasksTotal: 8,
      tasksCompleted: 8,
    },
    budget: {
      allocated: 20000,
      spent: 19500,
    },
  },
  {
    projectRef: 'PROJ-2024-001',
    stageName: 'Architecture Design',
    stageOrder: 2,
    stageType: 'design',
    status: 'completed',
    plannedStartDate: new Date('2024-02-16'),
    plannedEndDate: new Date('2024-03-31'),
    actualStartDate: new Date('2024-02-16'),
    actualEndDate: new Date('2024-03-28'),
    description: 'Design system architecture and integration patterns',
    progress: {
      percentage: 100,
      tasksTotal: 12,
      tasksCompleted: 12,
    },
    budget: {
      allocated: 35000,
      spent: 34200,
    },
  },
  {
    projectRef: 'PROJ-2024-001',
    stageName: 'Development Phase 1',
    stageOrder: 3,
    stageType: 'development',
    status: 'completed',
    plannedStartDate: new Date('2024-04-01'),
    plannedEndDate: new Date('2024-06-30'),
    actualStartDate: new Date('2024-04-01'),
    actualEndDate: new Date('2024-06-28'),
    description: 'Develop core integration modules',
    progress: {
      percentage: 100,
      tasksTotal: 25,
      tasksCompleted: 25,
    },
    budget: {
      allocated: 80000,
      spent: 78000,
    },
  },
  {
    projectRef: 'PROJ-2024-001',
    stageName: 'Testing & QA',
    stageOrder: 4,
    stageType: 'testing',
    status: 'in-progress',
    plannedStartDate: new Date('2024-07-01'),
    plannedEndDate: new Date('2024-09-30'),
    actualStartDate: new Date('2024-07-01'),
    description: 'Comprehensive testing of all integration points',
    progress: {
      percentage: 75,
      tasksTotal: 18,
      tasksCompleted: 14,
    },
    budget: {
      allocated: 45000,
      spent: 32000,
    },
  },
  {
    projectRef: 'PROJ-2024-001',
    stageName: 'Deployment & Go-Live',
    stageOrder: 5,
    stageType: 'deployment',
    status: 'not-started',
    plannedStartDate: new Date('2024-10-01'),
    plannedEndDate: new Date('2024-11-30'),
    description: 'Deploy to production and monitor go-live',
    progress: {
      percentage: 0,
      tasksTotal: 15,
      tasksCompleted: 0,
    },
    budget: {
      allocated: 40000,
      spent: 0,
    },
  },
];

module.exports = {
  sampleProjects,
  sampleStages,
};
