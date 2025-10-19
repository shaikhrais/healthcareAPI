/**
 * Postman Collection Generator
 * Generates a comprehensive Postman collection for all API endpoints
 */

const fs = require('fs');
const path = require('path');

// Import colors if available, fallback to basic console if not
let colors;
try {
  colors = require('colors');
} catch (e) {
  colors = {
    green: (text) => text,
    cyan: (text) => text,
    white: (text) => text,
    yellow: (text) => text
  };
}

class PostmanCollectionGenerator {
  constructor() {
    this.collection = {
      info: {
        name: "HealthCare Management API - Complete Testing Collection",
        description: "Comprehensive API testing collection for all endpoints including authentication flows and mobile features",
        version: "1.0.0",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      auth: {
        type: "bearer",
        bearer: [
          {
            key: "token",
            value: "{{auth_token}}",
            type: "string"
          }
        ]
      },
      variable: [
        {
          key: "base_url",
          value: "http://localhost:3001",
          type: "string"
        },
        {
          key: "api_url",
          value: "{{base_url}}/api",
          type: "string"
        },
        {
          key: "auth_token",
          value: "",
          type: "string"
        },
        {
          key: "user_email",
          value: "test@example.com",
          type: "string"
        },
        {
          key: "user_password",
          value: "TestPassword123!",
          type: "string"
        }
      ],
      item: []
    };
  }

  createRequest(name, method, endpoint, description = "", body = null, tests = null) {
    const request = {
      name,
      request: {
        method: method.toUpperCase(),
        header: [
          {
            key: "Content-Type",
            value: "application/json",
            type: "text"
          }
        ],
        url: {
          raw: `{{api_url}}${endpoint}`,
          host: ["{{api_url}}"],
          path: endpoint.split('/').filter(p => p)
        },
        description
      }
    };

    if (body) {
      request.request.body = {
        mode: "raw",
        raw: JSON.stringify(body, null, 2),
        options: {
          raw: {
            language: "json"
          }
        }
      };
    }

    if (tests) {
      request.event = [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: tests
          }
        }
      ];
    }

    return request;
  }

  createFolder(name, description, items) {
    return {
      name,
      description,
      item: items
    };
  }

  generateAuthenticationFolder() {
    const authTests = [
      "pm.test('Status code is 200 or 201', function () {",
      "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
      "});",
      "",
      "if (pm.response.code === 200 || pm.response.code === 201) {",
      "    const responseJson = pm.response.json();",
      "    if (responseJson.token) {",
      "        pm.collectionVariables.set('auth_token', responseJson.token);",
      "    }",
      "}"
    ];

    const requests = [
      this.createRequest(
        "Register User",
        "POST",
        "/auth/register",
        "Register a new user account",
        {
          email: "{{user_email}}",
          password: "{{user_password}}",
          firstName: "Test",
          lastName: "User",
          phoneNumber: "+1234567890"
        },
        authTests
      ),
      this.createRequest(
        "Login User",
        "POST", 
        "/auth/login",
        "Login with user credentials",
        {
          email: "{{user_email}}",
          password: "{{user_password}}"
        },
        authTests
      ),
      this.createRequest(
        "Get User Profile",
        "GET",
        "/auth/me",
        "Get current user profile (requires authentication)",
        null,
        [
          "pm.test('Status code is 200', function () {",
          "    pm.response.to.have.status(200);",
          "});",
          "",
          "pm.test('Response has user data', function () {",
          "    const responseJson = pm.response.json();",
          "    pm.expect(responseJson).to.have.property('data');",
          "});"
        ]
      ),
      this.createRequest(
        "Logout User",
        "POST",
        "/auth/logout",
        "Logout current user session"
      ),
      this.createRequest(
        "Request Password Reset",
        "POST",
        "/auth/password-reset/request",
        "Request password reset email",
        {
          email: "{{user_email}}"
        }
      )
    ];

    return this.createFolder("🔐 Authentication", "User authentication and session management", requests);
  }

  generatePhoneVerificationFolder() {
    const requests = [
      this.createRequest(
        "Send Verification Code",
        "POST",
        "/auth/phone/send-code",
        "Send SMS verification code to phone number",
        {
          phoneNumber: "+1234567890"
        }
      ),
      this.createRequest(
        "Verify Phone Code",
        "POST",
        "/auth/phone/verify",
        "Verify SMS code received on phone",
        {
          phoneNumber: "+1234567890",
          code: "123456"
        }
      ),
      this.createRequest(
        "Update Phone Number",
        "PUT",
        "/auth/phone",
        "Update user's phone number",
        {
          phoneNumber: "+1987654321",
          verificationCode: "123456"
        }
      )
    ];

    return this.createFolder("📱 Phone Verification", "SMS-based phone number verification", requests);
  }

  generateMFAFolder() {
    const requests = [
      this.createRequest(
        "Setup MFA",
        "POST",
        "/auth/mfa/setup",
        "Initialize multi-factor authentication setup"
      ),
      this.createRequest(
        "Verify MFA Token",
        "POST",
        "/auth/mfa/verify",
        "Verify MFA token from authenticator app",
        {
          token: "123456",
          deviceId: "test-device"
        }
      ),
      this.createRequest(
        "Get MFA Devices",
        "GET",
        "/auth/mfa/devices",
        "Get list of registered MFA devices"
      ),
      this.createRequest(
        "Disable MFA",
        "DELETE",
        "/auth/mfa/device/{deviceId}",
        "Disable MFA for specific device"
      )
    ];

    return this.createFolder("🔒 Multi-Factor Authentication", "TOTP-based MFA management", requests);
  }

  generateBiometricFolder() {
    const requests = [
      this.createRequest(
        "Register Biometric Device",
        "POST",
        "/auth/biometric/register",
        "Register device for biometric authentication",
        {
          deviceId: "test-device-12345",
          biometricType: "fingerprint",
          publicKey: "test-public-key-data",
          deviceInfo: {
            platform: "iOS",
            model: "iPhone 13 Pro",
            osVersion: "15.0",
            appVersion: "1.0.0"
          }
        }
      ),
      this.createRequest(
        "Biometric Authentication",
        "POST",
        "/auth/biometric/authenticate",
        "Authenticate using biometric data",
        {
          deviceId: "test-device-12345",
          challenge: "test-challenge-string",
          signature: "test-signature-data",
          biometricData: "encrypted-biometric-hash"
        }
      ),
      this.createRequest(
        "Get Biometric Devices",
        "GET",
        "/auth/biometric/devices",
        "Get list of registered biometric devices"
      ),
      this.createRequest(
        "Update Biometric Device",
        "PUT",
        "/auth/biometric/device",
        "Update biometric device information",
        {
          deviceId: "test-device-12345",
          name: "Updated Device Name",
          isActive: true
        }
      ),
      this.createRequest(
        "Delete Biometric Device",
        "DELETE",
        "/auth/biometric/device/{deviceId}",
        "Remove biometric device registration"
      )
    ];

    return this.createFolder("👆 Biometric Authentication", "Fingerprint/Face ID authentication", requests);
  }

  generateOfflineSyncFolder() {
    const requests = [
      this.createRequest(
        "Get Sync Status",
        "GET",
        "/sync/status",
        "Get current synchronization status"
      ),
      this.createRequest(
        "Upload Offline Data",
        "POST",
        "/sync/upload",
        "Upload data created while offline",
        {
          data: [
            {
              id: "local-appointment-1",
              type: "appointment",
              data: {
                title: "Offline Created Appointment",
                date: new Date().toISOString(),
                patientId: "patient-123",
                notes: "Created while offline"
              },
              timestamp: Date.now(),
              localId: "temp-id-1"
            }
          ]
        }
      ),
      this.createRequest(
        "Download Server Data",
        "GET",
        "/sync/download",
        "Download latest data from server"
      ),
      this.createRequest(
        "Resolve Conflicts",
        "POST",
        "/sync/resolve-conflicts",
        "Resolve sync conflicts between local and server data",
        {
          conflicts: [
            {
              localId: "local-appointment-1",
              serverId: "server-appointment-1",
              localData: { title: "Local Version", updatedAt: new Date() },
              serverData: { title: "Server Version", updatedAt: new Date() },
              resolution: "merge"
            }
          ]
        }
      ),
      this.createRequest(
        "Get Sync State",
        "GET",
        "/sync/state",
        "Get detailed synchronization state"
      ),
      this.createRequest(
        "Reset Sync",
        "POST",
        "/sync/reset",
        "Reset synchronization state"
      )
    ];

    return this.createFolder("🔄 Offline Sync", "Data synchronization for offline functionality", requests);
  }

  generateHealthIntegrationsFolder() {
    const requests = [
      this.createRequest(
        "Sync Health Data",
        "POST",
        "/health/sync",
        "Sync health data from external sources",
        {
          source: "apple_health",
          data: [
            {
              type: "steps",
              value: 8500,
              date: new Date().toISOString(),
              metadata: {
                device: "iPhone 13",
                source: "Health App"
              }
            },
            {
              type: "heart_rate",
              value: 72,
              date: new Date().toISOString(),
              metadata: {
                device: "Apple Watch Series 7"
              }
            }
          ]
        }
      ),
      this.createRequest(
        "Get Health Data",
        "GET",
        "/health/data?type=steps&date=2025-10-17",
        "Retrieve health data with filters"
      ),
      this.createRequest(
        "Validate Health Data",
        "POST",
        "/health/validate",
        "Validate health data before saving",
        {
          data: [
            { type: "heart_rate", value: 75, date: new Date() },
            { type: "steps", value: 10000, date: new Date() }
          ]
        }
      ),
      this.createRequest(
        "Export Health Data",
        "GET",
        "/health/export?format=json&startDate=2025-10-01",
        "Export health data in various formats"
      ),
      this.createRequest(
        "Get Health Insights",
        "GET",
        "/health/insights",
        "Get AI-generated health insights"
      ),
      this.createRequest(
        "Batch Import Health Data",
        "POST",
        "/health/batch-import",
        "Import large amounts of health data",
        {
          source: "google_fit",
          batch: [
            { type: "steps", value: 5000, date: new Date().toISOString() },
            { type: "steps", value: 5100, date: new Date(Date.now() - 24*60*60*1000).toISOString() }
          ]
        }
      )
    ];

    return this.createFolder("❤️ Health Integrations", "Apple Health & Google Fit integration", requests);
  }

  generatePushNotificationsFolder() {
    const requests = [
      this.createRequest(
        "Register Device",
        "POST",
        "/notifications/devices/register",
        "Register device for push notifications",
        {
          token: "fcm-test-token-12345",
          platform: "android",
          deviceInfo: {
            model: "Pixel 6 Pro",
            osVersion: "12.0",
            appVersion: "1.0.0"
          },
          preferences: {
            appointments: true,
            reminders: true,
            healthAlerts: false
          }
        }
      ),
      this.createRequest(
        "Send Notification",
        "POST",
        "/notifications/send",
        "Send push notification to specific users",
        {
          title: "Test Notification",
          body: "This is a test push notification",
          data: {
            type: "appointment_reminder",
            appointmentId: "appointment-123",
            action: "view"
          },
          recipients: ["user-id-123"]
        }
      ),
      this.createRequest(
        "Schedule Notification",
        "POST",
        "/notifications/schedule",
        "Schedule future push notification",
        {
          title: "Appointment Reminder",
          body: "You have an appointment in 1 hour",
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          data: {
            type: "appointment_reminder",
            appointmentId: "appointment-456"
          }
        }
      ),
      this.createRequest(
        "Get Notification History",
        "GET",
        "/notifications/history",
        "Get notification history for user"
      ),
      this.createRequest(
        "Send Bulk Notifications",
        "POST",
        "/notifications/bulk-send",
        "Send notifications to multiple users",
        {
          notifications: [
            {
              title: "Health Reminder",
              body: "Time to log your daily steps",
              recipients: ["user-1", "user-2", "user-3"]
            }
          ]
        }
      ),
      this.createRequest(
        "Update Notification Preferences",
        "PUT",
        "/notifications/preferences",
        "Update user notification preferences",
        {
          appointments: true,
          reminders: false,
          healthAlerts: true,
          marketing: false
        }
      ),
      this.createRequest(
        "Get Registered Devices",
        "GET",
        "/notifications/devices",
        "Get list of user's registered devices"
      )
    ];

    return this.createFolder("🔔 Push Notifications", "FCM/APNS push notification management", requests);
  }

  generatePatientsFolder() {
    const requests = [
      this.createRequest(
        "Get Patients List",
        "GET",
        "/patients",
        "Get list of all patients"
      ),
      this.createRequest(
        "Create Patient",
        "POST",
        "/patients",
        "Create a new patient record",
        {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phoneNumber: "+1234567890",
          dateOfBirth: "1990-01-01",
          gender: "male",
          address: {
            street: "123 Main St",
            city: "Anytown",
            state: "CA",
            zipCode: "12345"
          }
        }
      ),
      this.createRequest(
        "Get Patient by ID",
        "GET",
        "/patients/{patientId}",
        "Get specific patient details"
      ),
      this.createRequest(
        "Update Patient",
        "PUT",
        "/patients/{patientId}",
        "Update patient information",
        {
          firstName: "John",
          lastName: "Smith",
          phoneNumber: "+1987654321"
        }
      ),
      this.createRequest(
        "Search Patients",
        "GET",
        "/patients/search?q=John&limit=10",
        "Search patients by name or other criteria"
      ),
      this.createRequest(
        "Delete Patient",
        "DELETE",
        "/patients/{patientId}",
        "Delete patient record"
      )
    ];

    return this.createFolder("👥 Patients Management", "Patient records and management", requests);
  }

  generateAppointmentsFolder() {
    const requests = [
      this.createRequest(
        "Get Appointments",
        "GET",
        "/appointments",
        "Get list of appointments"
      ),
      this.createRequest(
        "Create Appointment",
        "POST",
        "/appointments",
        "Schedule a new appointment",
        {
          patientId: "patient-id-123",
          doctorId: "doctor-id-456",
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 30,
          type: "consultation",
          notes: "Regular checkup"
        }
      ),
      this.createRequest(
        "Get Appointment by ID",
        "GET",
        "/appointments/{appointmentId}",
        "Get specific appointment details"
      ),
      this.createRequest(
        "Update Appointment",
        "PUT",
        "/appointments/{appointmentId}",
        "Update appointment details",
        {
          date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          notes: "Updated appointment time"
        }
      ),
      this.createRequest(
        "Check Availability",
        "GET",
        "/appointments/availability?doctorId=123&date=2025-10-18",
        "Check doctor availability for scheduling"
      ),
      this.createRequest(
        "Cancel Appointment",
        "DELETE",
        "/appointments/{appointmentId}",
        "Cancel an appointment"
      )
    ];

    return this.createFolder("📅 Appointments", "Appointment scheduling and management", requests);
  }

  generateSystemFolder() {
    const requests = [
      this.createRequest(
        "Health Check",
        "GET",
        "/health",
        "Check API health status",
        null,
        [
          "pm.test('Status code is 200', function () {",
          "    pm.response.to.have.status(200);",
          "});",
          "",
          "pm.test('Response time is less than 1000ms', function () {",
          "    pm.expect(pm.response.responseTime).to.be.below(1000);",
          "});"
        ]
      ),
      this.createRequest(
        "API Status",
        "GET",
        "/status",
        "Get detailed API status and module information"
      ),
      this.createRequest(
        "API Documentation",
        "GET",
        "/api-docs",
        "Access Swagger API documentation"
      )
    ];

    // Remove the API prefix for system endpoints
    requests.forEach(request => {
      request.request.url.raw = request.request.url.raw.replace('{{api_url}}', '{{base_url}}');
    });

    return this.createFolder("🏥 System Health", "System health and status endpoints", requests);
  }

  generateCollection() {
    const folders = [
      this.generateSystemFolder(),
      this.generateAuthenticationFolder(),
      this.generatePhoneVerificationFolder(),
      this.generateMFAFolder(),
      this.generateBiometricFolder(),
      this.generateOfflineSyncFolder(),
      this.generateHealthIntegrationsFolder(),
      this.generatePushNotificationsFolder(),
      this.generatePatientsFolder(),
      this.generateAppointmentsFolder()
    ];

    this.collection.item = folders;

    return this.collection;
  }

  saveToFile(filename = 'HealthCare-API-Complete-Collection.postman_collection.json') {
    const collection = this.generateCollection();
    const filePath = path.join(__dirname, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(collection, null, 2));
    
    console.log(`✅ Postman collection generated successfully!`.green);
    console.log(`📁 File saved to: ${filePath}`.cyan);
    console.log(`\n📋 Collection includes:`.cyan);
    console.log(`   🏥 System Health (3 requests)`.white);
    console.log(`   🔐 Authentication (5 requests)`.white);
    console.log(`   📱 Phone Verification (3 requests)`.white);
    console.log(`   🔒 Multi-Factor Auth (4 requests)`.white);
    console.log(`   👆 Biometric Auth (5 requests)`.white);
    console.log(`   🔄 Offline Sync (6 requests)`.white);
    console.log(`   ❤️ Health Integrations (6 requests)`.white);
    console.log(`   🔔 Push Notifications (7 requests)`.white);
    console.log(`   👥 Patients Management (6 requests)`.white);
    console.log(`   📅 Appointments (6 requests)`.white);
    console.log(`\n📚 Import this collection into Postman to test all endpoints!`.yellow);
    
    return filePath;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new PostmanCollectionGenerator();
  generator.saveToFile();
}

module.exports = PostmanCollectionGenerator;