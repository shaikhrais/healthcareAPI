## Secondary Claim Generation - Complete Guide

## Overview

Complete secondary claim generation system with Coordination of Benefits (COB) logic for automatically filing secondary insurance claims after primary insurance payment processing.

---

## Components

### 1. Enhanced Claim Model with COB Support

The Claim model has been extended to support secondary insurance and COB tracking.

**New Fields:**

```javascript
// Secondary insurance information
secondaryInsurance: {
  hasSecondary: Boolean,
  payerId: String,
  payerName: String,
  policyNumber: String,
  groupNumber: String,
  planName: String,
  relationshipToInsured: String ('self' | 'spouse' | 'child' | 'other'),
  insured: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date
  },
  coverageStart: Date,
  coverageEnd: Date,
  timelyFilingLimit: Number (default 90 days),
  cobOrder: Number (2 for secondary, 3 for tertiary)
}

// Coordination of Benefits tracking
cob: {
  isPrimary: Boolean,
  isSecondary: Boolean,
  primaryClaimId: ObjectId,
  secondaryClaimId: ObjectId,
  primaryPayment: {
    amount: Number,
    date: Date,
    eobReceived: Boolean,
    eobDocument: String (URL or path)
  },
  patientResponsibilityFromPrimary: Number,
  secondaryFilingDate: Date
}
```

**New Methods:**

```javascript
// Get primary claims ready for secondary filing
const readyClaims = await Claim.getReadyForSecondary();
// Returns claims that:
// - Are primary claims
// - Have secondary insurance
// - Primary payment EOB received
// - No secondary claim filed yet
// - Status is 'paid'

// Get all claims with secondary insurance
const withSecondary = await Claim.getWithSecondaryInsurance();
```

### 2. Secondary Claim Generator Service

**[secondaryClaimGenerator.js](../services/secondaryClaimGenerator.js)** - Complete COB processing

**Key Methods:**

```javascript
const { secondaryClaimGenerator } = require('./services/secondaryClaimGenerator');

// Generate secondary claim from primary
const result = await secondaryClaimGenerator.generateSecondaryClaim(
  primaryClaimId,
  {
    amount: 150.00,              // Primary payment amount
    date: new Date(),             // Payment received date
    patientResponsibility: 30.00, // Patient responsibility from primary
    adjustments: [                // Primary adjustments
      { code: 'CO-45', amount: -20.00, reason: 'Contractual adjustment' }
    ],
    eobDocument: 'eob_url_or_path' // EOB document reference
  },
  {
    userId: userId,
    autoSubmit: false,
    attachEOB: true
  }
);

// Returns:
{
  secondaryClaim: Claim,    // New secondary claim
  primaryClaim: Claim,      // Updated primary claim
  amounts: {
    totalCharges: 200.00,
    primaryPaid: 150.00,
    primaryAdjustments: -20.00,
    allowedAmount: 180.00,
    patientResponsibilityFromPrimary: 30.00,
    remainingBalance: 30.00,
    secondaryCharges: 30.00
  }
}

// Calculate secondary amounts
const amounts = secondaryClaimGenerator.calculateSecondaryAmounts(
  primaryClaim,
  primaryPaymentData
);

// Batch generate secondary claims
const batchResults = await secondaryClaimGenerator.batchGenerateSecondaryClaims(
  primaryClaims,
  userId
);

// Returns:
{
  successful: [
    {
      primaryClaimId,
      primaryClaimNumber,
      secondaryClaimId,
      secondaryClaimNumber,
      amounts
    }
  ],
  failed: [
    {
      primaryClaimId,
      primaryClaimNumber,
      error: 'Error message'
    }
  ],
  totalProcessed: 10
}

// Validate secondary readiness
const validation = await secondaryClaimGenerator.validateSecondaryReadiness(primaryClaimId);

// Returns:
{
  ready: true/false,
  validations: [
    { passed: true, check: 'has_secondary_insurance' },
    { passed: true, check: 'primary_paid' },
    { passed: true, check: 'eob_received' },
    { passed: true, check: 'secondary_not_filed' },
    { passed: true, check: 'timely_filing', daysRemaining: 75 }
  ],
  primaryClaim: {
    id, claimNumber, status, amountPaid
  }
}

// Determine COB order
const cobOrder = secondaryClaimGenerator.determineCOBOrder(
  patientInfo,
  insurance1,
  insurance2
);

// Returns:
{
  primary: insurance1,
  secondary: insurance2,
  rule: 'birthday' | 'active' | 'default_order',
  notes: 'Optional explanation'
}
```

### 3. COB Rules Engine

Built-in COB rules for determining primary/secondary order:

**Birthday Rule** - For dependent children with two working parents:
- Parent with earlier birthday in calendar year is primary
- If same birthday, alphabetical by last name

**Self-Coverage Rule** - Always primary:
- If patient is the insured on a plan, that plan is primary

**Active/Inactive Rule**:
- Active employment coverage is primary over retired/COBRA

**Medicare Rules**:
- Working aged (<65): Employer coverage is primary
- Age 65+: Depends on employer size and employment status

**Implementation:**

```javascript
const { COBRules } = require('./services/secondaryClaimGenerator');

// Birthday rule
const result = COBRules.birthdayRule(
  '1980-05-15', // Parent 1 DOB
  '1982-03-20'  // Parent 2 DOB
);
// Returns: 'parent1' (May is earlier than March)

// Active/Inactive rule
const activeResult = COBRules.activeRule(
  true,  // Insurance 1 active
  false  // Insurance 2 inactive (COBRA)
);
// Returns: 'insurance1'

// Medicare rule
const medicareResult = COBRules.medicareRule(
  'MEDICARE',  // Insurance 1 type
  'EMPLOYER',  // Insurance 2 type
  62,          // Patient age
  true         // Is working
);
// Returns: 'insurance2' (Employer coverage primary for working aged)
```

---

## API Routes

### Generate Secondary Claim

**POST /api/secondary-claims/generate/:primaryClaimId**

Generate secondary claim from paid primary claim.

```javascript
POST /api/secondary-claims/generate/507f1f77bcf86cd799439011
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.00,
  "date": "2024-01-20",
  "patientResponsibility": 30.00,
  "adjustments": [
    {
      "code": "CO-45",
      "amount": -20.00,
      "reason": "Contractual adjustment"
    }
  ],
  "eobDocument": "https://s3.amazonaws.com/eobs/primary_eob_123.pdf",
  "autoSubmit": false
}

Response: 201 Created
{
  "success": true,
  "data": {
    "primaryClaim": {
      "id": "507f1f77bcf86cd799439011",
      "claimNumber": "CLM-123456-00001",
      "secondaryClaimId": "507f1f77bcf86cd799439012"
    },
    "secondaryClaim": {
      "_id": "507f1f77bcf86cd799439012",
      "claimNumber": "CLM-123456-00002",
      "cob": {
        "isPrimary": false,
        "isSecondary": true,
        "primaryClaimId": "507f1f77bcf86cd799439011"
      },
      "insurance": {
        "payerId": "SECONDARY_PAYER",
        "policyNumber": "SEC123456"
      },
      "totalCharges": 30.00,
      "status": "draft"
    },
    "amounts": {
      "totalCharges": 200.00,
      "primaryPaid": 150.00,
      "primaryAdjustments": -20.00,
      "allowedAmount": 180.00,
      "patientResponsibilityFromPrimary": 30.00,
      "remainingBalance": 30.00,
      "secondaryCharges": 30.00
    }
  }
}
```

### Validate Secondary Readiness

**GET /api/secondary-claims/validate/:primaryClaimId**

Check if primary claim is ready for secondary filing.

```javascript
GET /api/secondary-claims/validate/507f1f77bcf86cd799439011
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "ready": true,
    "validations": [
      { "passed": true, "check": "has_secondary_insurance" },
      { "passed": true, "check": "primary_paid" },
      { "passed": true, "check": "eob_received" },
      { "passed": true, "check": "secondary_not_filed" },
      {
        "passed": true,
        "check": "timely_filing",
        "message": "Within timely filing (15/90 days)",
        "daysRemaining": 75
      }
    ],
    "primaryClaim": {
      "id": "507f1f77bcf86cd799439011",
      "claimNumber": "CLM-123456-00001",
      "status": "paid",
      "amountPaid": 150.00
    }
  }
}
```

### Get Ready for Secondary

**GET /api/secondary-claims/ready**

Get all primary claims ready for secondary filing.

```javascript
GET /api/secondary-claims/ready
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "count": 5,
    "claims": [
      {
        "claim": {
          "_id": "507f1f77bcf86cd799439011",
          "claimNumber": "CLM-123456-00001",
          "patient": { "firstName": "John", "lastName": "Doe" },
          "serviceDate": "2024-01-15",
          "totalCharges": 200.00,
          "amountPaid": 150.00,
          "patientResponsibility": 30.00,
          "primaryPayment": {
            "amount": 150.00,
            "date": "2024-01-20",
            "eobReceived": true
          },
          "secondaryInsurance": {
            "payerId": "SECONDARY",
            "policyNumber": "SEC123"
          }
        },
        "validation": {
          "ready": true,
          "validations": [...]
        }
      }
    ]
  }
}
```

### Batch Generate

**POST /api/secondary-claims/batch/generate**

Batch generate multiple secondary claims.

```javascript
POST /api/secondary-claims/batch/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "primaryClaimIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439015"
  ]
}

Response: 200 OK
{
  "success": true,
  "data": {
    "successful": [
      {
        "primaryClaimId": "507f1f77bcf86cd799439011",
        "primaryClaimNumber": "CLM-123456-00001",
        "secondaryClaimId": "507f1f77bcf86cd799439012",
        "secondaryClaimNumber": "CLM-123456-00002",
        "amounts": { ... }
      }
    ],
    "failed": [
      {
        "primaryClaimId": "507f1f77bcf86cd799439013",
        "error": "Primary payment EOB not received"
      }
    ],
    "totalProcessed": 3
  }
}
```

### Get by Primary

**GET /api/secondary-claims/by-primary/:primaryClaimId**

Get secondary claim for a primary claim.

```javascript
GET /api/secondary-claims/by-primary/507f1f77bcf86cd799439011
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "hasSecondary": true,
    "primaryClaim": {
      "_id": "507f1f77bcf86cd799439011",
      "claimNumber": "CLM-123456-00001",
      "status": "paid",
      "amountPaid": 150.00,
      "primaryPayment": { ... }
    },
    "secondaryClaim": { ... }
  }
}
```

### Update Primary Payment

**PUT /api/secondary-claims/:primaryClaimId/primary-payment**

Update primary payment information to prepare for secondary filing.

```javascript
PUT /api/secondary-claims/507f1f77bcf86cd799439011/primary-payment
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.00,
  "date": "2024-01-20",
  "patientResponsibility": 30.00,
  "adjustments": [
    { "code": "CO-45", "amount": -20.00, "reason": "Contractual" }
  ],
  "eobReceived": true,
  "eobDocument": "https://s3.amazonaws.com/eobs/eob_123.pdf"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "claim": { ... }
  }
}
```

### Statistics

**GET /api/secondary-claims/stats**

Get secondary claims statistics.

```javascript
GET /api/secondary-claims/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "totalWithSecondary": 500,
    "readyForSecondary": 75,
    "secondaryFiled": 400,
    "secondaryPaid": 350,
    "secondaryPending": 50,
    "totalSecondaryCharges": 50000.00,
    "totalSecondaryPaid": 42000.00,
    "collectionRate": "84.00"
  }
}
```

### Determine COB Order

**POST /api/secondary-claims/cob-order**

Determine primary/secondary order for patient with multiple insurances.

```javascript
POST /api/secondary-claims/cob-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientInfo": {
    "dateOfBirth": "2010-05-15",
    "age": 14,
    "relationshipToInsured1": "child",
    "relationshipToInsured2": "child"
  },
  "insurance1": {
    "payerId": "BCBS",
    "relationshipToInsured": "child",
    "insured": {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1980-03-20"
    },
    "isActive": true
  },
  "insurance2": {
    "payerId": "AETNA",
    "relationshipToInsured": "child",
    "insured": {
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1982-05-15"
    },
    "isActive": true
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "primary": { ... insurance1 ... },
    "secondary": { ... insurance2 ... },
    "rule": "birthday",
    "notes": "Parent 1 has earlier birthday (March vs May)"
  }
}
```

---

## Complete Workflow Example

### Scenario: Patient with Dual Coverage

```javascript
// 1. Create primary claim with secondary insurance
const primaryClaim = new Claim({
  patient: {
    id: patientId,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '2010-05-15',
    gender: 'M',
    address: { ... }
  },
  provider: { ... },

  // Primary insurance
  insurance: {
    payerId: 'BCBS',
    policyNumber: 'PRI123456',
    groupNumber: 'GRP001'
  },

  // Secondary insurance
  secondaryInsurance: {
    hasSecondary: true,
    payerId: 'AETNA',
    policyNumber: 'SEC789012',
    groupNumber: 'GRP002',
    relationshipToInsured: 'child',
    insured: {
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1982-05-15'
    },
    timelyFilingLimit: 90,
    cobOrder: 2
  },

  serviceDate: '2024-01-15',
  placeOfService: '11',
  diagnosisCodes: ['Z00.00'],
  procedures: [{
    code: '99213',
    charge: 200.00,
    diagnosisPointers: [1]
  }],
  totalCharges: 200.00,

  cob: {
    isPrimary: true,
    isSecondary: false
  },

  createdBy: userId
});

await primaryClaim.save();

// 2. Scrub and submit primary claim
const scrubResult = await claimScrubber.scrub(primaryClaim, { autoFix: true });
primaryClaim.markAsSubmitted(userId, 'TRK-12345');
await primaryClaim.save();

// 3. Receive primary payment
// (Manual process: receive EOB from primary payer)
primaryClaim.markAsPaid(150.00, 'CHK001', 'ERA123');
primaryClaim.patientResponsibility = 30.00;
primaryClaim.payment.adjustments = [
  { code: 'CO-45', amount: -20.00, reason: 'Contractual adjustment' }
];
primaryClaim.cob.primaryPayment = {
  amount: 150.00,
  date: new Date(),
  eobReceived: true,
  eobDocument: 'https://s3.amazonaws.com/eobs/primary_eob_123.pdf'
};
primaryClaim.cob.patientResponsibilityFromPrimary = 30.00;
await primaryClaim.save();

// 4. Validate secondary readiness
const validation = await secondaryClaimGenerator.validateSecondaryReadiness(primaryClaim._id);

if (!validation.ready) {
  console.log('Not ready for secondary:');
  validation.validations
    .filter(v => !v.passed)
    .forEach(v => console.log(`- ${v.message}`));
  return;
}

// 5. Generate secondary claim
const result = await secondaryClaimGenerator.generateSecondaryClaim(
  primaryClaim._id,
  {
    amount: 150.00,
    date: new Date(),
    patientResponsibility: 30.00,
    adjustments: primaryClaim.payment.adjustments,
    eobDocument: 'https://s3.amazonaws.com/eobs/primary_eob_123.pdf'
  },
  { userId }
);

console.log('Secondary claim generated:');
console.log(`- Claim Number: ${result.secondaryClaim.claimNumber}`);
console.log(`- Charges: $${result.amounts.secondaryCharges}`);
console.log(`- Remaining Balance: $${result.amounts.remainingBalance}`);

// 6. Scrub secondary claim
const secondaryScrub = await claimScrubber.scrub(result.secondaryClaim, { autoFix: true });

// 7. Submit secondary claim
if (secondaryScrub.status !== 'fail') {
  result.secondaryClaim.markAsSubmitted(userId, 'TRK-67890');
  await result.secondaryClaim.save();
}

// 8. Receive secondary payment
result.secondaryClaim.markAsPaid(25.00, 'CHK002', 'ERA456');
await result.secondaryClaim.save();

// Final patient responsibility: $30 - $25 = $5
```

---

## Best Practices

### 1. Always Validate Before Generation

```javascript
// ✅ Good
const validation = await secondaryClaimGenerator.validateSecondaryReadiness(primaryClaimId);

if (!validation.ready) {
  const failedChecks = validation.validations
    .filter(v => !v.passed)
    .map(v => v.message);
  console.error('Cannot generate secondary:', failedChecks);
  return;
}

await secondaryClaimGenerator.generateSecondaryClaim(...);

// ❌ Bad
await secondaryClaimGenerator.generateSecondaryClaim(...);
// May fail without clear reason
```

### 2. Always Attach Primary EOB

```javascript
// ✅ Good - Include EOB reference
await secondaryClaimGenerator.generateSecondaryClaim(
  primaryClaimId,
  {
    amount: 150.00,
    eobDocument: 's3://bucket/eobs/primary_eob_123.pdf'
  },
  { userId, attachEOB: true }
);

// ❌ Bad - No EOB reference
await secondaryClaimGenerator.generateSecondaryClaim(
  primaryClaimId,
  { amount: 150.00 },
  { userId }
);
```

### 3. Monitor Timely Filing for Secondary

```javascript
// ✅ Good - Check timely filing
const readyClaims = await Claim.getReadyForSecondary();

for (const claim of readyClaims) {
  const validation = await secondaryClaimGenerator.validateSecondaryReadiness(claim._id);

  const timelyCheck = validation.validations.find(v => v.check === 'timely_filing');

  if (timelyCheck.daysRemaining <= 10) {
    console.warn(`Urgent: ${claim.claimNumber} has ${timelyCheck.daysRemaining} days remaining`);
  }
}

// ❌ Bad - No monitoring
const readyClaims = await Claim.getReadyForSecondary();
// May miss timely filing deadlines
```

### 4. Use Batch Processing for Efficiency

```javascript
// ✅ Good - Batch process
const readyClaims = await Claim.getReadyForSecondary();
const results = await secondaryClaimGenerator.batchGenerateSecondaryClaims(
  readyClaims,
  userId
);

console.log(`Processed ${results.totalProcessed} claims`);
console.log(`Success: ${results.successful.length}`);
console.log(`Failed: ${results.failed.length}`);

// ❌ Bad - Individual processing without error handling
for (const claim of readyClaims) {
  await secondaryClaimGenerator.generateSecondaryClaim(claim._id, ...);
  // One failure stops entire process
}
```

### 5. Determine COB Order Upfront

```javascript
// ✅ Good - Determine COB order when collecting insurance
const cobOrder = secondaryClaimGenerator.determineCOBOrder(
  patientInfo,
  insurance1,
  insurance2
);

claim.insurance = cobOrder.primary;
claim.secondaryInsurance = {
  hasSecondary: true,
  ...cobOrder.secondary,
  cobOrder: 2
};

// ❌ Bad - Guess COB order
claim.insurance = insurance1; // May be wrong
claim.secondaryInsurance = insurance2;
```

---

## Automated Workflows

### Nightly Secondary Generation

```javascript
const cron = require('node-cron');

// Run every night at 3 AM
cron.schedule('0 3 * * *', async () => {
  logger.info('Starting nightly secondary claim generation');

  const readyClaims = await Claim.getReadyForSecondary();

  if (readyClaims.length === 0) {
    logger.info('No claims ready for secondary filing');
    return;
  }

  const results = await secondaryClaimGenerator.batchGenerateSecondaryClaims(
    readyClaims,
    'system'
  );

  logger.info('Nightly secondary generation complete', {
    totalProcessed: results.totalProcessed,
    successful: results.successful.length,
    failed: results.failed.length
  });

  // Send notification if failures
  if (results.failed.length > 0) {
    await notificationService.send({
      subject: 'Secondary Claim Generation Failures',
      body: `${results.failed.length} claims failed to generate`,
      details: results.failed
    });
  }
});
```

### Timely Filing Alerts

```javascript
// Check daily for approaching deadlines
cron.schedule('0 9 * * *', async () => {
  const readyClaims = await Claim.getReadyForSecondary();

  const urgent = [];
  const approaching = [];

  for (const claim of readyClaims) {
    const validation = await secondaryClaimGenerator.validateSecondaryReadiness(claim._id);
    const timelyCheck = validation.validations.find(v => v.check === 'timely_filing');

    if (timelyCheck.daysRemaining <= 5) {
      urgent.push({
        claimNumber: claim.claimNumber,
        daysRemaining: timelyCheck.daysRemaining,
        patient: claim.patient.fullName
      });
    } else if (timelyCheck.daysRemaining <= 15) {
      approaching.push({
        claimNumber: claim.claimNumber,
        daysRemaining: timelyCheck.daysRemaining,
        patient: claim.patient.fullName
      });
    }
  }

  if (urgent.length > 0) {
    await notificationService.send({
      priority: 'high',
      subject: 'URGENT: Secondary Claims Approaching Deadline',
      body: `${urgent.length} claims must be filed within 5 days`,
      claims: urgent
    });
  }

  if (approaching.length > 0) {
    await notificationService.send({
      subject: 'Secondary Claims Approaching Filing Deadline',
      body: `${approaching.length} claims should be filed within 15 days`,
      claims: approaching
    });
  }
});
```

---

## Testing

### Unit Tests

```javascript
describe('Secondary Claim Generator', () => {
  test('should generate secondary claim from primary', async () => {
    const primaryClaim = await createTestClaim({
      secondaryInsurance: { hasSecondary: true },
      status: 'paid',
      amountPaid: 150
    });

    const result = await secondaryClaimGenerator.generateSecondaryClaim(
      primaryClaim._id,
      { amount: 150, patientResponsibility: 30 },
      { userId: 'test' }
    );

    expect(result.secondaryClaim.cob.isSecondary).toBe(true);
    expect(result.secondaryClaim.cob.primaryClaimId.toString()).toBe(primaryClaim._id.toString());
    expect(result.amounts.secondaryCharges).toBe(30);
  });

  test('should validate secondary readiness', async () => {
    const primaryClaim = await createTestClaim({
      secondaryInsurance: { hasSecondary: true },
      status: 'paid',
      'cob.primaryPayment.eobReceived': true
    });

    const validation = await secondaryClaimGenerator.validateSecondaryReadiness(primaryClaim._id);

    expect(validation.ready).toBe(true);
    expect(validation.validations.every(v => v.passed)).toBe(true);
  });

  test('should apply birthday rule correctly', () => {
    const result = COBRules.birthdayRule(
      '1980-03-20', // March 20
      '1982-05-15'  // May 15
    );

    expect(result).toBe('parent1'); // March is earlier
  });

  test('should calculate secondary amounts correctly', () => {
    const primaryClaim = {
      totalCharges: 200,
      procedures: [{ charge: 200, units: 1 }]
    };

    const paymentData = {
      amount: 150,
      patientResponsibility: 30,
      adjustments: [{ code: 'CO-45', amount: -20 }]
    };

    const amounts = secondaryClaimGenerator.calculateSecondaryAmounts(
      primaryClaim,
      paymentData
    );

    expect(amounts.totalCharges).toBe(200);
    expect(amounts.primaryPaid).toBe(150);
    expect(amounts.allowedAmount).toBe(180);
    expect(amounts.secondaryCharges).toBe(30);
  });
});
```

---

## Files Created

1. **[Claim.js](../models/Claim.js)** - Enhanced with COB support (updated)
2. **[secondaryClaimGenerator.js](../services/secondaryClaimGenerator.js)** - COB service (500 lines)
3. **[secondary-claims.js](../routes/secondary-claims.js)** - API routes (450 lines)
4. **[SECONDARY_CLAIMS.md](SECONDARY_CLAIMS.md)** - This documentation

**Total**: 950+ lines of new code + enhanced models

---

## Summary

TASK-10.13 provides complete secondary claim generation with:

- **Enhanced Claim Model** with secondary insurance and COB tracking
- **COB Rules Engine** implementing industry-standard coordination rules
- **Automatic Generation** of secondary claims after primary payment
- **Amount Calculation** with proper primary payment and adjustment tracking
- **Validation** ensuring readiness before filing
- **Batch Processing** for high-volume operations
- **Complete API** with all necessary endpoints
- **Timely Filing** monitoring for secondary claims
- **Automated Workflows** for nightly processing and alerts

The system ensures proper coordination of benefits and maximizes secondary insurance collections.
