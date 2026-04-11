// ==========================================
// Logger Utility - Structured Logging
// ==========================================
// This logger provides:
// - Consistent log levels (info, warn, error)
// - Request-level requestId tracking
// - Response time measurement
// - Machine-readable JSON format for production systems
// - Human-readable console output for development

class Logger {
  constructor() {
    this.LogLevel = {
      INFO: "INFO",
      WARN: "WARN",
      ERROR: "ERROR",
    };
  }

  // Generate timestamp in ISO format
  getTimestamp() {
    return new Date().toISOString();
  }

  // Format log entry with all necessary metadata
  formatLog(level, message, metadata = {}) {
    return {
      timestamp: this.getTimestamp(),
      level,
      message,
      ...metadata,
    };
  }

  // Print to console with color coding based on level
  print(level, message, metadata = {}) {
    const log = this.formatLog(level, message, metadata);

    const colorCodes = {
      INFO: "\x1b[36m", // Cyan
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
    };

    const resetCode = "\x1b[0m";
    const color = colorCodes[level] || "";

    console.log(`${color}[${log.timestamp}] [${level}]${resetCode}`, message);

    // Print metadata if it exists
    if (Object.keys(metadata).length > 0) {
      console.log("  Metadata:", JSON.stringify(metadata, null, 2));
    }
  }

  // INFO level - normal operations, non-breaking events
  info(message, metadata = {}) {
    this.print(this.LogLevel.INFO, message, metadata);
  }

  // WARN level - potentially problematic situations, recoverable issues
  warn(message, metadata = {}) {
    this.print(this.LogLevel.WARN, message, metadata);
  }

  // ERROR level - failures, exceptions, system errors
  error(message, metadata = {}) {
    this.print(this.LogLevel.ERROR, message, metadata);
  }

  // Log incoming HTTP request
  logRequest(req, requestId) {
    const metadata = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    this.info(`Incoming Request: ${req.method} ${req.url}`, metadata);
  }

  // Log outgoing HTTP response with timing
  logResponse(req, statusCode, responseTime, requestId) {
    const metadata = {
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      responseTimeMs: responseTime,
    };

    const level = statusCode >= 400 ? this.LogLevel.WARN : this.LogLevel.INFO;
    this.print(
      level,
      `Response Sent: ${req.method} ${req.url} -> ${statusCode}`,
      metadata,
    );
  }

  // Log middleware progression
  logMiddleware(name, status, requestId, details = {}) {
    const metadata = {
      requestId,
      middleware: name,
      status,
      ...details,
    };

    this.info(`Middleware: ${name} (${status})`, metadata);
  }

  // Log error with full context
  logError(error, requestId, context = {}) {
    const metadata = {
      requestId,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    };

    this.error(`Exception Caught: ${error.message}`, metadata);
  }

  // Structured log for task operations
  logTaskOperation(operation, taskId, status, requestId, details = {}) {
    const metadata = {
      requestId,
      operation,
      taskId,
      status,
      ...details,
    };

    this.info(`Task Operation: ${operation} on ${taskId}`, metadata);
  }
}

// Export singleton instance
module.exports = new Logger();
