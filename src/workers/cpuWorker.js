const { parentPort, threadId } = require("worker_threads");

const runCpuIntensiveComputation = (iterations) => {
  const startedAt = Date.now();
  let accumulator = 0;

  // Intentionally CPU-heavy loop for demonstration.
  for (let i = 0; i < iterations; i += 1) {
    accumulator += Math.sqrt((i % 1000) + 1) * Math.sin(i % 360);
  }

  return {
    result: Number(accumulator.toFixed(4)),
    durationMs: Date.now() - startedAt,
  };
};

parentPort.on("message", (payload) => {
  const { jobId, input } = payload;

  try {
    const normalizedIterations = Number(input?.iterations);
    if (!Number.isFinite(normalizedIterations) || normalizedIterations <= 0) {
      throw new Error("Iterations must be a positive number.");
    }

    const { result, durationMs } =
      runCpuIntensiveComputation(normalizedIterations);

    parentPort.postMessage({
      type: "job_completed",
      jobId,
      output: {
        threadId,
        durationMs,
        iterations: normalizedIterations,
        result,
      },
    });
  } catch (error) {
    parentPort.postMessage({
      type: "job_failed",
      jobId,
      threadId,
      message: error.message,
    });
  }
});
