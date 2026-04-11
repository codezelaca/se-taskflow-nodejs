// ==========================================
// TaskFlow - Raw Node.js HTTP Server
// ==========================================

const http = require("http");
const crypto = require("crypto");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

// Load simple .env parser logic
require("./src/config/env").loadEnv();

// Import our Singleton TaskStore.
const taskStore = require("./src/store/TaskStore");

// Import Middleware Chain Components
const AuthHandler = require("./src/middleware/AuthHandler");
const PermissionHandler = require("./src/middleware/PermissionHandler");
const ValidationHandler = require("./src/middleware/ValidationHandler");
const WorkerPool = require("./src/services/WorkerPool");
const MemoryManager = require("./src/services/MemoryManager");
const WebSocketHub = require("./src/services/WebSocketHub");

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
const DEFAULT_STREAM_DEMO_COUNT = 50000;
const MAX_STREAM_DEMO_COUNT = 300000;

const workerPool = new WorkerPool({
  poolSize: Number(process.env.WORKER_POOL_SIZE) || undefined,
  maxQueueSize: Number(process.env.WORKER_QUEUE_LIMIT) || 100,
  jobTimeoutMs: Number(process.env.WORKER_JOB_TIMEOUT_MS) || 30000,
});

const memoryManager = new MemoryManager({
  requestHistoryLimit: Number(process.env.MEMORY_REQUEST_HISTORY_LIMIT) || 500,
  eventHistoryLimit: Number(process.env.MEMORY_EVENT_HISTORY_LIMIT) || 500,
  safeCacheLimit: Number(process.env.MEMORY_SAFE_CACHE_LIMIT) || 100,
  leakBatchLimit: Number(process.env.MEMORY_LEAK_BATCH_LIMIT) || 100,
  cleanupIntervalMs: Number(process.env.MEMORY_CLEANUP_INTERVAL_MS) || 60000,
});

const webSocketHub = new WebSocketHub({
  path: "/ws/tasks",
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

const toPositiveBoundedCount = (
  rawValue,
  fallback = DEFAULT_STREAM_DEMO_COUNT,
  max = MAX_STREAM_DEMO_COUNT,
) => {
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsedValue), max);
};

const toSerializableTask = (task) => ({
  ...task,
  dependencies:
    task.dependencies && typeof task.dependencies.toArray === "function"
      ? task.dependencies.toArray()
      : Array.isArray(task.dependencies)
        ? task.dependencies
        : [],
});

const escapeCsvCell = (value) => {
  const stringified = String(value ?? "");
  const escaped = stringified.replace(/"/g, '""');
  return `"${escaped}"`;
};

const createTaskCsvReadable = (taskIterable) =>
  Readable.from(
    (async function* generateCsv() {
      yield "id,title,description,status,priority,dependencies,createdAt,updatedAt\n";

      for (const task of taskIterable) {
        const normalized = toSerializableTask(task);
        const row = [
          normalized.id,
          normalized.title,
          normalized.description,
          normalized.status,
          normalized.priority,
          JSON.stringify(normalized.dependencies),
          normalized.createdAt,
          normalized.updatedAt,
        ]
          .map(escapeCsvCell)
          .join(",");

        yield `${row}\n`;
      }
    })(),
  );

const createTaskNdjsonReadable = (taskIterable) =>
  Readable.from(
    (async function* generateNdjson() {
      for (const task of taskIterable) {
        yield `${JSON.stringify(toSerializableTask(task))}\n`;
      }
    })(),
  );

const createSyntheticTaskIterable = (count) => ({
  *[Symbol.iterator]() {
    const baseTime = Date.now();
    for (let i = 1; i <= count; i += 1) {
      const timestamp = new Date(baseTime - i * 1000).toISOString();
      yield {
        id: `demo-task-${i}`,
        title: `Synthetic Task ${i}`,
        description: `Generated row ${i} for stream performance demo`,
        status:
          i % 3 === 0 ? "completed" : i % 2 === 0 ? "in-progress" : "pending",
        priority: (i % 5) + 1,
        dependencies: i % 10 === 0 ? [`demo-task-${Math.max(1, i - 1)}`] : [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }
  },
});

const streamToResponse = async ({
  req,
  res,
  requestId,
  startTime,
  pathname,
  contentType,
  contentDisposition,
  source,
}) => {
  const streamState = { aborted: false };

  const markAborted = () => {
    streamState.aborted = true;
    source.destroy();
  };

  req.on("aborted", markAborted);
  res.on("close", markAborted);

  try {
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    };

    if (contentDisposition) {
      headers["Content-Disposition"] = contentDisposition;
    }

    res.writeHead(200, headers);
    await pipeline(source, res);

    const responseTime = Date.now() - startTime;
    logger.logResponse(req, 200, responseTime, requestId);
    memoryManager.recordRequest({
      requestId,
      method: req.method,
      url: req.url,
      pathname,
      statusCode: 200,
      responseTimeMs: responseTime,
    });
  } catch (error) {
    if (streamState.aborted) {
      logger.warn("Client disconnected during stream", {
        requestId,
        pathname,
      });
      return;
    }

    throw error;
  } finally {
    req.off("aborted", markAborted);
    res.off("close", markAborted);
  }
};

const getMemoryUsagePayload = (requestId, label, details = {}) => ({
  requestId,
  label,
  timestamp: new Date().toISOString(),
  ...memoryManager.createSnapshot(label, details),
});

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
      memoryManager.recordRequest({
        requestId,
        method,
        url,
        pathname,
        statusCode,
        responseTimeMs: responseTime,
      });
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
    // MEMORY MANAGEMENT DEMOS
    // ==========================================

    if (pathname === "/demo/memory/usage") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      return sendResponse(
        200,
        getMemoryUsagePayload(requestId, "memory-usage"),
      );
    }

    if (pathname === "/demo/memory/stats") {
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
        ...memoryManager.getStats(),
      });
    }

    if (pathname === "/demo/memory/leak") {
      if (method !== "POST") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const count = toPositiveBoundedCount(
        parsedUrl.searchParams.get("count"),
        1000,
        10000,
      );
      const sizeKb = toPositiveBoundedCount(
        parsedUrl.searchParams.get("sizeKb"),
        8,
        128,
      );
      const stats = memoryManager.createLeakBatch(count, sizeKb);

      logger.warn("Intentional memory leak batch created", {
        requestId,
        count,
        sizeKb,
      });

      return sendResponse(201, {
        requestId,
        mode: "intentional-leak",
        count,
        sizeKb,
        ...stats,
      });
    }

    if (pathname === "/demo/memory/safe") {
      if (method !== "POST") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const count = toPositiveBoundedCount(
        parsedUrl.searchParams.get("count"),
        1000,
        10000,
      );
      const sizeKb = toPositiveBoundedCount(
        parsedUrl.searchParams.get("sizeKb"),
        8,
        128,
      );
      const stats = memoryManager.createSafeBatch(count, sizeKb);

      logger.info("Bounded memory batch created", {
        requestId,
        count,
        sizeKb,
      });

      return sendResponse(201, {
        requestId,
        mode: "bounded-cache",
        count,
        sizeKb,
        ...stats,
      });
    }

    if (pathname === "/demo/memory/clear") {
      if (method !== "POST") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const stats = memoryManager.clearLeakCache();
      logger.info("Memory demo caches cleared", { requestId });

      return sendResponse(200, {
        requestId,
        mode: "cleared",
        ...stats,
      });
    }

    if (pathname === "/demo/ws/stats") {
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
        ...webSocketHub.getStats(),
      });
    }

    // ==========================================
    // STREAMING DEMOS: CSV & NDJSON
    // ==========================================

    if (pathname === "/demo/stream/csv") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const count = toPositiveBoundedCount(parsedUrl.searchParams.get("count"));
      const iterable = createSyntheticTaskIterable(count);
      const source = createTaskCsvReadable(iterable);

      logger.info("Starting synthetic CSV stream demo", {
        requestId,
        count,
      });

      await streamToResponse({
        req,
        res,
        requestId,
        startTime,
        pathname,
        contentType: "text/csv; charset=utf-8",
        contentDisposition: `attachment; filename=demo-stream-${count}.csv`,
        source,
      });
      return;
    }

    if (pathname === "/demo/stream/ndjson") {
      if (method !== "GET") {
        const { statusCode, response } = errorHandler.methodNotAllowedError(
          requestId,
          method,
          pathname,
        );
        return sendResponse(statusCode, response);
      }

      const count = toPositiveBoundedCount(parsedUrl.searchParams.get("count"));
      const iterable = createSyntheticTaskIterable(count);
      const source = createTaskNdjsonReadable(iterable);

      logger.info("Starting synthetic NDJSON stream demo", {
        requestId,
        count,
      });

      await streamToResponse({
        req,
        res,
        requestId,
        startTime,
        pathname,
        contentType: "application/x-ndjson; charset=utf-8",
        source,
      });
      return;
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
        if (id === "export.csv") {
          logger.info("Starting tasks CSV export stream", {
            requestId,
            taskCount: taskStore.tasks.size,
          });

          const source = createTaskCsvReadable(taskStore.tasks.values());

          await streamToResponse({
            req,
            res,
            requestId,
            startTime,
            pathname,
            contentType: "text/csv; charset=utf-8",
            contentDisposition: "attachment; filename=tasks-export.csv",
            source,
          });
          return;
        }

        if (id === "stream.ndjson") {
          logger.info("Starting tasks NDJSON stream", {
            requestId,
            taskCount: taskStore.tasks.size,
          });

          const source = createTaskNdjsonReadable(taskStore.tasks.values());

          await streamToResponse({
            req,
            res,
            requestId,
            startTime,
            pathname,
            contentType: "application/x-ndjson; charset=utf-8",
            source,
          });
          return;
        }

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
          memoryManager.recordEvent({
            type: "task.created",
            taskId: newTask.id,
            requestId,
          });
          webSocketHub.broadcastTaskEvent("task.created", newTask, requestId);
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
            memoryManager.recordEvent({
              type: "task.updated",
              taskId: id,
              requestId,
            });
            webSocketHub.broadcastTaskEvent(
              "task.updated",
              updatedTask,
              requestId,
            );
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
            memoryManager.recordEvent({
              type: "task.deleted",
              taskId: id,
              requestId,
            });
            webSocketHub.broadcastTaskEvent("task.deleted", { id }, requestId);
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

server.on("upgrade", (req, socket, head) => {
  try {
    const parsedUrl = new URL(req.url, "http://localhost");
    webSocketHub.handleUpgrade(
      req,
      socket,
      head,
      parsedUrl.pathname,
      memoryManager,
    );
  } catch (error) {
    logger.error("WebSocket upgrade failed", {
      errorMessage: error.message,
      requestUrl: req.url,
    });
    socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    socket.destroy();
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
    webSocketHub.shutdown();
    memoryManager.stopCleanupLoop();
    logger.info("Server closed cleanly", {});
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  logger.info("Shutdown signal received (SIGTERM)", {});
  server.close(async () => {
    await workerPool.shutdown();
    webSocketHub.shutdown();
    memoryManager.stopCleanupLoop();
    logger.info("Server closed cleanly", {});
    process.exit(0);
  });
});
