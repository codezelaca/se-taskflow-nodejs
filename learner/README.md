# Learning Backend Engineering from Scratch

Welcome to the Taskflow learning guides! This folder teaches you backend engineering by building a real application—no frameworks, no abstractions.

## How to Use This Folder

**Start with Step 1 and go in order.** Each step depends on the previous one.

For each step:

1. Read the guide (15-20 minutes)
2. Look at the actual code in `src/`
3. Run the demo commands
4. Try the exercises
5. Play with the code—see what breaks!

## 10-Step Learning Path

| Step                                                | Topic                           | Concepts                                 | Time   |
| --------------------------------------------------- | ------------------------------- | ---------------------------------------- | ------ |
| **[Step 1: Raw HTTP Server](01-http-server.md)**    | How Node.js HTTP works          | Request parsing, routing, responses      | 20 min |
| **[Step 2: In-Memory Storage](02-task-store.md)**   | Storing data with Hash Maps     | Time complexity, O(1) lookups            | 20 min |
| **[Step 3: Priority Queues](03-priority-queue.md)** | Organizing by importance        | Heaps, O(log N) operations               | 20 min |
| **[Step 4: Dependency Chains](04-dependencies.md)** | Tasks that depend on each other | Recursion, cycle detection               | 25 min |
| **[Step 5: Middleware Chains](05-middleware.md)**   | Safe request pipelines          | Chain of Responsibility pattern          | 20 min |
| **[Step 6: Error Handling](06-errors-logging.md)**  | Handling failures gracefully    | Logging, structured error formats        | 20 min |
| **[Step 7: Memory Management](07-memory.md)**       | Understanding memory leaks      | Stack vs heap, garbage collection        | 20 min |
| **[Step 8: Worker Threads](08-worker-threads.md)**  | Parallel CPU work               | Non-blocking, thread pools               | 20 min |
| **[Step 9: Streaming](09-streaming.md)**            | Sending huge data efficiently   | Backpressure, pipes, CSV/NDJSON          | 20 min |
| **[Step 10: WebSockets](10-websockets.md)**         | Real-time updates               | Bi-directional communication, broadcasts | 25 min |

**Total:** ~3-4 hours to read all guides  
**Total with coding:** ~8-10 hours to build everything

## Supporting Resources

These go deeper into specific topics if you want more:

- **[big-o-and-data-structures.md](big-o-and-data-structures.md)** — Complexity analysis, Big O cheat sheet
- **[event-loop-and-libuv.md](event-loop-and-libuv.md)** — How Node.js event loop actually works

## Quick Start

```bash
# 1. Setup
node server.js

# 2. In another terminal, follow Step 1 exercises
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-user-123"

# 3. After reading all 10 steps, run full demo
bash scripts/full-demo.sh
```

## How Each Step Connects to Real Code

Every concept is implemented in actual code you can inspect:

- **Step 1:** `server.js` route handling
- **Step 2:** `src/store/TaskStore.js`
- **Step 3:** `src/store/PriorityQueue.js`
- **Step 4:** `src/store/DependencyList.js` + resolver in TaskStore
- **Step 5:** `src/middleware/*.js`
- **Step 6:** `src/utils/logger.js`, `errorHandler.js`
- **Step 7:** `src/services/MemoryManager.js`
- **Step 8:** `src/services/WorkerPool.js` + `src/workers/*`
- **Step 9:** CSV/NDJSON streaming in `server.js`
- **Step 10:** `src/services/WebSocketHub.js`

All code has learning comments explaining the "why" not just the "how".

## Exercises in Each Guide

Every step has hands-on exercises:

- Add new HTTP endpoint
- Extend middleware chain
- Write recursive function
- Debug memory usage
- And more!

Try them. Get stuck. Debug. Learn way deeper.

## Real-World Relevance

This isn't theoretical. Companies building production systems use every concept here:

- **Airbnb:** Handles millions of requests with similar architectures
- **Stripe:** Uses worker pools for payment processing
- **Netflix:** Streams video using the patterns you'll learn
- **Discord:** Uses WebSockets for real-time chat
- **Any backend team:** Uses middleware, error handling, and logging

## Tips for Success

✅ **Do:**

- Read the guide first
- Look at the actual code second
- Run the commands and see output
- Modify code and observe changes
- Experiment and break things

❌ **Don't:**

- Skip the guides and jump to code
- Copy-paste without understanding
- Try all 10 steps in one sitting (take breaks!)
- Worry if some parts seem hard—they should!

## Getting Stuck?

If a concept doesn't click:

1. **Reread the guide** more slowly
2. **Look at the working code** in `src/`
3. **Run the demo** to see it working
4. **Modify something small** and see what changes
5. **Add console.log() statements** to trace execution
6. **Take a break**—sometimes understanding needs time

This is normal. Understanding takes time.

## After You Finish

You'll understand:

- How HTTP servers work (no framework magic)
- Why data structure choice matters (Big O)
- How to debug production systems
- When to use threads vs async
- How real-time systems work
- Memory and performance issues

You won't be an expert yet, but you'll be **dangerous**—able to understand, build, and debug anything.

Next steps:

- Read a framework's source code (Express, Fastify, etc.)
- Build your own project using these patterns
- Learn SQL and databases
- Learn load balancing and deployment

## Questions?

- Reread the guide for that concept
- Look at the actual code in `src/`
- Run some of the demo scripts to see live behavior
- Add debugging with `console.log()`

Each guide is complete and self-contained. You've got this!

---

**Ready? → [Start with Step 1: Raw HTTP Server](01-http-server.md)**
