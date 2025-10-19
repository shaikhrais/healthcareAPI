# TASK-10.17: Prior Authorization Tracking - Implementation Summary

**Module**: Billing & Payments
**Priority**: Medium
**Story Points**: 8
**Status**: ✅ COMPLETED

## Overview

Implemented a comprehensive prior authorization tracking system that manages the complete lifecycle of authorization requests from creation through approval, utilization tracking, and expiration monitoring. The system supports multiple submission methods, appeals, partial approvals, and automated monitoring with alerting.

## Components Implemented

### 1. PriorAuthorization Model
**File**: `expo-jane/backend/models/PriorAuthorization.js` (850+ lines)

Complete MongoDB model for authorization tracking with:

**Core Fields:**
- Authorization identification (number, reference number)
- Patient and provider information with demographics
- Insurance details (payer, policy, plan type)
- 17 service types (inpatient, outpatient, therapy, imaging, DME, etc.)
- Procedure codes (CPT, HCPCS, ICD-10-PCS)
- Diagnosis codes (ICD-10, ICD-9)
- Clinical justification and medical necessity documentation

**Workflow Management:**
- 12 status states (draft → submitted → approved/denied → expired)
- Status history with complete audit trail
- Priority levels (low, normal, high, urgent)
- Creation and modification tracking

**Decision Tracking:**
- Approval/denial with dates and reasons
- Effective and expiration dates
- Authorized services with quantity tracking
- Utilization tracking (quantity used vs. remaining)
- Conditions and restrictions

**Communication Log:**
- Multiple communication types (phone, fax, email, portal)
- Inbound/outbound tracking
- Follow-up scheduling
- Contact person and outcome tracking

**Appeal Support:**
- Appeal filing and tracking
- Appeal outcome management
- Supporting documentation references

**Alerts System:**
- 5 alert types (expiring_soon, expired, utilization_threshold, follow_up_needed, denial)
- Severity levels (info, warning, critical)
- Acknowledgment tracking

**Instance Methods:**
- `isActive()` - Check if authorization is currently valid
- `isExpiringSoon(daysThreshold)` - Check if expiring within threshold
- `getDaysUntilExpiration()` - Calculate remaining days
- `isUtilizationNearLimit(thresholdPercent)` - Check utilization
- `logCommunication(data)` - Add communication entry
- `changeStatus(newStatus, userId, reason, notes)` - Update status with history
- `recordUtilization(data)` - Track service usage
- `addAlert(type, message, severity)` - Create alert
- `submit(userId, method, confirmationNumber)` - Submit for approval
- `approve(approvalData, userId)` - Approve authorization
- `deny(denialData, userId)` - Deny authorization
- `initiateAppeal(appealData, userId)` - File appeal

**Static Methods:**
- `getActiveForPatient(patientId)` - Active authorizations for patient
- `getExpiring(daysThreshold)` - Authorizations expiring soon
- `getExpired()` - Expired authorizations
- `getPending()` - Pending review
- `getRequiringFollowUp()` - Follow-ups due
- `getStatistics(startDate, endDate)` - Aggregate statistics

### 2. PriorAuthService
**File**: `expo-jane/backend/services/priorAuthService.js` (650+ lines)

Complete workflow management service:

**Authorization Management:**
- `createAuthorization(data, userId)` - Create new request
- `updateAuthorization(authorizationId, updates, userId)` - Update draft
- `submitAuthorization(authorizationId, submissionData, userId)` - Submit to payer
- `validateForSubmission(authorization)` - Pre-submission validation
- `approveAuthorization(authorizationId, approvalData, userId)` - Approve
- `denyAuthorization(authorizationId, denialData, userId)` - Deny
- `partialApproval(authorizationId, approvalData, userId)` - Partial approval
- `cancelAuthorization(authorizationId, reason, userId)` - Cancel

**Utilization Tracking:**
- `recordUtilization(authorizationId, utilizationData, userId)` - Track usage
- Automatic quantity remaining calculation
- Near-limit alerting

**Communication:**
- `logCommunication(authorizationId, communicationData, userId)` - Log interactions
- Follow-up scheduling

**Appeals:**
- `fileAppeal(authorizationId, appealData, userId)` - File appeal for denial

**Monitoring:**
- `checkExpiringAuthorizations(daysThreshold)` - Find expiring
- `updateExpiredAuthorizations()` - Update status for expired

**Reporting:**
- `getPatientSummary(patientId)` - Patient authorization summary
- `getDashboardMetrics()` - Dashboard overview
- `generateAuthorizationLetter(authorizationId)` - Generate approval letter

**Validation Rules:**
- Member ID required
- Provider NPI required
- Payer ID required
- Service description required
- At least one procedure code
- At least one diagnosis code
- Service start date required
- Clinical justification required

### 3. Prior Authorization API Routes
**File**: `expo-jane/backend/routes/prior-auth.js` (650+ lines)

Complete RESTful API with 25+ endpoints:

**CRUD Operations:**
- `POST /api/prior-auth` - Create authorization
- `GET /api/prior-auth` - List with filtering (status, patient, provider, service type, priority)
- `GET /api/prior-auth/:id` - Get by ID with full population
- `PUT /api/prior-auth/:id` - Update authorization

**Workflow Operations:**
- `POST /api/prior-auth/:id/submit` - Submit for approval
- `POST /api/prior-auth/:id/approve` - Approve (owner/admin/billing)
- `POST /api/prior-auth/:id/deny` - Deny (owner/admin/billing)
- `POST /api/prior-auth/:id/partial-approval` - Partial approval
- `POST /api/prior-auth/:id/appeal` - File appeal
- `POST /api/prior-auth/:id/cancel` - Cancel

**Utilization & Communication:**
- `POST /api/prior-auth/:id/utilization` - Record service usage
- `POST /api/prior-auth/:id/communication` - Log communication

**Alerts:**
- `POST /api/prior-auth/:id/alerts/:alertId/acknowledge` - Acknowledge alert

**Reporting & Monitoring:**
- `GET /api/prior-auth/patient/:patientId/summary` - Patient summary
- `GET /api/prior-auth/dashboard/metrics` - Dashboard metrics
- `GET /api/prior-auth/expiring` - Expiring authorizations
- `GET /api/prior-auth/pending` - Pending authorizations
- `GET /api/prior-auth/follow-up` - Follow-ups due
- `GET /api/prior-auth/stats` - Statistics
- `GET /api/prior-auth/:id/letter` - Generate authorization letter

**Features:**
- Complete request validation with express-validator
- Role-based access control (owner, admin, practitioner, billing)
- Pagination support
- Population of related documents
- Error handling with custom error classes

### 4. Authorization Monitoring Service
**File**: `expo-jane/backend/services/authMonitoringService.js` (550+ lines)

Automated monitoring and alerting service:

**Monitoring Tasks:**
- **Expiration Monitoring** - Runs every 6 hours
  - Checks 7, 14, and 30-day expiration windows
  - Creates alerts with appropriate severity
  - Updates expired authorizations to 'expired' status

- **Utilization Monitoring** - Runs every 12 hours
  - Checks utilization at 80%, 90%, and 100% thresholds
  - Creates warning and critical alerts
  - Prevents alert duplication

- **Follow-Up Monitoring** - Runs daily
  - Identifies overdue follow-ups
  - Escalates alerts based on days overdue
  - Tracks submission to decision timeline

**Service Methods:**
- `startMonitoring()` - Start all monitoring tasks
- `stopMonitoring()` - Stop all monitoring tasks
- `checkExpiringAuthorizations()` - Manual expiration check
- `checkUtilizationThresholds()` - Manual utilization check
- `checkFollowUpsDue()` - Manual follow-up check
- `runAllChecks()` - Execute all checks immediately
- `getAlertSummary()` - Alert statistics and breakdown
- `acknowledgeAllAlerts(authorizationId, userId)` - Bulk acknowledge
- `clearOldAlerts(daysOld)` - Cleanup old acknowledged alerts
- `generateMonitoringReport()` - Comprehensive monitoring report
- `generateRecommendations(data)` - Action recommendations

**Alert Categories:**
- `expiring_soon` - Authorization nearing expiration
- `expired` - Authorization has expired
- `utilization_threshold` - Near utilization limit
- `follow_up_needed` - Follow-up overdue
- `denial` - Authorization denied

**Monitoring Report Includes:**
- Active authorizations count
- Expiring authorizations (7, 14, 30 days)
- Expired authorizations count
- High utilization count
- Follow-ups due/overdue
- Recent activity (approvals, denials)
- Alert summary by type and severity
- Actionable recommendations

## Technical Specifications

### Authorization Status Flow
```
draft → pending_submission → submitted → in_review →
  ├─→ approved → expired
  ├─→ partial_approval → expired
  ├─→ denied → appealed → appeal_approved / appeal_denied
  └─→ cancelled
```

### Service Types (17)
1. inpatient_admission
2. outpatient_surgery
3. diagnostic_test
4. imaging
5. durable_medical_equipment
6. home_health
7. skilled_nursing
8. physical_therapy
9. occupational_therapy
10. speech_therapy
11. mental_health
12. substance_abuse
13. prescription_drug
14. specialty_medication
15. specialist_visit
16. procedure
17. other

### Submission Methods
- phone - Phone submission
- fax - Fax submission
- portal - Online portal
- edi - Electronic Data Interchange
- mail - Postal mail
- email - Email submission

### Expected Response Times
- **Routine**: 14 days
- **Urgent**: 72 hours (3 days)
- **Emergency**: 24 hours

### Monitoring Intervals
- **Expiration Check**: Every 6 hours
- **Utilization Check**: Every 12 hours
- **Follow-Up Check**: Every 24 hours (daily)

## Usage Examples

### Create Authorization Request
```javascript
POST /api/prior-auth
Authorization: Bearer <token>

{
  "patientId": "65a1b2c3...",
  "providerId": "65a1b2c4...",
  "patientInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1980-01-15",
    "memberId": "MEM123456",
    "phone": "555-0123"
  },
  "providerInfo": {
    "npi": "1234567890",
    "name": "Dr. Smith",
    "phone": "555-0100"
  },
  "insurance": {
    "payerId": "12345",
    "payerName": "Blue Cross Blue Shield",
    "policyNumber": "POL123456",
    "planType": "PPO"
  },
  "serviceType": "physical_therapy",
  "serviceDescription": "Physical therapy for lower back pain",
  "procedureCodes": [
    { "code": "97110", "codeType": "CPT", "description": "Therapeutic exercise", "quantity": 12 }
  ],
  "diagnosisCodes": [
    { "code": "M54.5", "codeType": "ICD-10", "description": "Low back pain", "isPrimary": true }
  ],
  "clinical": {
    "clinicalJustification": "Patient requires physical therapy...",
    "medicalNecessity": "Conservative treatment for chronic low back pain..."
  },
  "serviceDetails": {
    "requestedStartDate": "2025-02-01",
    "numberOfVisits": 12,
    "frequency": "3x per week",
    "duration": "4 weeks",
    "urgency": "routine"
  },
  "priority": "normal"
}
```

### Submit for Approval
```javascript
POST /api/prior-auth/65a1b2c3.../submit
Authorization: Bearer <token>

{
  "method": "portal",
  "confirmationNumber": "CONF-12345",
  "contactPerson": "Jane Smith",
  "contactPhone": "555-0200",
  "followUpDate": "2025-01-20"
}
```

### Approve Authorization
```javascript
POST /api/prior-auth/65a1b2c3.../approve
Authorization: Bearer <token>

{
  "approvedBy": "Insurance Reviewer - Sarah Johnson",
  "effectiveDate": "2025-02-01",
  "expirationDate": "2025-05-01",
  "authorizedServices": [
    {
      "procedureCode": "97110",
      "description": "Therapeutic exercise",
      "quantity": 12,
      "quantityUsed": 0,
      "startDate": "2025-02-01",
      "endDate": "2025-05-01"
    }
  ],
  "conditions": [
    "Maximum 3 visits per week",
    "Requires progress notes every 4 visits"
  ],
  "notes": "Approved for 12 visits over 4 weeks"
}
```

### Record Utilization
```javascript
POST /api/prior-auth/65a1b2c3.../utilization
Authorization: Bearer <token>

{
  "claimId": "65a1b2c5...",
  "serviceDate": "2025-02-05",
  "procedureCode": "97110",
  "quantity": 1,
  "notes": "Session 1: Initial evaluation and exercise instruction"
}
```

### Service Usage
```javascript
const { priorAuthService } = require('./services/priorAuthService');
const { authMonitoringService } = require('./services/authMonitoringService');

// Create authorization
const auth = await priorAuthService.createAuthorization(data, userId);

// Submit
const submitted = await priorAuthService.submitAuthorization(
  auth._id,
  { method: 'portal', confirmationNumber: 'CONF-123' },
  userId
);

// Check expiring
const expiring = await priorAuthService.checkExpiringAuthorizations(30);

// Start monitoring
authMonitoringService.startMonitoring();

// Generate report
const report = await authMonitoringService.generateMonitoringReport();
```

## Integration Points

### 1. Patient Model Integration
- Authorizations linked to patients
- Patient demographics auto-populated
- Authorization summary available per patient

### 2. User Model Integration
- Provider assignments
- Role-based access control
- User tracking for all actions (create, submit, approve, etc.)

### 3. Claim Model Integration
- Utilization tracked against claims
- Authorization verification during claim submission
- Quantity tracking

### 4. ClaimAttachment Integration
- Clinical documentation attachments
- Appeal documentation attachments

## Files Created

1. `expo-jane/backend/models/PriorAuthorization.js` (850+ lines)
2. `expo-jane/backend/services/priorAuthService.js` (650+ lines)
3. `expo-jane/backend/routes/prior-auth.js` (650+ lines)
4. `expo-jane/backend/services/authMonitoringService.js` (550+ lines)
5. `expo-jane/backend/docs/TASK-10.17-SUMMARY.md` (this file)

**Total**: 5 files, ~2,700 lines of code

## Success Metrics

✅ **Comprehensive Data Model** - 17 service types, 12 status states, complete lifecycle
✅ **Full Workflow Management** - Create, submit, approve/deny, appeal, cancel
✅ **Utilization Tracking** - Quantity tracking with automated alerts
✅ **Automated Monitoring** - 3 monitoring tasks with configurable intervals
✅ **Complete API** - 25+ RESTful endpoints with validation
✅ **Alert System** - 5 alert types with 3 severity levels
✅ **Communication Tracking** - Complete interaction history
✅ **Appeal Support** - Full appeal workflow
✅ **Production Ready** - Error handling, logging, monitoring

## Monitoring & Alerts

### Expiration Alerts
- **7 days**: Critical alert
- **14 days**: Warning alert
- **30 days**: Info alert
- **Expired**: Automatic status update

### Utilization Alerts
- **80-89%**: Warning alert
- **90-99%**: Critical alert
- **100%**: Critical "fully utilized" alert

### Follow-Up Alerts
- **Overdue 1-3 days**: Warning alert
- **Overdue 4+ days**: Critical alert

## Future Enhancements

1. **Real-time Status Updates** - WebSocket integration for live status changes
2. **Payer Integration** - Direct API integration with major payers
3. **Predictive Analytics** - ML-powered approval prediction
4. **Automated Renewal** - Auto-generate renewal requests before expiration
5. **Batch Operations** - Bulk submission and approval
6. **Templates** - Pre-configured authorization templates by service type
7. **Document Generation** - Automated cover sheets and submission packets
8. **Peer-to-Peer Scheduling** - Integrated P2P call scheduling
9. **HL7/FHIR Integration** - Export as CoverageEligibilityRequest resources
10. **Mobile Notifications** - Push notifications for critical alerts

## Conclusion

TASK-10.17 has been successfully completed with a production-ready prior authorization tracking system. The implementation includes:

- Complete authorization lifecycle management (draft → submission → approval → utilization → expiration)
- Automated monitoring with intelligent alerting (expiration, utilization, follow-ups)
- Comprehensive API with role-based access control
- Appeal workflow for denied authorizations
- Patient and provider summaries
- Dashboard metrics and reporting
- Production-grade error handling and logging

The system is ready for deployment and supports the full prior authorization workflow required by healthcare practices.

**Status**: ✅ COMPLETED
**Completion Date**: 2025-01-12
