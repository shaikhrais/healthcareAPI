# Managers

Centralized managers encapsulate cross-cutting concerns and shared logic for the whole API. They are framework-agnostic, easy to test, and reduce duplication across modules.

Included managers:

- ErrorManager: Standard error classes, logging, and HTTP mapping
- ConfigManager: Typed access to env config with defaults and safe public snapshot
- CacheManager: In-memory cache with TTL and pluggable adapter
- RequestContextManager: Per-request correlation/user/tenant context

Suggested next managers to add:

- AuthManager: token issuing/verification, MFA factors, permissions checks
- AuditManager: write append-only audit logs for sensitive actions (HIPAA)
- NotificationManager: email/SMS/push via unified API with templates
- FileStorageManager: S3/Azure Blob/local storage abstraction + virus scan hooks
- QueueManager: background jobs (BullMQ/RabbitMQ/Azure SB) with retry policies
- FeatureFlagManager: runtime flags with remote config support

Usage examples:

```js
const { ErrorManager, ConfigManager, CacheManager, RequestContextManager } = require('../managers');

// Errors
throw new ErrorManager.ValidationError('Patient ID is required');

// Config
const { mongoUri } = ConfigManager;

// Cache
const patient = await CacheManager.remember(`patient:${id}`, 60_000, () => Patient.findById(id));

// Request context
app.use(RequestContextManager.middleware());
```
