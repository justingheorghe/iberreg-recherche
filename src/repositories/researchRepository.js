import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export class FileResearchRepository {
  constructor(filePath = config.dataFile) {
    this.filePath = filePath;
    this.items = new Map();
    this.loaded = false;
  }

  async init() {
    if (this.loaded) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        const item = JSON.parse(line);
        this.items.set(item.id, item);
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  async save(researchCase) {
    await this.init();
    const next = {
      ...researchCase,
      updatedAt: new Date().toISOString()
    };
    this.items.set(next.id, next);
    await this.flush();
    return next;
  }

  async findById(id) {
    await this.init();
    return this.items.get(id) ?? null;
  }

  async list(limit = 50) {
    await this.init();
    return [...this.items.values()]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  async flush() {
    const lines = [...this.items.values()].map((item) => JSON.stringify(item));
    await fs.writeFile(this.filePath, `${lines.join("\n")}${lines.length ? "\n" : ""}`, "utf8");
  }
}

export class MemoryResearchRepository {
  constructor() {
    this.items = new Map();
  }

  async save(researchCase) {
    const next = {
      ...researchCase,
      updatedAt: new Date().toISOString()
    };
    this.items.set(next.id, next);
    return next;
  }

  async findById(id) {
    return this.items.get(id) ?? null;
  }

  async list(limit = 50) {
    return [...this.items.values()]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

export async function createResearchRepository() {
  if (config.databaseUrl) {
    try {
      const { PostgresResearchRepository } = await import("./postgresRepository.js");
      const repository = new PostgresResearchRepository(config.databaseUrl);
      await repository.init();
      logger.info("PostgreSQL-Persistenz aktiviert.");
      return repository;
    } catch (error) {
      logger.warn("PostgreSQL nicht verfuegbar, nutze lokale Datei-Persistenz.", {
        error: error.message
      });
    }
  }

  try {
    const repository = new FileResearchRepository();
    await repository.init();
    return repository;
  } catch (error) {
    logger.warn("Datei-Persistenz nicht verfuegbar, nutze In-Memory-Speicher.", {
      error: error.message
    });
    return new MemoryResearchRepository();
  }
}
