# Step 8: Worker Threads

## What You'll Learn

How to offload CPU-heavy work so it doesn't freeze your server.

## Big Picture

Two types of work:

**I/O work** (reading files, database queries):

- Async, doesn't block
- Example: `fs.readFile()` waits but doesn't freeze other requests

**CPU work** (calculations, data processing):

- Blocks the main thread
- Example: `fibonacci(50)` freezes the server

```javascript
// ✗ This freezes your server for 5 seconds
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

const result = fib(50); // All requests wait!
```

**Solution:** Run CPU work in a **Worker Thread** (separate CPU core).

```
Main Thread         Worker Thread

┌─────────────────┐  ┌──────────────────┐
│ Handle requests │  │ Heavy calculation│
│ Return responses│  │ fib(50) = ...    │
│ Stay responsive │  │ (no blocking!)   │
└─────────────────┘  └──────────────────┘
```

## What To Build

A system that:

- Receives a CPU-heavy request
- Sends it to a worker thread
- Server continues handling other requests
- Returns results when worker finishes

## Code Location

See **[src/workers/cpuWorker.js](../src/workers/cpuWorker.js)** — the worker code  
See **[src/services/WorkerPool.js](../src/services/WorkerPool.js)** — manages multiple workers

Request endpoints:

- `GET /tasks/reports/start?heavyIterations=X` — start a job
- `GET /tasks/reports/:jobId` — check status

## Why Worker Threads?

### ✗ Without Workers (blocks main thread)

```
Time 0: Main thread starts fib(50)
Time 5: Request 2 arrives but MUST WAIT
Time 10: fib(50) finishes
Time 10: Request 2 finally processed
```

User 2 waited 8 seconds for their simple request! 😞

### ✓ With Workers (non-blocking)

```
Time 0: Main thread starts worker for fib(50)
Time 0.1: Request 2 arrives and processes immediately
Time 10: fib(50) finishes in worker
```

User 2 got instant response! 😊

## How Workers Work

### 1. Create a Worker

```javascript
const worker = new Worker("./cpuWorker.js");
// Starts a new JavaScript runtime (separate process)
```

### 2. Send Data

```javascript
worker.postMessage({ iterations: 1000000 });
// Send data to worker
```

### 3. Receive Results

```javascript
worker.on("message", (result) => {
  console.log("Worker finished:", result);
});
```

### 4. Handle Errors

```javascript
worker.on("error", (error) => {
  console.error("Worker crashed:", error);
});
```

## Example: The Worker Code

```javascript
// cpuWorker.js
const { parentPort } = require("worker_threads");

// Listen for messages from main thread
parentPort.on("message", (msg) => {
  const { iterations } = msg;

  // Do heavy work here
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i);
  }

  // Send result back
  parentPort.postMessage({ result });
});
```

## Worker Pool Pattern

Instead of creating a new worker per request, reuse a pool:

```
Request 1 → Worker 1 (working on fibonacci)
Request 2 → Worker 2 (working on sort)
Request 3 → Queue (waiting for worker to free up)
Request 4 → Queue (waiting for worker to free up)

[Worker 1 finishes fibonacci]
Worker 1 → Request 3 (starts)

[Worker 2 finishes sort]
Worker 2 → Request 4 (starts)
```

**Benefits:**

- Workers are expensive (each uses ~20MB RAM)
- Creating 1000 workers = 20GB memory wasted
- Pool with 4 workers = 80MB, handles thousands of requests

## Overhead: When NOT to Use Workers

Workers have startup cost:

- 50-100ms to spawn
- ~20MB per worker
- Communication overhead

So for very fast tasks, overhead outweighs benefits:

```
Worker for: fibonacci(50)     ✓ Worth it (10 second calc)
Worker for: fibonacci(5)      ✗ Overhead bigger than work
```

## Measuring: Main vs Worker

See **[scripts/worker-benchmark.js](../scripts/worker-benchmark.js)**:

```bash
node scripts/worker-benchmark.js
```

Output:

```
Main thread (blocking):      5230ms
Worker thread (non-blocking): 5240ms total, but server responsive!
Speedup: ~1x (same time, but non-blocking)
```

Both take ~5 seconds (same CPU work), but worker version doesn't freeze the server.

## Your Turn: Try It

**Task 1:** Look at the worker-benchmark.js and understand it

**Task 2:** Start the server and make concurrent requests:

```bash
# Terminal 1
node server.js

# Terminal 2
curl "http://localhost:3000/tasks/reports/start?heavyIterations=100000000"
# Returns: { jobId: "abc-123" }

# Check status while it's running:
curl http://localhost:3000/tasks/reports/abc-123
# Returns: { status: "processing", progress: "..." }

# Wait a bit, then check again:
curl http://localhost:3000/tasks/reports/abc-123
# Returns: { status: "complete", result: 123456 }
```

**Task 3:** Make multiple requests simultaneously:

```bash
for i in {1..5}; do
  curl "http://localhost:3000/tasks/reports/start?heavyIterations=100000000" &
done
```

All should process in parallel, not queue.

## Real-World Connection

- **Image processing:** Resize, compress in workers
- **Data analysis:** Large calculations in workers
- **PDF generation:** LaTeX rendering in workers
- **Machine learning:** Model inference in workers
- **Video transcoding:** FFmpeg in workers

Companies like Netflix, Stripe, and Shopify use worker patterns extensively.

## Next Step

You can now handle CPU work without freezing. But what about **sending massive amounts of data**?

Next: **Streaming** to efficiently send large files.

[→ Step 9: Streaming](09-streaming.md)
