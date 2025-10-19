# Session Management & Revocation

Complete session management system for tracking, managing, and revoking user sessions across multiple devices.

## Overview

The session management system provides:
- **Multi-device tracking**: Track user sessions across web, mobile, and API clients
- **Session revocation**: Revoke individual, multiple, or all sessions
- **Security monitoring**: Track IP addresses, devices, and locations
- **Activity tracking**: Monitor last activity for each session
- **Automatic cleanup**: Expire old sessions automatically

## Architecture

### Components

1. **Session Model** ([Session.js](../models/Session.js))
   - MongoDB model for storing session data
   - Tracks device info, IP, location, activity
   - Automatic expiration with TTL indexes

2. **Session Manager** ([sessionManager.js](../utils/sessionManager.js))
   - Session creation and validation
   - Device fingerprinting
   - Session revocation logic

3. **Session Middleware** ([sessionAuth.js](../middleware/sessionAuth.js))
   - Validates JWT + session
   - Attaches session info to requests
   - Handles expired sessions

4. **Auth Routes** ([auth.js](../routes/auth.js))
   - Session management endpoints
   - Logout and revocation APIs

## Session Lifecycle

### 1. Session Creation (Login)

When a user logs in:

```javascript
// Generate JWT
const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });

// Create session
await SessionManager.createSession(userId, token, req, {
  sessionType: 'web',
  expiryDays: 7
});
```

Session stores:
- Hashed token (SHA-256)
- Device information (browser, OS, device type)
- IP address
- Location (if available)
- Expiration date
- Session type (web/mobile/api)

### 2. Session Validation

On each authenticated request:

```javascript
const validation = await SessionManager.validateSession(token);

if (!validation.valid) {
  // Session revoked or expired
  return res.status(401).json({ error: validation.error });
}

// Update last activity
await validation.session.updateActivity();
```

### 3. Session Revocation

Sessions can be revoked:
- **User logout**: User explicitly logs out
- **User revoked**: User revokes from settings
- **Admin revoked**: Admin revokes for security
- **Security**: Suspicious activity detected
- **Expired**: Session TTL expired
- **Password change**: All sessions revoked

### 4. Automatic Cleanup

Sessions are automatically cleaned up:
- TTL index on `expiresAt` field
- Periodic cleanup job
- On password change

## API Endpoints

### Authentication

#### POST /api/auth/login
Login and create a new session

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### POST /api/auth/logout
Logout and revoke current session

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

### Session Management

#### GET /api/auth/sessions
Get all active sessions for current user

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "sessions": [
    {
      "id": "session-id-1",
      "device": "Desktop",
      "browser": "Chrome",
      "os": "Windows",
      "ipAddress": "192.168.1.1",
      "location": "New York, USA",
      "lastActivity": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-14T08:00:00Z",
      "isCurrent": true
    },
    {
      "id": "session-id-2",
      "device": "Mobile",
      "browser": "Safari",
      "os": "iOS",
      "ipAddress": "192.168.1.2",
      "location": "New York, USA",
      "lastActivity": "2024-01-14T22:00:00Z",
      "createdAt": "2024-01-13T14:00:00Z",
      "isCurrent": false
    }
  ],
  "total": 2
}
```

#### DELETE /api/auth/sessions/:sessionId
Revoke a specific session

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "message": "Session revoked successfully"
}
```

#### DELETE /api/auth/sessions/other/all
Revoke all sessions except current

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "message": "3 session(s) revoked successfully",
  "count": 3
}
```

#### DELETE /api/auth/sessions/all
Revoke all sessions (including current)

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "message": "All sessions revoked successfully (4 session(s))",
  "count": 4
}
```

#### GET /api/auth/sessions/stats
Get session statistics

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "activeSessions": 3,
  "totalSessions": 10,
  "lastActivity": "2024-01-15T10:30:00Z"
}
```

## Usage Examples

### Frontend Integration

#### Login with Session Tracking

```javascript
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.token) {
    localStorage.setItem('token', data.token);
    return data;
  }

  throw new Error(data.error);
}
```

#### Get Active Sessions

```javascript
async function getActiveSessions() {
  const token = localStorage.getItem('token');

  const response = await fetch('/api/auth/sessions', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}
```

#### Revoke Session

```javascript
async function revokeSession(sessionId) {
  const token = localStorage.getItem('token');

  const response = await fetch(`/api/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}
```

#### Logout All Devices

```javascript
async function logoutAllDevices() {
  const token = localStorage.getItem('token');

  const response = await fetch('/api/auth/sessions/all', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  localStorage.removeItem('token');
  return await response.json();
}
```

### Backend Integration

#### Using Session Middleware

```javascript
const { sessionAuthMiddleware } = require('./middleware/sessionAuth');

// Protect route with session validation
router.get('/protected', sessionAuthMiddleware, async (req, res) => {
  // req.user contains user info
  // req.session contains session info

  res.json({
    user: req.user,
    session: {
      id: req.session._id,
      lastActivity: req.session.lastActivity
    }
  });
});
```

#### Revoking Sessions on Password Change

```javascript
// In password change handler
user.password = newPassword;
await user.save();

// Revoke all sessions
await SessionManager.revokeAllUserSessions(
  user._id,
  'password_change',
  user._id
);
```

#### Manual Session Cleanup

```javascript
// Run periodically (e.g., cron job)
const cleanedCount = await SessionManager.cleanupExpiredSessions();
console.log(`Cleaned up ${cleanedCount} expired sessions`);
```

## Security Features

### Token Hashing

Tokens are hashed (SHA-256) before storage:

```javascript
const tokenHash = crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');
```

This ensures:
- Tokens are not stored in plain text
- Database compromise doesn't expose active tokens
- Token validation requires original token

### Device Fingerprinting

Each session tracks:
- User agent string
- Browser type
- Operating system
- Device type (desktop/mobile/tablet)
- IP address
- Geographic location (if available)

### Activity Monitoring

- Last activity timestamp updated on each request
- Inactive sessions can be identified
- Suspicious activity patterns can be detected

### Automatic Expiration

- TTL index on `expiresAt` field
- MongoDB automatically removes expired documents
- Sessions expire after 7 days (configurable)

## Configuration

### Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Session Configuration
SESSION_EXPIRY_DAYS=7
SESSION_CLEANUP_INTERVAL=3600000  # 1 hour in ms

# Security
ENABLE_SESSION_TRACKING=true
MAX_SESSIONS_PER_USER=10
```

### Database Indexes

Ensure these indexes exist for performance:

```javascript
// In Session model
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ tokenHash: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

## Best Practices

### 1. Always Use HTTPS

Sessions contain sensitive tokens. Always use HTTPS in production.

### 2. Set Appropriate Expiration

```javascript
// Short-lived for high-security apps
expiryDays: 1

// Long-lived for user convenience
expiryDays: 30

// Balance security and UX
expiryDays: 7  // Default
```

### 3. Implement Rate Limiting

Protect session endpoints with rate limiting:

```javascript
const rateLimit = require('express-rate-limit');

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.use('/sessions', sessionLimiter);
```

### 4. Monitor Suspicious Activity

```javascript
// Alert on unusual patterns
if (session.ipAddress !== previousIpAddress) {
  await sendSecurityAlert(user, 'New IP address detected');
}

if (activeSessions > 10) {
  await sendSecurityAlert(user, 'Unusual number of active sessions');
}
```

### 5. Revoke on Security Events

```javascript
// On password change
await SessionManager.revokeAllUserSessions(userId, 'password_change');

// On suspicious activity
await SessionManager.revokeSession(sessionId, 'security');

// On account compromise
await SessionManager.revokeAllUserSessions(userId, 'admin_revoked', adminId);
```

### 6. Clean Up Regularly

```javascript
// Schedule cleanup job
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  await SessionManager.cleanupExpiredSessions();
});
```

## Troubleshooting

### Session Not Found

**Cause**: Session was revoked or expired

**Solution**:
- User should log in again
- Check if session was manually revoked
- Verify token hasn't expired

### Too Many Sessions

**Cause**: User logging in from many devices

**Solution**:
- Implement max sessions per user
- Auto-revoke oldest sessions
- Allow user to manage sessions

### Session Validation Slow

**Cause**: Missing database indexes

**Solution**:
```javascript
// Add indexes
db.sessions.createIndex({ tokenHash: 1, isActive: 1 });
db.sessions.createIndex({ user: 1, isActive: 1 });
```

### Memory Leaks

**Cause**: Sessions not being cleaned up

**Solution**:
- Enable TTL index
- Run cleanup job regularly
- Monitor session count

## Testing

### Unit Tests

```javascript
describe('Session Manager', () => {
  it('should create a session', async () => {
    const session = await SessionManager.createSession(
      userId,
      token,
      mockReq
    );

    expect(session.user).toBe(userId);
    expect(session.isActive).toBe(true);
  });

  it('should validate active session', async () => {
    const validation = await SessionManager.validateSession(token);

    expect(validation.valid).toBe(true);
    expect(validation.session).toBeDefined();
  });

  it('should reject expired session', async () => {
    // Create expired session
    const session = await Session.create({
      user: userId,
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1000)
    });

    const validation = await SessionManager.validateSession(token);

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('expired');
  });
});
```

### Integration Tests

```javascript
describe('Session Endpoints', () => {
  it('should create session on login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const sessions = await Session.find({ user: userId });
    expect(sessions.length).toBe(1);
  });

  it('should revoke session on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const session = await Session.findOne({ tokenHash });
    expect(session.isActive).toBe(false);
  });
});
```

## Migration Guide

If upgrading from simple JWT-only auth:

### 1. Add Session Model

```bash
# Session model already created
# Just ensure MongoDB indexes are created
```

### 2. Update Login Flow

```javascript
// Before
const token = jwt.sign({ userId }, JWT_SECRET);
return { token };

// After
const token = jwt.sign({ userId }, JWT_SECRET);
await SessionManager.createSession(userId, token, req);
return { token };
```

### 3. Update Middleware

```javascript
// Before
const { authMiddleware } = require('./middleware/auth');

// After
const { sessionAuthMiddleware } = require('./middleware/sessionAuth');
router.use(sessionAuthMiddleware);
```

### 4. Add Cleanup Job

```javascript
// Add to server.js
const cron = require('node-cron');
const SessionManager = require('./utils/sessionManager');

cron.schedule('0 * * * *', async () => {
  await SessionManager.cleanupExpiredSessions();
});
```

## Support

For issues:
1. Check session is active: `GET /api/auth/sessions`
2. Verify token hasn't expired
3. Check database indexes are created
4. Review server logs for errors

## Future Enhancements

- [ ] IP-based location tracking
- [ ] Browser fingerprinting
- [ ] Anomaly detection
- [ ] Session transfer between devices
- [ ] Remember device option
- [ ] Two-factor authentication integration
- [ ] Real-time session notifications
