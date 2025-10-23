/**
 * AuditManager
 * Append-only audit logs for sensitive actions (HIPAA compliance).
 */
const fs = require('fs');
const path = require('path');
const auditLogPath = path.join(__dirname, '../../../logs/audit.log');

const AuditManager = {
  log(action, user, details = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      user: user?.id || 'system',
      details,
    };
    fs.appendFileSync(auditLogPath, JSON.stringify(entry) + '\n');
  },
};

module.exports = AuditManager;