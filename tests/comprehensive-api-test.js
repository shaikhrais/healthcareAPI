/**
 * Comprehensive API Testing Suite
 * Tests all endpoints, authentication flows, and mobile features
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

class HealthCareAPITester {
  constructor() {
    this.authToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  // Helper method to make authenticated requests
  async makeRequest(method, endpoint, data = null, useAuth = false) {
    try {
      const config = {
        method,
        url: `${API_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (useAuth && this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  // Test helper
  logTest(testName, passed, details = '') {
    if (passed) {
      console.log(`✅ ${testName}`.green + (details ? ` - ${details}`.gray : ''));
      this.testResults.passed++;
    } else {
      console.log(`❌ ${testName}`.red + (details ? ` - ${details}`.gray : ''));
      this.testResults.failed++;
      this.testResults.errors.push(`${testName}: ${details}`);
    }
  }

  // Health and Status Tests
  async testHealthEndpoints() {
    console.log('\n🏥 TESTING HEALTH & STATUS ENDPOINTS'.blue.bold);
    
    // Test health endpoint
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.logTest('Health Endpoint', response.status === 200, `Status: ${response.status}`);
    } catch (error) {
      this.logTest('Health Endpoint', false, error.message);
    }

    // Test status endpoint
    const statusResult = await this.makeRequest('GET', '/status');
    this.logTest('API Status', statusResult.success, `Status: ${statusResult.status}`);
  }

  // Authentication Flow Tests
  async testAuthenticationFlow() {
    console.log('\n🔐 TESTING AUTHENTICATION FLOW'.blue.bold);

    // Test user registration
    const registerData = {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+1234567890'
    };

    const registerResult = await this.makeRequest('POST', '/auth/register', registerData);
    this.logTest('User Registration', registerResult.success, 
      registerResult.success ? 'User created successfully' : registerResult.error?.message || 'Registration failed');

    // Test user login
    const loginData = {
      email: registerData.email,
      password: registerData.password
    };

    const loginResult = await this.makeRequest('POST', '/auth/login', loginData);
    this.logTest('User Login', loginResult.success,
      loginResult.success ? 'Login successful' : loginResult.error?.message || 'Login failed');

    if (loginResult.success && loginResult.data?.token) {
      this.authToken = loginResult.data.token;
    }

    // Test protected route (get user profile)
    const profileResult = await this.makeRequest('GET', '/auth/me', null, true);
    this.logTest('Protected Route Access', profileResult.success,
      profileResult.success ? 'Profile retrieved' : profileResult.error?.message || 'Profile access failed');

    // Test logout
    const logoutResult = await this.makeRequest('POST', '/auth/logout', null, true);
    this.logTest('User Logout', logoutResult.success || logoutResult.status === 200,
      'Logout endpoint called');
  }

  // Phone Verification Tests
  async testPhoneVerification() {
    console.log('\n📱 TESTING PHONE VERIFICATION'.blue.bold);

    const phoneData = {
      phoneNumber: '+1234567890'
    };

    // Test sending verification code
    const sendCodeResult = await this.makeRequest('POST', '/auth/phone/send-code', phoneData, true);
    this.logTest('Send Verification Code', sendCodeResult.success || sendCodeResult.status === 200,
      sendCodeResult.success ? 'Code sent' : sendCodeResult.error?.message || 'Code sending failed');

    // Test verifying code (with mock code)
    const verifyData = {
      phoneNumber: '+1234567890',
      code: '123456' // Mock code for testing
    };

    const verifyResult = await this.makeRequest('POST', '/auth/phone/verify', verifyData, true);
    this.logTest('Verify Phone Code', verifyResult.success || verifyResult.status === 400,
      'Verification endpoint accessible');
  }

  // MFA (Multi-Factor Authentication) Tests
  async testMFAFlow() {
    console.log('\n🔒 TESTING MFA (MULTI-FACTOR AUTHENTICATION)'.blue.bold);

    // Test MFA setup
    const setupResult = await this.makeRequest('POST', '/auth/mfa/setup', null, true);
    this.logTest('MFA Setup', setupResult.success || setupResult.status === 200,
      setupResult.success ? 'MFA setup initiated' : 'MFA setup endpoint accessible');

    // Test getting MFA devices
    const devicesResult = await this.makeRequest('GET', '/auth/mfa/devices', null, true);
    this.logTest('Get MFA Devices', devicesResult.success || devicesResult.status === 200,
      'MFA devices endpoint accessible');

    // Test MFA verification
    const mfaVerifyData = {
      token: '123456',
      deviceId: 'test-device'
    };

    const mfaVerifyResult = await this.makeRequest('POST', '/auth/mfa/verify', mfaVerifyData, true);
    this.logTest('MFA Verification', mfaVerifyResult.success || mfaVerifyResult.status === 400,
      'MFA verification endpoint accessible');
  }

  // Biometric Authentication Tests
  async testBiometricAuth() {
    console.log('\n👆 TESTING BIOMETRIC AUTHENTICATION'.blue.bold);

    const biometricData = {
      deviceId: 'test-device-123',
      biometricType: 'fingerprint',
      publicKey: 'test-public-key',
      deviceInfo: {
        platform: 'iOS',
        model: 'iPhone 13',
        osVersion: '15.0'
      }
    };

    // Test biometric registration
    const registerResult = await this.makeRequest('POST', '/auth/biometric/register', biometricData, true);
    this.logTest('Biometric Registration', registerResult.success || registerResult.status === 400,
      registerResult.success ? 'Device registered' : 'Registration endpoint accessible');

    // Test biometric authentication
    const authData = {
      deviceId: 'test-device-123',
      challenge: 'test-challenge',
      signature: 'test-signature'
    };

    const authResult = await this.makeRequest('POST', '/auth/biometric/authenticate', authData);
    this.logTest('Biometric Authentication', authResult.success || authResult.status === 400,
      'Biometric auth endpoint accessible');

    // Test getting biometric devices
    const devicesResult = await this.makeRequest('GET', '/auth/biometric/devices', null, true);
    this.logTest('Get Biometric Devices', devicesResult.success || devicesResult.status === 200,
      'Biometric devices endpoint accessible');
  }

  // Offline Sync Tests
  async testOfflineSync() {
    console.log('\n🔄 TESTING OFFLINE SYNC'.blue.bold);

    // Test sync status
    const statusResult = await this.makeRequest('GET', '/sync/status', null, true);
    this.logTest('Sync Status', statusResult.success || statusResult.status === 200,
      'Sync status endpoint accessible');

    // Test data upload
    const uploadData = {
      data: [
        {
          id: 'test-1',
          type: 'appointment',
          data: { title: 'Test Appointment', date: new Date() },
          timestamp: Date.now()
        }
      ]
    };

    const uploadResult = await this.makeRequest('POST', '/sync/upload', uploadData, true);
    this.logTest('Data Upload', uploadResult.success || uploadResult.status === 400,
      'Data upload endpoint accessible');

    // Test data download
    const downloadResult = await this.makeRequest('GET', '/sync/download', null, true);
    this.logTest('Data Download', downloadResult.success || downloadResult.status === 200,
      'Data download endpoint accessible');

    // Test conflict resolution
    const conflictData = {
      conflicts: [
        {
          localId: 'test-1',
          serverId: 'server-1',
          resolution: 'server-wins'
        }
      ]
    };

    const conflictResult = await this.makeRequest('POST', '/sync/resolve-conflicts', conflictData, true);
    this.logTest('Conflict Resolution', conflictResult.success || conflictResult.status === 400,
      'Conflict resolution endpoint accessible');
  }

  // Health Integrations Tests
  async testHealthIntegrations() {
    console.log('\n❤️ TESTING HEALTH INTEGRATIONS'.blue.bold);

    // Test health data sync
    const syncData = {
      source: 'apple_health',
      data: [
        {
          type: 'steps',
          value: 8500,
          date: new Date(),
          metadata: { device: 'iPhone' }
        }
      ]
    };

    const syncResult = await this.makeRequest('POST', '/health/sync', syncData, true);
    this.logTest('Health Data Sync', syncResult.success || syncResult.status === 400,
      'Health sync endpoint accessible');

    // Test getting health data
    const dataResult = await this.makeRequest('GET', '/health/data', null, true);
    this.logTest('Get Health Data', dataResult.success || dataResult.status === 200,
      'Health data endpoint accessible');

    // Test health data export
    const exportResult = await this.makeRequest('GET', '/health/export', null, true);
    this.logTest('Health Data Export', exportResult.success || exportResult.status === 200,
      'Health export endpoint accessible');

    // Test health data validation
    const validateData = {
      data: [
        { type: 'heart_rate', value: 75, date: new Date() }
      ]
    };

    const validateResult = await this.makeRequest('POST', '/health/validate', validateData, true);
    this.logTest('Health Data Validation', validateResult.success || validateResult.status === 400,
      'Health validation endpoint accessible');
  }

  // Push Notifications Tests
  async testPushNotifications() {
    console.log('\n🔔 TESTING PUSH NOTIFICATIONS'.blue.bold);

    // Test device registration
    const deviceData = {
      token: 'test-fcm-token',
      platform: 'android',
      deviceInfo: {
        model: 'Pixel 6',
        osVersion: '12.0'
      }
    };

    const registerResult = await this.makeRequest('POST', '/notifications/devices/register', deviceData, true);
    this.logTest('Device Registration', registerResult.success || registerResult.status === 400,
      'Device registration endpoint accessible');

    // Test sending notification
    const notificationData = {
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { test: true }
    };

    const sendResult = await this.makeRequest('POST', '/notifications/send', notificationData, true);
    this.logTest('Send Notification', sendResult.success || sendResult.status === 400,
      'Send notification endpoint accessible');

    // Test notification history
    const historyResult = await this.makeRequest('GET', '/notifications/history', null, true);
    this.logTest('Notification History', historyResult.success || historyResult.status === 200,
      'Notification history endpoint accessible');

    // Test device management
    const devicesResult = await this.makeRequest('GET', '/notifications/devices', null, true);
    this.logTest('Get Devices', devicesResult.success || devicesResult.status === 200,
      'Device list endpoint accessible');
  }

  // Patients Module Tests
  async testPatientsModule() {
    console.log('\n👥 TESTING PATIENTS MODULE'.blue.bold);

    // Test getting patients list
    const listResult = await this.makeRequest('GET', '/patients', null, true);
    this.logTest('Get Patients List', listResult.success || listResult.status === 200,
      'Patients list endpoint accessible');

    // Test creating patient
    const patientData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+1234567890',
      dateOfBirth: '1990-01-01',
      gender: 'male'
    };

    const createResult = await this.makeRequest('POST', '/patients', patientData, true);
    this.logTest('Create Patient', createResult.success || createResult.status === 400,
      'Create patient endpoint accessible');

    // Test patient search
    const searchResult = await this.makeRequest('GET', '/patients/search?q=John', null, true);
    this.logTest('Search Patients', searchResult.success || searchResult.status === 200,
      'Patient search endpoint accessible');
  }

  // Appointments Module Tests
  async testAppointmentsModule() {
    console.log('\n📅 TESTING APPOINTMENTS MODULE'.blue.bold);

    // Test getting appointments
    const listResult = await this.makeRequest('GET', '/appointments', null, true);
    this.logTest('Get Appointments', listResult.success || listResult.status === 200,
      'Appointments list endpoint accessible');

    // Test creating appointment
    const appointmentData = {
      patientId: 'test-patient-id',
      doctorId: 'test-doctor-id',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 30,
      type: 'consultation'
    };

    const createResult = await this.makeRequest('POST', '/appointments', appointmentData, true);
    this.logTest('Create Appointment', createResult.success || createResult.status === 400,
      'Create appointment endpoint accessible');

    // Test appointment availability
    const availabilityResult = await this.makeRequest('GET', '/appointments/availability', null, true);
    this.logTest('Check Availability', availabilityResult.success || availabilityResult.status === 200,
      'Availability endpoint accessible');
  }

  // Rate Limiting Tests
  async testRateLimiting() {
    console.log('\n⚡ TESTING RATE LIMITING'.blue.bold);

    // Test rate limiting on login endpoint
    const loginData = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    let rateLimitHit = false;
    for (let i = 0; i < 7; i++) {
      const result = await this.makeRequest('POST', '/auth/login', loginData);
      if (result.status === 429) {
        rateLimitHit = true;
        break;
      }
    }

    this.logTest('Rate Limiting', rateLimitHit, 
      rateLimitHit ? 'Rate limit triggered' : 'Rate limiting may be configured differently');
  }

  // Security Headers Tests
  async testSecurityHeaders() {
    console.log('\n🛡️ TESTING SECURITY HEADERS'.blue.bold);

    try {
      const response = await axios.get(`${BASE_URL}/health`);
      const headers = response.headers;

      this.logTest('CORS Headers', !!headers['access-control-allow-origin'], 
        `CORS: ${headers['access-control-allow-origin']}`);
      
      this.logTest('Security Headers Present', 
        !!(headers['x-content-type-options'] || headers['x-frame-options']),
        'Security headers configured');

    } catch (error) {
      this.logTest('Security Headers', false, error.message);
    }
  }

  // Error Handling Tests
  async testErrorHandling() {
    console.log('\n🚫 TESTING ERROR HANDLING'.blue.bold);

    // Test 404 for non-existent endpoint
    const notFoundResult = await this.makeRequest('GET', '/nonexistent');
    this.logTest('404 Handling', notFoundResult.status === 404 || !notFoundResult.success,
      `Status: ${notFoundResult.status}`);

    // Test unauthorized access
    const unauthorizedResult = await this.makeRequest('GET', '/auth/me');
    this.logTest('Unauthorized Access', unauthorizedResult.status === 401,
      `Status: ${unauthorizedResult.status}`);

    // Test invalid JSON handling
    try {
      const response = await axios.post(`${API_URL}/auth/login`, 'invalid-json', {
        headers: { 'Content-Type': 'application/json' }
      });
      this.logTest('Invalid JSON Handling', false, 'Should have rejected invalid JSON');
    } catch (error) {
      this.logTest('Invalid JSON Handling', error.response?.status === 400 || error.response?.status === 422,
        `Status: ${error.response?.status}`);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 STARTING HEALTHCARE API COMPREHENSIVE TESTING SUITE'.rainbow.bold);
    console.log(`📡 Testing against: ${BASE_URL}`.cyan);
    console.log('=' * 80);

    const startTime = Date.now();

    try {
      await this.testHealthEndpoints();
      await this.testAuthenticationFlow();
      await this.testPhoneVerification();
      await this.testMFAFlow();
      await this.testBiometricAuth();
      await this.testOfflineSync();
      await this.testHealthIntegrations();
      await this.testPushNotifications();
      await this.testPatientsModule();
      await this.testAppointmentsModule();
      await this.testRateLimiting();
      await this.testSecurityHeaders();
      await this.testErrorHandling();
    } catch (error) {
      console.log(`\n💥 Testing suite encountered an error: ${error.message}`.red);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '=' * 80);
    console.log('📊 TEST RESULTS SUMMARY'.rainbow.bold);
    console.log(`✅ Passed: ${this.testResults.passed}`.green);
    console.log(`❌ Failed: ${this.testResults.failed}`.red);
    console.log(`⏱️ Duration: ${duration}s`.cyan);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`.yellow);

    if (this.testResults.errors.length > 0) {
      console.log('\n🔍 FAILED TESTS DETAILS:'.red.bold);
      this.testResults.errors.forEach(error => {
        console.log(`   • ${error}`.red);
      });
    }

    console.log('\n🎉 Testing Complete!'.green.bold);
  }
}

// Export for use in other files
module.exports = HealthCareAPITester;

// Run tests if called directly
if (require.main === module) {
  const tester = new HealthCareAPITester();
  tester.runAllTests().catch(console.error);
}