/**
 * Master Test Checklist Data
 * Comprehensive list of tests for CloneJane application
 */

const testChecklists = [
  // ============================================
  // AUTHENTICATION MODULE
  // ============================================
  {
    testId: 'AUTH-001',
    testName: 'User Login - Valid Credentials',
    testDescription: 'Verify user can login with valid username and password',
    category: 'functional',
    module: 'authentication',
    priority: 'critical',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to login page',
        expectedResult: 'Login page loads successfully',
      },
      {
        stepNumber: 2,
        description: 'Enter valid username and password',
        expectedResult: 'Credentials are accepted',
      },
      {
        stepNumber: 3,
        description: 'Click login button',
        expectedResult: 'User is redirected to dashboard',
      },
      {
        stepNumber: 4,
        description: 'Verify user session is created',
        expectedResult: 'User token is stored and dashboard displays user info',
      },
    ],
    prerequisites: ['Valid user account exists in database'],
    testDataRequirements: {
      requiresLogin: false,
      requiredRole: 'any',
      requiresPatientData: false,
      requiresAppointmentData: false,
      customData: ['Valid credentials'],
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 5,
    tags: ['login', 'authentication', 'critical'],
  },

  {
    testId: 'AUTH-002',
    testName: 'User Login - Invalid Credentials',
    testDescription: 'Verify appropriate error message for invalid credentials',
    category: 'functional',
    module: 'authentication',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to login page',
        expectedResult: 'Login page loads successfully',
      },
      {
        stepNumber: 2,
        description: 'Enter invalid username or password',
        expectedResult: 'Error message appears',
      },
      {
        stepNumber: 3,
        description: 'Verify error message content',
        expectedResult: 'Error message is clear and user-friendly',
      },
    ],
    prerequisites: [],
    testDataRequirements: {
      requiresLogin: false,
      requiredRole: 'any',
      customData: ['Invalid credentials'],
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 3,
    tags: ['login', 'error-handling', 'security'],
  },

  {
    testId: 'AUTH-003',
    testName: 'User Logout',
    testDescription: 'Verify user can successfully logout and session is cleared',
    category: 'functional',
    module: 'authentication',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Login as valid user',
        expectedResult: 'User is logged in',
      },
      {
        stepNumber: 2,
        description: 'Click logout button',
        expectedResult: 'User is redirected to login page',
      },
      {
        stepNumber: 3,
        description: 'Verify session is cleared',
        expectedResult: 'Token is removed, cannot access protected pages',
      },
    ],
    prerequisites: ['User must be logged in'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'any',
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 4,
    tags: ['logout', 'session-management'],
  },

  // ============================================
  // APPOINTMENTS MODULE
  // ============================================
  {
    testId: 'APPT-001',
    testName: 'Create New Appointment',
    testDescription: 'Verify staff can create a new appointment for a patient',
    category: 'functional',
    module: 'appointments',
    priority: 'critical',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to appointments page',
        expectedResult: 'Appointments page loads',
      },
      {
        stepNumber: 2,
        description: 'Click "New Appointment" button',
        expectedResult: 'Appointment creation form opens',
      },
      {
        stepNumber: 3,
        description: 'Fill in patient, date, time, provider, and service',
        expectedResult: 'All fields accept input',
      },
      {
        stepNumber: 4,
        description: 'Click save',
        expectedResult: 'Appointment is created and appears in calendar',
      },
    ],
    prerequisites: ['Patient exists', 'Provider available'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'receptionist',
      requiresPatientData: true,
      customData: ['Available time slot'],
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 8,
    tags: ['appointments', 'create', 'critical'],
  },

  {
    testId: 'APPT-002',
    testName: 'Edit Existing Appointment',
    testDescription: 'Verify appointment details can be modified',
    category: 'functional',
    module: 'appointments',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to appointments and select existing appointment',
        expectedResult: 'Appointment details load',
      },
      {
        stepNumber: 2,
        description: 'Click edit and modify details',
        expectedResult: 'Changes are accepted',
      },
      {
        stepNumber: 3,
        description: 'Save changes',
        expectedResult: 'Appointment is updated with new information',
      },
    ],
    prerequisites: ['Existing appointment in system'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'receptionist',
      requiresAppointmentData: true,
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 6,
    tags: ['appointments', 'edit'],
  },

  {
    testId: 'APPT-003',
    testName: 'Cancel Appointment',
    testDescription: 'Verify appointment can be cancelled with proper notification',
    category: 'functional',
    module: 'appointments',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Select appointment to cancel',
        expectedResult: 'Appointment details shown',
      },
      {
        stepNumber: 2,
        description: 'Click cancel button',
        expectedResult: 'Confirmation dialog appears',
      },
      {
        stepNumber: 3,
        description: 'Confirm cancellation',
        expectedResult: 'Appointment status changed to cancelled',
      },
      {
        stepNumber: 4,
        description: 'Verify notification sent to patient',
        expectedResult: 'Cancellation notification logged',
      },
    ],
    prerequisites: ['Active appointment exists'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'receptionist',
      requiresAppointmentData: true,
    },
    canBeAutomated: true,
    preferredAssignmentType: 'operator',
    estimatedTimeMinutes: 7,
    tags: ['appointments', 'cancel', 'notifications'],
  },

  // ============================================
  // PATIENTS MODULE
  // ============================================
  {
    testId: 'PAT-001',
    testName: 'Add New Patient',
    testDescription: 'Verify new patient can be added to system',
    category: 'functional',
    module: 'patients',
    priority: 'critical',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to patients page',
        expectedResult: 'Patients list loads',
      },
      {
        stepNumber: 2,
        description: 'Click "Add Patient" button',
        expectedResult: 'Patient form opens',
      },
      {
        stepNumber: 3,
        description: 'Fill in required patient information',
        expectedResult: 'All fields validate correctly',
      },
      {
        stepNumber: 4,
        description: 'Save patient',
        expectedResult: 'Patient is created and appears in patient list',
      },
    ],
    prerequisites: [],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'receptionist',
      customData: ['Patient demographic information'],
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 10,
    tags: ['patients', 'create', 'critical'],
  },

  {
    testId: 'PAT-002',
    testName: 'Search Patient',
    testDescription: 'Verify patient search functionality works correctly',
    category: 'functional',
    module: 'patients',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to patients page',
        expectedResult: 'Patient list loads',
      },
      {
        stepNumber: 2,
        description: 'Enter patient name in search field',
        expectedResult: 'Search filters results in real-time',
      },
      {
        stepNumber: 3,
        description: 'Verify search results are accurate',
        expectedResult: 'Only matching patients are shown',
      },
    ],
    prerequisites: ['Patients exist in database'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'any',
      requiresPatientData: true,
    },
    canBeAutomated: true,
    preferredAssignmentType: 'both',
    estimatedTimeMinutes: 5,
    tags: ['patients', 'search'],
  },

  {
    testId: 'PAT-003',
    testName: 'View Patient Details',
    testDescription: 'Verify patient details page displays all information correctly',
    category: 'functional',
    module: 'patients',
    priority: 'medium',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Click on patient from list',
        expectedResult: 'Patient details page opens',
      },
      {
        stepNumber: 2,
        description: 'Verify all patient information is displayed',
        expectedResult: 'Demographics, contact info, medical history visible',
      },
      {
        stepNumber: 3,
        description: 'Check appointment history',
        expectedResult: 'Past and upcoming appointments shown',
      },
    ],
    prerequisites: ['Patient with history exists'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'any',
      requiresPatientData: true,
    },
    canBeAutomated: true,
    preferredAssignmentType: 'operator',
    estimatedTimeMinutes: 6,
    tags: ['patients', 'details', 'ui'],
  },

  // ============================================
  // PAYMENTS MODULE
  // ============================================
  {
    testId: 'PAY-001',
    testName: 'Process Payment',
    testDescription: 'Verify payment can be processed for an appointment',
    category: 'functional',
    module: 'payments',
    priority: 'critical',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to payment processing',
        expectedResult: 'Payment page loads',
      },
      {
        stepNumber: 2,
        description: 'Enter payment amount and method',
        expectedResult: 'Payment details accepted',
      },
      {
        stepNumber: 3,
        description: 'Submit payment',
        expectedResult: 'Payment is processed successfully',
      },
      {
        stepNumber: 4,
        description: 'Verify receipt is generated',
        expectedResult: 'Receipt available for download/print',
      },
    ],
    prerequisites: ['Appointment with balance exists'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'receptionist',
      requiresAppointmentData: true,
      customData: ['Payment method info'],
    },
    canBeAutomated: false,
    preferredAssignmentType: 'operator',
    estimatedTimeMinutes: 10,
    tags: ['payments', 'critical', 'financial'],
  },

  // ============================================
  // CLINICAL NOTES MODULE
  // ============================================
  {
    testId: 'CLINICAL-001',
    testName: 'Create Clinical Note',
    testDescription: 'Verify doctor can create clinical note for patient visit',
    category: 'functional',
    module: 'clinical_notes',
    priority: 'critical',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Open patient chart',
        expectedResult: 'Patient chart loads',
      },
      {
        stepNumber: 2,
        description: 'Click "Add Note" button',
        expectedResult: 'Note editor opens',
      },
      {
        stepNumber: 3,
        description: 'Enter clinical observations and treatment plan',
        expectedResult: 'Text is saved as typed',
      },
      {
        stepNumber: 4,
        description: 'Save note',
        expectedResult: 'Note is saved and timestamped',
      },
    ],
    prerequisites: ['Patient exists', 'Appointment exists'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'doctor',
      requiresPatientData: true,
      requiresAppointmentData: true,
    },
    canBeAutomated: true,
    preferredAssignmentType: 'operator',
    estimatedTimeMinutes: 8,
    tags: ['clinical', 'notes', 'critical'],
  },

  // ============================================
  // UI/UX TESTS
  // ============================================
  {
    testId: 'UI-001',
    testName: 'Responsive Design - Mobile View',
    testDescription: 'Verify application layout works on mobile devices',
    category: 'ui_ux',
    module: 'general',
    priority: 'high',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Open application on mobile device or emulator',
        expectedResult: 'Page loads and adjusts to mobile viewport',
      },
      {
        stepNumber: 2,
        description: 'Navigate through main pages',
        expectedResult: 'All elements are visible and properly aligned',
      },
      {
        stepNumber: 3,
        description: 'Test touch interactions',
        expectedResult: 'Buttons and links respond to touch',
      },
    ],
    prerequisites: [],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'any',
    },
    canBeAutomated: true,
    preferredAssignmentType: 'operator',
    estimatedTimeMinutes: 15,
    tags: ['ui', 'responsive', 'mobile'],
  },

  // ============================================
  // SECURITY TESTS
  // ============================================
  {
    testId: 'SEC-001',
    testName: 'Role-Based Access Control',
    testDescription: 'Verify users can only access features permitted by their role',
    category: 'security',
    module: 'authentication',
    priority: 'critical',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Login as receptionist',
        expectedResult: 'Receptionist dashboard loads',
      },
      {
        stepNumber: 2,
        description: 'Attempt to access admin-only features',
        expectedResult: 'Access is denied with appropriate message',
      },
      {
        stepNumber: 3,
        description: 'Repeat for other roles',
        expectedResult: 'Each role has appropriate access restrictions',
      },
    ],
    prerequisites: ['Users with different roles exist'],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'any',
      customData: ['Multiple user accounts with different roles'],
    },
    canBeAutomated: true,
    preferredAssignmentType: 'ai',
    estimatedTimeMinutes: 20,
    tags: ['security', 'authorization', 'critical'],
  },

  // ============================================
  // PERFORMANCE TESTS
  // ============================================
  {
    testId: 'PERF-001',
    testName: 'Page Load Time',
    testDescription: 'Verify pages load within acceptable time limits',
    category: 'performance',
    module: 'general',
    priority: 'medium',
    testSteps: [
      {
        stepNumber: 1,
        description: 'Navigate to dashboard',
        expectedResult: 'Page loads in under 3 seconds',
      },
      {
        stepNumber: 2,
        description: 'Navigate to patient list',
        expectedResult: 'List loads in under 2 seconds',
      },
      {
        stepNumber: 3,
        description: 'Open patient details',
        expectedResult: 'Details load in under 2 seconds',
      },
    ],
    prerequisites: [],
    testDataRequirements: {
      requiresLogin: true,
      requiredRole: 'any',
    },
    canBeAutomated: true,
    preferredAssignmentType: 'ai',
    estimatedTimeMinutes: 10,
    tags: ['performance', 'speed'],
  },
];

module.exports = testChecklists;
