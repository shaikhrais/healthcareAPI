/**
 * RequestContextManager
 * Per-request context store (correlationId, user, tenant) using AsyncLocalStorage.
 */
const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID } = require('crypto');

const als = new AsyncLocalStorage();

const RequestContextManager = {
  run(initial = {}, fn) {
    const base = { correlationId: randomUUID(), ...initial };
    return als.run(base, fn);
  },
  get(key) {
    const store = als.getStore();
    if (!store) return undefined;
    return key ? store[key] : store;
  },
  set(key, value) {
    const store = als.getStore();
    if (store) store[key] = value;
  },
  middleware() {
    return (req, _res, next) => {
      const correlationId = req.headers['x-correlation-id'] || randomUUID();
      als.run({ correlationId, user: req.user, tenant: req.headers['x-tenant-id'] }, () => next());
    };
  },
};

module.exports = RequestContextManager;
