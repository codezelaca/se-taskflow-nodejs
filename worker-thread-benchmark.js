// ==========================================
// Benchmark: Main Thread CPU vs Worker Threads
// ==========================================
// This script measures the difference between:
// - blocking CPU work on the main thread
// - the same CPU work executed in a Worker Thread
//
// Run with:
//   node worker-thread-benchmark.js
//
// Optional arguments:
//   node worker-thread-benchmark.js <iterations> <parallelJobs>
//
// Example:
//   node worker-thread-benchmark.js 900000000 4

const WorkerPool = require("./src/services/WorkerPool");

const DEFAULT_ITERATIONS = 900_000_000;
const DEFAULT_PARALLEL_JOBS = 4;

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.floor(parsedValue);
};

const runBlockingCpuWork = (iterations) => {
  const startedAt = Date.now();
  let accumulator = 0;

  for (let i = 0; i < iterations; i += 1) {
    accumulator += Math.sqrt((i % 1000) + 1) * Math.sin(i % 360);
  }

  return {
    result: Number(accumulator.toFixed(4)),
    durationMs: Date.now() - startedAt,
  };
};

const measureEventLoopLag = async (label, durationMs = 1000) => {
  const expectedIntervalMs = 100;
  const start = Date.now();
  const drifts = [];
  let lastTick = Date.now();

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const now = Date.now();
      const drift = now - lastTick - expectedIntervalMs;
      drifts.push(drift);
      lastTick = now;

      if (now - start >= durationMs) {
        clearInterval(interval);
        const maxDrift = drifts.length > 0 ? Math.max(...drifts) : 0;
        const avgDrift =
          drifts.length > 0
            ? drifts.reduce((sum, value) => sum + value, 0) / drifts.length
            : 0;

        resolve({
          label,
          samples: drifts.length,
          maxDriftMs: Number(maxDrift.toFixed(2)),
          avgDriftMs: Number(avgDrift.toFixed(2)),
          totalWindowMs: Date.now() - start,
        });
      }
    }, expectedIntervalMs);
  });
};

const benchmarkSequentialMainThread = (iterations) => {
  const startedAt = Date.now();
  const firstRun = runBlockingCpuWork(iterations);
  const secondRun = runBlockingCpuWork(iterations);
  const totalDurationMs = Date.now() - startedAt;

  return {
    mode: "main-thread-sequential",
    iterationsPerJob: iterations,
    jobs: 2,
    jobDurationsMs: [firstRun.durationMs, secondRun.durationMs],
    totalDurationMs,
    resultPreview: [firstRun.result, secondRun.result],
  };
};

const benchmarkWorkerThreadSequential = async (iterations) => {
  const pool = new WorkerPool({
    poolSize: 1,
    maxQueueSize: 10,
    jobTimeoutMs: 120000,
  });
  const startedAt = Date.now();

  try {
    const first = pool.submitCpuJob(iterations);
    const firstResult = await first.completionPromise;

    const second = pool.submitCpuJob(iterations);
    const secondResult = await second.completionPromise;

    return {
      mode: "worker-thread-sequential",
      iterationsPerJob: iterations,
      jobs: 2,
      jobDurationsMs: [firstResult.durationMs, secondResult.durationMs],
      totalDurationMs: Date.now() - startedAt,
      resultPreview: [firstResult.result, secondResult.result],
      threadIds: [firstResult.threadId, secondResult.threadId],
    };
  } finally {
    await pool.shutdown();
  }
};

const benchmarkWorkerThreadParallel = async (iterations, parallelJobs) => {
  const poolSize = Math.max(2, parallelJobs);
  const pool = new WorkerPool({
    poolSize,
    maxQueueSize: Math.max(10, parallelJobs * 2),
    jobTimeoutMs: 120000,
  });

  const startedAt = Date.now();

  try {
    const jobs = [];
    for (let i = 0; i < parallelJobs; i += 1) {
      jobs.push(pool.submitCpuJob(iterations));
    }

    const results = await Promise.all(jobs.map((job) => job.completionPromise));
    const totalDurationMs = Date.now() - startedAt;
    const slowestJobMs = Math.max(
      ...results.map((result) => result.durationMs),
    );
    const fastestJobMs = Math.min(
      ...results.map((result) => result.durationMs),
    );

    return {
      mode: "worker-thread-parallel",
      iterationsPerJob: iterations,
      jobs: parallelJobs,
      totalDurationMs,
      fastestJobMs,
      slowestJobMs,
      jobDurationsMs: results.map((result) => result.durationMs),
      threadIds: results.map((result) => result.threadId),
      resultPreview: results.map((result) => result.result),
    };
  } finally {
    await pool.shutdown();
  }
};

const main = async () => {
  const iterations = parsePositiveInteger(process.argv[2], DEFAULT_ITERATIONS);
  const parallelJobs = parsePositiveInteger(
    process.argv[3],
    DEFAULT_PARALLEL_JOBS,
  );

  console.log("============================================================");
  console.log("TaskFlow Worker Thread Benchmark");
  console.log("============================================================");
  console.log(`Iterations per job: ${iterations.toLocaleString()}`);
  console.log(`Parallel worker jobs: ${parallelJobs}`);
  console.log("");

  console.log("1) Measuring event loop responsiveness before heavy work...");
  const idleLag = await measureEventLoopLag("idle");
  console.log(JSON.stringify(idleLag, null, 2));
  console.log("");

  console.log(
    "2) Running two heavy CPU jobs on the main thread sequentially...",
  );
  const mainThreadResult = benchmarkSequentialMainThread(iterations);
  console.log(JSON.stringify(mainThreadResult, null, 2));
  console.log("");

  console.log(
    "3) Running the same work in a single worker thread sequentially...",
  );
  const workerSequentialResult =
    await benchmarkWorkerThreadSequential(iterations);
  console.log(JSON.stringify(workerSequentialResult, null, 2));
  console.log("");

  console.log("4) Running several jobs in parallel worker threads...");
  const workerParallelResult = await benchmarkWorkerThreadParallel(
    iterations,
    parallelJobs,
  );
  console.log(JSON.stringify(workerParallelResult, null, 2));
  console.log("");

  console.log("5) Measuring event loop lag again after the benchmark...");
  const postLag = await measureEventLoopLag("post-benchmark");
  console.log(JSON.stringify(postLag, null, 2));
  console.log("");

  console.log("============================================================");
  console.log("Interpretation");
  console.log("============================================================");
  console.log("- Main-thread work blocks the event loop while it runs.");
  console.log("- Worker-thread work keeps CPU work off the main thread.");
  console.log(
    "- Parallel workers reduce wall-clock time when multiple jobs run.",
  );
  console.log("- Event loop lag stays low when heavy CPU work is offloaded.");
};

main().catch((error) => {
  console.error("Benchmark failed:");
  console.error(error);
  process.exitCode = 1;
});
