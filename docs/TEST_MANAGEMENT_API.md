# Test Management API Documentation

## Overview

The Test Management System allows you to create a master checklist of tests, assign them to AI or human operators, track execution, log results, and monitor test status across your application.

## Table of Contents

- [Models](#models)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Workflow](#workflow)

---

## Models

### TestChecklist (Master Test List)

The master list of all tests that can be performed.

**Key Fields:**
- `testId` - Unique identifier (e.g., "AUTH-001")
- `testName` - Name of the test
- `testDescription` - Detailed description
- `category` - Type of test (functional, ui_ux, integration, api, security, performance, etc.)
- `module` - Which module it tests (authentication, appointments, patients, etc.)
- `priority` - critical | high | medium | low
- `testSteps[]` - Array of steps with expected results
- `canBeAutomated` - Boolean indicating if test can be automated
- `preferredAssignmentType` - 'ai' | 'operator' | 'both'
- `estimatedTimeMinutes` - Expected duration

### TestExecution (Test Runs)

Individual test execution instances with results.

**Key Fields:**
- `testChecklist` - Reference to master test
- `executionId` - Unique execution identifier
- `assignmentType` - 'ai' | 'operator'
- `assignedTo` - User assigned (if operator)
- `status` - assigned | in_progress | passed | failed | blocked | skipped | needs_review | cancelled
- `testResult` - Detailed results with step-by-step outcomes
- `issuesFound[]` - Array of bugs/issues discovered
- `aiExecutionData` - AI-specific execution data (if AI-executed)
- `reviewedBy` - Who reviewed the results
- `actualTimeMinutes` - How long test actually took

---

## API Endpoints

### Test Checklist Endpoints

#### 1. Get All Test Checklists

```http
GET /api/test-management/checklist
```

**Query Parameters:**
- `category` - Filter by category
- `module` - Filter by module
- `priority` - Filter by priority
- `isActive` - Filter active/inactive tests
- `search` - Search by name/description

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [...]
}
```

#### 2. Get Single Test Checklist

```http
GET /api/test-management/checklist/:id
```

#### 3. Create Test Checklist

```http
POST /api/test-management/checklist
```

**Required Role:** Admin or Doctor

**Request Body:**
```json
{
  "testId": "AUTH-004",
  "testName": "Password Reset Flow",
  "testDescription": "Verify user can reset password via email",
  "category": "functional",
  "module": "authentication",
  "priority": "high",
  "testSteps": [
    {
      "stepNumber": 1,
      "description": "Click 'Forgot Password'",
      "expectedResult": "Email input form appears"
    },
    {
      "stepNumber": 2,
      "description": "Enter valid email",
      "expectedResult": "Reset email sent"
    }
  ],
  "canBeAutomated": true,
  "preferredAssignmentType": "both",
  "estimatedTimeMinutes": 5
}
```

#### 4. Update Test Checklist

```http
PUT /api/test-management/checklist/:id
```

#### 5. Delete Test Checklist (Soft Delete)

```http
DELETE /api/test-management/checklist/:id
```

**Required Role:** Admin

---

### Test Execution Endpoints

#### 1. Assign Test to AI or Operator

```http
POST /api/test-management/execution/assign
```

**Request Body:**
```json
{
  "testChecklistId": "64abc123...",
  "assignmentType": "operator",
  "assignedTo": "64xyz789...",
  "testContext": {
    "environment": "staging",
    "platform": "web",
    "browser": "Chrome",
    "buildVersion": "2.1.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test assigned to operator",
  "data": {
    "executionId": "TEST-1697123456-abc123",
    "status": "assigned",
    ...
  }
}
```

#### 2. Bulk Assign Tests

```http
POST /api/test-management/execution/bulk-assign
```

**Request Body:**
```json
{
  "testChecklistIds": ["id1", "id2", "id3"],
  "assignmentType": "ai",
  "testContext": {
    "environment": "production"
  }
}
```

#### 3. Get My Assigned Tests

```http
GET /api/test-management/execution/my-tests
```

**Query Parameters:**
- `status` - Filter by status

#### 4. Start Test Execution

```http
POST /api/test-management/execution/:id/start
```

**Effect:**
- Sets status to "in_progress"
- Records `startedAt` timestamp

#### 5. Complete Test Execution

```http
POST /api/test-management/execution/:id/complete
```

**Request Body:**
```json
{
  "testResult": {
    "passed": false,
    "passedSteps": [1, 2],
    "failedSteps": [3],
    "stepResults": [
      {
        "stepNumber": 1,
        "status": "pass",
        "actualResult": "Login page loaded successfully",
        "screenshot": "url/to/screenshot"
      },
      {
        "stepNumber": 2,
        "status": "pass",
        "actualResult": "Credentials accepted"
      },
      {
        "stepNumber": 3,
        "status": "fail",
        "actualResult": "Redirect failed - stuck on login page",
        "notes": "Console shows 404 error on /dashboard"
      }
    ]
  },
  "executionNotes": "Test failed due to routing issue",
  "issuesFound": [
    {
      "severity": "high",
      "description": "Login redirect broken",
      "reproductionSteps": "1. Login with valid creds\n2. Click submit\n3. Page doesn't redirect",
      "screenshots": ["url1", "url2"]
    }
  ]
}
```

#### 6. Add Issue to Test

```http
POST /api/test-management/execution/:id/add-issue
```

**Request Body:**
```json
{
  "severity": "critical",
  "description": "Payment processing fails with credit cards",
  "reproductionSteps": "...",
  "screenshots": ["url"],
  "videoUrl": "url/to/video"
}
```

#### 7. Review Test Execution

```http
POST /api/test-management/execution/:id/review
```

**Required Role:** Admin or Doctor

**Request Body:**
```json
{
  "reviewStatus": "approved",
  "reviewNotes": "Results verified, issue logged as JIRA-123"
}
```

#### 8. Get Tests by Status

```http
GET /api/test-management/execution/status/:status
```

**Example:** `/api/test-management/execution/status/failed`

**Query Parameters:**
- `assignmentType` - Filter AI vs operator

#### 9. Get Failed Tests

```http
GET /api/test-management/execution/failed
```

**Query Parameters:**
- `startDate` - Filter by date

#### 10. Get Tests Needing Review

```http
GET /api/test-management/execution/needs-review
```

#### 11. Get Test Statistics

```http
GET /api/test-management/statistics
```

**Query Parameters:**
- `startDate`
- `endDate`
- `assignmentType`

**Response:**
```json
{
  "success": true,
  "data": {
    "statusBreakdown": [
      { "_id": "passed", "count": 45, "avgTime": 8.2 },
      { "_id": "failed", "count": 5, "avgTime": 12.1 },
      { "_id": "in_progress", "count": 3, "avgTime": null }
    ],
    "summary": {
      "total": 53,
      "active": 3,
      "completed": 50
    }
  }
}
```

---

## Usage Examples

### Example 1: Create and Assign Test to Operator

```javascript
// Step 1: Create a test checklist (one-time setup)
const response1 = await fetch('/api/test-management/checklist', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testId: 'APPT-005',
    testName: 'Reschedule Appointment',
    testDescription: 'Verify appointment can be rescheduled',
    category: 'functional',
    module: 'appointments',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Select appointment to reschedule',
        expectedResult: 'Appointment details load'
      },
      {
        stepNumber: 2,
        description: 'Click reschedule button',
        expectedResult: 'Calendar picker appears'
      },
      {
        stepNumber: 3,
        description: 'Select new date/time',
        expectedResult: 'Appointment updated successfully'
      }
    ],
    canBeAutomated: true,
    preferredAssignmentType: 'operator',
    estimatedTimeMinutes: 7
  })
});

const testChecklist = await response1.json();

// Step 2: Assign test to an operator
const response2 = await fetch('/api/test-management/execution/assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testChecklistId: testChecklist.data._id,
    assignmentType: 'operator',
    assignedTo: userId,
    testContext: {
      environment: 'staging',
      platform: 'web',
      browser: 'Chrome'
    }
  })
});

const execution = await response2.json();
console.log('Test assigned:', execution.data.executionId);
```

### Example 2: Execute Test and Log Results

```javascript
// Operator starts the test
const executionId = 'someExecutionId';

// Start test
await fetch(`/api/test-management/execution/${executionId}/start`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});

// ... operator performs test ...

// Complete test with results
await fetch(`/api/test-management/execution/${executionId}/complete`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testResult: {
      passed: true,
      passedSteps: [1, 2, 3],
      failedSteps: [],
      stepResults: [
        {
          stepNumber: 1,
          status: 'pass',
          actualResult: 'Appointment details loaded correctly'
        },
        {
          stepNumber: 2,
          status: 'pass',
          actualResult: 'Calendar picker appeared'
        },
        {
          stepNumber: 3,
          status: 'pass',
          actualResult: 'Appointment rescheduled successfully'
        }
      ]
    },
    executionNotes: 'All steps passed without issues'
  })
});
```

### Example 3: Assign Tests to AI

```javascript
// Get all automatable tests
const response1 = await fetch('/api/test-management/checklist?canBeAutomated=true');
const tests = await response1.json();

// Bulk assign to AI
const testIds = tests.data.map(t => t._id);

await fetch('/api/test-management/execution/bulk-assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testChecklistIds: testIds,
    assignmentType: 'ai',
    testContext: {
      environment: 'staging',
      platform: 'api'
    }
  })
});

// AI would then:
// 1. Fetch assigned tests
// 2. Execute automation scripts
// 3. Report results with aiExecutionData
```

### Example 4: Review and Monitor Tests

```javascript
// Get all failed tests
const failedResponse = await fetch('/api/test-management/execution/failed');
const failedTests = await failedResponse.json();

console.log(`${failedTests.count} tests failed`);

// Get tests needing review
const reviewResponse = await fetch('/api/test-management/execution/needs-review');
const testsToReview = await reviewResponse.json();

// Review a test
const testId = testsToReview.data[0]._id;
await fetch(`/api/test-management/execution/${testId}/review`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reviewStatus: 'approved',
    reviewNotes: 'Verified results, creating bug ticket'
  })
});

// Get statistics
const statsResponse = await fetch('/api/test-management/statistics?startDate=2024-01-01');
const stats = await statsResponse.json();
console.log('Test Statistics:', stats.data);
```

---

## Workflow

### Typical Test Management Workflow

1. **Setup Phase (One-time)**
   - Create master test checklist using `POST /checklist`
   - Define all tests with steps and expected results
   - Mark which tests can be automated

2. **Assignment Phase**
   - QA manager assigns tests to operators or AI
   - Use `POST /execution/assign` or `POST /execution/bulk-assign`
   - Operators receive test assignments

3. **Execution Phase**
   - Operator/AI starts test with `POST /execution/:id/start`
   - Performs test steps
   - Logs results with `POST /execution/:id/complete`
   - Reports any issues found

4. **Review Phase**
   - Manager reviews results with `GET /execution/needs-review`
   - Approves or requests retests with `POST /execution/:id/review`

5. **Monitoring Phase**
   - Track failed tests with `GET /execution/failed`
   - Monitor statistics with `GET /statistics`
   - Identify patterns and improve tests

---

## Database Schema Quick Reference

### TestChecklist Collection
```
{
  _id: ObjectId
  testId: String (unique)
  testName: String
  testDescription: String
  category: Enum
  module: Enum
  priority: Enum
  testSteps: Array
  prerequisites: Array
  testDataRequirements: Object
  canBeAutomated: Boolean
  preferredAssignmentType: Enum
  estimatedTimeMinutes: Number
  isActive: Boolean
  createdBy: ObjectId -> User
  timestamps: true
}
```

### TestExecution Collection
```
{
  _id: ObjectId
  testChecklist: ObjectId -> TestChecklist
  executionId: String (unique)
  assignmentType: Enum
  assignedTo: ObjectId -> User
  assignedBy: ObjectId -> User
  status: Enum
  testContext: Object
  testResult: Object
  issuesFound: Array
  executionNotes: String
  aiExecutionData: Object
  reviewedBy: ObjectId -> User
  reviewStatus: Enum
  actualTimeMinutes: Number
  timestamps: true
}
```

---

## Initial Setup

### 1. Seed Master Test Checklist

```bash
cd expo-jane/backend
node scripts/seedTestChecklists.js
```

This will populate your database with initial test cases covering:
- Authentication (login, logout, role-based access)
- Appointments (create, edit, cancel)
- Patients (add, search, view)
- Payments (process payment)
- Clinical Notes (create notes)
- UI/UX (responsive design)
- Security (access control)
- Performance (page load times)

### 2. Access API

All endpoints are available at:
```
http://localhost:3001/api/test-management/...
```

### 3. API Documentation

Visit Swagger docs at:
```
http://localhost:3001/api-docs
```

---

## Best Practices

1. **Test Naming Convention**
   - Use format: `{MODULE}-{NUMBER}` (e.g., AUTH-001, APPT-001)
   - Keep test IDs sequential and organized

2. **Priority Assignment**
   - **Critical**: Core functionality that would break the app
   - **High**: Important features that impact user experience
   - **Medium**: Standard functionality
   - **Low**: Nice-to-have features

3. **AI vs Operator Assignment**
   - **AI**: Repetitive tests, API tests, regression tests
   - **Operator**: UX/UI tests, exploratory tests, complex workflows
   - **Both**: Tests that benefit from both automated and manual verification

4. **Issue Reporting**
   - Always include reproduction steps
   - Attach screenshots/videos when possible
   - Set appropriate severity levels

5. **Review Process**
   - Review all AI-executed tests that require human verification
   - Approve or request retests promptly
   - Document review decisions

---

## Troubleshooting

### Common Issues

**Test not appearing in "My Tests"**
- Ensure test is assigned to correct user ID
- Check if status filter is applied

**Cannot complete test**
- Verify you started the test first
- Ensure you're the assigned user (for operator tests)

**Statistics not accurate**
- Check date range filters
- Ensure test executions have completed status

---

## Future Enhancements

Potential additions to the system:
- Test suites/batches
- Scheduled test runs
- Integration with CI/CD
- Screenshot/video upload handling
- Email notifications for test assignments
- Test coverage reports
- Flaky test detection
- Test result trends over time

---

For more information or support, contact the development team.
