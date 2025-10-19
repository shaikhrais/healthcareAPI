const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Automation Agent Model
 * AI-powered agents that can understand, plan, and implement features autonomously
 */
const automationAgentSchema = new mongoose.Schema(
  {
    // Agent Identification
    agentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
    },
    agentType: {
      type: String,
      enum: [
        'code-generator', // Generates code from requirements
        'architect', // Designs system architecture
        'tester', // Writes and executes tests
        'reviewer', // Reviews code quality
        'debugger', // Finds and fixes bugs
        'optimizer', // Optimizes performance
        'documenter', // Generates documentation
        'integrator', // Integrates components
        'orchestrator', // Coordinates multiple agents
        'learner', // Learns from patterns
      ],
      required: true,
      index: true,
    },

    // Agent Capabilities
    capabilities: {
      languages: [
        {
          type: String,
          enum: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'sql'],
        },
      ],
      frameworks: [String], // React, Vue, Angular, Express, Django, etc.
      technologies: [String], // MongoDB, Redis, Docker, AWS, etc.
      patterns: [String], // MVC, REST, GraphQL, Microservices, etc.

      maxComplexity: {
        type: String,
        enum: ['simple', 'moderate', 'complex', 'advanced'],
        default: 'moderate',
      },

      specializations: [
        {
          type: String,
          enum: [
            'frontend',
            'backend',
            'database',
            'api',
            'security',
            'testing',
            'devops',
            'mobile',
            'ai-ml',
            'full-stack',
          ],
        },
      ],
    },

    // AI Configuration
    aiConfig: {
      model: {
        type: String,
        default: 'gpt-4', // AI model to use
      },
      temperature: {
        type: Number,
        min: 0,
        max: 2,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
        default: 4000,
      },
      contextWindow: {
        type: Number,
        default: 8000,
      },

      // Learning configuration
      learningEnabled: {
        type: Boolean,
        default: true,
      },
      feedbackWeight: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
    },

    // Agent Status
    status: {
      type: String,
      enum: ['idle', 'busy', 'learning', 'error', 'maintenance', 'offline'],
      default: 'idle',
      index: true,
    },

    currentTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationTask',
    },

    // Performance Metrics
    metrics: {
      tasksCompleted: {
        type: Number,
        default: 0,
      },
      tasksSuccessful: {
        type: Number,
        default: 0,
      },
      tasksFailed: {
        type: Number,
        default: 0,
      },
      averageCompletionTime: {
        type: Number, // in minutes
        default: 0,
      },
      successRate: {
        type: Number, // percentage
        min: 0,
        max: 100,
        default: 0,
      },
      qualityScore: {
        type: Number, // 0-100
        min: 0,
        max: 100,
        default: 50,
      },

      // Code quality metrics
      codeQuality: {
        averageComplexity: Number,
        averageMaintainability: Number,
        averageTestCoverage: Number,
        averageBugRate: Number,
      },
    },

    // Learning Data
    learningData: {
      patternsLearned: [
        {
          patternType: String,
          patternName: String,
          confidence: Number, // 0-1
          usageCount: Number,
          successRate: Number,
          learnedAt: Date,
        },
      ],

      knowledgeBase: [
        {
          category: String,
          topic: String,
          content: String,
          relevanceScore: Number,
          lastUpdated: Date,
        },
      ],

      codeSnippets: [
        {
          language: String,
          purpose: String,
          code: String,
          usageCount: Number,
          rating: Number,
          tags: [String],
        },
      ],

      bestPractices: [
        {
          domain: String,
          practice: String,
          rationale: String,
          examples: [String],
        },
      ],
    },

    // Agent History
    taskHistory: [
      {
        task: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AutomationTask',
        },
        startTime: Date,
        endTime: Date,
        duration: Number, // minutes
        status: String,
        outcome: String,
        qualityScore: Number,
        feedback: String,
      },
    ],

    // Collaboration
    collaborations: [
      {
        withAgent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AutomationAgent',
        },
        taskCount: Number,
        successRate: Number,
        averageSynergy: Number, // How well they work together
      },
    ],

    // Configuration
    settings: {
      autoStart: {
        type: Boolean,
        default: true,
      },
      maxConcurrentTasks: {
        type: Number,
        default: 1,
      },
      priorityThreshold: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      requiresHumanReview: {
        type: Boolean,
        default: true,
      },
      autoLearn: {
        type: Boolean,
        default: true,
      },
    },

    // Metadata
    version: {
      type: String,
      default: '1.0.0',
    },
    lastActive: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
automationAgentSchema.index({ agentType: 1, status: 1 });
automationAgentSchema.index({ 'capabilities.specializations': 1 });
automationAgentSchema.index({ status: 1, isActive: 1 });

// Virtuals

// Calculate efficiency
automationAgentSchema.virtual('efficiency').get(function () {
  if (this.metrics.tasksCompleted === 0) return 0;
  return ((this.metrics.tasksSuccessful / this.metrics.tasksCompleted) * 100).toFixed(2);
});

// Check if overloaded
automationAgentSchema.virtual('isOverloaded').get(function () {
  return this.status === 'busy' && this.currentTask !== null;
});

// Static methods

// Find available agents for task
automationAgentSchema.statics.findAvailableAgents = async function (requirements) {
  const query = {
    status: 'idle',
    isActive: true,
  };

  if (requirements.agentType) {
    query.agentType = requirements.agentType;
  }

  if (requirements.specialization) {
    query['capabilities.specializations'] = requirements.specialization;
  }

  if (requirements.language) {
    query['capabilities.languages'] = requirements.language;
  }

  return this.find(query).sort({ 'metrics.qualityScore': -1, 'metrics.successRate': -1 });
};

// Find best agent for task
automationAgentSchema.statics.findBestAgent = async function (taskRequirements) {
  const agents = await this.findAvailableAgents(taskRequirements);

  if (agents.length === 0) return null;

  // Score each agent based on multiple factors
  const scoredAgents = agents.map((agent) => {
    let score = 0;

    // Base score from quality and success rate
    score += agent.metrics.qualityScore * 0.4;
    score += agent.metrics.successRate * 0.3;

    // Bonus for specialization match
    if (
      taskRequirements.specialization &&
      agent.capabilities.specializations.includes(taskRequirements.specialization)
    ) {
      score += 20;
    }

    // Bonus for experience
    score += Math.min(agent.metrics.tasksCompleted / 10, 10);

    return {
      agent,
      score,
    };
  });

  // Sort by score and return best
  scoredAgents.sort((a, b) => b.score - a.score);
  return scoredAgents[0].agent;
};

// Get agents by type
automationAgentSchema.statics.getByType = async function (agentType) {
  return this.find({
    agentType,
    isActive: true,
  }).sort({ 'metrics.qualityScore': -1 });
};

// Get top performers
automationAgentSchema.statics.getTopPerformers = async function (limit = 10) {
  return this.find({
    isActive: true,
    'metrics.tasksCompleted': { $gte: 5 },
  })
    .sort({ 'metrics.qualityScore': -1, 'metrics.successRate': -1 })
    .limit(limit);
};

// Instance methods

// Assign task
automationAgentSchema.methods.assignTask = async function (taskId) {
  if (this.status !== 'idle') {
    throw new Error('Agent is not available');
  }

  this.status = 'busy';
  this.currentTask = taskId;
  this.lastActive = new Date();

  return this.save();
};

// Complete task
automationAgentSchema.methods.completeTask = async function (taskId, outcome, qualityScore) {
  this.status = 'idle';
  this.currentTask = null;
  this.lastActive = new Date();

  this.metrics.tasksCompleted += 1;

  if (outcome === 'success') {
    this.metrics.tasksSuccessful += 1;
  } else {
    this.metrics.tasksFailed += 1;
  }

  // Update success rate
  this.metrics.successRate = (this.metrics.tasksSuccessful / this.metrics.tasksCompleted) * 100;

  // Update quality score (rolling average)
  if (qualityScore) {
    const totalQuality =
      this.metrics.qualityScore * (this.metrics.tasksCompleted - 1) + qualityScore;
    this.metrics.qualityScore = totalQuality / this.metrics.tasksCompleted;
  }

  return this.save();
};

// Learn from task
automationAgentSchema.methods.learnFromTask = async function (learningData) {
  if (!this.aiConfig.learningEnabled) return this;

  // Add patterns
  if (learningData.patterns) {
    for (const pattern of learningData.patterns) {
      const existing = this.learningData.patternsLearned.find(
        (p) => p.patternName === pattern.name
      );

      if (existing) {
        existing.usageCount += 1;
        existing.confidence = Math.min(existing.confidence + 0.1, 1);
      } else {
        this.learningData.patternsLearned.push({
          patternType: pattern.type,
          patternName: pattern.name,
          confidence: 0.5,
          usageCount: 1,
          successRate: 100,
          learnedAt: new Date(),
        });
      }
    }
  }

  // Add code snippets
  if (learningData.codeSnippets) {
    for (const snippet of learningData.codeSnippets) {
      this.learningData.codeSnippets.push({
        ...snippet,
        usageCount: 1,
        rating: 5,
      });
    }
  }

  // Add to knowledge base
  if (learningData.knowledge) {
    this.learningData.knowledgeBase.push({
      ...learningData.knowledge,
      relevanceScore: 1,
      lastUpdated: new Date(),
    });
  }

  return this.save();
};

// Get agent capabilities summary
automationAgentSchema.methods.getCapabilitiesSummary = function () {
  return {
    agentId: this.agentId,
    agentName: this.agentName,
    type: this.agentType,
    languages: this.capabilities.languages,
    specializations: this.capabilities.specializations,
    maxComplexity: this.capabilities.maxComplexity,
    status: this.status,
    performance: {
      tasksCompleted: this.metrics.tasksCompleted,
      successRate: this.metrics.successRate,
      qualityScore: this.metrics.qualityScore,
    },
  };
};

// Pre-save middleware
automationAgentSchema.pre('save', function (next) {
  this.lastActive = new Date();
  next();
});

module.exports = mongoose.model('AutomationAgent', automationAgentSchema);
