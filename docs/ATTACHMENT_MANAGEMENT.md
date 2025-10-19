# Claim Attachments Management

Comprehensive system for managing file attachments associated with insurance claims, including upload, storage, validation, and electronic submission.

## Overview

The attachment management system handles all aspects of claim attachments:
- Secure file upload with validation
- Local and cloud storage support
- Virus scanning and validation
- Electronic submission to clearinghouses
- PWK (Paperwork) segment generation for HIPAA 837 claims
- Complete audit trails
- HIPAA-compliant retention policies

## Architecture

### Components

1. **ClaimAttachment Model** - MongoDB model for attachment metadata
2. **AttachmentStorageService** - File storage and retrieval
3. **AttachmentSubmissionService** - Electronic submission and PWK generation
4. **Attachments Routes** - RESTful API endpoints

### File Storage Structure

```
uploads/attachments/
├── 2025/
│   ├── 01/
│   │   ├── 1735689600000-a1b2c3d4e5f6.pdf
│   │   └── 1735689700000-g7h8i9j0k1l2.jpg
│   └── 02/
│       └── 1738368000000-m3n4o5p6q7r8.pdf
```

Files are organized by year and month for performance and organization.

## Data Model

### ClaimAttachment Schema

```javascript
{
  // Associated claim
  claim: ObjectId,
  claimNumber: String,

  // File information
  filename: String,              // Secure generated filename
  originalFilename: String,      // Original user filename
  fileSize: Number,             // Bytes
  mimeType: String,
  fileExtension: String,

  // Storage
  storageType: 'local'|'s3'|'azure'|'gcp',
  storagePath: String,          // Relative path
  storageUrl: String,           // Optional public URL

  // Classification
  attachmentType: String,       // 16 types (medical_records, lab_results, etc.)
  description: String,
  documentDate: Date,

  // PWK codes for electronic submission
  pwkReportType: String,        // '03', '04', 'M1', 'RR', etc.
  pwkTransmissionCode: String,  // 'EL', 'BM', 'FX', etc.
  attachmentControlNumber: String, // Auto-generated unique ID

  // Status
  status: String,  // 'pending'|'uploaded'|'validated'|'submitted'|'accepted'|'rejected'

  // Validation
  validation: {
    validated: Boolean,
    validatedAt: Date,
    validatedBy: ObjectId,
    validationErrors: [{
      code: String,
      message: String,
      severity: 'error'|'warning'|'info'
    }],
    virusScan: {
      scanned: Boolean,
      clean: Boolean,
      scanDate: Date,
      scanEngine: String
    }
  },

  // Submission tracking
  submission: {
    submitted: Boolean,
    submittedAt: Date,
    submittedBy: ObjectId,
    submissionMethod: 'electronic'|'fax'|'mail'|'portal',
    trackingNumber: String,
    accepted: Boolean,
    acceptedAt: Date,
    rejectionReason: String
  },

  // Access control
  isConfidential: Boolean,
  accessRestrictions: ['provider_only'|'billing_only'|'admin_only'],
  encrypted: Boolean,

  // Retention
  retentionPeriod: Number,  // 2555 days (7 years for HIPAA)
  expirationDate: Date,
  archived: Boolean,

  // Audit
  uploadedBy: ObjectId,
  accessLog: [{
    user: ObjectId,
    action: 'view'|'download'|'edit'|'delete',
    timestamp: Date,
    ipAddress: String
  }],

  timestamps: true
}
```

### Attachment Types

1. **medical_records** - General medical records
2. **lab_results** - Laboratory test results
3. **radiology_report** - X-ray, MRI, CT scan reports
4. **operative_report** - Surgical procedure reports
5. **pathology_report** - Pathology findings
6. **consultation_report** - Specialist consultation notes
7. **prescription** - Medication prescriptions
8. **authorization** - Prior authorization documents
9. **referral** - Referral forms
10. **eob** - Explanation of Benefits
11. **correspondence** - Insurance correspondence
12. **billing_statement** - Billing documents
13. **patient_consent** - Consent forms
14. **insurance_card** - Insurance card images
15. **photo_id** - Patient identification
16. **other** - Other documents

## File Validation

### Allowed MIME Types

**Documents:**
- application/pdf
- application/msword (.doc)
- application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
- application/vnd.ms-excel (.xls)
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx)
- text/plain
- text/csv

**Images:**
- image/jpeg
- image/png
- image/gif
- image/bmp
- image/tiff
- image/webp

**Medical Imaging:**
- application/dicom

**Compressed:**
- application/zip
- application/x-rar-compressed

### File Size Limits

- PDF: 25 MB
- Images (JPEG/PNG): 10 MB
- TIFF (medical imaging): 50 MB
- DICOM: 100 MB
- Default: 25 MB

### Blocked Extensions (Security)

.exe, .bat, .cmd, .com, .msi, .scr, .vbs, .js, .jar, .app, .deb, .rpm

## API Endpoints

### Upload Attachments

```http
POST /api/attachments/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- files: File[] (max 10 files)
- claimId: String (required)
- attachmentType: String (required)
- description: String (optional)
- documentDate: String (ISO8601, optional)
- pwkReportType: String (optional)
- pwkTransmissionCode: String (optional, default: 'EL')
- isConfidential: Boolean (optional)
- tags: String[] (optional)

Response: 201 Created
{
  "message": "Successfully uploaded 2 of 2 files",
  "attachments": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "claim": "65a1...",
      "filename": "1735689600000-a1b2c3d4e5f6.pdf",
      "originalFilename": "medical_record_2025.pdf",
      "fileSize": 524288,
      "mimeType": "application/pdf",
      "attachmentType": "medical_records",
      "status": "uploaded",
      "attachmentControlNumber": "ATT-1LX2M3N-ABC123XYZ",
      "createdAt": "2025-01-01T12:00:00.000Z"
    }
  ]
}
```

### Get Attachment Metadata

```http
GET /api/attachments/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "claim": {
    "_id": "65a1...",
    "claimNumber": "CLM-2025-00123"
  },
  "filename": "1735689600000-a1b2c3d4e5f6.pdf",
  "originalFilename": "medical_record_2025.pdf",
  "fileSize": 524288,
  "mimeType": "application/pdf",
  "attachmentType": "medical_records",
  "status": "validated",
  "validation": {
    "validated": true,
    "validatedAt": "2025-01-01T13:00:00.000Z",
    "validationErrors": []
  }
}
```

### Download Attachment

```http
GET /api/attachments/:id/download
Authorization: Bearer <token>

Response: 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="medical_record_2025.pdf"
Content-Length: 524288

<binary file data>
```

### List Attachments for Claim

```http
GET /api/claims/:claimId/attachments
Authorization: Bearer <token>

Query Parameters:
- attachmentType: String (optional)
- status: String (optional)
- includeArchived: Boolean (optional, default: false)

Response: 200 OK
{
  "claimId": "65a1...",
  "claimNumber": "CLM-2025-00123",
  "count": 5,
  "attachments": [...]
}
```

### Validate Attachment

```http
POST /api/attachments/:id/validate
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Attachment validation complete",
  "valid": true,
  "attachment": {...},
  "validationErrors": []
}
```

### Submit Attachment Electronically

```http
POST /api/attachments/:id/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "submissionMethod": "electronic",
  "trackingNumber": "TRK-12345" // optional
}

Response: 200 OK
{
  "message": "Attachment marked as submitted",
  "attachment": {...}
}
```

### Update Attachment Metadata

```http
PUT /api/attachments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "attachmentType": "lab_results",
  "documentDate": "2025-01-15",
  "pwkReportType": "LA",
  "tags": ["urgent", "abnormal"],
  "notes": "Follow-up required"
}

Response: 200 OK
{
  "message": "Attachment updated successfully",
  "attachment": {...}
}
```

### Delete Attachment

```http
DELETE /api/attachments/:id
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Attachment deleted successfully",
  "attachmentId": "65a1..."
}
```

### Archive Attachment

```http
POST /api/attachments/:id/archive
Authorization: Bearer <token>

Response: 200 OK
{
  "message": "Attachment archived successfully",
  "attachment": {...}
}
```

### Get Statistics

```http
GET /api/attachments/stats
Authorization: Bearer <token>

Query Parameters:
- startDate: String (ISO8601, optional)
- endDate: String (ISO8601, optional)

Response: 200 OK
{
  "period": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  },
  "attachments": {
    "total": 145,
    "byType": {
      "medical_records": 45,
      "lab_results": 30,
      "radiology_report": 25,
      "eob": 20,
      "other": 25
    },
    "byStatus": {
      "uploaded": 10,
      "validated": 50,
      "submitted": 60,
      "accepted": 20,
      "rejected": 5
    },
    "totalSize": 524288000,
    "submitted": 85,
    "accepted": 20,
    "acceptanceRate": "23.53"
  },
  "storage": {
    "totalFiles": 145,
    "totalSize": 524288000,
    "totalSizeFormatted": "500 MB",
    "uploadDir": "/path/to/uploads/attachments"
  }
}
```

### Batch Validate

```http
POST /api/attachments/batch/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "attachmentIds": [
    "65a1b2c3...",
    "65a1b2c4...",
    "65a1b2c5..."
  ]
}

Response: 200 OK
{
  "message": "Validated 3 of 3 attachments",
  "results": [
    {
      "attachmentId": "65a1b2c3...",
      "success": true,
      "valid": true,
      "errorCount": 0
    }
  ]
}
```

## Electronic Submission

### PWK Segment Generation

The system generates PWK (Paperwork) segments for HIPAA 837 claims:

```
PWK*RP*EL*AC**AC*ATT-1LX2M3N-ABC123XYZ~
```

**Segment Fields:**
- PWK01: Report Type Code (e.g., 'M1' = Medical Record)
- PWK02: Transmission Code ('EL' = Electronic, 'BM' = By Mail, 'FX' = Fax)
- PWK03: Copies Needed (optional)
- PWK04: Entity Identifier (optional)
- PWK05: Identifier Qualifier ('AC' = Attachment Control Number)
- PWK06: Attachment Control Number (unique tracking ID)

### PWK Report Type Codes

Common codes:
- **03** - Report Justifying Treatment
- **04** - Drugs Administered
- **09** - Progress Report
- **AS** - Admission Summary
- **B2** - Prescription
- **B4** - Referral Form
- **CT** - Certification
- **DG** - Diagnostic Report
- **DS** - Discharge Summary
- **EB** - Explanation of Benefits
- **LA** - Laboratory Results
- **M1** - Medical Record Attachment
- **OB** - Operative Note
- **P4** - Pathology Report
- **PY** - Physician Report
- **RB** - Radiology Films
- **RR** - Radiology Reports

### Submission Process

1. **Validate** - Ensure attachment passes all validation checks
2. **Prepare** - Generate PWK segment and submission package
3. **Submit** - Send to clearinghouse API
4. **Track** - Monitor submission status
5. **Accept/Reject** - Process clearinghouse response

### Submission Package Structure

```javascript
{
  attachmentId: "65a1...",
  attachmentControlNumber: "ATT-1LX2M3N-ABC123XYZ",
  claim: {
    id: "65a1...",
    claimNumber: "CLM-2025-00123",
    patient: { firstName, lastName, memberId },
    provider: { npi, name },
    payer: { id, name }
  },
  attachment: {
    filename: "medical_record.pdf",
    mimeType: "application/pdf",
    size: 524288,
    type: "medical_records",
    description: "Patient medical history",
    documentDate: "2025-01-15"
  },
  pwk: {
    reportType: "M1",
    transmissionCode: "EL",
    identifierQualifier: "AC",
    controlNumber: "ATT-1LX2M3N-ABC123XYZ"
  },
  pwkSegment: "PWK*M1*EL*AC**AC*ATT-1LX2M3N-ABC123XYZ~",
  file: {
    data: "<base64-encoded file>",
    encoding: "base64"
  }
}
```

## Service Methods

### AttachmentStorageService

```javascript
const { attachmentStorageService } = require('./services/attachmentStorageService');

// Upload file
const result = await attachmentStorageService.upload(file, metadata);
// Returns: { filename, storageType, storagePath, fileHash, uploadedAt }

// Validate file
const validation = attachmentStorageService.validateFile(file);
// Returns: { valid: true/false, errors: [...] }

// Retrieve file
const buffer = await attachmentStorageService.retrieve(storageType, storagePath);

// Delete file
await attachmentStorageService.delete(storageType, storagePath);

// Get file info
const info = await attachmentStorageService.getFileInfo(storageType, storagePath);
// Returns: { size, created, modified, exists }

// Scan for viruses
const scanResult = await attachmentStorageService.scanForViruses(file);
// Returns: { scanned, clean, scanDate, scanEngine }

// Storage statistics
const stats = await attachmentStorageService.getStorageStatistics();
// Returns: { totalFiles, totalSize, totalSizeFormatted, uploadDir }

// Cleanup old files
const cleanup = await attachmentStorageService.cleanupOldFiles(7);
// Returns: { deletedCount }
```

### AttachmentSubmissionService

```javascript
const { attachmentSubmissionService } = require('./services/attachmentSubmissionService');

// Validate for submission
const validation = await attachmentSubmissionService.validateForSubmission(attachment);
// Returns: { valid: true/false, errors: [...] }

// Generate PWK segment
const pwk = attachmentSubmissionService.generatePWKSegment(attachment);
// Returns: { segment: {...}, ediSegment: "PWK*..." }

// Prepare for submission
const package = await attachmentSubmissionService.prepareForSubmission(attachmentId);
// Returns: { attachmentId, claim, attachment, pwk, file }

// Submit electronically
const result = await attachmentSubmissionService.submitElectronically(attachmentId, userId);
// Returns: { success, trackingNumber, controlNumber, submittedAt }

// Submit batch
const batchResult = await attachmentSubmissionService.submitBatch(attachmentIds, userId);
// Returns: { total, successful, failed, results }

// Check status
const status = await attachmentSubmissionService.checkSubmissionStatus(attachmentId);
// Returns: { status, submittedAt, trackingNumber, accepted }

// Process acceptance
await attachmentSubmissionService.processAcceptance(trackingNumber, acceptanceData);

// Process rejection
await attachmentSubmissionService.processRejection(trackingNumber, rejectionData);

// Get PWK description
const description = attachmentSubmissionService.getPWKDescription('M1');
// Returns: "Medical Record Attachment"

// Generate submission report
const report = await attachmentSubmissionService.generateSubmissionReport(claimId);
// Returns: { totalAttachments, byStatus, byType, submitted, accepted, rejected }

// Resend attachment
const resend = await attachmentSubmissionService.resendAttachment(attachmentId, userId);
```

### ClaimAttachment Model Methods

```javascript
// Instance methods
attachment.logAccess(userId, 'view', ipAddress);
attachment.markAsValidated(userId, errors);
attachment.markAsSubmitted(userId, 'electronic', trackingNumber);
attachment.markAsAccepted();
attachment.markAsRejected(reason);
attachment.archive();
attachment.isExpired(); // Returns: Boolean
attachment.hasAccess(userRole); // Returns: Boolean
attachment.getFormattedFileSize(); // Returns: "500 KB"

// Static methods
const attachments = await ClaimAttachment.getForClaim(claimId);
const byType = await ClaimAttachment.getByType(claimId, 'lab_results');
const pending = await ClaimAttachment.getPendingSubmissions();
const expired = await ClaimAttachment.getExpired();
const stats = await ClaimAttachment.getStatistics(startDate, endDate);
```

## Security & Compliance

### Access Control

Role-based access restrictions:
- **owner** - Full access to all attachments
- **admin** - Full access to all attachments
- **practitioner** - Access to non-restricted attachments
- **billing** - Access to billing-related attachments
- **patient** - Restricted access (patient portal)

Access restrictions can be applied:
- `provider_only` - Only accessible by providers
- `billing_only` - Only accessible by billing staff
- `admin_only` - Only accessible by administrators
- `patient_restricted` - Not accessible by patients

### Audit Trail

Every attachment maintains a complete access log:
```javascript
{
  user: ObjectId,
  action: 'view'|'download'|'edit'|'delete',
  timestamp: Date,
  ipAddress: String
}
```

The system tracks:
- Who uploaded the attachment
- Who last accessed it
- Complete history of all access (last 100 events)

### HIPAA Compliance

1. **7-Year Retention** - Default retention period of 2555 days (7 years)
2. **Encryption Support** - Encryption at rest capability
3. **Audit Trails** - Complete access logging
4. **Access Controls** - Role-based restrictions
5. **Secure Deletion** - Proper file deletion when authorized

### File Security

1. **Secure Filenames** - Cryptographically generated unique filenames
2. **Mime Type Validation** - Strict whitelist of allowed file types
3. **Extension Blocking** - Blacklist of dangerous file extensions
4. **File Size Limits** - Per-type size restrictions
5. **Virus Scanning** - Integration ready (placeholder included)
6. **Hash Generation** - SHA-256 hash for integrity verification

## Configuration

### Environment Variables

```bash
# Storage configuration
ATTACHMENT_UPLOAD_DIR=/path/to/uploads/attachments
ATTACHMENT_TEMP_DIR=/path/to/uploads/temp
ATTACHMENT_STORAGE_TYPE=local  # local, s3, azure, gcp

# S3 configuration (if using S3)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_S3_REGION=us-east-1

# Clearinghouse configuration
CLEARINGHOUSE_API_URL=https://api.clearinghouse.com
CLEARINGHOUSE_API_KEY=your_api_key

# Virus scanning (if using external service)
VIRUS_SCAN_API_URL=https://api.virusscan.com
VIRUS_SCAN_API_KEY=your_api_key
```

## Integration

### Clearinghouse Integration

For production use, integrate with a clearinghouse API:

1. **Update AttachmentSubmissionService**:
```javascript
async submitElectronically(attachmentId, userId) {
  const package = await this.prepareForSubmission(attachmentId);

  // POST to clearinghouse
  const response = await axios.post(
    `${this.clearinghouseUrl}/attachments/submit`,
    package,
    {
      headers: {
        'Authorization': `Bearer ${this.clearinghouseApiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Process response...
}
```

2. **Implement Webhook Handlers** for acceptance/rejection notifications

### S3 Integration

To use Amazon S3 for storage:

1. **Install AWS SDK**:
```bash
npm install aws-sdk
```

2. **Implement uploadToS3 in AttachmentStorageService**:
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async uploadToS3(file, metadata) {
  const key = `${year}/${month}/${secureFilename}`;

  await s3.putObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: 'AES256'
  }).promise();

  return { storageType: 's3', storagePath: key, ... };
}
```

## Best Practices

1. **Always validate** attachments before submission
2. **Use appropriate PWK codes** for accurate claim processing
3. **Monitor storage usage** regularly
4. **Archive old attachments** according to retention policy
5. **Implement virus scanning** in production
6. **Use S3 or cloud storage** for production (not local storage)
7. **Enable encryption** for confidential documents
8. **Review access logs** regularly for security audits
9. **Set appropriate access restrictions** based on document sensitivity
10. **Document the source and purpose** of each attachment

## Troubleshooting

### File Upload Fails

**Issue**: File upload returns validation error

**Solution**: Check file type, size, and extension against validation rules

### Attachment Not Found

**Issue**: Cannot retrieve file from storage

**Solution**: Verify storage path, check file system permissions, ensure file wasn't deleted

### Submission Fails

**Issue**: Electronic submission returns error

**Solution**:
- Verify attachment is validated
- Check PWK codes are present
- Ensure clearinghouse API is configured
- Review submission service logs

### Access Denied

**Issue**: User cannot access attachment

**Solution**: Check user role and attachment access restrictions

## Future Enhancements

1. **Image Processing** - Thumbnail generation, format conversion
2. **OCR Integration** - Extract text from scanned documents
3. **Document Classification** - AI-powered automatic attachment type detection
4. **Advanced Virus Scanning** - Integration with ClamAV or commercial services
5. **Cloud Storage** - Full S3, Azure, GCP support
6. **Attachment Templates** - Pre-defined attachment packages for common procedures
7. **Batch Upload** - Drag-and-drop multiple files with auto-classification
8. **Version Control** - Track attachment versions and revisions
9. **Digital Signatures** - Support for electronically signed documents
10. **FHIR Integration** - Export attachments in FHIR DocumentReference format

## Support

For issues or questions:
- Review logs in `/logs/attachment-*.log`
- Check attachment validation errors
- Verify storage configuration
- Consult clearinghouse documentation for PWK codes
