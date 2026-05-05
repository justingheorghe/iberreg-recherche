import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"]
]);

export async function readJsonBody(req, limitBytes = 128_000) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > limitBytes) {
      const error = new Error("Payload zu gross.");
      error.statusCode = 413;
      throw error;
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Ungueltiges JSON.");
    error.statusCode = 400;
    throw error;
  }
}

export function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
}

export function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
}

export async function serveStatic(res, publicDir, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));
  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, "Zugriff verweigert.");
    return true;
  }

  try {
    const data = await fs.readFile(filePath);
    const mimeType = MIME_TYPES.get(path.extname(filePath)) ?? "application/octet-stream";
    res.writeHead(200, {
      "content-type": mimeType,
      "cache-control": mimeType.startsWith("text/html") ? "no-store" : "public, max-age=3600"
    });
    res.end(data);
    return true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return false;
  }
}

export function createErrorPayload(message, details = []) {
  return {
    error: {
      message,
      details
    }
  };
}
