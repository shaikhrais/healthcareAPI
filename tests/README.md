# HealthCare API Testing Suite

Comprehensive testing suite for the HealthCare Management API, covering all endpoints, authentication flows, and mobile features.

## 🧪 Test Suites Available

### 1. **Master Test Runner** (`master-test-runner.js`)
Central orchestrator that runs all test suites and generates comprehensive reports.

```bash
# Run all tests
node tests/master-test-runner.js

# Run specific test types
node tests/master-test-runner.js auth,mobile
node tests/master-test-runner.js comprehensive
```

### 2. **Comprehensive API Test** (`comprehensive-api-test.js`)
Tests all API endpoints and basic functionality.

```bash
node tests/comprehensive-api-test.js
```

### 3. **Authentication Flow Test** (`auth-flow-test.js`)
Detailed testing of authentication scenarios and security measures.

```bash
node tests/auth-flow-test.js
```

### 4. **Mobile Features Test** (`mobile-features-test.js`)
Comprehensive testing of all 5 mobile application features.

```bash
node tests/mobile-features-test.js
```

### 5. **Postman Collection Generator** (`postman-collection-generator.js`)
Generates a complete Postman collection for manual testing.

```bash
node tests/postman-collection-generator.js
```

## 📱 Mobile Features Tested

### ✅ **1. Phone Verification**
- SMS code sending
- Code verification
- Phone number validation
- Rate limiting
- Phone number updates

### ✅ **2. Offline Sync**
- Data upload/download
- Conflict resolution
- Sync state management
- Pending sync queue
- Sync reset functionality

### ✅ **3. Biometric Authentication**
- Device registration
- Fingerprint/Face ID auth
- Device management
- Security features
- Device deactivation

### ✅ **4. Health Integrations**
- Apple Health & Google Fit sync
- Data validation
- Health insights
- Data export
- Batch import

### ✅ **5. Push Notifications**
- Device registration
- Notification sending
- Scheduled notifications
- Bulk notifications
- Preference management

## 🔐 Authentication Tests Covered

### **User Management**
- User registration (with validation)
- User login/logout
- Password reset flow
- Profile management
- Account deactivation

### **Token Security**
- JWT token validation
- Token expiration handling
- Invalid token rejection
- Token refresh scenarios

### **Session Management**
- Session creation/destruction
- Session statistics
- Multi-device sessions
- Session timeout

### **Security Measures**
- Rate limiting
- Brute force protection
- SQL injection prevention
- XSS protection
- Role-based access control

### **Multi-Factor Authentication**
- TOTP setup and verification
- Backup codes
- Device management
- MFA disable/enable

## 🚀 Quick Start

### Prerequisites
1. **Server Running**: Make sure the HealthCare API server is running
   ```bash
   npm start
   ```

2. **Dependencies**: Install testing dependencies
   ```bash
   npm install axios colors
   ```

### Run All Tests
```bash
# Complete test suite
node tests/master-test-runner.js

# Individual test suites
node tests/auth-flow-test.js
node tests/mobile-features-test.js
node tests/comprehensive-api-test.js
```

### Generate Postman Collection
```bash
node tests/postman-collection-generator.js
```

## 📊 Test Reports

Each test suite provides detailed reports including:

- ✅ **Pass/Fail Statistics**
- ⏱️ **Execution Duration**
- 📈 **Success Rates**
- 🔍 **Failed Test Details**
- 💡 **Recommendations**
- 🎯 **Feature Status Summary**

### Sample Report Output
```
🎯 MASTER TEST REPORT - HEALTHCARE API COMPREHENSIVE TESTING
===============================================================================

📈 OVERALL RESULTS:
   🎯 Total Test Suites: 3
   ✅ Total Tests Passed: 87
   ❌ Total Tests Failed: 3
   📊 Overall Success Rate: 96.7%
   ⏱️ Total Duration: 45.2s

🏥 HEALTHCARE API SYSTEM HEALTH ASSESSMENT:
   🟢 EXCELLENT: System is ready for production (96.7% critical features working)

📱 MOBILE FEATURES STATUS:
   📍 Phone Verification: Tested and integrated
   📍 Offline Sync: Tested and integrated
   📍 Biometric Authentication: Tested and integrated
   📍 Health Integrations: Tested and integrated
   📍 Push Notifications: Tested and integrated
```

## 🔧 Test Configuration

### Environment Variables
The tests use these environment variables (with defaults):
- `BASE_URL`: API base URL (default: http://localhost:3001)
- `TEST_USER_EMAIL`: Test user email (auto-generated)
- `TEST_USER_PASSWORD`: Test user password (default: TestPassword123!)

### Customization
You can modify test behavior by editing the test files:

- **Authentication scenarios**: Edit `auth-flow-test.js`
- **Mobile feature tests**: Edit `mobile-features-test.js`
- **API endpoint tests**: Edit `comprehensive-api-test.js`
- **Postman collection**: Edit `postman-collection-generator.js`

## 📚 Test Scenarios

### **Authentication Flow Scenarios**
1. Valid user registration
2. Duplicate email prevention
3. Invalid email/password validation
4. Login with valid/invalid credentials
5. Token validation and expiration
6. Password reset process
7. Session management
8. Account management operations
9. Role-based access control
10. Security measures (rate limiting, injection prevention)

### **Mobile Features Scenarios**
1. **Phone Verification**: SMS sending, code verification, number updates
2. **Offline Sync**: Data upload/download, conflict resolution, state management
3. **Biometric Auth**: Device registration, authentication, management
4. **Health Integration**: Data sync, validation, export, insights
5. **Push Notifications**: Device registration, sending, scheduling, preferences

### **API Endpoint Scenarios**
1. Health and status checks
2. Patient management (CRUD operations)
3. Appointment scheduling and management
4. Error handling (404, 401, 400, 500)
5. Rate limiting validation
6. Security headers verification
7. CORS configuration testing

## 🎯 Best Practices

### **Before Testing**
1. Ensure server is running and healthy
2. Database is accessible
3. All required environment variables are set
4. No conflicting processes on test ports

### **During Testing**
1. Monitor server logs for errors
2. Check database state if tests fail
3. Verify network connectivity
4. Review test output for patterns

### **After Testing**
1. Review generated reports
2. Address failed tests systematically
3. Update tests as API evolves
4. Clean up test data if needed

## 🛠️ Troubleshooting

### Common Issues

**Server Not Accessible**
```
❌ Server is not accessible. Please start the server first.
Run: npm start
```
- Solution: Start the HealthCare API server

**Authentication Failures**
- Check if user registration is working
- Verify JWT secret configuration
- Ensure database connectivity

**Mobile Feature Failures**
- Verify all mobile modules are loaded
- Check for missing dependencies
- Review middleware configurations

**Rate Limiting Issues**
- Tests may hit rate limits during rapid execution
- Add delays between requests if needed
- Adjust rate limit configurations for testing

## 📝 Contributing

To add new tests:

1. **New Endpoint Tests**: Add to `comprehensive-api-test.js`
2. **New Auth Scenarios**: Add to `auth-flow-test.js`
3. **New Mobile Features**: Add to `mobile-features-test.js`
4. **New Postman Requests**: Add to `postman-collection-generator.js`

### Test Structure
```javascript
async testNewFeature() {
  console.log('\n🆕 TESTING NEW FEATURE'.blue.bold);
  
  const result = await this.makeRequest('GET', '/new-endpoint', null, true);
  this.logTest('New Feature', 'Feature Test', result.success,
    result.success ? 'Feature working' : result.error?.message);
}
```

## 📈 Continuous Integration

The test suites are designed to be CI-friendly:

- Exit codes indicate success/failure
- JSON output available for parsing
- Configurable test types
- Detailed error reporting
- Performance metrics

### Example CI Usage
```yaml
- name: Run API Tests
  run: |
    npm start &
    sleep 10
    node tests/master-test-runner.js
    kill %1
```

---

**🎉 Happy Testing!** 

This comprehensive test suite ensures your HealthCare API is robust, secure, and ready for production deployment.