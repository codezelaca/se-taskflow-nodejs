// ==========================================
// Error Handler Utility - Standardized Error Responses
// ==========================================
// This provides:
// - Consistent error response shape across all endpoints
// - Machine-readable error codes
// - Structured error details
// - Request correlation via requestId
// - Best practices for API error contracts

class ErrorHandler {
  constructor() {
    // Standard HTTP-aligned error codes
    this.ErrorCodes = {
      // Client errors (4xx)
      BAD_REQUEST: "BAD_REQUEST",
      VALIDATION_ERROR: "VALIDATION_ERROR",
      UNAUTHORIZED: "UNAUTHORIZED",
      FORBIDDEN: "FORBIDDEN",
      NOT_FOUND: "NOT_FOUND",
      CONFLICT: "CONFLICT",
      UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",

      // Server errors (5xx)
      INTERNAL_ERROR: "INTERNAL_ERROR",
      NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
      SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

      // Application-specific errors
      INVALID_JSON: "INVALID_JSON",
      MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
      INVALID_TOKEN: "INVALID_TOKEN",
      INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
      TASK_NOT_FOUND: "TASK_NOT_FOUND",
    };

    // Map error codes to HTTP status codes
    this.StatusCodeMap = {
      [this.ErrorCodes.BAD_REQUEST]: 400,
      [this.ErrorCodes.VALIDATION_ERROR]: 422,
      [this.ErrorCodes.UNAUTHORIZED]: 401,
      [this.ErrorCodes.FORBIDDEN]: 403,
      [this.ErrorCodes.NOT_FOUND]: 404,
      [this.ErrorCodes.CONFLICT]: 409,
      [this.ErrorCodes.UNPROCESSABLE_ENTITY]: 422,
      [this.ErrorCodes.INTERNAL_ERROR]: 500,
      [this.ErrorCodes.NOT_IMPLEMENTED]: 501,
      [this.ErrorCodes.SERVICE_UNAVAILABLE]: 503,
      [this.ErrorCodes.INVALID_JSON]: 400,
      [this.ErrorCodes.MISSING_REQUIRED_FIELD]: 422,
      [this.ErrorCodes.INVALID_TOKEN]: 401,
      [this.ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
      [this.ErrorCodes.TASK_NOT_FOUND]: 404,
    };
  }

  /**
   * Create a standardized error response
   * @param {string} code - Machine-readable error code
   * @param {string} message - Human-readable error message
   * @param {string} requestId - Request correlation ID
   * @param {object} details - Optional additional context
   * @returns {object} Standardized error object
   */
  createErrorResponse(code, message, requestId, details = {}) {
    return {
      error: {
        code,
        message,
        requestId,
        timestamp: new Date().toISOString(),
        ...(Object.keys(details).length > 0 && { details }),
      },
    };
  }

  /**
   * Get HTTP status code for a given error code
   */
  getStatusCode(code) {
    return this.StatusCodeMap[code] || 500;
  }

  /**
   * Validation error - missing or invalid fields
   */
  validationError(requestId, fieldName, reason, details = {}) {
    return {
      statusCode: 422,
      response: this.createErrorResponse(
        this.ErrorCodes.VALIDATION_ERROR,
        `Validation failed for field: ${fieldName}. Reason: ${reason}`,
        requestId,
        { field: fieldName, reason, ...details },
      ),
    };
  }

  /**
   * Invalid JSON payload
   */
  invalidJsonError(requestId, parseError) {
    return {
      statusCode: 400,
      response: this.createErrorResponse(
        this.ErrorCodes.INVALID_JSON,
        "Request body contains invalid JSON",
        requestId,
        { parseError: parseError.message },
      ),
    };
  }

  /**
   * Authentication error - invalid or missing token
   */
  unauthorizedError(
    requestId,
    reason = "Missing or invalid authentication token",
  ) {
    return {
      statusCode: 401,
      response: this.createErrorResponse(
        this.ErrorCodes.INVALID_TOKEN,
        reason,
        requestId,
      ),
    };
  }

  /**
   * Authorization error - user lacks permission
   */
  forbiddenError(
    requestId,
    reason = "You do not have permission to access this resource",
  ) {
    return {
      statusCode: 403,
      response: this.createErrorResponse(
        this.ErrorCodes.INSUFFICIENT_PERMISSIONS,
        reason,
        requestId,
      ),
    };
  }

  /**
   * Resource not found
   */
  notFoundError(requestId, resource, id) {
    return {
      statusCode: 404,
      response: this.createErrorResponse(
        this.ErrorCodes.NOT_FOUND,
        `${resource} with ID "${id}" not found`,
        requestId,
        { resource, id },
      ),
    };
  }

  /**
   * Generic internal server error
   */
  internalError(requestId, errorMessage, stack) {
    // In production, you might not want to expose the stack trace to clients
    return {
      statusCode: 500,
      response: this.createErrorResponse(
        this.ErrorCodes.INTERNAL_ERROR,
        "An unexpected error occurred. Please try again later.",
        requestId,
        { internalMessage: errorMessage },
        // Note: Stack trace is NOT included in client response
        // but logged separately for debugging
      ),
    };
  }

  /**
   * Method not allowed
   */
  methodNotAllowedError(requestId, method, endpoint) {
    return {
      statusCode: 405,
      response: this.createErrorResponse(
        this.ErrorCodes.BAD_REQUEST,
        `Method ${method} is not allowed on this endpoint`,
        requestId,
        { method, endpoint },
      ),
    };
  }

  /**
   * Missing required field
   */
  missingFieldError(requestId, fieldName) {
    return {
      statusCode: 422,
      response: this.createErrorResponse(
        this.ErrorCodes.MISSING_REQUIRED_FIELD,
        `Missing required field: ${fieldName}`,
        requestId,
        { field: fieldName },
      ),
    };
  }

  /**
   * Task-specific not found (convenience method)
   */
  taskNotFoundError(requestId, taskId) {
    return this.notFoundError(requestId, "Task", taskId);
  }

  /**
   * Generic bad request error
   */
  badRequestError(requestId, reason) {
    return {
      statusCode: 400,
      response: this.createErrorResponse(
        this.ErrorCodes.BAD_REQUEST,
        reason,
        requestId,
      ),
    };
  }

  /**
   * Parse an error and return appropriate response
   * Useful for middleware that needs to handle various error types
   */
  handleUnknownError(requestId, error, context = {}) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "An unexpected error occurred";

    return {
      statusCode,
      response: this.createErrorResponse(
        this.ErrorCodes.INTERNAL_ERROR,
        message,
        requestId,
        { context },
      ),
    };
  }
}

// Export singleton instance
module.exports = new ErrorHandler();
