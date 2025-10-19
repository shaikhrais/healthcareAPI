# Seed Complete 370 Tasks - Documentation

## Overview

This route loads all 370 tasks from the extracted JSON file (`extracted-all-tasks.json`) and creates a complete database seed with:
- **18 sprints** with full metadata (timeline, story points, goals)
- **370 development tasks** with proper sprint references
- **Complete technical details** including tech stack and acceptance criteria
- **2034 total story points** across all sprints

## API Endpoints

### POST /api/seed/complete-370-tasks

Seeds the complete project with all 370 tasks.

**Request:**
```bash
curl -X POST http://localhost:3001/api/seed/complete-370-tasks
```

**Response:**
```json
{
  "success": true,
  "message": "🎉 Successfully seeded 370 tasks across 18 sprints!",
  "summary": {
    "totalSprints": 18,
    "totalTasks": 370,
    "totalStoryPoints": 2034,
    "averagePointsPerTask": 5.5,
    "tasksByStatus": {
      "planned": 370,
      "todo": 0,
      "in_progress": 0,
      "completed": 0
    }
  },
  "sprintBreakdown": [
    {
      "sprintNumber": 1,
      "name": "Foundation & Authentication",
      "tasksCount": 20,
      "storyPoints": 89
    }
    // ... 17 more sprints
  ],
  "dataSource": {
    "file": "extracted-all-tasks.json",
    "projectName": "Jane Clone - Healthcare Practice Management System",
    "durationWeeks": 36
  },
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

### GET /api/seed/complete-370-tasks/verify

Verifies the seeded data and provides statistics.

**Request:**
```bash
curl http://localhost:3001/api/seed/complete-370-tasks/verify
```

**Response:**
```json
{
  "success": true,
  "verification": {
    "totalSprints": 18,
    "totalTasks": 370,
    "expectedSprints": 18,
    "expectedTasks": 370,
    "isComplete": true
  },
  "sprints": [
    {
      "sprintNumber": 1,
      "name": "Foundation & Authentication",
      "storyPoints": 89,
      "tasksTotal": 20
    }
    // ... more sprints
  ],
  "tasksByStatus": [
    {
      "_id": "todo",
      "count": 370,
      "totalPoints": 2034
    }
  ],
  "tasksBySprint": [
    {
      "_id": 1,
      "count": 20,
      "totalPoints": 89
    }
    // ... more sprints
  ],
  "timestamp": "2025-01-10T12:00:00.000Z"
}
```

## How It Works

### 1. Data Loading
- Reads `extracted-all-tasks.json` from the backend directory
- Parses the complete project structure with all sprints and tasks
- Validates the data structure

### 2. Data Clearing
- Deletes all existing sprints from the database
- Deletes all existing development tasks
- Ensures a clean slate for seeding

### 3. Sprint Creation
For each of the 18 sprints, creates:
```javascript
{
  sprintId: "SPRINT-001",
  sprintNumber: 1,
  name: "Foundation & Authentication",
  status: "active", // First sprint is active, rest are "planning"
  startDate: Date,
  endDate: Date,
  duration: 14, // days
  capacity: {
    totalStoryPoints: 89,
    plannedVelocity: 89,
    actualVelocity: 0,
    teamCapacity: 356 // hours (4 hours per story point)
  },
  technicalDetails: {
    sprintOverview: "Foundation & Authentication",
    totalTasks: 20,
    estimatedStoryPoints: 89,
    timeline: "Jan 6 - Jan 19, 2025 (2 weeks)"
  }
}
```

### 4. Task Creation
For each of the 370 tasks, creates:
```javascript
{
  taskId: "TASK-1.1",
  moduleId: "1",
  moduleName: "Module 1",
  taskNumber: "1.1",
  title: "User Registration System",
  description: "Implements complete user registration flow...",
  technicalRequirements: [
    { requirement: "Implement User Registration System", completed: false },
    { requirement: "Test User Registration System functionality", completed: false },
    { requirement: "Document User Registration System implementation", completed: false }
  ],
  sprint: ObjectId("..."), // Reference to Sprint
  sprintNumber: 1,
  priority: "high", // mapped from JSON
  status: "todo", // mapped from "planned"
  storyPoints: 5,
  estimatedDuration: {
    days: 3,
    hours: 20
  },
  assignedRole: "Senior Backend Engineer", // Auto-determined
  tags: ["development", "authentication", "api", "security"], // Auto-generated
  labels: [
    { name: "Sprint 1", color: "#667eea" },
    { name: "high", color: "#e67e22" }
  ],
  notes: JSON.stringify({
    techStack: "Node.js, Express, JWT, Nodemailer, bcrypt, MongoDB",
    acceptanceCriteria: [
      "User can register",
      "Email sent",
      "Account activated",
      "Login successful"
    ],
    originalDescription: "...",
    originalStatus: "planned",
    originalPriority: "high"
  })
}
```

## Field Mapping

### Status Mapping
| JSON Status | DevelopmentTask Status |
|-------------|------------------------|
| `planned`   | `todo`                |
| `in_progress` | `in_progress`      |
| `completed` | `completed`           |
| `blocked`   | `blocked`             |

### Priority Mapping
| JSON Priority | DevelopmentTask Priority |
|---------------|--------------------------|
| `High`        | `high`                  |
| `Medium`      | `medium`                |
| `Low`         | `low`                   |
| `Critical`    | `critical`              |

### Role Assignment (Auto-determined)
Based on task complexity (story points) and keywords in title:

| Criteria | Role |
|----------|------|
| Frontend/UI tasks, points >= 8 | Senior Frontend Engineer |
| Frontend/UI tasks, points < 8 | Mid-Level Frontend Engineer |
| Backend/API tasks, points >= 8 | Senior Backend Engineer |
| Backend/API tasks, points < 8 | Mid-Level Backend Engineer |
| Integration/System tasks | Full-Stack Engineer |
| DevOps tasks | DevOps Engineer |
| Testing tasks | QA Engineer |

### Tag Generation (Auto-generated)
Tags are automatically generated based on:
- **Title keywords**: auth, login, api, ui, database, test, security, payment, etc.
- **Tech stack**: react, nodejs, mongodb, jwt, stripe, docker, etc.

Examples:
- "User Registration System" → `["development", "authentication", "api", "security", "nodejs"]`
- "Payment Gateway Integration" → `["development", "payments", "billing", "integration", "stripe"]`

## Technical Details Storage

All original data from the JSON is preserved in the `notes` field as a JSON string:

```json
{
  "techStack": "Node.js, Express, JWT, Nodemailer, bcrypt, MongoDB",
  "acceptanceCriteria": [
    "User can register",
    "Email sent",
    "Account activated",
    "Login successful"
  ],
  "originalDescription": "Implements complete user registration flow with email verification...",
  "originalStatus": "planned",
  "originalPriority": "high"
}
```

This allows you to:
1. Reference the original data source
2. Parse and display tech stack information
3. Show acceptance criteria in the UI
4. Track status transitions

## Usage Examples

### Complete Fresh Seed
```bash
# Seed the entire project
curl -X POST http://localhost:3001/api/seed/complete-370-tasks

# Verify it worked
curl http://localhost:3001/api/seed/complete-370-tasks/verify
```

### Using with Sprint Management API
```bash
# Get all sprints
curl http://localhost:3001/api/sprint-management/sprints

# Get tasks for Sprint 1
curl http://localhost:3001/api/sprint-management/sprints/1/tasks

# Get task details
curl http://localhost:3001/api/sprint-management/tasks/TASK-1.1
```

### Querying Seeded Data
```javascript
// Get all tasks for a specific sprint
const tasks = await DevelopmentTask.find({ sprintNumber: 1 })
  .populate('sprint')
  .sort({ taskNumber: 1 });

// Get all high-priority tasks
const highPriorityTasks = await DevelopmentTask.find({ priority: 'high' })
  .populate('sprint');

// Get tasks by status
const todoTasks = await DevelopmentTask.find({ status: 'todo' })
  .populate('sprint')
  .sort({ sprintNumber: 1, taskNumber: 1 });

// Get sprint with all its tasks
const sprint = await Sprint.findOne({ sprintNumber: 1 })
  .populate('tasks');

// Parse technical details from notes
const task = await DevelopmentTask.findOne({ taskId: 'TASK-1.1' });
const technicalDetails = JSON.parse(task.notes);
console.log(technicalDetails.techStack);
console.log(technicalDetails.acceptanceCriteria);
```

## Error Handling

The route includes comprehensive error handling:

### File Not Found
```json
{
  "error": "JSON file not found",
  "message": "Could not find file at: C:\\...\\extracted-all-tasks.json",
  "hint": "Make sure extracted-all-tasks.json exists in the backend directory"
}
```

### Invalid JSON
```json
{
  "error": "Failed to seed tasks",
  "message": "Unexpected token in JSON at position 1234"
}
```

### Database Error
```json
{
  "error": "Failed to seed tasks",
  "message": "E11000 duplicate key error collection: test.sprints index: sprintId_1 dup key: { sprintId: \"SPRINT-001\" }"
}
```

## Performance Considerations

- **Execution Time**: ~2-5 seconds to seed all 370 tasks
- **Database Operations**:
  - 2 delete operations (sprints, tasks)
  - 18 sprint inserts
  - 370 task inserts
  - 18 sprint updates (to link tasks)
- **Memory Usage**: Loads entire JSON file into memory (~1MB)

## Testing

### Manual Testing
```bash
# Start the server
cd C:\Users\User\Projects\clonejane\expo-jane\backend
npm start

# In another terminal, seed the data
curl -X POST http://localhost:3001/api/seed/complete-370-tasks

# Verify the seeding
curl http://localhost:3001/api/seed/complete-370-tasks/verify
```

### Automated Testing
```javascript
const request = require('supertest');
const app = require('../server');

describe('Seed Complete 370 Tasks', () => {
  it('should seed all 370 tasks successfully', async () => {
    const response = await request(app)
      .post('/api/seed/complete-370-tasks')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.summary.totalTasks).toBe(370);
    expect(response.body.summary.totalSprints).toBe(18);
  });

  it('should verify seeded data', async () => {
    const response = await request(app)
      .get('/api/seed/complete-370-tasks/verify')
      .expect(200);

    expect(response.body.verification.isComplete).toBe(true);
    expect(response.body.verification.totalTasks).toBe(370);
  });
});
```

## Troubleshooting

### Issue: "JSON file not found"
**Solution**: Ensure `extracted-all-tasks.json` is in the `backend` directory:
```bash
ls C:\Users\User\Projects\clonejane\expo-jane\backend\extracted-all-tasks.json
```

### Issue: Duplicate key errors
**Solution**: The route automatically clears existing data, but if you get this error, manually clear the collections:
```javascript
await Sprint.deleteMany({});
await DevelopmentTask.deleteMany({});
```

### Issue: Tasks not showing up
**Solution**: Check if the tasks were created but not linked to sprints:
```javascript
const orphanedTasks = await DevelopmentTask.find({ sprint: null });
console.log(`Found ${orphanedTasks.length} orphaned tasks`);
```

## Related Routes

- **POST /api/seed/sprints** - Seeds only sprints (without tasks)
- **POST /api/seed/all-tasks** - Seeds hardcoded tasks (old method)
- **GET /api/sprint-management/sprints** - Lists all sprints
- **GET /api/sprint-management/tasks** - Lists all tasks
- **GET /api/sprint-task-map** - Shows sprint-task relationships

## Future Enhancements

1. **Incremental Seeding**: Add ability to seed specific sprints or task ranges
2. **Update Mode**: Update existing tasks instead of clearing all data
3. **Validation**: Add JSON schema validation before seeding
4. **Progress Tracking**: WebSocket-based real-time progress updates
5. **Rollback**: Add ability to rollback seeding if errors occur
6. **Import from URL**: Support loading JSON from remote URL

## License

This seed route is part of the ExpoJane project.
