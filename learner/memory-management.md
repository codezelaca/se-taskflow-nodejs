# Memory Management in Node.js

## Goal

Understand stack vs heap memory, garbage collection behavior, and how memory leaks happen.

## Stack vs Heap

- Stack: function call frames, local references, fast and structured
- Heap: objects, arrays, maps, closures, dynamically allocated data

Task objects and Map entries in Taskflow live on the heap.

## Garbage Collection in V8

V8 reclaims heap memory that is no longer reachable.

Key principle:

- unreachable objects can be collected
- reachable objects cannot be collected

A leak is usually not missing GC. It is retaining references unintentionally.

## Typical Leak Patterns in APIs

- unbounded global arrays/maps that never evict
- event listeners added repeatedly without removal
- closures holding large objects beyond needed lifetime
- caches without TTL or size limits

## Taskflow Context

Current in-memory store is intentionally simple and unbounded.

For production-like behavior, consider:

- capacity limits
- archival strategy
- persistence storage

## Leak Demonstration Idea

Create an endpoint that pushes request payloads into a global array and never clears it. Repeated calls grow memory continuously.

Then fix it by:

- bounded queue
- periodic cleanup
- writing to durable storage instead

## Observability Basics

Monitor process memory over time:

- process.memoryUsage()
- heapUsed trend
- rss trend

If heapUsed increases without returning after workload stabilizes, inspect retained references.
