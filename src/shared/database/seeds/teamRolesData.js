/**
 * Complete Team Structure with Roles, Salaries, and Requirements
 * For CloneJane Healthcare Platform Development
 */

const teamRoles = [
  // ============================================
  // EXECUTIVE TEAM
  // ============================================
  {
    roleId: 'EXEC-001',
    roleName: 'Chief Executive Officer (CEO)',
    roleCategory: 'executive',
    level: 'executive',
    responsibilities: {
      primary: [
        'Overall company strategy and vision',
        'Board relations and investor management',
        'High-level decision making',
        'Company culture and values',
        'Major partnerships and deals',
      ],
      secondary: ['Fundraising and financial strategy', 'Executive team leadership'],
      keyDeliverables: [
        'Annual strategic plan',
        'Quarterly board presentations',
        'Funding rounds execution',
      ],
    },
    requiredSkills: {
      technical: [],
      soft: ['Leadership', 'Strategic thinking', 'Communication', 'Negotiation', 'Decision making'],
      tools: [],
      certifications: ['MBA preferred'],
    },
    experience: {
      minYears: 15,
      maxYears: null,
      preferredIndustries: ['Healthcare', 'SaaS', 'Technology'],
      mustHaveExperience: ['C-level experience', 'P&L responsibility'],
    },
    compensation: {
      salaryRange: {
        min: 200000,
        max: 350000,
        currency: 'USD',
      },
      equity: {
        min: 5,
        max: 15,
      },
      benefits: ['Health insurance', 'Retirement plan', 'Executive bonus'],
      bonusStructure: {
        type: 'Performance-based',
        eligible: true,
        targetPercentage: 50,
      },
    },
    workType: 'full-time',
    location: 'hybrid',
    timeCommitment: {
      hoursPerWeek: 60,
      overtime: true,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'critical',
  },

  {
    roleId: 'EXEC-002',
    roleName: 'Chief Technology Officer (CTO)',
    roleCategory: 'executive',
    level: 'executive',
    responsibilities: {
      primary: [
        'Technology strategy and roadmap',
        'Engineering team leadership',
        'Architecture decisions',
        'Technology stack selection',
        'Innovation and R&D',
      ],
      secondary: ['Technical hiring', 'Vendor relationships'],
      keyDeliverables: [
        'Technology roadmap',
        'Engineering team performance',
        'System architecture',
      ],
    },
    requiredSkills: {
      technical: [
        { skill: 'Software Architecture', level: 'expert', mandatory: true },
        { skill: 'Cloud Infrastructure', level: 'expert', mandatory: true },
        { skill: 'Multiple Programming Languages', level: 'expert', mandatory: true },
      ],
      soft: ['Leadership', 'Strategic thinking', 'Communication'],
      tools: ['AWS/Azure/GCP', 'Docker', 'Kubernetes'],
      certifications: ['AWS/Azure Architect preferred'],
    },
    experience: {
      minYears: 12,
      maxYears: null,
      preferredIndustries: ['Healthcare IT', 'SaaS', 'Enterprise Software'],
      mustHaveExperience: ['Team leadership 50+', 'System architecture'],
    },
    compensation: {
      salaryRange: {
        min: 180000,
        max: 300000,
        currency: 'USD',
      },
      equity: {
        min: 3,
        max: 10,
      },
      benefits: ['Health insurance', 'Retirement plan', 'Executive bonus'],
      bonusStructure: {
        type: 'Performance-based',
        eligible: true,
        targetPercentage: 40,
      },
    },
    workType: 'full-time',
    location: 'hybrid',
    timeCommitment: {
      hoursPerWeek: 55,
      overtime: true,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'critical',
  },

  {
    roleId: 'EXEC-003',
    roleName: 'Chief Product Officer (CPO)',
    roleCategory: 'executive',
    level: 'executive',
    responsibilities: {
      primary: [
        'Product strategy and vision',
        'Product roadmap',
        'Market research and analysis',
        'Product team leadership',
        'Customer feedback integration',
      ],
      keyDeliverables: ['Product roadmap', 'Feature prioritization', 'Market analysis reports'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Product Management', level: 'expert', mandatory: true },
        { skill: 'Analytics', level: 'advanced', mandatory: true },
      ],
      soft: ['Strategic thinking', 'Communication', 'Leadership'],
      tools: ['Jira', 'Figma', 'Analytics tools'],
      certifications: [],
    },
    experience: {
      minYears: 10,
      maxYears: null,
      preferredIndustries: ['Healthcare', 'SaaS'],
      mustHaveExperience: ['Product leadership', 'B2B products'],
    },
    compensation: {
      salaryRange: {
        min: 160000,
        max: 250000,
        currency: 'USD',
      },
      equity: {
        min: 2,
        max: 8,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Performance-based',
        eligible: true,
        targetPercentage: 30,
      },
    },
    workType: 'full-time',
    location: 'hybrid',
    timeCommitment: {
      hoursPerWeek: 50,
      overtime: true,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'high',
  },

  // ============================================
  // ENGINEERING - BACKEND
  // ============================================
  {
    roleId: 'ENG-001',
    roleName: 'Senior Backend Engineer',
    roleCategory: 'engineering',
    level: 'senior',
    responsibilities: {
      primary: [
        'Design and build scalable backend systems',
        'API development and integration',
        'Database design and optimization',
        'Code review and mentoring',
        'Technical documentation',
      ],
      secondary: ['DevOps support', 'Performance optimization'],
      keyDeliverables: ['Backend APIs', 'Database schemas', 'Technical documentation'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Node.js/Express', level: 'expert', mandatory: true },
        { skill: 'MongoDB/PostgreSQL', level: 'advanced', mandatory: true },
        { skill: 'REST API Design', level: 'expert', mandatory: true },
        { skill: 'Microservices', level: 'advanced', mandatory: false },
        { skill: 'AWS/Cloud', level: 'advanced', mandatory: true },
      ],
      soft: ['Problem solving', 'Communication', 'Mentoring'],
      tools: ['Git', 'Docker', 'CI/CD', 'Postman'],
      certifications: [],
    },
    experience: {
      minYears: 5,
      maxYears: 10,
      preferredIndustries: ['Healthcare', 'Fintech', 'SaaS'],
      mustHaveExperience: ['Scalable systems', 'API development'],
    },
    compensation: {
      salaryRange: {
        min: 120000,
        max: 180000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 2,
      },
      benefits: ['Health insurance', 'Retirement plan', 'Learning budget'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 15,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 3,
      needed: 3,
    },
    priority: 'critical',
  },

  {
    roleId: 'ENG-002',
    roleName: 'Mid-Level Backend Engineer',
    roleCategory: 'engineering',
    level: 'mid',
    responsibilities: {
      primary: [
        'Implement backend features',
        'Write unit and integration tests',
        'Bug fixing and maintenance',
        'Code documentation',
        'Participate in code reviews',
      ],
      keyDeliverables: ['Feature implementations', 'Bug fixes', 'Test coverage'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Node.js/Express', level: 'advanced', mandatory: true },
        { skill: 'MongoDB', level: 'intermediate', mandatory: true },
        { skill: 'REST APIs', level: 'advanced', mandatory: true },
      ],
      soft: ['Teamwork', 'Learning agility', 'Communication'],
      tools: ['Git', 'Docker', 'Testing frameworks'],
      certifications: [],
    },
    experience: {
      minYears: 3,
      maxYears: 5,
      preferredIndustries: ['Any'],
      mustHaveExperience: ['Backend development', 'API integration'],
    },
    compensation: {
      salaryRange: {
        min: 80000,
        max: 120000,
        currency: 'USD',
      },
      equity: {
        min: 0.25,
        max: 1,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 10,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 4,
      needed: 4,
    },
    priority: 'high',
  },

  // ============================================
  // ENGINEERING - FRONTEND
  // ============================================
  {
    roleId: 'ENG-003',
    roleName: 'Senior Frontend Engineer',
    roleCategory: 'engineering',
    level: 'senior',
    responsibilities: {
      primary: [
        'Build responsive and performant UIs',
        'Component architecture and reusability',
        'Frontend performance optimization',
        'Code review and mentoring',
        'Collaborate with designers',
      ],
      keyDeliverables: ['UI components', 'Frontend architecture', 'Performance optimizations'],
    },
    requiredSkills: {
      technical: [
        { skill: 'React/React Native', level: 'expert', mandatory: true },
        { skill: 'JavaScript/TypeScript', level: 'expert', mandatory: true },
        { skill: 'CSS/SASS', level: 'advanced', mandatory: true },
        { skill: 'State Management (Redux/Context)', level: 'advanced', mandatory: true },
        { skill: 'Performance Optimization', level: 'advanced', mandatory: true },
      ],
      soft: ['Design sense', 'Communication', 'Mentoring'],
      tools: ['Git', 'Webpack/Vite', 'Jest', 'Figma'],
      certifications: [],
    },
    experience: {
      minYears: 5,
      maxYears: 10,
      preferredIndustries: ['Any'],
      mustHaveExperience: ['React applications', 'Mobile development'],
    },
    compensation: {
      salaryRange: {
        min: 110000,
        max: 170000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 2,
      },
      benefits: ['Health insurance', 'Retirement plan', 'Learning budget'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 15,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 2,
      needed: 2,
    },
    priority: 'critical',
  },

  {
    roleId: 'ENG-004',
    roleName: 'Mid-Level Frontend Engineer',
    roleCategory: 'engineering',
    level: 'mid',
    responsibilities: {
      primary: [
        'Implement UI features from designs',
        'Component development',
        'Frontend testing',
        'Bug fixing',
        'Cross-browser compatibility',
      ],
      keyDeliverables: ['UI components', 'Feature implementations', 'Bug fixes'],
    },
    requiredSkills: {
      technical: [
        { skill: 'React', level: 'advanced', mandatory: true },
        { skill: 'JavaScript', level: 'advanced', mandatory: true },
        { skill: 'CSS', level: 'intermediate', mandatory: true },
      ],
      soft: ['Attention to detail', 'Teamwork', 'Communication'],
      tools: ['Git', 'Chrome DevTools', 'Jest'],
      certifications: [],
    },
    experience: {
      minYears: 2,
      maxYears: 5,
      preferredIndustries: ['Any'],
      mustHaveExperience: ['React development'],
    },
    compensation: {
      salaryRange: {
        min: 75000,
        max: 115000,
        currency: 'USD',
      },
      equity: {
        min: 0.25,
        max: 1,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 10,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 3,
      needed: 3,
    },
    priority: 'high',
  },

  // ============================================
  // ENGINEERING - FULL STACK
  // ============================================
  {
    roleId: 'ENG-005',
    roleName: 'Full Stack Engineer',
    roleCategory: 'engineering',
    level: 'senior',
    responsibilities: {
      primary: [
        'End-to-end feature development',
        'Both frontend and backend implementation',
        'Database to UI integration',
        'API development and consumption',
        'Architecture decisions',
      ],
      keyDeliverables: [
        'Complete features',
        'Full stack implementations',
        'Technical documentation',
      ],
    },
    requiredSkills: {
      technical: [
        { skill: 'Node.js + React', level: 'expert', mandatory: true },
        { skill: 'Database (SQL/NoSQL)', level: 'advanced', mandatory: true },
        { skill: 'REST APIs', level: 'expert', mandatory: true },
        { skill: 'DevOps basics', level: 'intermediate', mandatory: false },
      ],
      soft: ['Versatility', 'Problem solving', 'Communication'],
      tools: ['Git', 'Docker', 'CI/CD'],
      certifications: [],
    },
    experience: {
      minYears: 4,
      maxYears: 8,
      preferredIndustries: ['Any'],
      mustHaveExperience: ['Full stack development'],
    },
    compensation: {
      salaryRange: {
        min: 100000,
        max: 160000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 1.5,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 12,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 2,
      needed: 2,
    },
    priority: 'high',
  },

  // ============================================
  // DEVOPS & INFRASTRUCTURE
  // ============================================
  {
    roleId: 'DEVOPS-001',
    roleName: 'DevOps Engineer',
    roleCategory: 'devops',
    level: 'senior',
    responsibilities: {
      primary: [
        'CI/CD pipeline management',
        'Infrastructure as code',
        'Cloud infrastructure management',
        'Monitoring and alerting',
        'Security and compliance',
      ],
      keyDeliverables: ['Automated deployments', 'Infrastructure setup', 'Monitoring dashboards'],
    },
    requiredSkills: {
      technical: [
        { skill: 'AWS/Azure/GCP', level: 'expert', mandatory: true },
        { skill: 'Docker/Kubernetes', level: 'advanced', mandatory: true },
        { skill: 'Terraform/CloudFormation', level: 'advanced', mandatory: true },
        { skill: 'CI/CD (Jenkins/GitLab)', level: 'expert', mandatory: true },
        { skill: 'Linux/Bash', level: 'advanced', mandatory: true },
      ],
      soft: ['Problem solving', 'Automation mindset', 'Communication'],
      tools: ['Git', 'Monitoring tools', 'Security scanners'],
      certifications: ['AWS/Azure certification preferred'],
    },
    experience: {
      minYears: 5,
      maxYears: 10,
      preferredIndustries: ['Any'],
      mustHaveExperience: ['Cloud infrastructure', 'CI/CD'],
    },
    compensation: {
      salaryRange: {
        min: 115000,
        max: 175000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 1.5,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 15,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 45,
      overtime: true,
    },
    headcount: {
      current: 0,
      planned: 2,
      needed: 2,
    },
    priority: 'critical',
  },

  // ============================================
  // QUALITY ASSURANCE
  // ============================================
  {
    roleId: 'QA-001',
    roleName: 'QA Engineer',
    roleCategory: 'quality-assurance',
    level: 'mid',
    responsibilities: {
      primary: [
        'Test planning and execution',
        'Automated test development',
        'Bug tracking and reporting',
        'Quality metrics tracking',
        'Test documentation',
      ],
      keyDeliverables: ['Test plans', 'Automated tests', 'Quality reports'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Test Automation', level: 'advanced', mandatory: true },
        { skill: 'Selenium/Cypress', level: 'advanced', mandatory: true },
        { skill: 'API Testing', level: 'advanced', mandatory: true },
        { skill: 'Programming (JS/Python)', level: 'intermediate', mandatory: true },
      ],
      soft: ['Attention to detail', 'Analytical thinking', 'Communication'],
      tools: ['Jira', 'Postman', 'Testing frameworks'],
      certifications: ['ISTQB preferred'],
    },
    experience: {
      minYears: 3,
      maxYears: 6,
      preferredIndustries: ['Healthcare preferred'],
      mustHaveExperience: ['Test automation', 'Web/mobile testing'],
    },
    compensation: {
      salaryRange: {
        min: 70000,
        max: 110000,
        currency: 'USD',
      },
      equity: {
        min: 0.25,
        max: 0.75,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 10,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 2,
      needed: 2,
    },
    priority: 'high',
  },

  // ============================================
  // DESIGN
  // ============================================
  {
    roleId: 'DESIGN-001',
    roleName: 'Senior UI/UX Designer',
    roleCategory: 'design',
    level: 'senior',
    responsibilities: {
      primary: [
        'User research and analysis',
        'UI/UX design for web and mobile',
        'Design system creation',
        'Prototyping and wireframing',
        'Usability testing',
      ],
      keyDeliverables: ['UI designs', 'Design system', 'Prototypes', 'User research findings'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Figma', level: 'expert', mandatory: true },
        { skill: 'Design Systems', level: 'advanced', mandatory: true },
        { skill: 'User Research', level: 'advanced', mandatory: true },
        { skill: 'Prototyping', level: 'expert', mandatory: true },
      ],
      soft: ['Creativity', 'Communication', 'Empathy'],
      tools: ['Figma', 'Adobe Creative Suite', 'Prototyping tools'],
      certifications: [],
    },
    experience: {
      minYears: 5,
      maxYears: 10,
      preferredIndustries: ['Healthcare', 'SaaS'],
      mustHaveExperience: ['B2B product design', 'Design systems'],
    },
    compensation: {
      salaryRange: {
        min: 95000,
        max: 145000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 1.5,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 12,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'high',
  },

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================
  {
    roleId: 'PROD-001',
    roleName: 'Senior Product Manager',
    roleCategory: 'product',
    level: 'senior',
    responsibilities: {
      primary: [
        'Product strategy and roadmap',
        'Feature prioritization',
        'Stakeholder management',
        'Market research',
        'Product analytics',
      ],
      keyDeliverables: ['Product roadmap', 'Feature specs', 'Success metrics'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Product Management', level: 'expert', mandatory: true },
        { skill: 'Analytics', level: 'advanced', mandatory: true },
        { skill: 'Technical Understanding', level: 'intermediate', mandatory: true },
      ],
      soft: ['Leadership', 'Communication', 'Strategic thinking'],
      tools: ['Jira', 'Figma', 'Analytics platforms', 'SQL'],
      certifications: [],
    },
    experience: {
      minYears: 5,
      maxYears: 10,
      preferredIndustries: ['Healthcare', 'SaaS'],
      mustHaveExperience: ['B2B products', 'Healthcare preferred'],
    },
    compensation: {
      salaryRange: {
        min: 110000,
        max: 160000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 2,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Performance-based',
        eligible: true,
        targetPercentage: 20,
      },
    },
    workType: 'full-time',
    location: 'hybrid',
    timeCommitment: {
      hoursPerWeek: 45,
      overtime: true,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'high',
  },

  // ============================================
  // DATA & ANALYTICS
  // ============================================
  {
    roleId: 'DATA-001',
    roleName: 'Data Engineer',
    roleCategory: 'data',
    level: 'mid',
    responsibilities: {
      primary: [
        'Data pipeline development',
        'ETL processes',
        'Data warehouse management',
        'Data quality and validation',
        'Analytics infrastructure',
      ],
      keyDeliverables: ['Data pipelines', 'Analytics dashboards', 'Data quality reports'],
    },
    requiredSkills: {
      technical: [
        { skill: 'SQL', level: 'expert', mandatory: true },
        { skill: 'Python', level: 'advanced', mandatory: true },
        { skill: 'ETL Tools', level: 'advanced', mandatory: true },
        { skill: 'Data Warehousing', level: 'advanced', mandatory: true },
      ],
      soft: ['Analytical thinking', 'Problem solving', 'Communication'],
      tools: ['SQL databases', 'Python', 'Airflow', 'Tableau/PowerBI'],
      certifications: [],
    },
    experience: {
      minYears: 3,
      maxYears: 6,
      preferredIndustries: ['Healthcare', 'Analytics'],
      mustHaveExperience: ['Data pipelines', 'SQL'],
    },
    compensation: {
      salaryRange: {
        min: 85000,
        max: 130000,
        currency: 'USD',
      },
      equity: {
        min: 0.25,
        max: 1,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 10,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'medium',
  },

  // ============================================
  // SECURITY
  // ============================================
  {
    roleId: 'SEC-001',
    roleName: 'Security Engineer',
    roleCategory: 'security',
    level: 'senior',
    responsibilities: {
      primary: [
        'Security architecture',
        'Vulnerability assessment',
        'HIPAA compliance',
        'Security monitoring',
        'Incident response',
      ],
      keyDeliverables: ['Security policies', 'Compliance reports', 'Security audits'],
    },
    requiredSkills: {
      technical: [
        { skill: 'Security Architecture', level: 'expert', mandatory: true },
        { skill: 'HIPAA Compliance', level: 'expert', mandatory: true },
        { skill: 'Penetration Testing', level: 'advanced', mandatory: true },
        { skill: 'Security Tools', level: 'advanced', mandatory: true },
      ],
      soft: ['Attention to detail', 'Problem solving', 'Communication'],
      tools: ['Security scanners', 'SIEM tools', 'Penetration testing tools'],
      certifications: ['CISSP, CEH, or similar required'],
    },
    experience: {
      minYears: 5,
      maxYears: 10,
      preferredIndustries: ['Healthcare required'],
      mustHaveExperience: ['HIPAA compliance', 'Security architecture'],
    },
    compensation: {
      salaryRange: {
        min: 120000,
        max: 180000,
        currency: 'USD',
      },
      equity: {
        min: 0.5,
        max: 1.5,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Annual',
        eligible: true,
        targetPercentage: 15,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: true,
    },
    headcount: {
      current: 0,
      planned: 1,
      needed: 1,
    },
    priority: 'critical',
  },

  // ============================================
  // SUPPORT & OPERATIONS
  // ============================================
  {
    roleId: 'OPS-001',
    roleName: 'Customer Success Manager',
    roleCategory: 'operations',
    level: 'mid',
    responsibilities: {
      primary: [
        'Customer onboarding',
        'Account management',
        'Customer training',
        'Issue resolution',
        'Customer feedback collection',
      ],
      keyDeliverables: [
        'Customer satisfaction scores',
        'Onboarding completions',
        'Support tickets resolution',
      ],
    },
    requiredSkills: {
      technical: [
        { skill: 'Product Knowledge', level: 'advanced', mandatory: true },
        { skill: 'CRM Tools', level: 'intermediate', mandatory: true },
      ],
      soft: ['Communication', 'Empathy', 'Problem solving', 'Customer focus'],
      tools: ['CRM', 'Support ticketing', 'Product'],
      certifications: [],
    },
    experience: {
      minYears: 2,
      maxYears: 5,
      preferredIndustries: ['Healthcare', 'SaaS'],
      mustHaveExperience: ['Customer success', 'B2B'],
    },
    compensation: {
      salaryRange: {
        min: 55000,
        max: 85000,
        currency: 'USD',
      },
      equity: {
        min: 0.1,
        max: 0.5,
      },
      benefits: ['Health insurance', 'Retirement plan'],
      bonusStructure: {
        type: 'Customer satisfaction based',
        eligible: true,
        targetPercentage: 15,
      },
    },
    workType: 'full-time',
    location: 'remote',
    timeCommitment: {
      hoursPerWeek: 40,
      overtime: false,
    },
    headcount: {
      current: 0,
      planned: 2,
      needed: 2,
    },
    priority: 'medium',
  },
];

module.exports = teamRoles;
