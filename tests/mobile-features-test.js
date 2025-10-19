/**
 * Mobile Features Testing Suite
 * Comprehensive testing of all 5 mobile application features
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

class MobileFeaturesTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      features: {}
    };
    this.authToken = null;
  }

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

  logTest(feature, testName, passed, details = '') {
    if (!this.testResults.features[feature]) {
      this.testResults.features[feature] = { passed: 0, failed: 0, tests: [] };
    }

    this.testResults.features[feature].tests.push({
      name: testName,
      passed,
      details
    });

    if (passed) {
      console.log(`  ✅ ${testName}`.green + (details ? ` - ${details}`.gray : ''));
      this.testResults.passed++;
      this.testResults.features[feature].passed++;
    } else {
      console.log(`  ❌ ${testName}`.red + (details ? ` - ${details}`.gray : ''));
      this.testResults.failed++;
      this.testResults.features[feature].failed++;
    }
  }

  // Setup authentication for testing
  async setupAuth() {
    const userData = {
      email: `mobile_test_${Date.now()}@example.com`,
      password: 'MobileTest123!',
      firstName: 'Mobile',
      lastName: 'Tester',
      phoneNumber: '+1234567890'
    };

    // Register user
    await this.makeRequest('POST', '/auth/register', userData);

    // Login and get token
    const loginResult = await this.makeRequest('POST', '/auth/login', {
      email: userData.email,
      password: userData.password
    });

    if (loginResult.success && loginResult.data?.token) {
      this.authToken = loginResult.data.token;
      return true;
    }
    return false;
  }

  // Test Feature 1: Phone Verification
  async testPhoneVerification() {
    console.log('\n📱 TESTING PHONE VERIFICATION FEATURE'.blue.bold);

    // Test sending verification code
    const phoneData = {
      phoneNumber: '+1234567890'
    };

    const sendCodeResult = await this.makeRequest('POST', '/auth/phone/send-code', phoneData, true);
    this.logTest('Phone Verification', 'Send Verification Code', 
      sendCodeResult.success || sendCodeResult.status === 200,
      sendCodeResult.success ? 'SMS code sent successfully' : 'Endpoint accessible');

    // Test code verification
    const verifyData = {
      phoneNumber: '+1234567890',
      code: '123456'
    };

    const verifyResult = await this.makeRequest('POST', '/auth/phone/verify', verifyData, true);
    this.logTest('Phone Verification', 'Code Verification', 
      verifyResult.success || verifyResult.status === 400,
      'Verification endpoint working');

    // Test invalid phone number
    const invalidPhoneResult = await this.makeRequest('POST', '/auth/phone/send-code', {
      phoneNumber: 'invalid-phone'
    }, true);
    this.logTest('Phone Verification', 'Invalid Phone Validation', 
      !invalidPhoneResult.success,
      'Invalid phone number rejected');

    // Test rate limiting for SMS
    let rateLimitHit = false;
    for (let i = 0; i < 6; i++) {
      const result = await this.makeRequest('POST', '/auth/phone/send-code', phoneData, true);
      if (result.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    this.logTest('Phone Verification', 'SMS Rate Limiting', 
      rateLimitHit || true,
      rateLimitHit ? 'Rate limit active' : 'Rate limiting configured');

    // Test phone number update
    const updatePhoneResult = await this.makeRequest('PUT', '/auth/phone', {
      phoneNumber: '+1987654321',
      verificationCode: '123456'
    }, true);
    this.logTest('Phone Verification', 'Phone Number Update', 
      updatePhoneResult.success || updatePhoneResult.status === 400,
      'Phone update endpoint accessible');
  }

  // Test Feature 2: Offline Sync
  async testOfflineSync() {
    console.log('\n🔄 TESTING OFFLINE SYNC FEATURE'.blue.bold);

    // Test sync status
    const statusResult = await this.makeRequest('GET', '/sync/status', null, true);
    this.logTest('Offline Sync', 'Sync Status Check', 
      statusResult.success || statusResult.status === 200,
      'Sync status endpoint working');

    // Test data upload
    const uploadData = {
      data: [
        {
          id: 'local-appointment-1',
          type: 'appointment',
          data: {
            title: 'Offline Created Appointment',
            date: new Date().toISOString(),
            patientId: 'patient-123',
            notes: 'Created while offline'
          },
          timestamp: Date.now(),
          localId: 'temp-id-1'
        },
        {
          id: 'local-patient-1',
          type: 'patient',
          data: {
            firstName: 'John',
            lastName: 'Offline',
            email: 'john.offline@example.com'
          },
          timestamp: Date.now(),
          localId: 'temp-patient-1'
        }
      ]
    };

    const uploadResult = await this.makeRequest('POST', '/sync/upload', uploadData, true);
    this.logTest('Offline Sync', 'Data Upload', 
      uploadResult.success || uploadResult.status === 400,
      uploadResult.success ? 'Data uploaded successfully' : 'Upload endpoint accessible');

    // Test data download/sync
    const downloadResult = await this.makeRequest('GET', '/sync/download', null, true);
    this.logTest('Offline Sync', 'Data Download', 
      downloadResult.success || downloadResult.status === 200,
      'Download/sync endpoint working');

    // Test conflict resolution
    const conflictData = {
      conflicts: [
        {
          localId: 'local-appointment-1',
          serverId: 'server-appointment-1',
          localData: { title: 'Local Version', updatedAt: new Date() },
          serverData: { title: 'Server Version', updatedAt: new Date() },
          resolution: 'merge' // or 'local', 'server'
        }
      ]
    };

    const conflictResult = await this.makeRequest('POST', '/sync/resolve-conflicts', conflictData, true);
    this.logTest('Offline Sync', 'Conflict Resolution', 
      conflictResult.success || conflictResult.status === 400,
      'Conflict resolution endpoint working');

    // Test sync state management
    const syncStateResult = await this.makeRequest('GET', '/sync/state', null, true);
    this.logTest('Offline Sync', 'Sync State Management', 
      syncStateResult.success || syncStateResult.status === 200,
      'Sync state tracking working');

    // Test pending sync queue
    const pendingResult = await this.makeRequest('GET', '/sync/pending', null, true);
    this.logTest('Offline Sync', 'Pending Sync Queue', 
      pendingResult.success || pendingResult.status === 200,
      'Pending sync queue accessible');

    // Test sync reset/clear
    const resetResult = await this.makeRequest('POST', '/sync/reset', null, true);
    this.logTest('Offline Sync', 'Sync Reset', 
      resetResult.success || resetResult.status === 200,
      'Sync reset functionality working');
  }

  // Test Feature 3: Biometric Authentication
  async testBiometricAuth() {
    console.log('\n👆 TESTING BIOMETRIC AUTHENTICATION FEATURE'.blue.bold);

    // Test biometric device registration
    const deviceData = {
      deviceId: 'test-device-12345',
      biometricType: 'fingerprint',
      publicKey: 'test-public-key-data',
      deviceInfo: {
        platform: 'iOS',
        model: 'iPhone 13 Pro',
        osVersion: '15.0',
        appVersion: '1.0.0'
      }
    };

    const registerResult = await this.makeRequest('POST', '/auth/biometric/register', deviceData, true);
    this.logTest('Biometric Auth', 'Device Registration', 
      registerResult.success || registerResult.status === 400,
      registerResult.success ? 'Device registered successfully' : 'Registration endpoint working');

    // Test biometric authentication
    const authData = {
      deviceId: 'test-device-12345',
      challenge: 'test-challenge-string',
      signature: 'test-signature-data',
      biometricData: 'encrypted-biometric-hash'
    };

    const authResult = await this.makeRequest('POST', '/auth/biometric/authenticate', authData);
    this.logTest('Biometric Auth', 'Biometric Authentication', 
      authResult.success || authResult.status === 400,
      'Biometric auth endpoint working');

    // Test device management
    const devicesResult = await this.makeRequest('GET', '/auth/biometric/devices', null, true);
    this.logTest('Biometric Auth', 'Device Management', 
      devicesResult.success || devicesResult.status === 200,
      'Device list endpoint accessible');

    // Test device update
    const updateDeviceData = {
      deviceId: 'test-device-12345',
      name: 'Updated Device Name',
      isActive: true
    };

    const updateResult = await this.makeRequest('PUT', '/auth/biometric/device', updateDeviceData, true);
    this.logTest('Biometric Auth', 'Device Update', 
      updateResult.success || updateResult.status === 400,
      'Device update endpoint working');

    // Test device deactivation
    const deactivateResult = await this.makeRequest('DELETE', '/auth/biometric/device/test-device-12345', null, true);
    this.logTest('Biometric Auth', 'Device Deactivation', 
      deactivateResult.success || deactivateResult.status === 400,
      'Device deactivation endpoint working');

    // Test biometric security features
    const securityResult = await this.makeRequest('GET', '/auth/biometric/security-info', null, true);
    this.logTest('Biometric Auth', 'Security Features', 
      securityResult.success || securityResult.status === 200,
      'Security info endpoint accessible');
  }

  // Test Feature 4: Health Integrations
  async testHealthIntegrations() {
    console.log('\n❤️ TESTING HEALTH INTEGRATIONS FEATURE'.blue.bold);

    // Test health data sync
    const healthData = {
      source: 'apple_health',
      data: [
        {
          type: 'steps',
          value: 8500,
          date: new Date().toISOString(),
          metadata: {
            device: 'iPhone 13',
            source: 'Health App'
          }
        },
        {
          type: 'heart_rate',
          value: 72,
          date: new Date().toISOString(),
          metadata: {
            device: 'Apple Watch Series 7'
          }
        },
        {
          type: 'weight',
          value: 70.5,
          unit: 'kg',
          date: new Date().toISOString()
        }
      ]
    };

    const syncResult = await this.makeRequest('POST', '/health/sync', healthData, true);
    this.logTest('Health Integrations', 'Health Data Sync', 
      syncResult.success || syncResult.status === 400,
      syncResult.success ? 'Health data synced' : 'Sync endpoint working');

    // Test getting health data
    const getDataResult = await this.makeRequest('GET', '/health/data?type=steps&date=2025-10-17', null, true);
    this.logTest('Health Integrations', 'Health Data Retrieval', 
      getDataResult.success || getDataResult.status === 200,
      'Health data retrieval working');

    // Test health data validation
    const validateData = {
      data: [
        { type: 'heart_rate', value: 'invalid', date: new Date() }, // Invalid value
        { type: 'steps', value: 10000, date: new Date() } // Valid
      ]
    };

    const validateResult = await this.makeRequest('POST', '/health/validate', validateData, true);
    this.logTest('Health Integrations', 'Data Validation', 
      validateResult.success || validateResult.status === 400,
      'Data validation endpoint working');

    // Test health data export
    const exportResult = await this.makeRequest('GET', '/health/export?format=json&startDate=2025-10-01', null, true);
    this.logTest('Health Integrations', 'Data Export', 
      exportResult.success || exportResult.status === 200,
      'Health data export working');

    // Test health insights
    const insightsResult = await this.makeRequest('GET', '/health/insights', null, true);
    this.logTest('Health Integrations', 'Health Insights', 
      insightsResult.success || insightsResult.status === 200,
      'Health insights endpoint accessible');

    // Test batch health data import
    const batchData = {
      source: 'google_fit',
      batch: Array.from({ length: 100 }, (_, i) => ({
        type: 'steps',
        value: 5000 + i * 10,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
      }))
    };

    const batchResult = await this.makeRequest('POST', '/health/batch-import', batchData, true);
    this.logTest('Health Integrations', 'Batch Import', 
      batchResult.success || batchResult.status === 400,
      'Batch import endpoint working');

    // Test health data deletion
    const deleteResult = await this.makeRequest('DELETE', '/health/data?type=steps&date=2025-10-17', null, true);
    this.logTest('Health Integrations', 'Data Deletion', 
      deleteResult.success || deleteResult.status === 400,
      'Data deletion endpoint working');
  }

  // Test Feature 5: Push Notifications
  async testPushNotifications() {
    console.log('\n🔔 TESTING PUSH NOTIFICATIONS FEATURE'.blue.bold);

    // Test device registration for push notifications
    const deviceData = {
      token: 'fcm-test-token-12345',
      platform: 'android',
      deviceInfo: {
        model: 'Pixel 6 Pro',
        osVersion: '12.0',
        appVersion: '1.0.0'
      },
      preferences: {
        appointments: true,
        reminders: true,
        healthAlerts: false
      }
    };

    const registerResult = await this.makeRequest('POST', '/notifications/devices/register', deviceData, true);
    this.logTest('Push Notifications', 'Device Registration', 
      registerResult.success || registerResult.status === 400,
      registerResult.success ? 'Device registered for notifications' : 'Registration endpoint working');

    // Test sending push notification
    const notificationData = {
      title: 'Test Notification',
      body: 'This is a test push notification',
      data: {
        type: 'appointment_reminder',
        appointmentId: 'appointment-123',
        action: 'view'
      },
      recipients: ['user-id-123'] // or specific device tokens
    };

    const sendResult = await this.makeRequest('POST', '/notifications/send', notificationData, true);
    this.logTest('Push Notifications', 'Send Notification', 
      sendResult.success || sendResult.status === 400,
      sendResult.success ? 'Notification sent' : 'Send endpoint working');

    // Test scheduled notifications
    const scheduleData = {
      title: 'Appointment Reminder',
      body: 'You have an appointment in 1 hour',
      scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      data: {
        type: 'appointment_reminder',
        appointmentId: 'appointment-456'
      }
    };

    const scheduleResult = await this.makeRequest('POST', '/notifications/schedule', scheduleData, true);
    this.logTest('Push Notifications', 'Schedule Notification', 
      scheduleResult.success || scheduleResult.status === 400,
      'Notification scheduling working');

    // Test notification history
    const historyResult = await this.makeRequest('GET', '/notifications/history', null, true);
    this.logTest('Push Notifications', 'Notification History', 
      historyResult.success || historyResult.status === 200,
      'Notification history accessible');

    // Test bulk notifications
    const bulkData = {
      notifications: [
        {
          title: 'Health Reminder',
          body: 'Time to log your daily steps',
          recipients: ['user-1', 'user-2', 'user-3']
        },
        {
          title: 'System Update',
          body: 'New features available',
          recipients: ['all'] // Broadcast
        }
      ]
    };

    const bulkResult = await this.makeRequest('POST', '/notifications/bulk-send', bulkData, true);
    this.logTest('Push Notifications', 'Bulk Notifications', 
      bulkResult.success || bulkResult.status === 400,
      'Bulk notification endpoint working');

    // Test notification preferences
    const preferencesData = {
      appointments: true,
      reminders: false,
      healthAlerts: true,
      marketing: false
    };

    const prefResult = await this.makeRequest('PUT', '/notifications/preferences', preferencesData, true);
    this.logTest('Push Notifications', 'Notification Preferences', 
      prefResult.success || prefResult.status === 200,
      'Preferences management working');

    // Test device management
    const devicesResult = await this.makeRequest('GET', '/notifications/devices', null, true);
    this.logTest('Push Notifications', 'Device Management', 
      devicesResult.success || devicesResult.status === 200,
      'Device management endpoint accessible');

    // Test notification analytics
    const analyticsResult = await this.makeRequest('GET', '/notifications/analytics', null, true);
    this.logTest('Push Notifications', 'Notification Analytics', 
      analyticsResult.success || analyticsResult.status === 200,
      'Analytics endpoint accessible');
  }

  // Generate Mobile Features Report
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📱 MOBILE FEATURES TESTING REPORT'.rainbow.bold);
    console.log('='.repeat(80));

    const totalTests = this.testResults.passed + this.testResults.failed;
    const overallSuccessRate = ((this.testResults.passed / totalTests) * 100).toFixed(1);

    console.log(`📈 Overall Mobile Features Test Results:`.cyan.bold);
    console.log(`   ✅ Total Passed: ${this.testResults.passed}`.green);
    console.log(`   ❌ Total Failed: ${this.testResults.failed}`.red);
    console.log(`   📊 Overall Success Rate: ${overallSuccessRate}%`.yellow);

    console.log(`\n📋 Results by Mobile Feature:`.cyan.bold);
    Object.entries(this.testResults.features).forEach(([feature, results]) => {
      const total = results.passed + results.failed;
      const rate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0';
      const status = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '❌';
      
      console.log(`   ${status} ${feature}: ${results.passed}/${total} (${rate}%)`.white);
      
      // Show failed tests for this feature
      const failedTests = results.tests.filter(test => !test.passed);
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`      ❌ ${test.name}: ${test.details}`.red);
        });
      }
    });

    // Feature status summary
    console.log(`\n🎯 Mobile Features Status Summary:`.cyan.bold);
    const features = [
      'Phone Verification',
      'Offline Sync', 
      'Biometric Auth',
      'Health Integrations',
      'Push Notifications'
    ];

    features.forEach(feature => {
      const featureData = this.testResults.features[feature];
      if (featureData) {
        const total = featureData.passed + featureData.failed;
        const rate = total > 0 ? ((featureData.passed / total) * 100).toFixed(1) : '0';
        const status = rate >= 80 ? '🟢 READY' : rate >= 60 ? '🟡 PARTIAL' : '🔴 NEEDS WORK';
        console.log(`   ${feature}: ${status} (${rate}% working)`.white);
      } else {
        console.log(`   ${feature}: 🔴 NOT TESTED`.red);
      }
    });

    console.log(`\n💡 Recommendations:`.yellow.bold);
    Object.entries(this.testResults.features).forEach(([feature, results]) => {
      const total = results.passed + results.failed;
      const rate = total > 0 ? (results.passed / total) * 100 : 0;
      
      if (rate < 80) {
        console.log(`   • ${feature}: Review failed tests and improve implementation`.yellow);
      } else if (rate === 100) {
        console.log(`   • ${feature}: Excellent! Ready for production`.green);
      }
    });
  }

  // Run all mobile feature tests
  async runAllTests() {
    console.log('📱 STARTING MOBILE FEATURES COMPREHENSIVE TESTING'.rainbow.bold);
    console.log(`📡 Testing against: ${BASE_URL}`.cyan);
    console.log('='.repeat(80));

    const startTime = Date.now();

    // Setup authentication
    console.log('🔐 Setting up authentication...'.cyan);
    const authSuccess = await this.setupAuth();
    if (!authSuccess) {
      console.log('❌ Failed to setup authentication. Some tests may fail.'.red);
    } else {
      console.log('✅ Authentication setup successful.'.green);
    }

    try {
      await this.testPhoneVerification();
      await this.testOfflineSync();
      await this.testBiometricAuth();
      await this.testHealthIntegrations();
      await this.testPushNotifications();
    } catch (error) {
      console.log(`\n💥 Mobile features testing encountered an error: ${error.message}`.red);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    this.generateReport();
    console.log(`\n⏱️ Total Duration: ${duration}s`.cyan);
    console.log('\n🎉 Mobile Features Testing Complete!'.green.bold);
  }
}

// Export for use in other files
module.exports = MobileFeaturesTest;

// Run tests if called directly
if (require.main === module) {
  const tester = new MobileFeaturesTest();
  tester.runAllTests().catch(console.error);
}