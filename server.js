// ==========================================
// TaskFlow - Raw Node.js HTTP Server
// ==========================================

const http = require("http");
const crypto = require("crypto");

// Load simple .env parser logic
require("./src/config/env").loadEnv();

// Import our Singleton TaskStore.
const taskStore = require("./src/store/TaskStore");

// Import Middleware Chain Components
const AuthHandler = require("./src/middleware/AuthHandler");
const PermissionHandler = require("./src/middleware/PermissionHandler");
const ValidationHandler = require("./src/middleware/ValidationHandler");

// Import Logging and Error Handling Utilities
const logger = require("./src/utils/logger");
const errorHandler = require("./src/utils/errorHandler");

// Hook up the Chain block: Auth -> Permission -> Validation
const middlewareChain = new AuthHandler();
middlewareChain
  .setNext(new PermissionHandler())
  .setNext(new ValidationHandler());

const PORT = 3000;

// ==========================================
// Global Request Context & Response Helpers
// ==========================================

// Generate unique requestId for request tracing
const generateRequestId = () => crypto.randomUUID();

// Helper function to extract JSON from an incoming stream (the request)
// This deals with asynchronous data chunks more elegantly.
const parseJSON = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        // Return an empty object if no body exists, otherwise parse it.
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
};

// ==========================================
// HTTP Request Handler with Global Error Handling
// ==========================================

const server = http.createServer(async (req, res) => {
  // Generate unique requestId for this request
  const requestId = generateRequestId();

  // Record request start time for response time calculation
  const startTime = Date.now();

  // Log incoming request
  logger.logRequest(req, requestId);

  try {
    // We can extract CORS headers if building a frontend later.
    // Setting up the base response header type.
    const sendResponse = (statusCode, data) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));

      // Log response after sending
      const responseTime = Date.now() - startTime;
      logger.logResponse(req, statusCode, responseTime, requestId);
    };

    const { method, url } = req;

    // Parse incoming JSON body for mutating requests globally
    if (method === "POST" || method === "PUT") {
      try {
        req.body = await parseJSON(req);
        logger.info("Request body parsed successfully", {
          requestId,
          bodyKeys: Object.keys(req.body),
        });
      } catch (error) {
        logger.logError(error, requestId, {
          stage: "JSON_PARSING",
          method,
          url,
        });
        const { statusCode, response } = errorHandler.invalidJsonError(
          requestId,
          error,
        );
        return sendResponse(statusCode, response);
      }
    }

    // ==========================================
    // DEMO ENDPOINTS FOR ERROR HANDLING SHOWCASE
    // ==========================================

    // Demo 1: Intentional Server Error
    if (url === "/demo/error/internal") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.logMiddleware("DemoEndpoint", "INTENTIONAL_ERROR_DEMO", requestId);
      throw new Error("Simulated internal server error for demonstration");
    }

    // Demo 2: Validation Error
    if (url === "/demo/error/validation") {
      if (method !== "POST") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.logMiddleware("DemoEndpoint", "VALIDATION_ERROR_DEMO", requestId);
      const { statusCode, response } = errorHandler.validationError(
        requestId,
        "title",
        "Title must be a non-empty string",
        {},
      );
      return sendResponse(statusCode, response);
    }

    // Demo 3: Unauthorized Error
    if (url === "/demo/error/unauthorized") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.logMiddleware("DemoEndpoint", "UNAUTHORIZED_DEMO", requestId);
      const { statusCode, response } =
        errorHandler.unauthorizedError(requestId);
      return sendResponse(statusCode, response);
    }

    // Demo 4: Forbidden Error
    if (url === "/demo/error/forbidden") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.logMiddleware("DemoEndpoint", "FORBIDDEN_DEMO", requestId);
      const { statusCode, response } = errorHandler.forbiddenError(
        requestId,
        "Only Admins can access this resource",
      );
      return sendResponse(statusCode, response);
    }

    // Demo 5: Not Found Error
    if (url === "/demo/error/notfound") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.logMiddleware("DemoEndpoint", "NOT_FOUND_DEMO", requestId);
      const { statusCode, response } = errorHandler.taskNotFoundError(
        requestId,
        "non-existent-id-12345",
      );
      return sendResponse(statusCode, response);
    }

    // Demo 6: Missing Field Error
    if (url === "/demo/error/missingfield") {
      if (method !== "POST") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.logMiddleware("DemoEndpoint", "MISSING_FIELD_DEMO", requestId);
      const { statusCode, response } = errorHandler.missingFieldError(
        requestId,
        "description",
      );
      return sendResponse(statusCode, response);
    }

    // Demo 7: Health check with request tracking
    if (url === "/health") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
      logger.info("Health check requested", { requestId });
      return sendResponse(200, {
        status: "healthy",
        timestamp: new Date().toISOString(),
        requestId,
        uptimeSeconds: process.uptime(),
      });
    }

    // ==========================================
    // TASK MANAGEMENT ENDPOINTS
    // ==========================================

    // We'll add rudimentary routing based on the start of the URL.
    if (url === "/tasks" || url.startsWith("/tasks/")) {
      // ==========================================
      // MIDDLEWARE CHAIN EXECUTION
      // ==========================================
      const chainPassed = await middlewareChain.handle(req, res, sendResponse);
      if (!chainPassed) {
        return; // A handler caught an issue, returned an HTTP error, and halted execution.
      }

      // Extract an ID if it exists in the URL (e.g., /tasks/fa21-b2c3 -> "fa21-b2c3")
      const id = url.split("/")[2];

      // ----------------------------------------------------
      // Handle GET /tasks (All) or /tasks/:id (Single, peek, queue)
      // ----------------------------------------------------
      if (method === "GET") {
        if (id === "queue") {
          logger.logTaskOperation("QUEUE_FETCH", "all", "SUCCESS", requestId, {
            queueSize: taskStore.queue.heap.length,
          });
          // Returns the raw Max-Heap array
          sendResponse(200, taskStore.queue.heap);
        } else if (id === "peek") {
          const peekedTask = taskStore.queue.peek();
          logger.logTaskOperation("PEEK", "all", "SUCCESS", requestId, {
            found: !!peekedTask,
          });
          // Returns the highest priority task without deleting it
          sendResponse(200, peekedTask || { message: "Queue is empty" });
        } else if (id) {
          const task = taskStore.getById(id);
          if (task) {
            logger.logTaskOperation("READ", id, "SUCCESS", requestId);
            sendResponse(200, task);
          } else {
            logger.warn(`Task not found attempt: ${id}`, {
              requestId,
              taskId: id,
            });
            const { statusCode, response } = errorHandler.taskNotFoundError(
              requestId,
              id,
            );
            return sendResponse(statusCode, response);
          }
        } else {
          // URL was just /tasks
          logger.logTaskOperation("LIST_ALL", "all", "SUCCESS", requestId, {
            taskCount: taskStore.tasks.size,
          });
          sendResponse(200, taskStore.getAll());
        }
      }

      // ----------------------------------------------------
      // Handle POST /tasks (Create)
      // ----------------------------------------------------
      else if (method === "POST") {
        try {
          // Validate required fields
          if (!req.body.title) {
            const { statusCode, response } = errorHandler.missingFieldError(
              requestId,
              "title",
            );
            return sendResponse(statusCode, response);
          }

          const newTask = taskStore.create(req.body);
          logger.logTaskOperation("CREATE", newTask.id, "SUCCESS", requestId, {
            title: req.body.title,
          });
          sendResponse(201, newTask);
        } catch (err) {
          logger.logError(err, requestId, {
            stage: "TASK_CREATE",
            method,
            url,
          });
          const { statusCode, response } = errorHandler.internalError(
            requestId,
            err.message,
            err.stack,
          );
          return sendResponse(statusCode, response);
        }
      }

      // ----------------------------------------------------
      // Handle PUT /tasks/:id (Update)
      // ----------------------------------------------------
      else if (method === "PUT" && id) {
        try {
          const updatedTask = taskStore.update(id, req.body);

          if (updatedTask) {
            logger.logTaskOperation("UPDATE", id, "SUCCESS", requestId);
            sendResponse(200, updatedTask);
          } else {
            logger.warn(`Task update failed - not found: ${id}`, {
              requestId,
              taskId: id,
            });
            const { statusCode, response } = errorHandler.taskNotFoundError(
              requestId,
              id,
            );
            return sendResponse(statusCode, response);
          }
        } catch (err) {
          logger.logError(err, requestId, { stage: "TASK_UPDATE", taskId: id });
          const { statusCode, response } = errorHandler.internalError(
            requestId,
            err.message,
            err.stack,
          );
          return sendResponse(statusCode, response);
        }
      }

      // ----------------------------------------------------
      // Handle DELETE /tasks/:id (Delete)
      // ----------------------------------------------------
      else if (method === "DELETE" && id) {
        try {
          // Memory efficient O(1) delete execution
          const success = taskStore.delete(id);

          if (success) {
            logger.logTaskOperation("DELETE", id, "SUCCESS", requestId);
            // 204 No Content is standard for successful deletions where no body is returned.
            res.writeHead(204);
            res.end();

            // Log response after sending
            const responseTime = Date.now() - startTime;
            logger.logResponse(req, 204, responseTime, requestId);
          } else {
            logger.warn(`Task delete failed - not found: ${id}`, {
              requestId,
              taskId: id,
            });
            const { statusCode, response } = errorHandler.taskNotFoundError(
              requestId,
              id,
            );
            return sendResponse(statusCode, response);
          }
        } catch (err) {
          logger.logError(err, requestId, { stage: "TASK_DELETE", taskId: id });
          const { statusCode, response } = errorHandler.internalError(
            requestId,
            err.message,
            err.stack,
          );
          return sendResponse(statusCode, response);
        }
      }

      // ----------------------------------------------------
      // Method Not Allowed
      // ----------------------------------------------------
      else {
        logger.warn(`Method not allowed: ${method} ${url}`, {
          requestId,
          method,
          url,
        });
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          url,
        );
        return sendResponse(statusCode, response);
      }
    }
    // ----------------------------------------------------
    // Fallback URL router
    // ----------------------------------------------------
    else {
      logger.warn(`Route not found: ${method} ${url}`, {
        requestId,
        method,
        url,
      });
      const { statusCode, response } = errorHandler.createErrorResponse(
        errorHandler.ErrorCodes.NOT_FOUND,
        "Endpoint not found",
        requestId,
        { url, method },
      );
      return sendResponse(statusCode, response);
    }
  } catch (error) {
    // ==========================================
    // GLOBAL ERROR CATCH BLOCK
    // ==========================================
    logger.logError(error, requestId, {
      stage: "UNHANDLED_ERROR",
      url: req.url,
      method: req.method,
    });

    // Send standardized error response
    const { statusCode, response } = errorHandler.internalError(
      requestId,
      error.message,
      error.stack,
    );

    // Safely send response (may fail if response already started)
    try {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response));

      const responseTime = Date.now() - startTime;
      logger.logResponse(req, statusCode, responseTime, requestId);
    } catch (resError) {
      logger.error("Failed to send error response", {
        requestId,
        originalError: error.message,
        responseError: resError.message,
      });
    }
  }
});

// ==========================================
// Server Startup

// ==========================================
// Server Startup
// ==========================================

server.listen(PORT, () => {
  logger.info("TaskFlow server started successfully", {
    port: PORT,
    url: `http://localhost:${PORT}`,
    environment: process.env.NODE_ENV || "development",
  });
  logger.info("Listening for requests... (Press Ctrl+C to stop)", {});
});

// Graceful shutdown on process termination
process.on("SIGINT", () => {
  logger.info("Shutdown signal received (SIGINT)", {});
  server.close(() => {
    logger.info("Server closed cleanly", {});
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  logger.info("Shutdown signal received (SIGTERM)", {});
  server.close(() => {
    logger.info("Server closed cleanly", {});
    process.exit(0);
  });
});
