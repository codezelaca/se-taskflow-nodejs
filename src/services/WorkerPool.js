const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { Worker } = require("worker_threads");

class WorkerPool {
  constructor(options = {}) {
    const cpuCount = os.cpus().length;

    this.poolSize = options.poolSize || Math.max(1, Math.min(cpuCount - 1, 4));
    this.maxQueueSize = options.maxQueueSize || 100;
    this.jobTimeoutMs = options.jobTimeoutMs || 30000;
    this.workerScriptPath =
      options.workerScriptPath ||
      path.join(__dirname, "..", "workers", "cpuWorker.js");

    this.workers = [];
    this.jobQueue = [];
    this.jobs = new Map();
    this.isShuttingDown = false;

    for (let i = 0; i < this.poolSize; i += 1) {
      this._spawnWorker();
    }
  }

  _spawnWorker() {
    const worker = new Worker(this.workerScriptPath);
    const workerState = {
      worker,
      isBusy: false,
      currentJobId: null,
    };

    worker.on("message", (message) =>
      this._handleWorkerMessage(workerState, message),
    );
    worker.on("error", (error) => this._handleWorkerError(workerState, error));
    worker.on("exit", (code) => this._handleWorkerExit(workerState, code));

    this.workers.push(workerState);
  }

  _handleWorkerMessage(workerState, message) {
    const { type, jobId } = message;
    const job = this.jobs.get(jobId);

    if (!job) {
      workerState.isBusy = false;
      workerState.currentJobId = null;
      this._dispatch();
      return;
    }

    clearTimeout(job.timeoutHandle);

    if (type === "job_completed") {
      job.status = "completed";
      job.finishedAt = new Date().toISOString();
      job.output = {
        result: message.result,
        durationMs: message.durationMs,
        iterations: message.iterations,
        threadId: message.threadId,
      };
      job.resolve(job.output);
    } else {
      job.status = "failed";
      job.finishedAt = new Date().toISOString();
      job.error = message.message || "Worker failed to process the job.";
      job.reject(new Error(job.error));
    }

    workerState.isBusy = false;
    workerState.currentJobId = null;
    this._dispatch();
  }

  _handleWorkerError(workerState, error) {
    const { currentJobId } = workerState;
    if (!currentJobId) {
      return;
    }

    const job = this.jobs.get(currentJobId);
    if (!job) {
      return;
    }

    clearTimeout(job.timeoutHandle);
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.error = `Worker thread crashed: ${error.message}`;
    job.reject(new Error(job.error));

    workerState.isBusy = false;
    workerState.currentJobId = null;
  }

  _handleWorkerExit(workerState, code) {
    const workerIndex = this.workers.indexOf(workerState);
    if (workerIndex >= 0) {
      this.workers.splice(workerIndex, 1);
    }

    if (workerState.currentJobId) {
      const job = this.jobs.get(workerState.currentJobId);
      if (job && job.status !== "completed" && job.status !== "failed") {
        clearTimeout(job.timeoutHandle);
        job.status = "failed";
        job.finishedAt = new Date().toISOString();
        job.error = `Worker exited unexpectedly with code ${code}.`;
        job.reject(new Error(job.error));
      }
    }

    if (!this.isShuttingDown) {
      this._spawnWorker();
      this._dispatch();
    }
  }

  _getIdleWorker() {
    return this.workers.find((workerState) => !workerState.isBusy);
  }

  _dispatch() {
    if (this.isShuttingDown) {
      return;
    }

    while (this.jobQueue.length > 0) {
      const idleWorker = this._getIdleWorker();
      if (!idleWorker) {
        return;
      }

      const nextJobId = this.jobQueue.shift();
      const job = this.jobs.get(nextJobId);
      if (!job || job.status !== "queued") {
        continue;
      }

      job.status = "running";
      job.startedAt = new Date().toISOString();

      idleWorker.isBusy = true;
      idleWorker.currentJobId = nextJobId;

      job.timeoutHandle = setTimeout(() => {
        const timeoutMessage = `Worker job timed out after ${this.jobTimeoutMs}ms.`;
        job.status = "failed";
        job.finishedAt = new Date().toISOString();
        job.error = timeoutMessage;
        job.reject(new Error(timeoutMessage));

        idleWorker.worker.terminate();
      }, this.jobTimeoutMs);

      idleWorker.worker.postMessage({
        jobId: nextJobId,
        iterations: job.input.iterations,
      });
    }
  }

  submitCpuJob(iterations) {
    if (this.isShuttingDown) {
      throw new Error("Worker pool is shutting down.");
    }

    if (this.jobQueue.length >= this.maxQueueSize) {
      throw new Error("Worker queue is full. Try again later.");
    }

    const normalizedIterations = Number(iterations);
    if (!Number.isFinite(normalizedIterations) || normalizedIterations <= 0) {
      throw new Error("Iterations must be a positive number.");
    }

    const jobId = crypto.randomUUID();

    let resolveFn;
    let rejectFn;
    const completionPromise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    this.jobs.set(jobId, {
      jobId,
      status: "queued",
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      input: { iterations: normalizedIterations },
      output: null,
      error: null,
      timeoutHandle: null,
      resolve: resolveFn,
      reject: rejectFn,
    });

    this.jobQueue.push(jobId);
    this._dispatch();

    return {
      jobId,
      completionPromise,
    };
  }

  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      jobId: job.jobId,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      input: job.input,
      output: job.output,
      error: job.error,
    };
  }

  getStats() {
    const values = Array.from(this.jobs.values());

    return {
      poolSize: this.poolSize,
      workerCount: this.workers.length,
      activeWorkers: this.workers.filter((w) => w.isBusy).length,
      queuedJobs: this.jobQueue.length,
      maxQueueSize: this.maxQueueSize,
      totalJobs: values.length,
      completedJobs: values.filter((job) => job.status === "completed").length,
      failedJobs: values.filter((job) => job.status === "failed").length,
      runningJobs: values.filter((job) => job.status === "running").length,
      queuedJobCount: values.filter((job) => job.status === "queued").length,
    };
  }

  async shutdown() {
    this.isShuttingDown = true;

    for (const workerState of this.workers) {
      await workerState.worker.terminate();
    }

    this.workers = [];
  }
}

module.exports = WorkerPool;
