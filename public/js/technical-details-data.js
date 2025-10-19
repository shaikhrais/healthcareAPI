// Technical details database for all tasks
const technicalDetailsDatabase = {
  '1-2': {
    title: 'Login System with JWT',
    sections: [
      {
        icon: '🔐',
        title: 'JWT Token Strategy',
        content: [
          '<strong>Access Token:</strong> Short-lived (15 minutes), contains userId, role, permissions',
          '<strong>Refresh Token:</strong> Long-lived (7 days), stored in HTTP-only cookie',
          '<strong>Token Storage:</strong> Access in memory/localStorage, Refresh in secure cookie',
          '<strong>Token Rotation:</strong> Refresh tokens rotated on each use',
          '<strong>Revocation:</strong> Blacklist in Redis for immediate logout',
        ],
      },
      {
        icon: '🔄',
        title: 'API Endpoints',
        isCode: true,
        content: `POST /api/auth/login
Body: { email, password }
Response: { accessToken, user: { id, email, role } }
Headers: Set-Cookie: refreshToken (HTTP-only, Secure, SameSite=Strict)

POST /api/auth/refresh
Headers: Cookie: refreshToken
Response: { accessToken }

POST /api/auth/logout
Response: { message: "Logged out successfully" }`,
      },
      {
        icon: '🛡️',
        title: 'Security Measures',
        content: [
          '<strong>Password Verification:</strong> bcrypt.compare() timing-safe',
          '<strong>Rate Limiting:</strong> Max 5 login attempts per 15 min',
          '<strong>Account Lockout:</strong> Lock after 10 failed attempts (24 hours)',
          '<strong>Brute Force Protection:</strong> Exponential backoff',
          '<strong>Token Signing:</strong> RS256 with private/public key pair',
          '<strong>CSRF Protection:</strong> SameSite cookie + CSRF tokens',
        ],
      },
    ],
  },

  '1-3': {
    title: 'Password Reset Flow',
    sections: [
      {
        icon: '🔐',
        title: 'Security Implementation',
        content: [
          '<strong>Token Generation:</strong> crypto.randomBytes(32) for secure random tokens',
          '<strong>Token Hashing:</strong> SHA256 hash stored in DB',
          '<strong>Token Expiry:</strong> 1 hour validity',
          '<strong>Single Use:</strong> Token deleted after reset',
          '<strong>Rate Limiting:</strong> Max 3 reset requests per hour',
          '<strong>Email Enumeration Prevention:</strong> Same response always',
        ],
      },
      {
        icon: '🔄',
        title: 'Password Reset Workflow',
        isCode: true,
        content: `1. POST /api/auth/forgot-password { email }
   → Generate & hash reset token
   → Send email with reset link

2. User clicks link with token

3. POST /api/auth/reset-password { token, newPassword }
   → Validate token & expiry
   → Hash new password
   → Clear reset token
   → Send confirmation email`,
      },
    ],
  },

  '1-4': {
    title: 'Docker Configuration',
    sections: [
      {
        icon: '🐳',
        title: 'Dockerfile (Multi-Stage)',
        isCode: true,
        content: `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3001
USER node
CMD ["node", "dist/server.js"]`,
      },
      {
        icon: '📦',
        title: 'docker-compose.yml',
        isCode: true,
        content: `services:
  app:
    build: .
    ports: ["3001:3001"]
    depends_on: [mongodb, redis]
    restart: unless-stopped

  mongodb:
    image: mongo:6
    volumes: [mongo-data:/data/db]

  redis:
    image: redis:7-alpine
    volumes: [redis-data:/data]`,
      },
      {
        icon: '📊',
        title: 'Optimization',
        content: [
          '<strong>Base Image:</strong> Alpine Linux for minimal size (~100MB)',
          '<strong>Layer Caching:</strong> Copy package.json first',
          '<strong>Security:</strong> Run as non-root user',
          '<strong>.dockerignore:</strong> Exclude node_modules, .git, .env',
        ],
      },
    ],
  },

  '1-5': {
    title: 'CI/CD Pipeline',
    sections: [
      {
        icon: '🔄',
        title: 'Pipeline Stages',
        isCode: true,
        content: `name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    - Checkout code
    - Run linting
    - Run tests (80%+ coverage)
    - Upload to Codecov

  build:
    - Build Docker image
    - Tag with SHA + latest
    - Push to registry
    - Scan for vulnerabilities

  deploy:
    - Deploy to staging (auto)
    - Deploy to production (manual approval)`,
      },
      {
        icon: '✅',
        title: 'Testing Stage',
        content: [
          '<strong>Linting:</strong> ESLint + Prettier',
          '<strong>Unit Tests:</strong> Jest with 80%+ coverage',
          '<strong>Integration Tests:</strong> API + database tests',
          '<strong>Security:</strong> npm audit + Snyk scanning',
        ],
      },
    ],
  },

  // Sprint 2 Tasks
  '2-1': {
    title: 'Role-Based Access Control',
    sections: [
      {
        icon: '👥',
        title: 'Roles & Permissions',
        content: [
          '<strong>Roles:</strong> Admin, Provider, Staff, Patient',
          '<strong>Permissions:</strong> Granular (read:patients, write:appointments)',
          '<strong>Hierarchy:</strong> Admin > Provider > Staff > Patient',
          '<strong>Dynamic Roles:</strong> Custom roles with permission sets',
          '<strong>Role Assignment:</strong> Admin can assign/revoke roles',
        ],
      },
      {
        icon: '🔒',
        title: 'Permission Schema',
        isCode: true,
        content: `{
  role: "provider",
  permissions: [
    "read:patients",
    "write:patients",
    "read:appointments",
    "write:appointments",
    "read:clinical_notes",
    "write:clinical_notes",
    "read:prescriptions",
    "write:prescriptions"
  ],
  restrictions: {
    canViewAllPatients: false,
    canModifyOwnNotesOnly: true
  }
}`,
      },
      {
        icon: '🛡️',
        title: 'Authorization Middleware',
        isCode: true,
        content: `// Route protection
router.post('/appointments',
  requireAuth,
  requireRole('provider', 'staff'),
  requirePermission('write:appointments'),
  createAppointment
);

// Resource-level authorization
if (!canAccessPatient(user, patientId)) {
  return res.status(403).json({ error: 'Forbidden' });
}`,
      },
    ],
  },

  '2-2': {
    title: 'Audit Logging System',
    sections: [
      {
        icon: '📝',
        title: 'Audit Log Schema',
        isCode: true,
        content: `{
  userId: ObjectId,
  action: 'VIEW_PATIENT' | 'UPDATE_RECORD' | 'DELETE_APPOINTMENT',
  resourceType: 'Patient' | 'Appointment' | 'ClinicalNote',
  resourceId: ObjectId,
  changes: { before: {}, after: {} },
  ipAddress: String,
  userAgent: String,
  timestamp: Date,
  success: Boolean,
  errorMessage: String
}`,
      },
      {
        icon: '🔍',
        title: 'Compliance Features',
        content: [
          '<strong>HIPAA Compliance:</strong> Log all PHI access',
          '<strong>Immutable Logs:</strong> Write-once, append-only',
          '<strong>Retention:</strong> 7 years minimum',
          '<strong>Search:</strong> Fast queries by user, resource, date',
          '<strong>Export:</strong> CSV/JSON for auditors',
        ],
      },
    ],
  },
};

// More tasks to be added...
