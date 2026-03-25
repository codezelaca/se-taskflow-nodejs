# Concurrency: Async I/O vs Worker Threads

## Goal

Separate two ideas clearly:

- async I/O concurrency on single JS thread
- true parallel CPU execution with worker threads

## Async I/O Concurrency

Node handles many sockets and files concurrently through non-blocking I/O.

Good for:

- API calls
- database/network waiting
- stream pipelines

Not good for:

- CPU-intensive transforms on main thread

## Worker Threads

Worker threads let you run JavaScript in parallel across multiple threads.

Use when:

- report generation is CPU-heavy
- sorting or aggregation is large
- compression/encryption workload is substantial

## Taskflow Planned Use

Generate heavy analytics reports in a worker so API endpoints remain responsive.

Main thread responsibilities:

- receive request
- start worker
- await worker result or status
- return response

## Tradeoffs

Benefits:

- prevents event loop blocking
- better tail latency under CPU load

Costs:

- serialization overhead for messages
- more complex error handling
- thread lifecycle management

## Exercise

Implement a report endpoint two ways:

1. synchronous CPU processing in main thread
2. worker thread processing

Compare response time stability for concurrent GET /tasks calls.
