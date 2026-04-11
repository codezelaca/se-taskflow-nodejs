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
const WorkerPool = require("./src/services/WorkerPool");

// Import Logging and Error Handling Utilities
const logger = require("./src/utils/logger");
const errorHandler = require("./src/utils/errorHandler");

// Hook up the Chain block: Auth -> Permission -> Validation
const middlewareChain = new AuthHandler();
middlewareChain
  .setNext(new PermissionHandler())
  .setNext(new ValidationHandler());

const PORT = 3000;
const DEFAULT_CPU_ITERATIONS = 120000000;

const workerPool = new WorkerPool({
  poolSize: Number(process.env.WORKER_POOL_SIZE) || undefined,
  maxQueueSize: Number(process.env.WORKER_QUEUE_LIMIT) || 100,
  jobTimeoutMs: Number(process.env.WORKER_JOB_TIMEOUT_MS) || 30000,
});

// ==========================================
// Global Request Context & Response Helpers
// ==========================================

// Generate unique requestId for request tracing
const generateRequestId = () => crypto.randomUUID();

const toPositiveIterations = (rawValue, fallback = DEFAULT_CPU_ITERATIONS) => {
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.floor(parsedValue);
};

const runBlockingCpuDemo = (iterations) => {
  const startedAt = Date.now();
  let accumulator = 0;

  // This intentionally blocks the main thread for demonstration.
  for (let i = 0; i < iterations; i += 1) {
    accumulator += Math.sqrt((i % 1000) + 1) * Math.sin(i % 360);
  }

  return {
    result: Number(accumulator.toFixed(4)),
    durationMs: Date.now() - startedAt,
  };
};

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
    const parsedUrl = new URL(url, "http://localhost");
    const pathname = parsedUrl.pathname;

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
    if (pathname === "/demo/error/internal") {
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
    if (pathname === "/demo/error/validation") {
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
    if (pathname === "/demo/error/unauthorized") {
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
    if (pathname === "/demo/error/forbidden") {
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
    if (pathname === "/demo/error/notfound") {
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
    if (pathname === "/demo/error/missingfield") {
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
    if (pathname === "/health") {
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
    // CPU DEMOS: EVENT LOOP BLOCKING VS WORKERS
    // ==========================================

    if (pathname === "/demo/cpu/ping") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      return sendResponse(200, {
        message: "pong",
        requestId,
        timestamp: new Date().toISOString(),
      });
    }

    if (pathname === "/demo/cpu/blocking") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const iterations = toPositiveIterations(
        parsedUrl.searchParams.get("iterations"),
      );

      logger.info("Running blocking CPU demo on main thread", {
        requestId,
        iterations,
        mode: "blocking-main-thread",
      });

      const output = runBlockingCpuDemo(iterations);

      return sendResponse(200, {
        mode: "blocking-main-thread",
        requestId,
        iterations,
        ...output,
      });
    }

    if (pathname === "/demo/cpu/worker/run") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const iterations = toPositiveIterations(
        parsedUrl.searchParams.get("iterations"),
      );

      logger.info("Running CPU demo on worker thread", {
        requestId,
        iterations,
        mode: "worker-thread-await",
      });

      let jobId;
      let completionPromise;

      try {
        ({ jobId, completionPromise } = workerPool.submitCpuJob(iterations));
      } catch (submitError) {
        const isQueueError = submitError.message.includes("queue is full");
        const statusCode = isQueueError ? 503 : 400;
        const response = errorHandler.createErrorResponse(
          isQueueError
            ? errorHandler.ErrorCodes.SERVICE_UNAVAILABLE
            : errorHandler.ErrorCodes.BAD_REQUEST,
          submitError.message,
          requestId,
        );
        return sendResponse(statusCode, response);
      }

      const output = await completionPromise;

      return sendResponse(200, {
        mode: "worker-thread-await",
        requestId,
        jobId,
        ...output,
      });
    }

    if (pathname === "/demo/cpu/worker/start") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const iterations = toPositiveIterations(
        parsedUrl.searchParams.get("iterations"),
      );
      let jobId;
      try {
        ({ jobId } = workerPool.submitCpuJob(iterations));
      } catch (submitError) {
        const isQueueError = submitError.message.includes("queue is full");
        const statusCode = isQueueError ? 503 : 400;
        const response = errorHandler.createErrorResponse(
          isQueueError
            ? errorHandler.ErrorCodes.SERVICE_UNAVAILABLE
            : errorHandler.ErrorCodes.BAD_REQUEST,
          submitError.message,
          requestId,
        );
        return sendResponse(statusCode, response);
      }

      logger.info("Queued CPU worker job", {
        requestId,
        jobId,
        iterations,
      });

      return sendResponse(202, {
        message: "Worker job accepted",
        requestId,
        jobId,
        statusPath: `/demo/cpu/worker/jobs/${jobId}`,
      });
    }

    if (pathname.startsWith("/demo/cpu/worker/jobs/")) {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const jobId = pathname.split("/").pop();
      const job = workerPool.getJob(jobId);
      if (!job) {
        const { statusCode, response } = errorHandler.notFoundError(
          requestId,
          "Worker job",
          jobId,
        );
        return sendResponse(statusCode, response);
      }

      return sendResponse(200, {
        requestId,
        ...job,
      });
    }

    if (pathname === "/demo/cpu/worker/stats") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      return sendResponse(200, {
        requestId,
        ...workerPool.getStats(),
      });
    }

    // ==========================================
    // TASK MANAGEMENT ENDPOINTS
    // ==========================================

    // We'll add rudimentary routing based on the start of the URL.
    if (pathname === "/tasks" || pathname.startsWith("/tasks/")) {
      // ==========================================
      // MIDDLEWARE CHAIN EXECUTION
      // ==========================================
      const chainPassed = await middlewareChain.handle(req, res, sendResponse);
      if (!chainPassed) {
        return; // A handler caught an issue, returned an HTTP error, and halted execution.
      }

      // Extract an ID if it exists in the URL (e.g., /tasks/fa21-b2c3 -> "fa21-b2c3")
      const id = pathname.split("/")[2];

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
      const statusCode = errorHandler.getStatusCode(
        errorHandler.ErrorCodes.NOT_FOUND,
      );
      const response = errorHandler.createErrorResponse(
        errorHandler.ErrorCodes.NOT_FOUND,
        "Endpoint not found",
        requestId,
        { url: pathname, method },
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
  server.close(async () => {
    await workerPool.shutdown();
    logger.info("Server closed cleanly", {});
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  logger.info("Shutdown signal received (SIGTERM)", {});
  server.close(async () => {
    await workerPool.shutdown();
    logger.info("Server closed cleanly", {});
    process.exit(0);
  });
});
