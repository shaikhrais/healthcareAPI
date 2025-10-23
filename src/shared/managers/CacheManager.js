/**
 * CacheManager
 * Simple in-memory cache with TTL and pluggable adapters (Redis-ready).
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlMs) {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  del(key) {
    this.store.delete(key);
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.store.clear();
  }
}

class CacheManager {
  constructor(adapter = new MemoryCache()) {
    this.adapter = adapter;
  }

  set(key, value, ttlMs) {
    return this.adapter.set(key, value, ttlMs);
  }

  get(key, fallback) {
    const v = this.adapter.get(key);
    return v === undefined ? fallback : v;
  }

  async remember(key, ttlMs, producer) {
    const cached = this.adapter.get(key);
    if (cached !== undefined) return cached;
    const value = await producer();
    this.adapter.set(key, value, ttlMs);
    return value;
  }

  del(key) {
    return this.adapter.del(key);
  }

  clear() {
    return this.adapter.clear();
  }
}

module.exports = new CacheManager();
