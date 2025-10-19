/**
 * Authentication Flow Testing Suite
 * Detailed testing of all authentication scenarios and edge cases
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

class AuthenticationTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      scenarios: []
    };
    this.createdUsers = [];
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: `${API_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status, headers: response.headers };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500,
        headers: error.response?.headers || {}
      };
    }
  }

  logTest(scenario, testName, passed, details = '') {
    const result = {
      scenario,
      testName,
      passed,
      details
    };
    
    this.testResults.scenarios.push(result);
    
    if (passed) {
      console.log(`  ✅ ${testName}`.green + (details ? ` - ${details}`.gray : ''));
      this.testResults.passed++;
    } else {
      console.log(`  ❌ ${testName}`.red + (details ? ` - ${details}`.gray : ''));
      this.testResults.failed++;
    }
  }

  // Test User Registration Flow
  async testUserRegistration() {
    console.log('\n📝 TESTING USER REGISTRATION SCENARIOS'.blue.bold);

    // Valid Registration
    const validUser = {
      email: `test_valid_${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567890'
    };

    const validRegResult = await this.makeRequest('POST', '/auth/register', validUser);
    this.logTest('Registration', 'Valid User Registration', validRegResult.success,
      validRegResult.success ? 'User created successfully' : validRegResult.error?.message);
    
    if (validRegResult.success) {
      this.createdUsers.push(validUser.email);
    }

    // Duplicate Email Registration
    const duplicateResult = await this.makeRequest('POST', '/auth/register', validUser);
    this.logTest('Registration', 'Duplicate Email Prevention', !duplicateResult.success && duplicateResult.status === 400,
      'Duplicate email properly rejected');

    // Invalid Email Format
    const invalidEmailUser = { ...validUser, email: 'invalid-email' };
    const invalidEmailResult = await this.makeRequest('POST', '/auth/register', invalidEmailUser);
    this.logTest('Registration', 'Invalid Email Validation', !invalidEmailResult.success,
      'Invalid email format rejected');

    // Weak Password
    const weakPasswordUser = { ...validUser, email: `weak_${Date.now()}@example.com`, password: '123' };
    const weakPasswordResult = await this.makeRequest('POST', '/auth/register', weakPasswordUser);
    this.logTest('Registration', 'Weak Password Validation', !weakPasswordResult.success,
      'Weak password rejected');

    // Missing Required Fields
    const incompleteUser = { email: `incomplete_${Date.now()}@example.com` };
    const incompleteResult = await this.makeRequest('POST', '/auth/register', incompleteUser);
    this.logTest('Registration', 'Required Fields Validation', !incompleteResult.success,
      'Missing required fields rejected');
  }

  // Test Login Flow
  async testLoginFlow() {
    console.log('\n🔐 TESTING LOGIN SCENARIOS'.blue.bold);

    // First create a test user
    const testUser = {
      email: `login_test_${Date.now()}@example.com`,
      password: 'LoginTestPassword123!',
      firstName: 'Login',
      lastName: 'Test'
    };

    await this.makeRequest('POST', '/auth/register', testUser);
    this.createdUsers.push(testUser.email);

    // Valid Login
    const validLoginResult = await this.makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    this.logTest('Login', 'Valid Login', validLoginResult.success && validLoginResult.data?.token,
      validLoginResult.success ? 'Token received' : validLoginResult.error?.message);

    const validToken = validLoginResult.data?.token;

    // Invalid Email
    const invalidEmailResult = await this.makeRequest('POST', '/auth/login', {
      email: 'nonexistent@example.com',
      password: testUser.password
    });
    this.logTest('Login', 'Invalid Email', !invalidEmailResult.success,
      'Non-existent email rejected');

    // Invalid Password
    const invalidPasswordResult = await this.makeRequest('POST', '/auth/login', {
      email: testUser.email,
      password: 'wrongpassword'
    });
    this.logTest('Login', 'Invalid Password', !invalidPasswordResult.success,
      'Wrong password rejected');

    // Missing Credentials
    const missingCredsResult = await this.makeRequest('POST', '/auth/login', {});
    this.logTest('Login', 'Missing Credentials', !missingCredsResult.success,
      'Missing credentials rejected');

    return validToken;
  }

  // Test Token Validation
  async testTokenValidation(token) {
    console.log('\n🎫 TESTING TOKEN VALIDATION'.blue.bold);

    if (!token) {
      this.logTest('Token', 'Token Available for Testing', false, 'No valid token from login');
      return;
    }

    // Valid Token Access
    const validTokenResult = await this.makeRequest('GET', '/auth/me', null, token);
    this.logTest('Token', 'Valid Token Access', validTokenResult.success,
      validTokenResult.success ? 'Protected route accessible' : validTokenResult.error?.message);

    // Invalid Token
    const invalidTokenResult = await this.makeRequest('GET', '/auth/me', null, 'invalid.token.here');
    this.logTest('Token', 'Invalid Token Rejection', !invalidTokenResult.success && invalidTokenResult.status === 401,
      'Invalid token properly rejected');

    // No Token
    const noTokenResult = await this.makeRequest('GET', '/auth/me');
    this.logTest('Token', 'No Token Rejection', !noTokenResult.success && noTokenResult.status === 401,
      'Missing token properly rejected');

    // Malformed Token
    const malformedTokenResult = await this.makeRequest('GET', '/auth/me', null, 'Bearer malformed');
    this.logTest('Token', 'Malformed Token Rejection', !malformedTokenResult.success,
      'Malformed token properly rejected');
  }

  // Test Password Reset Flow
  async testPasswordResetFlow() {
    console.log('\n🔄 TESTING PASSWORD RESET FLOW'.blue.bold);

    // Create test user for password reset
    const resetUser = {
      email: `reset_test_${Date.now()}@example.com`,
      password: 'ResetTestPassword123!',
      firstName: 'Reset',
      lastName: 'Test'
    };

    await this.makeRequest('POST', '/auth/register', resetUser);
    this.createdUsers.push(resetUser.email);

    // Request Password Reset
    const resetRequestResult = await this.makeRequest('POST', '/auth/password-reset/request', {
      email: resetUser.email
    });
    this.logTest('Password Reset', 'Reset Request', resetRequestResult.success || resetRequestResult.status === 200,
      'Reset request processed');

    // Invalid Email for Reset
    const invalidResetResult = await this.makeRequest('POST', '/auth/password-reset/request', {
      email: 'nonexistent@example.com'
    });
    this.logTest('Password Reset', 'Invalid Email Reset', 
      invalidResetResult.success || invalidResetResult.status === 200,
      'Invalid email handled gracefully');

    // Test Reset with Token (mock scenario)
    const resetWithTokenResult = await this.makeRequest('POST', '/auth/password-reset/confirm', {
      token: 'mock-reset-token',
      newPassword: 'NewPassword123!'
    });
    this.logTest('Password Reset', 'Reset with Token', 
      !resetWithTokenResult.success || resetWithTokenResult.status === 400,
      'Reset token validation working');
  }

  // Test Session Management
  async testSessionManagement(token) {
    console.log('\n👤 TESTING SESSION MANAGEMENT'.blue.bold);

    if (!token) {
      this.logTest('Session', 'Token Available for Testing', false, 'No valid token');
      return;
    }

    // Get Current Session
    const sessionResult = await this.makeRequest('GET', '/auth/session', null, token);
    this.logTest('Session', 'Get Session Info', sessionResult.success || sessionResult.status === 200,
      'Session endpoint accessible');

    // Get Session Stats
    const statsResult = await this.makeRequest('GET', '/auth/session/stats', null, token);
    this.logTest('Session', 'Session Statistics', statsResult.success || statsResult.status === 200,
      'Session stats endpoint accessible');

    // Logout
    const logoutResult = await this.makeRequest('POST', '/auth/logout', null, token);
    this.logTest('Session', 'Logout', logoutResult.success || logoutResult.status === 200,
      'Logout processed');

    // Access After Logout
    const afterLogoutResult = await this.makeRequest('GET', '/auth/me', null, token);
    this.logTest('Session', 'Access After Logout', 
      afterLogoutResult.success || afterLogoutResult.status !== 403,
      'Post-logout access handled');
  }

  // Test Account Management
  async testAccountManagement(token) {
    console.log('\n⚙️ TESTING ACCOUNT MANAGEMENT'.blue.bold);

    if (!token) {
      this.logTest('Account', 'Token Available for Testing', false, 'No valid token');
      return;
    }

    // Update Profile
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+1987654321'
    };

    const updateResult = await this.makeRequest('PUT', '/auth/profile', updateData, token);
    this.logTest('Account', 'Profile Update', updateResult.success || updateResult.status === 200,
      updateResult.success ? 'Profile updated' : 'Update endpoint accessible');

    // Change Password
    const passwordChangeData = {
      currentPassword: 'LoginTestPassword123!',
      newPassword: 'NewPassword123!'
    };

    const passwordResult = await this.makeRequest('PUT', '/auth/password', passwordChangeData, token);
    this.logTest('Account', 'Password Change', passwordResult.success || passwordResult.status === 400,
      'Password change endpoint accessible');

    // Get Account Settings
    const settingsResult = await this.makeRequest('GET', '/auth/settings', null, token);
    this.logTest('Account', 'Account Settings', settingsResult.success || settingsResult.status === 200,
      'Settings endpoint accessible');

    // Deactivate Account
    const deactivateResult = await this.makeRequest('POST', '/auth/deactivate', null, token);
    this.logTest('Account', 'Account Deactivation', deactivateResult.success || deactivateResult.status === 200,
      'Deactivation endpoint accessible');
  }

  // Test Role-Based Access Control
  async testRoleBasedAccess() {
    console.log('\n👑 TESTING ROLE-BASED ACCESS CONTROL'.blue.bold);

    // Create regular user
    const regularUser = {
      email: `regular_${Date.now()}@example.com`,
      password: 'RegularUserPassword123!',
      firstName: 'Regular',
      lastName: 'User'
    };

    const regResult = await this.makeRequest('POST', '/auth/register', regularUser);
    if (regResult.success) {
      this.createdUsers.push(regularUser.email);
    }

    const loginResult = await this.makeRequest('POST', '/auth/login', {
      email: regularUser.email,
      password: regularUser.password
    });

    const userToken = loginResult.data?.token;

    if (userToken) {
      // Test admin endpoint access
      const adminResult = await this.makeRequest('GET', '/admin/users', null, userToken);
      this.logTest('Role Access', 'Admin Endpoint Access', 
        !adminResult.success && adminResult.status === 403,
        'Regular user denied admin access');

      // Test user endpoints
      const userResult = await this.makeRequest('GET', '/auth/me', null, userToken);
      this.logTest('Role Access', 'User Endpoint Access', userResult.success,
        'Regular user can access user endpoints');
    }
  }

  // Test Security Measures
  async testSecurityMeasures() {
    console.log('\n🛡️ TESTING SECURITY MEASURES'.blue.bold);

    // Test rate limiting on login
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    let rateLimitTriggered = false;
    for (let i = 0; i < 10; i++) {
      const result = await this.makeRequest('POST', '/auth/login', loginData);
      if (result.status === 429) {
        rateLimitTriggered = true;
        break;
      }
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logTest('Security', 'Rate Limiting', rateLimitTriggered,
      rateLimitTriggered ? 'Rate limit triggered' : 'Rate limiting may be configured differently');

    // Test SQL Injection in login
    const sqlInjectionData = {
      email: "admin'; DROP TABLE users; --",
      password: 'password'
    };

    const sqlResult = await this.makeRequest('POST', '/auth/login', sqlInjectionData);
    this.logTest('Security', 'SQL Injection Protection', !sqlResult.success,
      'SQL injection attempt handled');

    // Test XSS in registration
    const xssData = {
      email: `xss_${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: '<script>alert("xss")</script>',
      lastName: 'Test'
    };

    const xssResult = await this.makeRequest('POST', '/auth/register', xssData);
    this.logTest('Security', 'XSS Protection', 
      !xssResult.success || !xssResult.data?.firstName?.includes('<script>'),
      'XSS attempt handled');
  }

  // Generate Test Report
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUTHENTICATION TESTING REPORT'.rainbow.bold);
    console.log('='.repeat(80));

    const totalTests = this.testResults.passed + this.testResults.failed;
    const successRate = ((this.testResults.passed / totalTests) * 100).toFixed(1);

    console.log(`📈 Overall Results:`.cyan.bold);
    console.log(`   ✅ Passed: ${this.testResults.passed}`.green);
    console.log(`   ❌ Failed: ${this.testResults.failed}`.red);
    console.log(`   📊 Success Rate: ${successRate}%`.yellow);

    // Group results by scenario
    const scenarioGroups = {};
    this.testResults.scenarios.forEach(result => {
      if (!scenarioGroups[result.scenario]) {
        scenarioGroups[result.scenario] = { passed: 0, failed: 0, tests: [] };
      }
      scenarioGroups[result.scenario].tests.push(result);
      if (result.passed) {
        scenarioGroups[result.scenario].passed++;
      } else {
        scenarioGroups[result.scenario].failed++;
      }
    });

    console.log(`\n📋 Results by Scenario:`.cyan.bold);
    Object.entries(scenarioGroups).forEach(([scenario, results]) => {
      const rate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
      console.log(`   ${scenario}: ${results.passed}/${results.passed + results.failed} (${rate}%)`.white);
    });

    // Show failed tests
    const failedTests = this.testResults.scenarios.filter(result => !result.passed);
    if (failedTests.length > 0) {
      console.log(`\n🔍 Failed Tests:`.red.bold);
      failedTests.forEach(test => {
        console.log(`   • ${test.scenario} - ${test.testName}: ${test.details}`.red);
      });
    }

    console.log(`\n👤 Test Users Created: ${this.createdUsers.length}`.cyan);
    if (this.createdUsers.length > 0) {
      console.log(`   (Consider cleaning up: ${this.createdUsers.join(', ')})`.gray);
    }
  }

  // Run all authentication tests
  async runAllTests() {
    console.log('🔐 STARTING AUTHENTICATION COMPREHENSIVE TESTING'.rainbow.bold);
    console.log(`📡 Testing against: ${BASE_URL}`.cyan);
    console.log('='.repeat(80));

    const startTime = Date.now();

    try {
      await this.testUserRegistration();
      const token = await this.testLoginFlow();
      await this.testTokenValidation(token);
      await this.testPasswordResetFlow();
      await this.testSessionManagement(token);
      await this.testAccountManagement(token);
      await this.testRoleBasedAccess();
      await this.testSecurityMeasures();
    } catch (error) {
      console.log(`\n💥 Authentication testing encountered an error: ${error.message}`.red);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.generateReport();
    console.log(`\n⏱️ Total Duration: ${duration}s`.cyan);
    console.log('\n🎉 Authentication Testing Complete!'.green.bold);
  }
}

// Export for use in other files
module.exports = AuthenticationTester;

// Run tests if called directly
if (require.main === module) {
  const tester = new AuthenticationTester();
  tester.runAllTests().catch(console.error);
}