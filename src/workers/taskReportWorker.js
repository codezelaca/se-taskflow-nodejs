const { parentPort, threadId } = require("worker_threads");

// Build a report from a task array in parallel worker context.
const buildTaskReport = (tasks, heavyIterations = 0) => {
  const startedAt = Date.now();

  const byStatus = {
    pending: 0,
    "in-progress": 0,
    completed: 0,
    other: 0,
  };

  const byPriority = {
    high: 0,
    medium: 0,
    low: 0,
  };

  let blockedTasks = 0;
  let totalDependencies = 0;

  for (const task of tasks) {
    // Count status buckets.
    const status = task.status || "other";
    if (Object.prototype.hasOwnProperty.call(byStatus, status)) {
      byStatus[status] += 1;
    } else {
      byStatus.other += 1;
    }

    // Group priorities into simple learning-friendly buckets.
    const priorityValue = Number(task.priority || 0);
    if (priorityValue >= 8) {
      byPriority.high += 1;
    } else if (priorityValue >= 4) {
      byPriority.medium += 1;
    } else {
      byPriority.low += 1;
    }

    // Track dependency-related backlog metrics.
    const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
    totalDependencies += deps.length;
    if (deps.length > 0) {
      blockedTasks += 1;
    }
  }

  // Optional CPU load so the report path can be used in performance demos.
  let syntheticCpuScore = 0;
  for (let i = 0; i < heavyIterations; i += 1) {
    syntheticCpuScore += Math.sqrt((i % 1000) + 1) * Math.sin(i % 360);
  }

  const durationMs = Date.now() - startedAt;

  return {
    summary: {
      totalTasks: tasks.length,
      blockedTasks,
      unblockedTasks: tasks.length - blockedTasks,
      totalDependencies,
    },
    byStatus,
    byPriority,
    syntheticCpuScore: Number(syntheticCpuScore.toFixed(4)),
    generatedAt: new Date().toISOString(),
    durationMs,
  };
};

parentPort.on("message", (payload) => {
  const { jobId, input } = payload;

  try {
    const tasks = Array.isArray(input?.tasks) ? input.tasks : [];
    const heavyIterations = Math.max(0, Number(input?.heavyIterations || 0));

    const report = buildTaskReport(tasks, heavyIterations);

    // Send computed report back to the main thread.
    parentPort.postMessage({
      type: "job_completed",
      jobId,
      output: {
        threadId,
        ...report,
      },
    });
  } catch (error) {
    // Return worker-side failures in a structured format.
    parentPort.postMessage({
      type: "job_failed",
      jobId,
      threadId,
      message: error.message,
    });
  }
});
