# Seed Complete 370 Tasks - Data Structure

## 📊 Database Schema

### Sprint Model

```javascript
Sprint {
  // Identification
  _id: ObjectId,                          // MongoDB auto-generated
  sprintId: "SPRINT-001",                 // Formatted sprint ID
  sprintNumber: 1,                        // Sequential number

  // Basic Info
  name: "Foundation & Authentication",    // Sprint name
  status: "active" | "planning" | "completed" | "cancelled",
  startDate: Date,                        // Sprint start
  endDate: Date,                          // Sprint end
  duration: 14,                           // Days

  // Sprint Details
  focus: "Foundation & Authentication",   // Main focus area
  modules: ["Foundation & Authentication"], // Modules covered
  goals: [
    {
      description: String,                // Goal description
      completed: Boolean,                 // Goal status
      priority: "critical" | "high" | "medium" | "low"
    }
  ],

  // Capacity Planning
  capacity: {
    totalStoryPoints: 89,                // Total points
    plannedVelocity: 89,                 // Planned completion
    actualVelocity: 0,                   // Actual completed
    teamCapacity: 356                    // Available hours
  },

  // Task Summary
  taskSummary: {
    total: 20,                           // Total tasks
    completed: 0,                        // Completed tasks
    inProgress: 0,                       // In-progress tasks
    todo: 20,                            // Todo tasks
    blocked: 0                           // Blocked tasks
  },

  // Task References
  tasks: [ObjectId],                     // References to DevelopmentTask

  // Technical Documentation
  technicalDetails: {
    sprintOverview: String,              // Sprint overview
    totalTasks: Number,                  // Task count
    estimatedStoryPoints: Number,        // Story points
    timeline: String                     // Timeline string
  },

  // Timestamps
  createdAt: Date,                       // Auto-generated
  updatedAt: Date                        // Auto-generated
}
```

### DevelopmentTask Model

```javascript
DevelopmentTask {
  // Identification
  _id: ObjectId,                         // MongoDB auto-generated
  taskId: "TASK-1.1",                    // Formatted task ID
  moduleId: "1",                         // Module number
  moduleName: "Module 1",                // Module name
  taskNumber: "1.1",                     // Task number

  // Basic Info
  title: "User Registration System",    // Task title
  description: String,                   // Detailed description
  status: "todo" | "in_progress" | "in_review" | "testing" | "completed" | "blocked" | "cancelled",
  priority: "critical" | "high" | "medium" | "low",

  // Sprint Assignment
  sprint: ObjectId,                      // Reference to Sprint
  sprintNumber: 1,                       // Sprint number (denormalized)

  // Estimation
  storyPoints: 5,                        // Story points
  estimatedDuration: {
    days: 3,                             // Estimated days
    hours: 20                            // Estimated hours
  },
  actualDuration: {
    days: Number,                        // Actual days
    hours: Number                        // Actual hours
  },

  // Assignment
  assignedTo: ObjectId,                  // User reference
  assignedRole: "Senior Backend Engineer", // Role name
  createdBy: ObjectId,                   // User reference

  // Technical Requirements
  technicalRequirements: [
    {
      requirement: String,               // Requirement description
      completed: Boolean                 // Completion status
    }
  ],

  // Dependencies
  dependencies: [
    {
      taskId: String,                    // Related task ID
      type: "blocks" | "blocked_by" | "related_to",
      description: String                // Dependency description
    }
  ],
  isBlocked: Boolean,                    // Is task blocked?
  blockedReason: String,                 // Reason for block
  blockedDate: Date,                     // When blocked

  // Subtasks
  subtasks: [
    {
      title: String,                     // Subtask title
      description: String,               // Subtask description
      estimatedHours: Number,            // Estimated hours
      actualHours: Number,               // Actual hours
      completed: Boolean,                // Completion status
      completedAt: Date,                 // Completion timestamp
      assignedTo: ObjectId,              // User reference
      order: Number                      // Display order
    }
  ],

  // Test Cases
  testCases: [
    {
      testId: String,                    // Test identifier
      testName: String,                  // Test name
      input: String,                     // Test input
      expectedOutput: String,            // Expected output
      acceptanceCriteria: [String],      // Acceptance criteria
      status: "pending" | "passed" | "failed" | "skipped",
      executedBy: ObjectId,              // User reference
      executedAt: Date,                  // Execution timestamp
      notes: String                      // Test notes
    }
  ],

  // Files
  filesToCreate: [
    {
      path: String,                      // File path
      type: "model" | "route" | "controller" | "service" | "middleware" | "component" | "page" | "test" | "config" | "other",
      status: "pending" | "created" | "reviewed" | "merged",
      createdAt: Date                    // Creation timestamp
    }
  ],
  filesToModify: [
    {
      path: String,                      // File path
      changes: String,                   // Change description
      status: "pending" | "modified" | "reviewed" | "merged",
      modifiedAt: Date                   // Modification timestamp
    }
  ],

  // Code Review
  codeReview: {
    required: Boolean,                   // Is review required?
    reviewer: ObjectId,                  // User reference
    status: "pending" | "in_review" | "changes_requested" | "approved" | "not_required",
    comments: [
      {
        author: ObjectId,                // User reference
        comment: String,                 // Comment text
        severity: "blocker" | "major" | "minor" | "suggestion",
        resolved: Boolean,               // Is resolved?
        createdAt: Date                  // Comment timestamp
      }
    ],
    approvedAt: Date                     // Approval timestamp
  },

  // Quality Assurance
  qa: {
    required: Boolean,                   // Is QA required?
    tester: ObjectId,                    // User reference
    status: "pending" | "in_testing" | "failed" | "passed" | "not_required",
    testResults: [
      {
        testCase: String,                // Test case name
        result: "passed" | "failed" | "skipped",
        notes: String,                   // Test notes
        testedAt: Date                   // Test timestamp
      }
    ],
    passedAt: Date                       // Pass timestamp
  },

  // Git Integration
  gitBranch: String,                     // Git branch name
  pullRequest: {
    url: String,                         // PR URL
    number: Number,                      // PR number
    status: "open" | "merged" | "closed" | "draft",
    createdAt: Date,                     // PR creation date
    mergedAt: Date                       // PR merge date
  },
  commits: [
    {
      hash: String,                      // Commit hash
      message: String,                   // Commit message
      author: String,                    // Author name
      date: Date                         // Commit date
    }
  ],

  // Progress Tracking
  progress: {
    percentage: 0,                       // 0-100
    lastUpdated: Date                    // Last update timestamp
  },

  // Time Tracking
  timeTracking: {
    startedAt: Date,                     // Start timestamp
    completedAt: Date,                   // Completion timestamp
    totalHoursSpent: 0,                  // Total hours
    timeEntries: [
      {
        user: ObjectId,                  // User reference
        hours: Number,                   // Hours logged
        description: String,             // Work description
        date: Date                       // Entry date
      }
    ]
  },

  // Documentation
  documentation: {
    required: Boolean,                   // Is docs required?
    status: "pending" | "in_progress" | "completed" | "not_required",
    links: [
      {
        title: String,                   // Link title
        url: String,                     // Link URL
        type: "api_docs" | "technical_spec" | "user_guide" | "readme" | "other"
      }
    ]
  },

  // Comments and Notes
  comments: [
    {
      user: ObjectId,                    // User reference
      comment: String,                   // Comment text
      createdAt: Date                    // Comment timestamp
    }
  ],
  notes: String,                         // JSON string with original data:
  // {
  //   techStack: String,
  //   acceptanceCriteria: [String],
  //   originalDescription: String,
  //   originalStatus: String,
  //   originalPriority: String
  // }

  // Metadata
  tags: [String],                        // Auto-generated tags
  labels: [
    {
      name: String,                      // Label name
      color: String                      // Label color (hex)
    }
  ],

  // Timestamps
  createdAt: Date,                       // Auto-generated
  updatedAt: Date                        // Auto-generated
}
```

## 🔗 Relationships

```
Sprint (1) ──────< (Many) DevelopmentTask
   │                         │
   │                         │
   ├─ sprintId              ├─ taskId
   ├─ sprintNumber          ├─ sprint (ObjectId → Sprint._id)
   ├─ name                  ├─ sprintNumber (denormalized)
   ├─ capacity              ├─ title
   ├─ taskSummary           ├─ description
   └─ tasks: [ObjectId]     ├─ storyPoints
                            ├─ status
                            ├─ priority
                            └─ assignedRole
```

## 📋 Data Flow Diagram

```
extracted-all-tasks.json
{
  "project_name": "...",
  "total_sprints": 18,
  "total_tasks": 370,
  "sprints": [
    {
      "sprint_number": 1,
      "name": "...",
      "tasks": [
        {
          "task_id": "TASK-1.1",
          "title": "...",
          "points": 5,
          ...
        }
      ]
    }
  ]
}
           ↓
    [Load & Parse]
           ↓
      [Clear DB]
    - Sprint.deleteMany({})
    - DevelopmentTask.deleteMany({})
           ↓
   [Create Sprints]
    For each sprint in JSON:
    - Parse timeline → dates
    - Map fields → Sprint schema
    - Create Sprint document
    - Store Sprint._id in map
           ↓
    [Create Tasks]
    For each task in sprint.tasks:
    - Get sprint._id from map
    - Map fields → DevelopmentTask schema
    - Auto-generate tags
    - Auto-assign role
    - Store original data in notes
    - Create DevelopmentTask document
           ↓
   [Link Tasks to Sprints]
    For each Sprint:
    - Find all tasks with sprint._id
    - Update Sprint.tasks array
           ↓
  [Return Statistics]
    {
      summary: { ... },
      sprintBreakdown: [ ... ],
      tasksByStatus: { ... }
    }
```

## 🎨 Visual Schema

```
┌─────────────────────────────────────────────────────────────┐
│                         Sprint                              │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId("...")                                        │
│ sprintId: "SPRINT-001"                                      │
│ sprintNumber: 1                                             │
│ name: "Foundation & Authentication"                         │
│ status: "active"                                            │
│ capacity: { totalStoryPoints: 89, ... }                     │
│ taskSummary: { total: 20, todo: 20, ... }                  │
│ tasks: [ObjectId("..."), ObjectId("..."), ...]              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ One-to-Many
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DevelopmentTask                          │
├─────────────────────────────────────────────────────────────┤
│ _id: ObjectId("...")                                        │
│ taskId: "TASK-1.1"                                          │
│ title: "User Registration System"                           │
│ sprint: ObjectId("...")  ←──────────┐                       │
│ sprintNumber: 1                     │ Foreign Key          │
│ storyPoints: 5                      │                       │
│ status: "todo"                      │                       │
│ priority: "high"                    │                       │
│ tags: ["auth", "api"]               │                       │
│ notes: '{"techStack": "...", ...}'  │                       │
└─────────────────────────────────────┴───────────────────────┘
```

## 🗂️ Collection Structure

```
Database: expojane (or test database)

Collections:
├── sprints
│   ├── Document 1 (Sprint 1)
│   ├── Document 2 (Sprint 2)
│   ├── ...
│   └── Document 18 (Sprint 18)
│
└── developmenttasks
    ├── Document 1 (TASK-1.1)
    ├── Document 2 (TASK-1.2)
    ├── ...
    └── Document 370 (TASK-18.16)
```

## 📈 Index Structure

### Sprint Indexes
```javascript
{
  sprintNumber: 1,               // Unique index
  status: 1,                     // Query optimization
  startDate: 1, endDate: 1       // Date range queries
}
```

### DevelopmentTask Indexes
```javascript
{
  taskId: 1,                     // Unique index
  moduleId: 1, taskNumber: 1,    // Compound index
  sprint: 1, status: 1,          // Compound index
  assignedTo: 1, status: 1,      // Compound index
  priority: 1, status: 1,        // Compound index
  sprintNumber: 1, status: 1     // Compound index
}
```

## 🔍 Query Examples

### Get Sprint with Tasks
```javascript
const sprint = await Sprint.findOne({ sprintNumber: 1 })
  .populate('tasks')
  .exec();
```

### Get Tasks for Sprint
```javascript
const tasks = await DevelopmentTask.find({ sprintNumber: 1 })
  .populate('sprint')
  .sort({ taskNumber: 1 })
  .exec();
```

### Get High Priority Tasks
```javascript
const tasks = await DevelopmentTask.find({ priority: 'high' })
  .populate('sprint', 'name sprintNumber')
  .exec();
```

### Get Task with Technical Details
```javascript
const task = await DevelopmentTask.findOne({ taskId: 'TASK-1.1' });
const technicalDetails = JSON.parse(task.notes);
console.log(technicalDetails.techStack);
console.log(technicalDetails.acceptanceCriteria);
```

## 💾 Storage Size Estimates

### Per Document
- Sprint: ~2-5 KB (including metadata)
- DevelopmentTask: ~3-8 KB (including all fields)

### Total Database Size
- 18 Sprints: ~90 KB
- 370 Tasks: ~2.5 MB
- Indexes: ~500 KB
- **Total: ~3 MB** (uncompressed)

## 🎯 Key Features

✅ **Referential Integrity**
- Tasks reference sprints via ObjectId
- Denormalized sprintNumber for quick queries

✅ **Data Preservation**
- Original JSON data stored in notes field
- All source information accessible

✅ **Query Optimization**
- Strategic indexes on common query fields
- Compound indexes for complex queries

✅ **Flexibility**
- Mixed type fields for extensibility
- JSON storage for dynamic data

✅ **Scalability**
- Efficient document structure
- Optimized for read-heavy workloads

---

**Last Updated**: October 11, 2025
