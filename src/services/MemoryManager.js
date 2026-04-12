const DEFAULT_HISTORY_LIMIT = 500;
const DEFAULT_CACHE_LIMIT = 100;
const DEFAULT_LEAK_BATCH_LIMIT = 100;
const DEFAULT_CLEANUP_INTERVAL_MS = 60000;

// MemoryManager keeps debug data bounded so demos stay stable.
class MemoryManager {
  constructor(options = {}) {
    this.requestHistoryLimit =
      options.requestHistoryLimit || DEFAULT_HISTORY_LIMIT;
    this.eventHistoryLimit = options.eventHistoryLimit || DEFAULT_HISTORY_LIMIT;
    this.safeCacheLimit = options.safeCacheLimit || DEFAULT_CACHE_LIMIT;
    this.leakBatchLimit = options.leakBatchLimit || DEFAULT_LEAK_BATCH_LIMIT;
    this.cleanupIntervalMs =
      options.cleanupIntervalMs || DEFAULT_CLEANUP_INTERVAL_MS;

    this.requestHistory = [];
    this.eventHistory = [];
    this.safeCache = [];
    this.intentionalLeakCache = [];
    this.cleanupTimer = null;

    // Start periodic cleanup immediately after initialization.
    this.startCleanupLoop();
  }

  trimToLimit(collection, limit) {
    // Keep only the newest entries when limit is exceeded.
    if (collection.length > limit) {
      collection.splice(0, collection.length - limit);
    }
  }

  createSnapshot(label, details = {}) {
    return {
      label,
      timestamp: new Date().toISOString(),
      process: process.memoryUsage(),
      ...details,
    };
  }

  recordRequest(entry) {
    this.requestHistory.push({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    this.trimToLimit(this.requestHistory, this.requestHistoryLimit);
  }

  recordEvent(entry) {
    this.eventHistory.push({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    this.trimToLimit(this.eventHistory, this.eventHistoryLimit);
  }

  addToSafeCache(payload) {
    this.safeCache.push({
      timestamp: new Date().toISOString(),
      payload,
    });
    this.trimToLimit(this.safeCache, this.safeCacheLimit);
  }

  addToLeakCache(payload) {
    // Leak cache intentionally keeps much more data for learning demos.
    this.intentionalLeakCache.push({
      timestamp: new Date().toISOString(),
      payload,
    });
    this.trimToLimit(this.intentionalLeakCache, this.leakBatchLimit * 10);
  }

  generateLargePayload(sizeKb) {
    // Create a predictable string payload by size in kilobytes.
    const targetSize = Math.max(1, Number(sizeKb) || 1) * 1024;
    return "x".repeat(targetSize);
  }

  createLeakBatch(count, sizeKb) {
    const safeCount = Math.min(
      Math.max(1, Number(count) || 1),
      this.leakBatchLimit,
    );
    const payload = this.generateLargePayload(sizeKb);

    for (let i = 0; i < safeCount; i += 1) {
      this.addToLeakCache({
        id: `leak-${Date.now()}-${i}`,
        blob: payload + i,
      });
    }

    return this.getStats();
  }

  createSafeBatch(count, sizeKb) {
    const safeCount = Math.min(
      Math.max(1, Number(count) || 1),
      this.leakBatchLimit,
    );
    const payload = this.generateLargePayload(sizeKb);

    for (let i = 0; i < safeCount; i += 1) {
      this.addToSafeCache({
        id: `safe-${Date.now()}-${i}`,
        blob: payload + i,
      });
    }

    return this.getStats();
  }

  clearLeakCache() {
    // Reset both caches to quickly recover memory during demos.
    this.intentionalLeakCache = [];
    this.safeCache = [];
    return this.getStats();
  }

  cleanup() {
    this.trimToLimit(this.requestHistory, this.requestHistoryLimit);
    this.trimToLimit(this.eventHistory, this.eventHistoryLimit);
    this.trimToLimit(this.safeCache, this.safeCacheLimit);
  }

  startCleanupLoop() {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(
      () => this.cleanup(),
      this.cleanupIntervalMs,
    );
    // unref lets Node exit even if only this timer is active.
    this.cleanupTimer.unref();
  }

  stopCleanupLoop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getStats() {
    const memory = process.memoryUsage();

    return {
      memory,
      requestHistorySize: this.requestHistory.length,
      eventHistorySize: this.eventHistory.length,
      safeCacheSize: this.safeCache.length,
      intentionalLeakCacheSize: this.intentionalLeakCache.length,
      requestHistoryLimit: this.requestHistoryLimit,
      eventHistoryLimit: this.eventHistoryLimit,
      safeCacheLimit: this.safeCacheLimit,
      leakBatchLimit: this.leakBatchLimit,
      uptimeSeconds: Number(process.uptime().toFixed(2)),
    };
  }
}

module.exports = MemoryManager;
