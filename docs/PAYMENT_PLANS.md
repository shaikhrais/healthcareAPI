# Payment Plan Calculator - Technical Documentation

## Overview

The Payment Plan Calculator module provides comprehensive payment plan management for healthcare providers, including:

- Multiple payment plan option calculations (3-36 months)
- Affordability assessment with 0-100 scoring
- Installment tracking with automated late fees
- Default detection and management
- Auto-payment processing
- Patient portal integration
- Comprehensive reporting and monitoring

## Architecture

### Components

1. **PaymentPlan Model** ([backend/models/PaymentPlan.js](backend/models/PaymentPlan.js))
   - Complete payment plan data model with installment tracking
   - Financial details, terms, and agreement management
   - Instance methods for payment recording and plan management
   - Static methods for querying and statistics

2. **Payment Plan Service** ([backend/services/paymentPlanService.js](backend/services/paymentPlanService.js))
   - Payment plan calculator with amortization
   - Affordability assessment engine
   - Payment recording and validation
   - Plan modification support

3. **Monitoring Service** ([backend/services/paymentPlanMonitoringService.js](backend/services/paymentPlanMonitoringService.js))
   - Automated overdue payment processing
   - Payment reminder system
   - Auto-payment processing
   - Default detection

4. **API Routes** ([backend/routes/payment-plans.js](backend/routes/payment-plans.js))
   - 24 RESTful endpoints
   - Role-based access control
   - Patient portal endpoints
   - Dashboard and reporting

## Data Model

### PaymentPlan Schema

```javascript
{
  planNumber: String,              // Auto-generated: PP-TIMESTAMP-RANDOM
  patient: ObjectId,               // Reference to Patient
  claims: [ObjectId],              // Associated claims

  financial: {
    totalAmount: Number,           // Total amount to be financed
    downPayment: Number,           // Down payment amount
    downPaymentPaid: Boolean,      // Down payment status
    financedAmount: Number,        // Amount after down payment
    interestRate: Number,          // Annual interest rate (0-100)
    totalInterest: Number,         // Total interest over plan
    totalWithInterest: Number,     // Total including interest
    amountPaid: Number,            // Total amount paid to date
    remainingBalance: Number       // Remaining balance (calculated)
  },

  terms: {
    numberOfPayments: Number,      // 1-60 months max
    paymentAmount: Number,         // Per-payment amount
    paymentFrequency: String,      // 'weekly'|'biweekly'|'monthly'|'quarterly'
    firstPaymentDate: Date,        // First payment due date
    finalPaymentDate: Date,        // Final payment due date
    autoPayEnabled: Boolean,       // Auto-payment enabled
    lateFeeAmount: Number,         // Late fee amount
    lateFeeDays: Number            // Days before late fee (default: 15)
  },

  installments: [{
    installmentNumber: Number,     // Sequential number
    dueDate: Date,                 // Payment due date
    amount: Number,                // Payment amount
    principalAmount: Number,       // Principal portion
    interestAmount: Number,        // Interest portion
    status: String,                // 'pending'|'paid'|'overdue'|'partial'|'missed'|'waived'
    paidAmount: Number,            // Amount paid
    paidDate: Date,                // Date paid
    paymentMethod: String,         // Payment method used
    transactionId: String,         // Transaction ID
    lateFee: Number,               // Late fee applied
    notes: String                  // Payment notes
  }],

  status: String,                  // Plan status (see below)

  affordabilityAssessment: {
    monthlyIncome: Number,         // Patient monthly income
    monthlyExpenses: Number,       // Patient monthly expenses
    discretionaryIncome: Number,   // Income - expenses
    recommendedPayment: Number,    // Recommended payment amount
    affordabilityScore: Number,    // 0-100 score
    assessmentDate: Date,
    assessmentNotes: String
  },

  defaultTracking: {
    missedPayments: Number,        // Total missed payments
    consecutiveMissed: Number,     // Consecutive missed (3+ = default)
    totalLateFees: Number,         // Total late fees applied
    defaultDate: Date,             // Date marked as defaulted
    defaultReason: String,         // Reason for default
    sentToCollections: Boolean,    // Sent to collections
    collectionsDate: Date          // Date sent to collections
  },

  agreement: {
    signedDate: Date,              // Date signed
    signedBy: String,              // Patient name
    signature: String,             // Signature (base64 or URL)
    ipAddress: String,             // IP address of signer
    userAgent: String,             // User agent
    terms: String,                 // Full terms text
    accepted: Boolean              // Agreement accepted
  }
}
```

### Plan Status Values

- **draft**: Initial state, not yet submitted
- **pending_approval**: Awaiting approval by staff
- **active**: Approved and active
- **completed**: All payments received
- **defaulted**: Defaulted (3+ consecutive missed payments)
- **cancelled**: Cancelled by staff or patient
- **suspended**: Temporarily suspended

### Installment Status Values

- **pending**: Payment not yet due or paid
- **paid**: Payment received in full
- **overdue**: Payment past due date
- **partial**: Partial payment received
- **missed**: More than 30 days overdue
- **waived**: Payment waived by staff

## API Endpoints

### Plan Calculation

#### Calculate Payment Plan Options
```
POST /api/payment-plans/calculate
```

**Request Body:**
```json
{
  "totalAmount": 5000,
  "downPaymentPercent": 10,
  "interestRate": 6.0,
  "paymentFrequency": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAmount": 5000,
    "downPayment": 500,
    "financedAmount": 4500,
    "options": [
      {
        "termMonths": 3,
        "monthlyPayment": 1522.50,
        "totalInterest": 67.50,
        "totalWithInterest": 4567.50,
        "effectiveAPR": 6.0
      },
      // ... more options for 6, 12, 18, 24, 36 months
    ]
  }
}
```

#### Assess Affordability
```
POST /api/payment-plans/assess-affordability
Role: owner, full_access, admin_billing, billing_only
```

**Request Body:**
```json
{
  "patientId": "patient_id",
  "totalAmount": 5000,
  "monthlyIncome": 5000,
  "monthlyExpenses": 3500,
  "desiredMonthlyPayment": 300
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monthlyIncome": 5000,
    "monthlyExpenses": 3500,
    "discretionaryIncome": 1500,
    "recommendedPayment": 450,
    "desiredPayment": 300,
    "paymentToIncomeRatio": 6.0,
    "affordabilityScore": 100,
    "recommendation": "Excellent - Well within comfortable range",
    "maxSafePayment": 1500
  }
}
```

**Affordability Scoring:**
- **100**: Payment ≤ 10% of gross income (Excellent)
- **80**: Payment ≤ 20% of gross income (Good)
- **60**: Payment ≤ 30% of gross income (Fair)
- **40**: Payment ≤ 40% of gross income (Challenging)
- **20**: Payment > 40% of gross income (Difficult)

### Plan Management

#### Create Payment Plan
```
POST /api/payment-plans
Role: owner, full_access, admin_billing, billing_only
```

**Request Body:**
```json
{
  "patientId": "patient_id",
  "totalAmount": 5000,
  "downPayment": 500,
  "numberOfPayments": 12,
  "paymentFrequency": "monthly",
  "firstPaymentDate": "2025-11-01",
  "interestRate": 6.0,
  "claims": ["claim_id_1", "claim_id_2"],
  "paymentMethod": {
    "type": "credit_card",
    "cardLast4": "4242",
    "cardBrand": "Visa"
  }
}
```

#### Get Payment Plan
```
GET /api/payment-plans/:id
Role: All authenticated (with access check)
```

#### List Payment Plans
```
GET /api/payment-plans?page=1&limit=20&status=active&patientId=patient_id
Role: All authenticated (patients see only their own)
```

#### Update Payment Plan
```
PUT /api/payment-plans/:id
Role: owner, full_access, admin_billing, billing_only
```

**Allowed Updates:**
- notes
- paymentMethod
- status (limited to draft, pending_approval, cancelled)

#### Approve Payment Plan
```
POST /api/payment-plans/:id/approve
Role: owner, full_access, admin_billing
```

#### Suspend Payment Plan
```
POST /api/payment-plans/:id/suspend
Role: owner, full_access, admin_billing
```

**Request Body:**
```json
{
  "reason": "Patient requested temporary suspension due to financial hardship"
}
```

#### Resume Payment Plan
```
POST /api/payment-plans/:id/resume
Role: owner, full_access, admin_billing
```

#### Modify Plan Terms
```
POST /api/payment-plans/:id/modify
Role: owner, full_access, admin_billing
```

**Request Body:**
```json
{
  "reason": "Reduced payment amount due to financial hardship",
  "newPaymentAmount": 250
}
```
OR
```json
{
  "reason": "Extended payment term at patient request",
  "extendTerm": 6
}
```

### Payment Recording

#### Record Payment
```
POST /api/payment-plans/:id/payments
Role: owner, full_access, admin_billing, billing_only, frontdesk_only
```

**Request Body:**
```json
{
  "installmentNumber": 3,
  "amount": 381.25,
  "paymentMethod": "credit_card",
  "transactionId": "ch_1234567890",
  "paymentDate": "2025-10-12"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "plan": { /* full plan object */ },
    "summary": {
      "totalPayments": 12,
      "paidPayments": 3,
      "overduePayments": 0,
      "remainingPayments": 9,
      "totalAmount": 5000,
      "amountPaid": 1143.75,
      "remainingBalance": 3856.25,
      "percentComplete": "25.42",
      "nextPaymentDue": { /* next installment */ }
    }
  }
}
```

#### Get Payment Schedule
```
GET /api/payment-plans/:id/schedule
Role: All authenticated (with access check)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "planNumber": "PP-123ABC-XYZ789",
    "schedule": [
      {
        "number": 1,
        "dueDate": "2025-11-01",
        "amount": 381.25,
        "principal": 358.75,
        "interest": 22.50,
        "status": "paid",
        "paidAmount": 381.25,
        "paidDate": "2025-10-31"
      },
      // ... more installments
    ],
    "summary": { /* payment summary */ }
  }
}
```

#### Get Payment Summary
```
GET /api/payment-plans/:id/summary
Role: All authenticated (with access check)
```

### Patient Portal

#### Get Patient's Payment Plans
```
GET /api/payment-plans/patient/:patientId
Role: All authenticated (patients can only access their own)
```

#### Sign Payment Plan Agreement
```
POST /api/payment-plans/:id/agree
Role: patient
```

**Request Body:**
```json
{
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "accepted": true
}
```

### Monitoring and Reporting

#### Get Dashboard Metrics
```
GET /api/payment-plans/dashboard/metrics
Role: owner, full_access, admin_billing, billing_only
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalActivePlans": 45,
      "overduePayments": 8,
      "recentlyCreated": 12,
      "completedLastMonth": 5,
      "defaultedPlans": 2,
      "upcomingPayments": 15
    },
    "statistics": {
      "period": { "startDate": null, "endDate": null },
      "totalPlans": 75,
      "activePlans": 45,
      "completedPlans": 22,
      "defaultedPlans": 2,
      "byStatus": {
        "active": 45,
        "completed": 22,
        "defaulted": 2,
        "cancelled": 6
      },
      "totalFinanced": 375000,
      "totalCollected": 280000,
      "collectionRate": "74.67%"
    }
  }
}
```

#### Get Overdue Plans
```
GET /api/payment-plans/reports/overdue
Role: owner, full_access, admin_billing, billing_only
```

#### Get Upcoming Payments
```
GET /api/payment-plans/reports/upcoming?daysAhead=7
Role: owner, full_access, admin_billing, billing_only
```

#### Get Statistics
```
GET /api/payment-plans/reports/statistics?startDate=2025-01-01&endDate=2025-10-12
Role: owner, full_access, admin_billing
```

## Business Logic

### Payment Plan Calculation

The calculator uses standard amortization formulas to calculate payment plans:

**Monthly Payment Formula:**
```
M = P * (r * (1 + r)^n) / ((1 + r)^n - 1)

Where:
M = Monthly payment
P = Principal (financed amount)
r = Monthly interest rate (annual rate / 12)
n = Number of payments
```

**Installment Generation:**
For each payment period:
1. Calculate interest on remaining balance: `Interest = Balance * MonthlyRate`
2. Calculate principal: `Principal = Payment - Interest`
3. Subtract principal from remaining balance
4. Increment date based on payment frequency

### Late Fee Application

- Late fees are applied after `lateFeeDays` (default: 15 days)
- Late fee amount is configurable per plan
- Late fees are only applied once per installment
- Late fees are tracked in `defaultTracking.totalLateFees`

### Default Detection

A payment plan is marked as defaulted when:
- **3 or more consecutive payments are missed**
- Missed = Overdue for more than 30 days

Default process:
1. Count consecutive overdue/missed payments
2. If count >= 3 and status is active:
   - Set `status` to 'defaulted'
   - Record `defaultTracking.defaultDate`
   - Record `defaultTracking.defaultReason`
   - Create critical alert
3. Plan can be sent to collections manually

### Plan Modification

**Payment Amount Change:**
- Recalculates remaining installments with new amount
- Adjusts number of payments to match remaining balance
- Records modification in history

**Term Extension:**
- Adds additional payment periods
- Recalculates payment amounts
- Updates final payment date
- Records modification in history

## Automated Monitoring

The monitoring service runs three scheduled tasks:

### 1. Overdue Payment Processing (Hourly)

- Identifies all overdue installments
- Applies late fees after grace period
- Counts consecutive missed payments
- Marks plans as defaulted (3+ consecutive missed)
- Creates alerts for overdue payments

### 2. Payment Reminders (Daily at 9 AM)

- Sends reminders 3 days before due date
- Sends overdue payment reminders
- Creates in-app alerts
- TODO: Email/SMS integration

### 3. Auto-Payment Processing (Daily at 2 AM)

- Processes payments for plans with auto-pay enabled
- Charges configured payment method
- Records successful payments
- Creates alerts for failed payments
- TODO: Payment processor integration

## Integration Points

### Payment Processor Integration

The system is designed to integrate with payment processors (Stripe, Square, etc.):

**Location:** [backend/services/paymentPlanMonitoringService.js:172](backend/services/paymentPlanMonitoringService.js#L172)

```javascript
// TODO: Integrate with payment processor
const paymentResult = await this.processPaymentTransaction({
  amount: nextPayment.amount,
  paymentMethod: plan.paymentMethod,
  customerId: plan.patient._id,
  description: `Payment plan ${plan.planNumber} - Installment ${nextPayment.installmentNumber}`
});
```

### Notification Integration

The system includes placeholders for notification integration:

**Email/SMS Reminders:**
- Location: [backend/services/paymentPlanMonitoringService.js:122](backend/services/paymentPlanMonitoringService.js#L122)
- Location: [backend/services/paymentPlanMonitoringService.js:145](backend/services/paymentPlanMonitoringService.js#L145)

**Payment Confirmations:**
- Location: [backend/services/paymentPlanMonitoringService.js:210](backend/services/paymentPlanMonitoringService.js#L210)

**Payment Failures:**
- Location: [backend/services/paymentPlanMonitoringService.js:230](backend/services/paymentPlanMonitoringService.js#L230)

## Security Considerations

### Access Control

- **Staff roles** (owner, full_access, admin_billing, billing_only): Full access to all plans
- **Patient role**: Can only access their own payment plans
- **Payment recording**: Restricted to billing and front desk staff
- **Plan approval**: Restricted to owner, full_access, admin_billing
- **Plan modification**: Restricted to owner, full_access, admin_billing

### Data Protection

- Payment methods store only last 4 digits
- Signatures stored as base64 or URLs
- IP address and user agent tracked for agreements
- All modifications tracked with user ID and timestamp

### Audit Trail

Complete audit trail maintained:
- All modifications tracked in `modifications` array
- All alerts tracked in `alerts` array
- All payments tracked in `installments` array
- Agreement details with IP and user agent

## Testing Recommendations

### Unit Tests

1. **Calculator Tests:**
   - Verify amortization formula accuracy
   - Test interest calculations
   - Test payment frequency conversions

2. **Affordability Tests:**
   - Verify scoring algorithm
   - Test edge cases (zero income, high expenses)

3. **Default Detection:**
   - Test consecutive missed counting
   - Test default threshold

### Integration Tests

1. **Payment Recording:**
   - Test full payment
   - Test partial payment
   - Test payment completion flow

2. **Plan Modification:**
   - Test payment amount changes
   - Test term extensions
   - Test modification history tracking

3. **Status Transitions:**
   - Test approval workflow
   - Test suspension/resume
   - Test completion detection

### E2E Tests

1. **Complete Workflow:**
   - Calculate options
   - Create plan
   - Approve plan
   - Record payments
   - Complete plan

2. **Default Workflow:**
   - Create plan
   - Miss payments
   - Verify late fees
   - Verify default detection

3. **Patient Portal:**
   - View plans
   - Sign agreement
   - View payment schedule

## Performance Considerations

### Indexes

The model includes indexes on:
- `planNumber` (unique)
- `patient` + `status`
- `installments.dueDate` + `installments.status`
- `terms.firstPaymentDate`
- `status` + `financial.remainingBalance`

### Query Optimization

- Use `.populate()` selectively to avoid over-fetching
- Use pagination for list endpoints (default: 20 per page)
- Use aggregation for statistics to reduce memory usage

### Monitoring Performance

- Scheduled tasks run during off-peak hours
- Auto-payments at 2 AM
- Reminders at 9 AM
- Overdue processing hourly (can be adjusted)

## Future Enhancements

1. **Payment Processor Integration**
   - Stripe/Square integration
   - Automated recurring payments
   - Payment method tokenization

2. **Notification System**
   - Email notifications
   - SMS reminders
   - Push notifications for mobile app

3. **Advanced Features**
   - Payment plan templates
   - Bulk plan creation
   - Interest rate tiers
   - Promotional interest-free periods
   - Early payoff discounts

4. **Reporting Enhancements**
   - Aging reports
   - Collection efficiency metrics
   - Payment success rate tracking
   - Predictive default modeling

5. **Collections Integration**
   - Automated collections workflow
   - Collections agency integration
   - Settlement offer management

## Related Models

- **Patient** ([backend/models/Patient.js](backend/models/Patient.js))
- **Claim** (Referenced but not shown)
- **User** ([backend/models/User.js](backend/models/User.js))

## API Route Registration

Add to [backend/server.js](backend/server.js) or main app file:

```javascript
const paymentPlanRoutes = require('./routes/payment-plans');
app.use('/api/payment-plans', paymentPlanRoutes);
```

## Monitoring Service Startup

Add to [backend/server.js](backend/server.js) or main app file:

```javascript
const paymentPlanMonitoring = require('./services/paymentPlanMonitoringService');

// Start monitoring after server starts
paymentPlanMonitoring.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  paymentPlanMonitoring.stop();
  // ... other cleanup
});
```

## Support and Maintenance

### Monitoring Dashboard

Access monitoring status programmatically:

```javascript
const monitoringService = require('./services/paymentPlanMonitoringService');

// Get status
const status = monitoringService.getStatus();

// Get dashboard stats
const stats = await monitoringService.getDashboardStats();

// Get plans requiring attention
const attention = await monitoringService.getPlansRequiringAttention();

// Manual triggers
await monitoringService.manualProcessOverdue();
await monitoringService.manualSendReminders();
await monitoringService.manualProcessAutoPayments();
```

### Troubleshooting

**Issue: Auto-payments not processing**
- Check monitoring service is running: `monitoringService.getStatus()`
- Verify payment method is configured on plan
- Check for failed payment alerts
- Review server logs for errors

**Issue: Late fees not being applied**
- Verify `lateFeeAmount` is set on plan
- Check `lateFeeDays` configuration
- Ensure monitoring service is running
- Verify installment due dates

**Issue: Plans not defaulting**
- Check `consecutiveMissed` count in `defaultTracking`
- Verify overdue payments are being marked correctly
- Ensure monitoring service is processing overdue payments
- Check plan status is 'active'

## Conclusion

The Payment Plan Calculator module provides a complete solution for healthcare payment plan management, from calculation through completion or default. The system includes automated monitoring, flexible payment terms, and comprehensive reporting to support efficient financial operations.
