import { URL } from "node:url";
import { config } from "../src/config.js";
import { createErrorPayload, readJsonBody, sendJson, sendText } from "../src/lib/http.js";
import { logger } from "../src/lib/logger.js";
import { createResearchRepository } from "../src/repositories/researchRepository.js";
import { ResearchService } from "../src/services/researchService.js";
import { researchToCsv, researchToPdf } from "../src/services/exportService.js";

let researchService;
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const repository = await createResearchRepository();
  researchService = new ResearchService(repository);
  initialized = true;
}

export default async function handler(req, res) {
  await ensureInitialized();

  try {
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
      try {
        const completed = await researchService.runCase(researchCase.id);
        sendJson(res, 200, completed, {
          location: `/api/recherchen/${completed.id}`
        });
      } catch (error) {
        logger.error("Recherche fehlgeschlagen.", { id: researchCase.id, error: error.message });
        const failedCase = await researchService.getCase(researchCase.id);
        sendJson(res, 200, {
          ...(failedCase || researchCase),
          status: "failed",
          auditLog: [
            ...(failedCase || researchCase).auditLog,
            { type: "case_failed", message: error.message, sourceId: "system", time: new Date().toISOString() }
          ]
        });
      }
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

    sendJson(res, 404, createErrorPayload("Nicht gefunden."));
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
}