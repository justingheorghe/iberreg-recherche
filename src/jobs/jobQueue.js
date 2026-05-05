import { logger } from "../lib/logger.js";

export class InMemoryJobQueue {
  constructor() {
    this.jobs = new Map();
  }

  enqueue(id, task) {
    this.jobs.set(id, { id, status: "running", startedAt: new Date().toISOString() });
    queueMicrotask(async () => {
      try {
        await task();
        this.jobs.set(id, { id, status: "completed", finishedAt: new Date().toISOString() });
      } catch (error) {
        logger.error("Recherche-Job fehlgeschlagen.", { id, error: error.message });
        this.jobs.set(id, {
          id,
          status: "failed",
          error: error.message,
          finishedAt: new Date().toISOString()
        });
      }
    });
  }

  get(id) {
    return this.jobs.get(id) ?? null;
  }
}
