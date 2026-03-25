# Event Loop, Call Stack, and libuv

## Goal

Understand why Node can handle many concurrent connections despite JavaScript being single-threaded.

## Core Pieces

- Call Stack: where JS functions execute
- Event Loop: scheduler that decides what callback runs next
- libuv: C library handling async I/O and thread pool tasks

## Event Loop Phases (Simplified)

1. Timers: setTimeout and setInterval callbacks
2. Pending callbacks: deferred system-level callbacks
3. Poll: receive new I/O events, execute I/O callbacks
4. Check: setImmediate callbacks
5. Close callbacks: socket close handlers, etc.

In practice, Poll and Check behavior is key for server responsiveness.

## Why This Matters for Taskflow

Taskflow server handles network I/O efficiently because:

- HTTP socket handling is asynchronous
- callbacks are queued and processed without blocking on slow clients

If you add CPU-heavy synchronous logic, you block the loop and all clients feel delay.

## Practical Example

Bad pattern:

- request handler runs a huge synchronous loop

Result:

- all requests stall while loop runs

Better pattern:

- offload CPU-heavy work to Worker Threads (covered later)

## Quick Experiment

1. Add an endpoint that computes Fibonacci recursively with large n.
2. Open two terminals.
3. Hit CPU endpoint in terminal A.
4. Call GET /tasks in terminal B.

Observation:

- GET /tasks slows dramatically while CPU endpoint runs.

Lesson:

- Node scales in I/O concurrency, not CPU-bound work on main thread.
