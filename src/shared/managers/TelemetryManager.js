/**
 * TelemetryManager
 * Metrics, tracing, and logging abstraction (OpenTelemetry ready).
 */
const TelemetryManager = {
  recordMetric(name, value, tags = {}) {
    // Integrate with Prometheus, OpenTelemetry, etc.
    console.log(`[metric] ${name} = ${value}`, tags);
  },
  trace(name, fn) {
    const start = Date.now();
    try {
      const result = fn();
      this.recordMetric(`${name}.durationMs`, Date.now() - start);
      return result;
    } catch (err) {
      this.recordMetric(`${name}.error`, 1);
      throw err;
    }
  },
};

module.exports = TelemetryManager;