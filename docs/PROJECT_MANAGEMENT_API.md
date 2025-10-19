# Project Management & Sprint Development API Documentation

Complete API reference for the ExpoJane Project Management and Sprint Development module.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [API Endpoints](#api-endpoints)
   - [Sprint Management](#sprint-management)
   - [Task Management](#task-management)
   - [Sprint Metrics & Analytics](#sprint-metrics--analytics)
   - [Sprint-Task Mapping](#sprint-task-mapping)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Examples](#examples)

---

## Overview

The Project Management API provides comprehensive endpoints for managing sprints, tasks, and project analytics in an Agile development environment.

**Key Features:**
- Sprint lifecycle management (create, start, complete)
- Task tracking with story points and status updates
- Real-time sprint metrics and analytics
- Team velocity tracking
- Burndown chart data
- Sprint-task relationship mapping

---

## Authentication

Currently, the API does not require authentication for development purposes. In production, JWT authentication should be implemented.

```http
Authorization: Bearer <token>
```

---

## Base URL

```
http://localhost:3001/api
```

**Production:** `https://your-domain.com/api`

---

## API Endpoints

### Sprint Management

Base path: `/sprint-management`

#### 1. Get All Sprints

```http
GET /sprint-management/sprints
```

**Description:** Retrieve all sprints in the system.

**Response:**
```json
{
  "success": true,
  "count": 18,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sprintId": "SPRINT-001",
      "sprintNumber": 1,
      "name": "Sprint 1: Foundation & Authentication",
      "goal": "Establish core authentication and infrastructure",
      "startDate": "2025-01-06T00:00:00.000Z",
      "endDate": "2025-01-19T00:00:00.000Z",
      "status": "Not Started",
      "totalStoryPoints": 89,
      "modules": [
        {
          "moduleId": "1",
          "moduleName": "Authentication & Authorization",
          "priority": "High"
        }
      ],
      "createdAt": "2025-10-11T03:50:00.000Z"
    }
  ]
}
```

---

#### 2. Get Sprint by ID

```http
GET /sprint-management/sprints/:id
```

**Parameters:**
- `id` (path) - MongoDB ObjectId of the sprint

**Response:**
```json
{
  "success": true,
  "data": {
    "sprintId": "SPRINT-001",
    "name": "Sprint 1: Foundation & Authentication",
    "status": "Active",
    "totalStoryPoints": 89
  }
}
```

---

#### 3. Get Sprint by Sprint Number

```http
GET /sprint-management/sprints/number/:sprintNumber
```

**Parameters:**
- `sprintNumber` (path) - Sprint number (1-18)

**Example:**
```http
GET /sprint-management/sprints/number/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sprintId": "SPRINT-001",
    "sprintNumber": 1,
    "name": "Sprint 1: Foundation & Authentication"
  }
}
```

---

#### 4. Create Sprint

```http
POST /sprint-management/sprints
```

**Request Body:**
```json
{
  "sprintId": "SPRINT-019",
  "sprintNumber": 19,
  "name": "Sprint 19: Advanced Features",
  "goal": "Implement advanced reporting and analytics",
  "startDate": "2025-09-14",
  "endDate": "2025-09-27",
  "totalStoryPoints": 75,
  "modules": [
    {
      "moduleId": "11",
      "moduleName": "Reporting & Analytics",
      "priority": "High"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sprint created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "sprintId": "SPRINT-019",
    "status": "Not Started"
  }
}
```

---

#### 5. Update Sprint

```http
PUT /sprint-management/sprints/:id
```

**Request Body:**
```json
{
  "name": "Sprint 1: Foundation & Core Auth",
  "status": "Active",
  "totalStoryPoints": 95
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sprint updated successfully",
  "data": {
    "sprintId": "SPRINT-001",
    "name": "Sprint 1: Foundation & Core Auth"
  }
}
```

---

#### 6. Start Sprint

```http
POST /sprint-management/sprints/:id/start
```

**Description:** Marks a sprint as "Active" and sets the start date.

**Response:**
```json
{
  "success": true,
  "message": "Sprint SPRINT-001 started successfully",
  "data": {
    "sprintId": "SPRINT-001",
    "status": "Active",
    "startDate": "2025-10-11T03:50:00.000Z"
  }
}
```

---

#### 7. Complete Sprint

```http
POST /sprint-management/sprints/:id/complete
```

**Description:** Marks a sprint as "Completed" and sets the end date.

**Response:**
```json
{
  "success": true,
  "message": "Sprint SPRINT-001 completed successfully",
  "data": {
    "sprintId": "SPRINT-001",
    "status": "Completed",
    "endDate": "2025-10-11T03:50:00.000Z"
  }
}
```

---

#### 8. Delete Sprint

```http
DELETE /sprint-management/sprints/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Sprint deleted successfully"
}
```

---

### Task Management

Base path: `/sprint-management`

#### 1. Get All Tasks

```http
GET /sprint-management/tasks
```

**Query Parameters:**
- `sprint` (optional) - Filter by sprint ObjectId
- `status` (optional) - Filter by status ("Not Started", "In Progress", "Completed", "Blocked")
- `assignedTo` (optional) - Filter by assignee

**Example:**
```http
GET /sprint-management/tasks?status=In Progress&assignedTo=Alice
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "taskId": "TASK-1.1",
      "moduleId": "1",
      "moduleName": "Authentication & Authorization",
      "taskNumber": "1.1",
      "title": "User Registration System",
      "description": "Implement user registration with email verification",
      "acceptanceCriteria": [
        "User can register with email and password",
        "Email verification sent and validated"
      ],
      "storyPoints": 5,
      "estimatedHours": 20,
      "priority": "High",
      "status": "Not Started",
      "assignedTo": "Senior Backend Engineer",
      "sprint": "507f1f77bcf86cd799439011",
      "dependencies": [],
      "tags": ["authentication", "backend", "api"],
      "createdAt": "2025-10-11T03:50:00.000Z"
    }
  ]
}
```

---

#### 2. Get Task by ID

```http
GET /sprint-management/tasks/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "TASK-1.1",
    "title": "User Registration System",
    "status": "In Progress",
    "storyPoints": 5
  }
}
```

---

#### 3. Get Tasks by Sprint

```http
GET /sprint-management/sprints/:sprintId/tasks
```

**Parameters:**
- `sprintId` (path) - MongoDB ObjectId of the sprint

**Response:**
```json
{
  "success": true,
  "sprint": {
    "sprintId": "SPRINT-001",
    "name": "Sprint 1: Foundation & Authentication"
  },
  "count": 5,
  "totalStoryPoints": 26,
  "data": [
    {
      "taskId": "TASK-1.1",
      "title": "User Registration System",
      "storyPoints": 5,
      "status": "Not Started"
    }
  ]
}
```

---

#### 4. Create Task

```http
POST /sprint-management/tasks
```

**Request Body:**
```json
{
  "taskId": "TASK-1.6",
  "moduleId": "1",
  "moduleName": "Authentication & Authorization",
  "taskNumber": "1.6",
  "title": "OAuth Integration",
  "description": "Implement OAuth 2.0 authentication",
  "acceptanceCriteria": [
    "Google OAuth login works",
    "User profile synced from OAuth provider"
  ],
  "storyPoints": 8,
  "estimatedHours": 32,
  "priority": "Medium",
  "status": "Not Started",
  "assignedTo": "John Doe",
  "sprint": "507f1f77bcf86cd799439011",
  "dependencies": ["TASK-1.1"],
  "tags": ["authentication", "oauth", "integration"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "taskId": "TASK-1.6",
    "title": "OAuth Integration"
  }
}
```

---

#### 5. Update Task

```http
PUT /sprint-management/tasks/:id
```

**Request Body:**
```json
{
  "status": "In Progress",
  "assignedTo": "Jane Smith",
  "storyPoints": 6
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "taskId": "TASK-1.1",
    "status": "In Progress",
    "assignedTo": "Jane Smith"
  }
}
```

---

#### 6. Delete Task

```http
DELETE /sprint-management/tasks/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### Sprint Metrics & Analytics

Base path: `/sprint-metrics`

#### 1. Get Sprint Metrics

```http
GET /sprint-metrics/:sprintId
```

**Description:** Get comprehensive metrics for sprint visualization (charts, progress, team contributions).

**Parameters:**
- `sprintId` (path) - Sprint ID (e.g., "SPRINT-001")

**Response:**
```json
{
  "sprint": {
    "sprintId": "SPRINT-001",
    "name": "Sprint 1: Foundation & Authentication",
    "sprintNumber": 1,
    "progress": 0,
    "storyPoints": {
      "completed": 0,
      "total": 26
    },
    "startDate": "2025-01-06T00:00:00.000Z",
    "endDate": "2025-01-19T00:00:00.000Z"
  },
  "taskStatus": [
    {
      "label": "Not Started",
      "value": 5,
      "color": "#9E9E9E"
    }
  ],
  "teamMembers": [
    {
      "label": "Unassigned",
      "value": 26,
      "color": "#FF6B6B"
    }
  ],
  "summary": {
    "totalTasks": 5,
    "completedTasks": 0,
    "blockedTasks": 0,
    "averageStoryPoints": 5.2
  }
}
```

**Use Case:** Feed this data directly to chart components (PieChart, DonutChart, BarChart).

---

#### 2. Get Velocity Trend

```http
GET /sprint-metrics/velocity/all
```

**Description:** Get velocity (completed story points) across all sprints for trend analysis.

**Response:**
```json
{
  "velocity": [
    {
      "label": "Sprint 1",
      "value": 0,
      "sprintId": "SPRINT-001"
    },
    {
      "label": "Sprint 2",
      "value": 0,
      "sprintId": "SPRINT-002"
    }
  ],
  "totalSprints": 18,
  "averageVelocity": 0
}
```

**Use Case:** Display in LineChart for velocity trends over time.

---

#### 3. Get Burndown Chart Data

```http
GET /sprint-metrics/burndown/:sprintId
```

**Description:** Get ideal and actual burndown data for a sprint.

**Parameters:**
- `sprintId` (path) - Sprint ID (e.g., "SPRINT-001")

**Response:**
```json
{
  "sprint": {
    "sprintId": "SPRINT-001",
    "name": "Sprint 1: Foundation & Authentication",
    "totalPoints": 26,
    "durationDays": 14
  },
  "ideal": [
    {
      "label": "Day 0",
      "value": 26
    },
    {
      "label": "Day 1",
      "value": 24.14
    },
    {
      "label": "Day 14",
      "value": 0
    }
  ]
}
```

**Use Case:** Display ideal vs actual burndown in LineChart.

---

#### 4. Get Project Summary

```http
GET /sprint-metrics/summary/all
```

**Description:** Get aggregated metrics across all sprints and tasks.

**Response:**
```json
{
  "sprints": {
    "total": 18,
    "completed": 0,
    "active": 0
  },
  "tasks": {
    "total": 5,
    "completed": 0,
    "inProgress": 0,
    "blocked": 0
  },
  "storyPoints": {
    "total": 26,
    "completed": 0,
    "remaining": 26,
    "progress": 0
  }
}
```

**Use Case:** Dashboard overview cards showing project-wide statistics.

---

### Sprint-Task Mapping

Base path: `/sprint-task-map`

#### 1. Get Complete Sprint-Task Map

```http
GET /sprint-task-map
```

**Description:** Get mapping of all sprints with their associated tasks.

**Response:**
```json
{
  "success": true,
  "totalSprints": 18,
  "totalTasks": 5,
  "sprintTaskMap": [
    {
      "sprint": {
        "sprintId": "SPRINT-001",
        "sprintNumber": 1,
        "name": "Sprint 1: Foundation & Authentication",
        "status": "Not Started"
      },
      "taskCount": 5,
      "tasks": [
        {
          "taskId": "TASK-1.1",
          "title": "User Registration System",
          "status": "Not Started",
          "belongsToSprint": 1
        }
      ],
      "taskIds": "TASK-1.1, TASK-1.2, TASK-1.3, TASK-1.4, TASK-1.5"
    }
  ]
}
```

---

#### 2. Lookup Sprint by Task ID

```http
GET /sprint-task-map/lookup/:taskId
```

**Parameters:**
- `taskId` (path) - Task ID (e.g., "TASK-1.1")

**Example:**
```http
GET /sprint-task-map/lookup/TASK-1.1
```

**Response:**
```json
{
  "success": true,
  "taskId": "TASK-1.1",
  "title": "User Registration System",
  "sprint": {
    "sprintId": "SPRINT-001",
    "sprintNumber": 1,
    "name": "Sprint 1: Foundation & Authentication"
  }
}
```

---

#### 3. Get Tasks by Sprint Number

```http
GET /sprint-task-map/sprint/:sprintNumber
```

**Parameters:**
- `sprintNumber` (path) - Sprint number (1-18)

**Example:**
```http
GET /sprint-task-map/sprint/1
```

**Response:**
```json
{
  "success": true,
  "sprint": {
    "sprintId": "SPRINT-001",
    "sprintNumber": 1,
    "name": "Sprint 1: Foundation & Authentication"
  },
  "taskCount": 5,
  "tasks": [
    {
      "taskId": "TASK-1.1",
      "title": "User Registration System",
      "taskNumber": "1.1"
    }
  ]
}
```

---

#### 4. Get Sprint-Task Summary

```http
GET /sprint-task-map/summary
```

**Description:** Quick overview of sprint-task distribution.

**Response:**
```json
{
  "success": true,
  "totalSprints": 18,
  "totalTasks": 5,
  "tasksPerSprint": {
    "SPRINT-001": 5,
    "SPRINT-002": 0,
    "SPRINT-003": 0
  },
  "averageTasksPerSprint": 0.28
}
```

---

## Data Models

### Sprint Model

```javascript
{
  sprintId: String,           // Unique: "SPRINT-001"
  sprintNumber: Number,       // 1-18
  name: String,               // "Sprint 1: Foundation & Authentication"
  goal: String,               // Sprint objective
  startDate: Date,
  endDate: Date,
  status: String,             // "Not Started" | "Active" | "Completed"
  totalStoryPoints: Number,
  modules: [{
    moduleId: String,
    moduleName: String,
    priority: String          // "High" | "Medium" | "Low"
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

### Task Model

```javascript
{
  taskId: String,             // Unique: "TASK-1.1" (Sprint 1, Task 1)
  moduleId: String,
  moduleName: String,
  taskNumber: String,         // "1.1"
  title: String,
  description: String,
  acceptanceCriteria: [String],
  storyPoints: Number,
  estimatedHours: Number,
  priority: String,           // "High" | "Medium" | "Low"
  status: String,             // "Not Started" | "In Progress" | "Completed" | "Blocked"
  assignedTo: String,
  sprint: ObjectId,           // Reference to Sprint
  dependencies: [String],     // Array of taskIds
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Examples

### Example 1: Create and Start a Sprint

```bash
# Step 1: Create Sprint
curl -X POST http://localhost:3001/api/sprint-management/sprints \
  -H "Content-Type: application/json" \
  -d '{
    "sprintId": "SPRINT-019",
    "sprintNumber": 19,
    "name": "Sprint 19: Advanced Features",
    "goal": "Implement advanced reporting",
    "startDate": "2025-09-14",
    "endDate": "2025-09-27",
    "totalStoryPoints": 75
  }'

# Step 2: Get Sprint ID from response
# Response: { "_id": "507f1f77bcf86cd799439011", ... }

# Step 3: Start Sprint
curl -X POST http://localhost:3001/api/sprint-management/sprints/507f1f77bcf86cd799439011/start
```

---

### Example 2: Add Tasks to Sprint

```bash
# Create first task
curl -X POST http://localhost:3001/api/sprint-management/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK-19.1",
    "moduleId": "11",
    "moduleName": "Reporting",
    "title": "Advanced Analytics Dashboard",
    "storyPoints": 8,
    "priority": "High",
    "status": "Not Started",
    "sprint": "507f1f77bcf86cd799439011"
  }'

# Create second task
curl -X POST http://localhost:3001/api/sprint-management/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "TASK-19.2",
    "moduleId": "11",
    "moduleName": "Reporting",
    "title": "Export Reports to PDF",
    "storyPoints": 5,
    "priority": "Medium",
    "status": "Not Started",
    "sprint": "507f1f77bcf86cd799439011",
    "dependencies": ["TASK-19.1"]
  }'
```

---

### Example 3: Update Task Status

```bash
# Update task to In Progress
curl -X PUT http://localhost:3001/api/sprint-management/tasks/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "In Progress",
    "assignedTo": "John Doe"
  }'

# Mark task as completed
curl -X PUT http://localhost:3001/api/sprint-management/tasks/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Completed"
  }'
```

---

### Example 4: Get Sprint Metrics for Dashboard

```bash
# Get metrics for Sprint 1
curl http://localhost:3001/api/sprint-metrics/SPRINT-001

# Get velocity across all sprints
curl http://localhost:3001/api/sprint-metrics/velocity/all

# Get project summary
curl http://localhost:3001/api/sprint-metrics/summary/all
```

---

### Example 5: Find Which Sprint a Task Belongs To

```bash
# Lookup by task ID
curl http://localhost:3001/api/sprint-task-map/lookup/TASK-1.1

# Response:
# {
#   "taskId": "TASK-1.1",
#   "title": "User Registration System",
#   "sprint": {
#     "sprintId": "SPRINT-001",
#     "sprintNumber": 1,
#     "name": "Sprint 1: Foundation & Authentication"
#   }
# }
```

---

## Task Numbering System

Tasks follow the format: `TASK-{sprintNumber}.{taskNumber}`

**Examples:**
- `TASK-1.1` = Sprint 1, Task 1
- `TASK-1.2` = Sprint 1, Task 2
- `TASK-2.1` = Sprint 2, Task 1
- `TASK-18.15` = Sprint 18, Task 15

The first number indicates the sprint, the second number is the sequential task number within that sprint.

---

## Integration with Charts

### PieChart / DonutChart Data

Use the `taskStatus` array from `/sprint-metrics/:sprintId`:

```javascript
import { DonutChart } from './components/charts';

const response = await fetch('http://localhost:3001/api/sprint-metrics/SPRINT-001');
const data = await response.json();

<DonutChart
  data={data.taskStatus}  // Ready to use!
  size={220}
  title="Task Status"
/>
```

### BarChart Data

Use the `teamMembers` array:

```javascript
<BarChart
  data={data.teamMembers}  // Ready to use!
  title="Team Contributions"
/>
```

### LineChart Data

Use the `velocity` array from `/sprint-metrics/velocity/all`:

```javascript
const response = await fetch('http://localhost:3001/api/sprint-metrics/velocity/all');
const data = await response.json();

<LineChart
  data={data.velocity}  // Ready to use!
  title="Velocity Trend"
/>
```

---

## Rate Limiting

Currently no rate limiting is implemented. Recommended for production:
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

---

## Versioning

**Current Version:** v1

All endpoints are prefixed with `/api/` but not versioned. Future versions will use:
- `/api/v1/sprint-management`
- `/api/v2/sprint-management`

---

## Support

For issues or questions:
- Check the [Swagger UI](http://localhost:3001/api-docs)
- Review [TASK_NUMBERING_SYSTEM.md](../../TASK_NUMBERING_SYSTEM.md)
- Review [SPRINT_TASK_RELATIONSHIP.md](../../SPRINT_TASK_RELATIONSHIP.md)

---

## Changelog

### Version 1.0.0 (2025-10-11)
- Initial release
- Sprint CRUD operations
- Task CRUD operations
- Sprint metrics endpoints
- Sprint-task mapping endpoints
- Chart-ready data format

---

**Last Updated:** October 11, 2025
**API Version:** 1.0.0
**Base URL:** http://localhost:3001/api
