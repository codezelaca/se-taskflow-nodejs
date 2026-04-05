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

The code currently includes Parts 1 through 5:

- [x] **Step 1:** Raw Node.js HTTP server with manual routing
- [x] **Step 2:** In-memory task store using JavaScript Map (O(1) Hash Map) and Singleton export
- [x] **Step 3:** Priority Queue (Max-Heap) for O(log N) prioritized scheduling
- [x] **Step 4:** Linked-List Task Dependency Chains with O(N) automated garbage collection (sweep)
- [x] **Step 5:** OOP Middleware Chain of Responsibility (Authentication, Roles, Data Validation)

Planned parts are documented in the roadmap below and expanded in the learner guides.

## Technology Constraints

- Runtime: Node.js (No Babel, No TypeScript)
- Current external npm packages: **none** (zero-dependency design)
- Planned single exception: ws (introduced in final WebSocket step)

Everything else is built natively.

## Repository Structure

- `server.js`: HTTP server, route handling, JSON parsing, middleware execution
- `benchmarks.js`: Big O demonstration (Array.find vs Map.get)
- `src/store/TaskStore.js`: Singleton in-memory state engine
- `src/store/PriorityQueue.js`: Max-Heap Queue data structure for ordering Tasks by priority
- `src/store/DependencyList.js`: Singly Linked List data structure for Task prerequisite linking
- `src/middleware/`: Chain of Responsibility implementation for Auth, Permissions, and Validations
- `src/config/env.js`: Zero dependency `.env` parser
- `learner/README.md`: Learning path and deep-dive documentation index

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

### 4) Run the Complexity Benchmark

```bash
node benchmarks.js
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

1. Raw HTTP API in Node.js without frameworks *(Done!)*
2. In-memory task store with Hash Map and complexity benchmark *(Done!)*
3. Priority queue for prioritized scheduling *(Done!)*
4. Linked-list dependency chains and recursive dependency resolution *(Done!)*
5. Middleware chain (authentication, authorization, validation) *(Done!)*
6. Global error handling and structured logging
7. Intentional memory leak demonstration and remediation
8. Worker Thread report generation for CPU-heavy processing
9. Streaming CSV export via Node streams
10. WebSocket live updates using ws

This repository currently has **Steps 1 through 5** completely implemented natively!

## Concepts Covered in This Repository

- **Data Structures**: Priority Queues, Binary Heaps, Singly Linked Lists, Hash Maps (O(1) Time vs O(N) vs O(log N)).
- **Design Patterns**: Singleton State Stores, Object-Oriented Chain of Responsibility, Interceptors.
- Event Loop internals (Timers, Poll, Check phases)
- Call Stack and libuv responsibilities

Detailed guides are available in `learner/README.md`.

## Troubleshooting

### Port 3000 already in use
Run server on a free port by changing PORT in `server.js`.

### Missing or Invalid Tokens
Since Step 5 was introduced, modifying commands explicitly require an `ADMIN_TOKEN` placed inside the `Authorization: Bearer <token>` header as seen in the `.env` file.

### Data disappears after restart
Expected behavior. This is currently an in-memory repository designed to teach data structures without database overhead!
