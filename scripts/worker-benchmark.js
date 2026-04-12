const WorkerPool = require("../src/services/WorkerPool");

const DEFAULT_ITERATIONS = 900_000_000;
const DEFAULT_PARALLEL_JOBS = 4;

// Parse positive integer args with safe fallback values.
const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.floor(parsedValue);
};

// Same CPU workload used by worker demo so comparison is fair.
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

// Baseline: run jobs one after another on main thread.
const benchmarkSequentialMainThread = (iterations) => {
  const startedAt = Date.now();
  const firstRun = runBlockingCpuWork(iterations);
  const secondRun = runBlockingCpuWork(iterations);

  return {
    mode: "main-thread-sequential",
    iterationsPerJob: iterations,
    jobs: 2,
    jobDurationsMs: [firstRun.durationMs, secondRun.durationMs],
    totalDurationMs: Date.now() - startedAt,
  };
};

// Parallel mode: run jobs at the same time in worker threads.
const benchmarkWorkerThreadParallel = async (iterations, parallelJobs) => {
  const pool = new WorkerPool({
    poolSize: Math.max(2, parallelJobs),
    maxQueueSize: parallelJobs * 2,
    jobTimeoutMs: 120000,
  });
  const startedAt = Date.now();

  try {
    const jobs = [];
    for (let i = 0; i < parallelJobs; i += 1) {
      jobs.push(pool.submitCpuJob(iterations));
    }

    const results = await Promise.all(jobs.map((job) => job.completionPromise));

    return {
      mode: "worker-thread-parallel",
      iterationsPerJob: iterations,
      jobs: parallelJobs,
      totalDurationMs: Date.now() - startedAt,
      fastestJobMs: Math.min(...results.map((result) => result.durationMs)),
      slowestJobMs: Math.max(...results.map((result) => result.durationMs)),
      threadIds: results.map((result) => result.threadId),
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

  console.log("=== Worker Benchmark ===");
  console.log(`iterations=${iterations}, parallelJobs=${parallelJobs}`);

  const mainThreadResult = benchmarkSequentialMainThread(iterations);
  console.log(JSON.stringify(mainThreadResult, null, 2));

  const workerResult = await benchmarkWorkerThreadParallel(
    iterations,
    parallelJobs,
  );
  console.log(JSON.stringify(workerResult, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
