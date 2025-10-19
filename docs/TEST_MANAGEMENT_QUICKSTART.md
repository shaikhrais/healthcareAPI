# Test Management System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install and Seed Database

```bash
# Navigate to backend directory
cd expo-jane/backend

# Install dependencies (if not already done)
npm install

# Seed the master test checklist
node scripts/seedTestChecklists.js
```

**Expected Output:**
```
✅ Test checklist seeding completed successfully!

TEST CHECKLIST SUMMARY
========================================
By Module:
  authentication: Total: 3 (Critical: 2, High: 1)
  appointments: Total: 3 (Critical: 1, High: 2)
  patients: Total: 3 (Critical: 1, High: 1)
  ...
Total Tests: 15
Critical Priority: 8
Automatable: 12 (80%)
```

### Step 2: Start the Server

```bash
# Start the backend server
npm start
```

Server should be running at `http://localhost:3001`

### Step 3: Test the API

You can use any of these methods:

#### Option A: Using cURL

```bash
# 1. Login to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Save the token from response, then:

# 2. Get all test checklists
curl http://localhost:3001/api/test-management/checklist \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Assign a test to yourself
curl -X POST http://localhost:3001/api/test-management/execution/assign \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "testChecklistId": "TEST_ID_FROM_STEP_2",
    "assignmentType": "operator",
    "assignedTo": "YOUR_USER_ID",
    "testContext": {
      "environment": "development",
      "platform": "web"
    }
  }'
```

#### Option B: Using Postman/Insomnia

Import these endpoints:

**Base URL:** `http://localhost:3001`

**Headers (for authenticated requests):**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Collection:**
1. POST `/api/auth/login` - Get token
2. GET `/api/test-management/checklist` - View all tests
3. POST `/api/test-management/execution/assign` - Assign test
4. GET `/api/test-management/execution/my-tests` - View your tests
5. POST `/api/test-management/execution/:id/start` - Start test
6. POST `/api/test-management/execution/:id/complete` - Complete test

---

## 📋 Common Workflows

### Workflow 1: Assign Test to Operator

```javascript
// 1. Get available tests
const tests = await fetch('http://localhost:3001/api/test-management/checklist?module=appointments', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// 2. Pick a test and assign it
const testId = testsData.data[0]._id;

const assignment = await fetch('http://localhost:3001/api/test-management/execution/assign', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testChecklistId: testId,
    assignmentType: 'operator',
    assignedTo: operatorUserId,
    testContext: {
      environment: 'staging',
      platform: 'web',
      browser: 'Chrome'
    }
  })
});

// 3. Operator receives assignment and can start testing
```

### Workflow 2: Execute and Report Test Results

```javascript
const executionId = 'TEST-1234-abc';

// 1. Start the test
await fetch(`http://localhost:3001/api/test-management/execution/${executionId}/start`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token }
});

// 2. Perform the test manually...

// 3. Report results
await fetch(`http://localhost:3001/api/test-management/execution/${executionId}/complete`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testResult: {
      passed: false,
      passedSteps: [1, 2],
      failedSteps: [3],
      stepResults: [
        {
          stepNumber: 1,
          status: 'pass',
          actualResult: 'Step 1 completed successfully'
        },
        {
          stepNumber: 2,
          status: 'pass',
          actualResult: 'Step 2 completed successfully'
        },
        {
          stepNumber: 3,
          status: 'fail',
          actualResult: 'Expected redirect did not occur',
          notes: 'Console shows 404 error'
        }
      ]
    },
    executionNotes: 'Test failed at final step due to routing issue',
    issuesFound: [
      {
        severity: 'high',
        description: 'Appointment creation redirects to 404',
        reproductionSteps: '1. Fill form\n2. Click save\n3. 404 error appears'
      }
    ]
  })
});
```

### Workflow 3: Monitor Test Progress

```javascript
// Get all tests assigned to me
const myTests = await fetch('http://localhost:3001/api/test-management/execution/my-tests', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Filter by status
const inProgress = await fetch('http://localhost:3001/api/test-management/execution/my-tests?status=in_progress', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Get failed tests
const failed = await fetch('http://localhost:3001/api/test-management/execution/failed', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// Get statistics
const stats = await fetch('http://localhost:3001/api/test-management/statistics', {
  headers: { 'Authorization': 'Bearer ' + token }
});
```

---

## 🤖 AI Integration Example

### Assigning Tests to AI

```javascript
// Get automatable tests
const response = await fetch('http://localhost:3001/api/test-management/checklist?canBeAutomated=true&category=api');
const tests = await response.json();

// Bulk assign to AI
const testIds = tests.data.map(t => t._id);

await fetch('http://localhost:3001/api/test-management/execution/bulk-assign', {
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
```

### AI Reporting Results

When AI completes a test, it should include `aiExecutionData`:

```javascript
await fetch(`http://localhost:3001/api/test-management/execution/${executionId}/complete`, {
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
      stepResults: [...]
    },
    executionNotes: 'Automated test completed successfully',
    aiExecutionData: {
      model: 'gpt-4',
      confidence: 95,
      automationScript: 'test_auth_login.py',
      rawOutput: '... test output logs ...',
      requiresHumanVerification: false
    }
  })
});
```

---

## 📊 Dashboard Data

### Get Summary Statistics

```javascript
const stats = await fetch('http://localhost:3001/api/test-management/statistics?startDate=2024-01-01');
const data = await stats.json();

console.log(data.data);
// {
//   statusBreakdown: [
//     { _id: 'passed', count: 45, avgTime: 8.2 },
//     { _id: 'failed', count: 5, avgTime: 12.1 }
//   ],
//   summary: {
//     total: 53,
//     active: 3,
//     completed: 50
//   }
// }
```

### Build a Dashboard

Example metrics you can track:
- Pass/Fail rate
- Average test execution time
- Tests by priority
- Tests by module
- AI vs Operator performance
- Failed tests requiring attention
- Tests pending review

---

## 🔍 Filtering and Searching

### Get Tests by Module

```bash
curl http://localhost:3001/api/test-management/checklist?module=appointments \
  -H "Authorization: Bearer TOKEN"
```

### Get Critical Tests Only

```bash
curl http://localhost:3001/api/test-management/checklist?priority=critical \
  -H "Authorization: Bearer TOKEN"
```

### Search Tests

```bash
curl "http://localhost:3001/api/test-management/checklist?search=login" \
  -H "Authorization: Bearer TOKEN"
```

### Get Tests by Category

```bash
curl http://localhost:3001/api/test-management/checklist/category/security \
  -H "Authorization: Bearer TOKEN"
```

---

## ✅ Sample Test Execution Flow

Here's a complete example from start to finish:

```javascript
// SETUP: Get token
const loginRes = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  })
});
const { token, user } = await loginRes.json();

// STEP 1: View available tests
const testsRes = await fetch('http://localhost:3001/api/test-management/checklist?module=authentication', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const tests = await testsRes.json();
console.log(`Found ${tests.count} authentication tests`);

// STEP 2: Assign test to myself
const testId = tests.data[0]._id;
const assignRes = await fetch('http://localhost:3001/api/test-management/execution/assign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testChecklistId: testId,
    assignmentType: 'operator',
    assignedTo: user._id,
    testContext: {
      environment: 'development',
      platform: 'web',
      browser: 'Chrome 120'
    }
  })
});
const execution = await assignRes.json();
const executionId = execution.data._id;

console.log(`Test assigned: ${execution.data.executionId}`);

// STEP 3: Start test
await fetch(`http://localhost:3001/api/test-management/execution/${executionId}/start`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('Test started...');

// STEP 4: Execute test manually
// ... perform test steps ...

// STEP 5: Report results
const completeRes = await fetch(`http://localhost:3001/api/test-management/execution/${executionId}/complete`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testResult: {
      passed: true,
      passedSteps: [1, 2, 3, 4],
      failedSteps: [],
      stepResults: [
        { stepNumber: 1, status: 'pass', actualResult: 'Login page loaded' },
        { stepNumber: 2, status: 'pass', actualResult: 'Credentials accepted' },
        { stepNumber: 3, status: 'pass', actualResult: 'Redirected to dashboard' },
        { stepNumber: 4, status: 'pass', actualResult: 'User session created' }
      ]
    },
    executionNotes: 'All steps passed without issues'
  })
});

console.log('Test completed successfully!');
```

---

## 🎯 Next Steps

1. **Create Custom Tests**
   - Add tests specific to your features
   - Define test steps and expected results
   - Mark which can be automated

2. **Integrate with Your Frontend**
   - Create a test management UI
   - Show assigned tests to operators
   - Display test results and statistics

3. **Set Up AI Integration**
   - Connect your AI/automation system
   - Assign automatable tests to AI
   - Review AI-generated results

4. **Monitor and Improve**
   - Track test metrics over time
   - Identify flaky or problematic tests
   - Refine test cases based on results

---

## 📚 Additional Resources

- **Full API Documentation:** See `TEST_MANAGEMENT_API.md`
- **API Docs (Swagger):** http://localhost:3001/api-docs
- **Seed File:** `backend/seeds/testChecklists.js`
- **Models:** `backend/models/TestChecklist.js` and `TestExecution.js`
- **Routes:** `backend/routes/test-management.js`

---

## ❓ FAQ

**Q: Can I edit existing tests?**
A: Yes, use PUT `/api/test-management/checklist/:id`

**Q: How do I reassign a test?**
A: Create a new execution with the new assignee. Original execution remains for audit trail.

**Q: Can AI and operator both test the same checklist?**
A: Yes, create separate executions for each.

**Q: What happens to old test results?**
A: All executions are preserved in the database for historical tracking.

**Q: How do I mark a test as no longer needed?**
A: Use DELETE endpoint to soft-delete (sets `isActive: false`)

---

Happy Testing! 🎉
