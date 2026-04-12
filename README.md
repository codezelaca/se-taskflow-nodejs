# Taskflow: Learn Backend Engineering From Scratch

Welcome! Taskflow teaches backend engineering fundamentals using **only Node.js—no frameworks, no magic**.

You'll build a real task queue system step-by-step, learning core concepts as you go.

## Why Learn This Way?

Frameworks hide how things work. This project shows you **exactly** what happens:

- How HTTP requests are parsed
- How data is stored and retrieved
- How middleware chains work
- How to handle errors and scale efficiently
- How real-time updates work with WebSockets

By the end, you'll understand backend systems deeply and be able to debug or build anything.

## What You'll Build

A real-time task management app with:

- Task creation, updates, deletion
- Priority-based scheduling
- Dependency tracking between tasks
- Parallel job processing with Worker Threads
- Memory management and monitoring
- Live updates via WebSockets
- Data streaming (CSV/NDJSON export)

## Quick Start (5 minutes)

### 1. Install Node.js

You need Node.js 18+. Download from [nodejs.org](https://nodejs.org).

Check you have it:

```bash
node --version
```

### 2. Clone or Navigate to This Folder

```bash
cd se-taskflow-nodejs
```

### 3. Setup Environment

```bash
cp .env.example .env
```

This file stores your API tokens (used for testing authentication).

### 4. Start the Server

```bash
node server.js
```

You should see:

```
Environment variables loaded natively.
[timestamp] TaskFlow server started on http://localhost:3000
Listening for requests...
```

### 5. Open Another Terminal and Try It

Create a task:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn backend","priority":9}'
```

List all tasks:

```bash
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-user-123"
```

## 10-Step Learning Path

Start at **Step 1** and progress sequentially. Each step builds on the previous one.

| Step | Topic                                           | What You Learn                                          |
| ---- | ----------------------------------------------- | ------------------------------------------------------- |
| 1    | [Raw HTTP Server](learner/01-http-server.md)    | How Node's http module works, routing, request/response |
| 2    | [In-Memory Storage](learner/02-task-store.md)   | Hash maps, O(1) lookups, the singleton pattern          |
| 3    | [Priority Queues](learner/03-priority-queue.md) | Heaps, O(log N) operations, scheduling algorithms       |
| 4    | [Dependency Chains](learner/04-dependencies.md) | Linked lists, O(N) traversal, recursive resolution      |
| 5    | [Middleware Chains](learner/05-middleware.md)   | The Chain of Responsibility pattern, authentication     |
| 6    | [Error Handling](learner/06-errors-logging.md)  | Structured error responses, request correlation         |
| 7    | [Memory Management](learner/07-memory.md)       | Heap vs stack, garbage collection, memory leaks         |
| 8    | [Worker Threads](learner/08-worker-threads.md)  | Parallelism, offloading CPU work, avoiding blocking     |
| 9    | [Streaming Data](learner/09-streaming.md)       | Readable streams, backpressure, chunked responses       |
| 10   | [WebSockets](learner/10-websockets.md)          | Real-time two-way communication, frame encoding         |

**→ Start with [Step 1](learner/01-http-server.md)**

## Run the Full Learning Demo

After understanding the concepts, run everything together:

```bash
# Terminal 1: Start the server
node server.js

# Terminal 2 (optional): Watch live task events
node scripts/websocket-client.js

# Terminal 3: Run the full demo
bash scripts/full-demo.sh
```

This script demonstrates all 10 concepts in action.

## File Organization

```
server.js                     # The main HTTP server
.env.example                  # Copy to .env before running

learner/                      # 10 step-by-step guides
├── 01-http-server.md        # Start here!
├── 02-task-store.md
├── ...
└── 10-websockets.md

src/                          # Implementation code
├── store/                    # Data structures
├── middleware/               # Request handlers
├── services/                 # Worker pools, WebSockets, memory
├── workers/                  # CPU-heavy background jobs
└── utils/                    # Logging, errors

scripts/                      # Demo and benchmark scripts
├── full-demo.sh             # Run this after learning
├── dependency-resolver-demo.sh
├── websocket-client.js
└── benchmarks/

docs/                         # API reference and operation guides
```

## Key Concepts at a Glance

**Data Structures:**

- Map (hash table): O(1) lookups
- Max-Heap: O(log N) priority ordering
- Linked List: O(1) append, O(N) traversal

**Patterns:**

- Middleware Chain of Responsibility
- Singleton (shared state)
- Worker pools (task queues)

**Operations:**

- HTTP routing with manual parsing
- WebSocket frame protocol
- Request/response correlation
- Memory bounded caches

## Common Commands

```bash
# Start server
node server.js

# Run full demo (all 10 concepts at once)
bash scripts/full-demo.sh

# Benchmark: Map vs Array lookup speed
node scripts/map-vs-array-benchmark.js

# Benchmark: Main thread vs worker threads
node scripts/worker-benchmark.js

# Dependency resolver demo
bash scripts/dependency-resolver-demo.sh

# Live WebSocket client
node scripts/websocket-client.js
```

## API Quick Reference

All endpoints require authentication header:

```bash
-H "Authorization: Bearer secret-admin-123"   # Admin (can create/update/delete)
-H "Authorization: Bearer secret-user-123"    # User (can only view)
```

**Tasks:**

```bash
POST /tasks                   # Create a task
GET /tasks                    # List all tasks
GET /tasks/:id                # Get one task
PUT /tasks/:id                # Update a task
DELETE /tasks/:id             # Delete a task
GET /tasks/next               # Get highest priority task
GET /tasks/resolve            # Resolve full dependency order
GET /tasks/:id/resolve        # Resolve dependencies for one task
```

**Real-Time:**

```bash
WS /ws/tasks                  # Connect for live updates
```

**Monitoring:**

```bash
GET /tasks/system/memory      # Memory usage stats
GET /tasks/system/ws          # WebSocket connection count
GET /tasks/reports/stats      # Worker pool statistics
```

**Streaming:**

```bash
GET /tasks/export.csv         # Download tasks as CSV
GET /tasks/stream.ndjson      # Stream tasks as NDJSON
```

For full API details, see [docs/api-reference.md](docs/api-reference.md).

## Troubleshooting

**Port already in use?**

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

**Getting 401 Unauthorized?**
Add the auth header:

```bash
-H "Authorization: Bearer secret-admin-123"
```

**Server crashes on startup?**
Make sure your `node --version` shows 18+:

```bash
node --version
```

## Next Steps

1. **Read Step 1:** [Raw HTTP Server](learner/01-http-server.md)
2. **Build it:** Follow the exercises in each guide
3. **Run scripts:** Use the demo scripts to see it all working
4. **Experiment:** Modify the code and see what breaks—that's learning!

## Questions or Stuck?

- Re-read the specific guide for that concept
- Look at the working code in `src/`
- Run a demo script to see the live behavior
- Add `console.log()` statements to trace execution

## Technology Stack

- **Runtime:** Node.js (no TypeScript, no Babel)
- **Database:** In-memory hash map (resets on restart)
- **Real-time:** Native WebSocket protocol (no external library)
- **External packages:** None (everything from Node.js stdlib)

This is intentional—you'll see exactly what you're using and why.

## License

Open source, learn freely.

---

**Ready? → [Start with Step 1: Raw HTTP Server](learner/01-http-server.md)**

# Taskflow

Taskflow is a real-time, collaborative task queue system built to teach backend engineering from first principles.

This repository intentionally avoids backend frameworks so learners can understand exactly what happens under the hood in production systems. Routing, request parsing, state management, and API behavior are implemented manually using core Node.js APIs.

## Why This Repository Exists

Most tutorials start with frameworks and hide core mechanics. Taskflow does the opposite:

- Build with core Node.js first.
- Understand architecture and tradeoffs before abstractions.
- Learn data structures and algorithmic complexity in context.
- Introduce advanced capabilities (streaming, worker threads, WebSockets) progressively.

The result is a learning-first codebase that teaches both implementation and reasoning.

## Current Implementation Status

The code now includes Parts 1 through 10:

- [x] **Step 1:** Raw Node.js HTTP server with manual routing
- [x] **Step 2:** In-memory task store using JavaScript Map (O(1) Hash Map) and Singleton export
- [x] **Step 3:** Priority Queue (Max-Heap) for O(log N) prioritized scheduling
- [x] **Step 4:** Linked-List Task Dependency Chains with O(N) automated garbage collection (sweep)
- [x] **Step 5:** OOP Middleware Chain of Responsibility (Authentication, Roles, Data Validation)
- [x] **Step 6:** Global error handling with structured logging and request correlation
- [x] **Step 7:** Memory leak detection, bounded caches, and memory observability
- [x] **Step 8:** Worker Thread CPU offloading with a reusable worker pool
- [x] **Step 9:** Streaming CSV / NDJSON exports with backpressure-safe pipelines
- [x] **Step 10:** WebSocket live updates with heartbeats and task broadcast

Planned parts are documented in the roadmap below and expanded in the learner guides.

## Technology Constraints

- Runtime: Node.js (No Babel, No TypeScript)
- Current external npm packages: **none** (zero-dependency design)
- WebSocket support is implemented natively with the Node.js `upgrade` path and manual frame handling

Everything else is built natively.

## Repository Structure

- `server.js`: HTTP server, route handling, JSON parsing, middleware execution, streaming, memory demos, and WebSocket upgrade handling
- `scripts/full-demo.sh`: Unified end-to-end demo script covering all major concepts
- `scripts/demo-live-events.sh`: Emits create/update/delete events for live WebSocket observation
- `scripts/map-vs-array-benchmark.js`: Big O demonstration (Array.find vs Map.get)
- `scripts/worker-benchmark.js`: Worker Thread benchmark for blocking vs parallel CPU work
- `scripts/dependency-resolver-demo.sh`: Recursive dependency resolution and cycle detection demo
- `scripts/websocket-client.js`: Terminal WebSocket client for live update demos
- `docs/full-demo.md`: Full demo instructions and integrated endpoint map
- `src/store/TaskStore.js`: Singleton in-memory state engine
- `src/store/PriorityQueue.js`: Max-Heap Queue data structure for ordering Tasks by priority
- `src/store/DependencyList.js`: Singly Linked List data structure for Task prerequisite linking
- `src/services/MemoryManager.js`: Bounded memory tracking, leak demo batches, and cleanup
- `src/services/WorkerPool.js`: Managed Worker Thread pool for CPU-heavy jobs
- `src/services/WebSocketHub.js`: Native WebSocket broadcast and heartbeat manager
- `src/middleware/`: Chain of Responsibility implementation for Auth, Permissions, and Validations
- `src/config/env.js`: Zero dependency `.env` parser
- `learner/README.md`: Learning path and deep-dive documentation index
- `docs/full-demo.md`: End-to-end terminal demo instructions

## Quick Start

### 1) Prerequisites

- Node.js 18+ recommended (crypto.randomUUID support)

### 2) Set up Environment Variables

Create your `.env` file based on the example to supply the API tokens for the Middleware Chain:

```bash
cp .env.example .env
```

### 3) Start the API Server

```bash
node server.js
```

Expected startup output:

- `Environment variables loaded natively.`
- `TaskFlow server is running on http://localhost:3000`
- `Listening for requests... (Press Ctrl+C to stop)`

### 4) Run Integrated Demos

Full integrated demo:

```bash
bash scripts/full-demo.sh
```

Dependency resolver focused demo:

```bash
bash scripts/dependency-resolver-demo.sh
```

Data-structure benchmark:

```bash
node scripts/map-vs-array-benchmark.js
```

Worker benchmark:

```bash
node scripts/worker-benchmark.js
```

You should observe significantly faster Map lookup timing compared to Array.find for large collections.

## API Reference (Current)

Base URL: `http://localhost:3000`

### GET /tasks

Returns all tasks. Users and Admins can access this.

### GET /tasks/queue

Returns the Max-Heap queue array structure highlighting task priority ordering.

### GET /tasks/peek

Returns the absolute highest priority task without dequeuing it. O(1) read time.

### POST /tasks

Creates a new task. **Requires Admin Token**.

Request body (`title` and `priority` are validated):

```json
{
  "title": "Prepare sprint board",
  "priority": 5,
  "dependencies": []
}
```

### PUT /tasks/:id

Updates an existing task by merging provided fields. Validates the payload and organically updates the Priority Queue and Dependency Linked List. **Requires Admin Token**.

### DELETE /tasks/:id

Deletes a task and performs an O(N) sweep across all other tasks to cleanly remove its ID from their linked list dependencies to prevent ghost links! **Requires Admin Token**.

### GET /tasks/export.csv

Streams all tasks as CSV using backpressure-safe streaming.

### GET /tasks/stream.ndjson

Streams all tasks as NDJSON for incremental consumption.

### GET /tasks/next

Returns the next highest-priority task candidate from the queue without dequeuing it.

### GET /tasks/resolve

Resolves dependency-safe execution order for all tasks using recursive DFS/topological ordering.

### GET /tasks/:id/resolve

Resolves dependency-safe execution order for one task subtree. Returns 409 when a cycle is detected.

### POST /tasks/reports/start?heavyIterations=...

Starts a Worker Thread powered task analytics report job and returns a `jobId`.

### GET /tasks/reports/:jobId

Fetches report job status and output.

### GET /tasks/reports/stats

Returns report worker pool runtime statistics.

### GET /tasks/system/memory

Returns current bounded memory manager and process memory statistics.

### POST /tasks/memory/leak?count=...&sizeKb=...

Creates an intentional retained batch (for leak demonstration).

### POST /tasks/memory/safe?count=...&sizeKb=...

Creates a bounded cache batch that trims automatically.

### POST /tasks/memory/clear

Clears memory demo caches.

### GET /tasks/system/ws

Returns WebSocket hub statistics.

### WS /ws/tasks

Real-time task event stream (`task.created`, `task.updated`, `task.deleted`).

### GET /demo/cpu/ping

Lightweight endpoint for latency checks before and after heavy CPU work.

### GET /demo/cpu/blocking?iterations=...

Runs CPU work on the main thread so you can demonstrate event loop blocking.

### GET /demo/cpu/worker/run?iterations=...

Runs the same CPU work in a Worker Thread and waits for completion.

### GET /demo/cpu/worker/start?iterations=...

Queues a Worker Thread job and returns a job ID for polling.

### GET /demo/memory/usage

Returns heap, rss, external, and array buffer memory usage.

### POST /demo/memory/leak?count=...&sizeKb=...

Creates an intentional leak batch for demonstration.

### POST /demo/memory/safe?count=...&sizeKb=...

Creates a bounded cache batch that gets trimmed automatically.

### GET /demo/ws/stats

Returns WebSocket hub statistics.

## End-to-End API Walkthrough (Copy/Paste)

### Create a Task (Admin Action)

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123" \
  -H "Content-Type: application/json" \
  -d '{"title":"Implement auth middleware","priority":10}'
```

### Create a Dependent Task

Replace `TASK_A_ID` with the ID generated in the last command! This automatically injects it into a native Linked List.

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123" \
  -H "Content-Type: application/json" \
  -d '{"title":"Secondary Task","priority":5,"dependencies":["TASK_A_ID"]}'
```

### List Tasks (User Action)

```bash
curl -i -H "Authorization: Bearer secret-user-123" http://localhost:3000/tasks
```

### Update Task

```bash
curl -i -X PUT http://localhost:3000/tasks/TASK_A_ID \
  -H "Authorization: Bearer secret-admin-123" \
  -H "Content-Type: application/json" \
  -d '{"priority":100}'
```

### Observe Priority Shift in the Heap

```bash
curl -i http://localhost:3000/tasks/peek
```

### Delete Task (Triggers Linked List Sweep)

```bash
curl -i -X DELETE http://localhost:3000/tasks/TASK_A_ID \
  -H "Authorization: Bearer secret-admin-123"
```

## Data Model (Current)

Each task currently contains:

- `id`: UUID string generated by crypto.randomUUID
- `title`: string
- `description`: string
- `status`: string (pending, in-progress, completed)
- `priority`: integer (higher number = higher execution urgency)
- `dependencies`: Array serialization of the active `DependencyList` Singly Linked List
- `createdAt`: ISO timestamp string
- `updatedAt`: ISO timestamp string

## Internal Architecture & Computer Science

### Request Flow

1. Node HTTP server accepts request.
2. `src/config/env` parses `.env` manually into global variables.
3. Stream body is read into JSON format globally for mutating requests.
4. **Middleware Chain of Responsibility** executes: Auth -> Permission -> Validation.
5. If the chain yields, URL/method handles endpoints.
6. `TaskStore` processes updates:
   - Sets the O(1) Memory map.
   - Safely sweeps and parses arrays to `DependencyList`.
   - Modifies positions linearly in the `PriorityQueue` Max Heap.
7. JSON response sent explicitly.

## Learning Roadmap (Project Scope)

Taskflow’s intended progression covers:

1. Raw HTTP API in Node.js without frameworks _(Done!)_
2. In-memory task store with Hash Map and complexity benchmark _(Done!)_
3. Priority queue for prioritized scheduling _(Done!)_
4. Linked-list dependency chains and recursive dependency resolution with cycle detection _(Done!)_
5. Middleware chain (authentication, authorization, validation) _(Done!)_
6. Global error handling and structured logging _(Done!)_
7. Intentional memory leak demonstration and remediation _(Done!)_
8. Worker Thread report generation for CPU-heavy processing _(Done!)_
9. Streaming CSV export via Node streams _(Done!)_
10. WebSocket live updates using native Node.js upgrade handling _(Done!)_

This repository currently has **Steps 1 through 10** completely implemented natively!

## Concepts Covered in This Repository

- **Data Structures**: Priority Queues, Binary Heaps, Singly Linked Lists, Hash Maps (O(1) Time vs O(N) vs O(log N)).
- **Design Patterns**: Singleton State Stores, Object-Oriented Chain of Responsibility, Interceptors.
- Event Loop internals (Timers, Poll, Check phases)
- Call Stack and libuv responsibilities

Detailed guides are available in `learner/README.md` and `docs/full-demo.md`.

## Troubleshooting

### Port 3000 already in use

Run server on a free port by changing PORT in `server.js`.

### Missing or Invalid Tokens

Since Step 5 was introduced, modifying commands explicitly require an `ADMIN_TOKEN` placed inside the `Authorization: Bearer <token>` header as seen in the `.env` file.

### Data disappears after restart

Expected behavior. This is currently an in-memory repository designed to teach data structures without database overhead!
