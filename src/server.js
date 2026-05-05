import http from "node:http";
import { URL } from "node:url";
import { config } from "./config.js";
import { createErrorPayload, readJsonBody, sendJson, sendText, serveStatic } from "./lib/http.js";
import { logger } from "./lib/logger.js";
import { createResearchRepository } from "./repositories/researchRepository.js";
import { InMemoryJobQueue } from "./jobs/jobQueue.js";
import { ResearchService } from "./services/researchService.js";
import { researchToCsv, researchToPdf } from "./services/exportService.js";

const repository = await createResearchRepository();
const researchService = new ResearchService(repository);
const queue = new InMemoryJobQueue();

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    logger.error("Request fehlgeschlagen.", {
      error: error.message,
      url: req.url,
      method: req.method
    });
    sendJson(
      res,
      error.statusCode ?? 500,
      createErrorPayload(error.statusCode ? error.message : "Ein unerwarteter Fehler ist aufgetreten.", error.details)
    );
  }
});

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      time: new Date().toISOString(),
      externalLookupsEnabled: config.externalLookupsEnabled
    });
    return;
  }

  if (url.pathname === "/api/recherchen" && req.method === "POST") {
    const payload = await readJsonBody(req);
    const researchCase = await researchService.createCase(payload);
    queue.enqueue(researchCase.id, () => researchService.runCase(researchCase.id));
    sendJson(res, 202, researchCase, {
      location: `/api/recherchen/${researchCase.id}`
    });
    return;
  }

  if (url.pathname === "/api/recherchen" && req.method === "GET") {
    const cases = await researchService.listCases();
    sendJson(res, 200, { items: cases });
    return;
  }

  const caseMatch = url.pathname.match(/^\/api\/recherchen\/([0-9a-f-]{36})(?:\/export\.(csv|pdf))?$/i);
  if (caseMatch && req.method === "GET") {
    const [, id, exportType] = caseMatch;
    const researchCase = await researchService.getCase(id);
    if (!researchCase) {
      sendJson(res, 404, createErrorPayload("Recherche nicht gefunden."));
      return;
    }

    if (exportType === "csv") {
      sendText(res, 200, researchToCsv(researchCase), "text/csv; charset=utf-8", {
        "content-disposition": `attachment; filename="recherche-${id}.csv"`
      });
      return;
    }

    if (exportType === "pdf") {
      const pdf = researchToPdf(researchCase);
      res.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="recherche-${id}.pdf"`,
        "cache-control": "no-store"
      });
      res.end(pdf);
      return;
    }

    sendJson(res, 200, researchCase);
    return;
  }

  if (url.pathname === "/api/queue" && req.method === "GET") {
    sendJson(res, 200, { jobs: [...queue.jobs.values()] });
    return;
  }

  const served = await serveStatic(res, config.publicDir, url.pathname);
  if (served) return;

  sendText(res, 404, "Nicht gefunden.");
}

server.listen(config.port, () => {
  logger.info("Spanien-Immobilienrecherche gestartet.", {
    port: config.port,
    url: `http://localhost:${config.port}`
  });
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM empfangen, Server wird beendet.");
  server.close(() => process.exit(0));
});
