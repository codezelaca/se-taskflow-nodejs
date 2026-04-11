# Worker Threads Demo: Blocking vs Parallel

## Files Added

- `src/services/WorkerPool.js`: Production-style worker pool with queueing, timeout handling, and crash recovery.
- `src/workers/cpuWorker.js`: CPU-heavy computation worker script.
- `server.js`: New demo routes for main-thread blocking and worker-thread execution.

## New Demo Endpoints

- `GET /demo/cpu/ping`
- `GET /demo/cpu/blocking?iterations=<number>`
- `GET /demo/cpu/worker/run?iterations=<number>`
- `GET /demo/cpu/worker/start?iterations=<number>`
- `GET /demo/cpu/worker/jobs/:jobId`
- `GET /demo/cpu/worker/stats`

## Start Server

```bash
node server.js
```

## 1) Baseline responsiveness

```bash
curl -s "http://localhost:3000/demo/cpu/ping" | jq .
```

## 2) Freeze demo (event loop blocking)

Runs a heavy CPU loop on the main thread while ping is attempted in parallel.

```bash
curl -s "http://localhost:3000/demo/cpu/blocking?iterations=900000000" > /tmp/blocking_demo.json & /usr/bin/time -p curl -s "http://localhost:3000/demo/cpu/ping" | jq . && wait
cat /tmp/blocking_demo.json | jq .
```

Expected behavior:

- `ping` is delayed (high `real` time), because event loop is blocked.

## 3) Worker-thread demo (non-blocking)

Runs same heavy workload on worker thread while ping is attempted in parallel.

```bash
curl -s "http://localhost:3000/demo/cpu/worker/run?iterations=900000000" > /tmp/worker_demo.json & /usr/bin/time -p curl -s "http://localhost:3000/demo/cpu/ping" | jq . && wait
cat /tmp/worker_demo.json | jq .
```

Expected behavior:

- `ping` returns quickly (low `real` time), while CPU job still runs in worker.

## 4) Production-style async job flow

Queue heavy jobs and track status separately.

```bash
JOB1=$(curl -s "http://localhost:3000/demo/cpu/worker/start?iterations=400000000" | jq -r '.jobId')
JOB2=$(curl -s "http://localhost:3000/demo/cpu/worker/start?iterations=450000000" | jq -r '.jobId')

curl -s "http://localhost:3000/demo/cpu/worker/stats" | jq .
curl -s "http://localhost:3000/demo/cpu/worker/jobs/$JOB1" | jq .
curl -s "http://localhost:3000/demo/cpu/worker/jobs/$JOB2" | jq .
```

Check completion later:

```bash
curl -s "http://localhost:3000/demo/cpu/worker/stats" | jq .
curl -s "http://localhost:3000/demo/cpu/worker/jobs/$JOB1" | jq .
```

## Best Practices Implemented

- Fixed-size worker pool (bounded concurrency)
- Backpressure via queue limit
- Per-job timeout protection
- Worker crash/exit recovery with respawn
- Dedicated endpoints for submission, polling, and pool stats
- Main-thread endpoint preserved to demonstrate anti-pattern clearly
