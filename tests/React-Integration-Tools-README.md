# React API Integration Tools

This directory contains a comprehensive suite of tools for analyzing React applications and generating corresponding backend APIs with full Healthcare system integration.

## 🛠️ Tools Overview

### 1. React API Scanner (`react-api-scanner.js`)
Scans entire React projects to extract components, API endpoints, and application structure.

**Features:**
- 📦 Component discovery and analysis
- 🌐 API endpoint extraction
- 🎣 Custom hooks identification
- 🛣️ Route structure mapping
- 📊 Comprehensive project reporting

**Usage:**
```bash
node tests/react-api-scanner.js /path/to/react/project
```

### 2. React Component Analyzer (`react-component-analyzer.js`)
Deep analysis of individual React components with backend generation.

**Features:**
- 🔍 Data structure extraction
- 📝 Form field analysis
- 🎯 Event handler mapping
- 🔗 API call detection
- 🏗️ Backend endpoint generation

**Usage:**
```bash
node tests/react-component-analyzer.js /path/to/component.jsx
```

### 3. React Healthcare Integration (`react-healthcare-integration.js`)
Complete integration suite that combines scanning and analysis with healthcare-specific component generation.

**Features:**
- 🏥 Healthcare component generation
- 🔄 Full project integration
- 📊 Unified backend generation
- 📚 Complete documentation
- 🧪 Test suite creation

**Usage:**
```bash
node tests/react-healthcare-integration.js /path/to/react/project
```

## 🚀 Quick Start

### Prerequisites
```bash
npm install axios colors
```

### Basic Usage

1. **Scan a React Project:**
   ```bash
   node tests/react-api-scanner.js ../my-react-app
   ```

2. **Analyze Individual Component:**
   ```bash
   node tests/react-component-analyzer.js ../my-react-app/src/components/UserForm.jsx
   ```

3. **Full Healthcare Integration:**
   ```bash
   node tests/react-healthcare-integration.js ../my-react-app
   ```

## 📊 Generated Output

### Project Scanning Results
```
generated-react-components/
├── components/          # Generated React components
├── pages/              # Generated page components
├── hooks/              # Generated custom hooks
├── services/           # API service layer
├── styles/             # Component CSS files
├── utils/              # Utility functions
└── README.md           # Integration guide
```

### Component Analysis Results
```
generated-backend/
├── routes/             # Express.js routes
├── controllers/        # API controllers
├── models/             # Mongoose models
└── component-analysis-report.json
```

### Full Healthcare Integration Results
```
generated-react-healthcare/
├── components/
│   ├── PatientDashboard.jsx
│   ├── AppointmentBooking.jsx
│   ├── MedicalRecordsViewer.jsx
│   ├── TelehealthConsole.jsx
│   └── BillingManagement.jsx
├── styles/             # Healthcare-specific CSS
├── tests/              # Jest test files
└── services/           # Consolidated API service

generated-unified-backend/
├── services/           # Unified API services
├── routes/             # Healthcare API routes
├── controllers/        # Healthcare controllers
└── models/             # Healthcare data models

REACT_INTEGRATION_GUIDE.md  # Complete integration guide
```

## 🏥 Healthcare Components Generated

### 1. PatientDashboard
- **Purpose:** Patient overview and management
- **Features:** Patient list, appointment calendar, medical records summary
- **API Endpoints:** `/api/patients`, `/api/appointments`, `/api/medical-records`

### 2. AppointmentBooking
- **Purpose:** Appointment scheduling system
- **Features:** Doctor selection, time slot picker, patient info form
- **API Endpoints:** `/api/appointments`, `/api/doctors`, `/api/time-slots`

### 3. MedicalRecordsViewer
- **Purpose:** Medical history and records display
- **Features:** Record timeline, prescription list, lab results charts
- **API Endpoints:** `/api/medical-records`, `/api/prescriptions`, `/api/lab-results`

### 4. TelehealthConsole
- **Purpose:** Virtual healthcare communication
- **Features:** Video call interface, chat system, notification center
- **API Endpoints:** `/api/video-calls`, `/api/messages`, `/api/notifications`

### 5. BillingManagement
- **Purpose:** Financial and billing operations
- **Features:** Invoice generation, payment processing, insurance claims
- **API Endpoints:** `/api/invoices`, `/api/payments`, `/api/insurance`

## 🔧 Configuration Options

### Environment Variables
```env
# React App Configuration
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WEBSOCKET_URL=ws://localhost:3001

# Backend Configuration
PORT=3001
MONGODB_URI=mongodb://localhost:27017/healthcare
JWT_SECRET=your-secret-key-here
```

### Scanner Configuration
You can customize the scanning behavior by modifying the patterns in each tool:

```javascript
// Example: Custom component patterns
const componentPatterns = [
  /\.jsx?$/,
  /\.tsx?$/,
  /Component\.js$/,
  /components\/.*\.js$/
];
```

## 📋 Analysis Features

### Data Structure Extraction
- ✅ useState initial values
- ✅ Interface/type definitions
- ✅ Object literals
- ✅ PropTypes definitions

### API Call Detection
- ✅ Axios calls
- ✅ Fetch API usage
- ✅ Custom service calls
- ✅ WebSocket connections

### Form Analysis
- ✅ Input field extraction
- ✅ Validation rules
- ✅ Event handlers
- ✅ Submission logic

### Component Relationships
- ✅ Import/export mapping
- ✅ Component hierarchy
- ✅ Hook dependencies
- ✅ Route relationships

## 🧪 Testing Integration

### Generated Test Structure
```javascript
// Example generated test
describe('PatientDashboard', () => {
  test('renders component header', () => {
    render(<PatientDashboard />);
    expect(screen.getByText('Patient Dashboard')).toBeInTheDocument();
  });

  test('loads data successfully', async () => {
    // Mock API calls
    healthcareAPI.get.mockResolvedValue({ data: mockData });
    
    render(<PatientDashboard />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });
  });
});
```

### Test Commands
```bash
# Run all generated tests
npm test

# Run specific component tests
npm test PatientDashboard.test.jsx

# Run with coverage
npm test -- --coverage
```

## 🔒 Security Features

### Authentication Integration
- ✅ JWT token management
- ✅ Automatic token refresh
- ✅ Biometric authentication support
- ✅ Multi-factor authentication

### Data Protection
- ✅ Input sanitization
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Rate limiting

### HIPAA Compliance
- ✅ Data encryption
- ✅ Audit logging
- ✅ Access control
- ✅ Data retention policies

## 📊 API Service Features

### Consolidated Healthcare API
```javascript
import { healthcareAPI } from './services/healthcareAPI';

// Authentication
await healthcareAPI.auth.login(credentials);
await healthcareAPI.auth.verifyMFA(token);

// Patient Management
await healthcareAPI.patients.getAll();
await healthcareAPI.patients.create(patientData);

// Appointment Scheduling
await healthcareAPI.appointments.book(appointmentData);
await healthcareAPI.appointments.getAvailableSlots(doctorId, date);

// Medical Records
await healthcareAPI.medicalRecords.getByPatient(patientId);
await healthcareAPI.medicalRecords.addDiagnosis(recordId, diagnosis);

// Billing
await healthcareAPI.billing.createInvoice(invoiceData);
await healthcareAPI.billing.processPayment(paymentData);
```

### Error Handling
- ✅ Automatic retry logic
- ✅ Network error handling
- ✅ Authentication error handling
- ✅ Validation error display

## 🎨 Styling System

### Healthcare Theme
```css
:root {
  --healthcare-primary: #1976d2;
  --healthcare-secondary: #e3f2fd;
  --healthcare-success: #4caf50;
  --healthcare-error: #f44336;
  --healthcare-warning: #ff9800;
}
```

### Responsive Design
- ✅ Mobile-first approach
- ✅ Tablet optimization
- ✅ Desktop layouts
- ✅ Accessibility compliance

## 🚀 Deployment Guide

### Frontend Deployment
```bash
# Build optimized React app
npm run build

# Deploy to hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

### Backend Integration
```bash
# Copy generated backend files
cp -r generated-unified-backend/* ../healthcare-api/

# Install dependencies
npm install

# Start production server
npm start
```

## 📚 Documentation Generated

1. **REACT_INTEGRATION_GUIDE.md** - Complete integration instructions
2. **component-analysis-report.json** - Detailed analysis results
3. **component-mapping-report.json** - Component to API mapping
4. **API documentation** - Endpoint specifications
5. **Test documentation** - Testing guidelines

## ⚡ Performance Optimizations

### Code Splitting
- ✅ Component lazy loading
- ✅ Route-based splitting
- ✅ Dynamic imports

### API Optimizations
- ✅ Request caching
- ✅ Batch operations
- ✅ Connection pooling
- ✅ Rate limiting

### Bundle Optimization
- ✅ Tree shaking
- ✅ Code minification
- ✅ Asset optimization
- ✅ CDN integration

## 🛠️ Troubleshooting

### Common Issues

#### Tool Not Running
```bash
# Check Node.js version
node --version  # Should be 14+

# Install missing dependencies
npm install axios colors
```

#### CORS Errors
```javascript
// Add to Express server
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
```

#### API Connection Issues
```javascript
// Check API base URL
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=true node tests/react-healthcare-integration.js /path/to/project
```

## 📞 Support

For questions and issues:
1. Check the troubleshooting section above
2. Review the generated documentation
3. Test individual components
4. Verify API connectivity

## 🔄 Updates and Maintenance

### Tool Updates
- Regular security updates
- New healthcare component templates
- Enhanced analysis capabilities
- Performance improvements

### Version Compatibility
- React 16.8+ (Hooks support required)
- Node.js 14+
- Express.js 4+
- MongoDB 4+

---

**Generated:** ${new Date().toISOString()}
**Version:** 1.0.0
**Compatibility:** React 16.8+, Node.js 14+