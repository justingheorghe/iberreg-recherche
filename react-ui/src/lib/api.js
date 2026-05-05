const BASE = "/api";

export async function createResearch(address) {
  const response = await fetch(`${BASE}/recherchen`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.details?.join(" ") || payload.error?.message || "Die Anfrage konnte nicht verarbeitet werden.");
  }
  return payload;
}

export async function getResearch(id) {
  const response = await fetch(`${BASE}/recherchen/${id}`);
  if (!response.ok) throw new Error("Recherche nicht gefunden.");
  return response.json();
}

export async function listResearch() {
  const response = await fetch(`${BASE}/recherchen`);
  if (!response.ok) throw new Error("Recherchen konnten nicht geladen werden.");
  return response.json();
}

export function getExportUrl(id, format) {
  return `${BASE}/recherchen/${id}/export.${format}`;
}

export async function checkHealth() {
  const response = await fetch(`${BASE}/health`);
  if (!response.ok) throw new Error("Server nicht erreichbar.");
  return response.json();
}

export function pollUntilDone(id, { interval = 900, maxAttempts = 120 } = {}) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      if (attempts > maxAttempts) {
        clearInterval(timer);
        reject(new Error("Recherche hat zu lange gedauert."));
        return;
      }
      try {
        const data = await getResearch(id);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(timer);
          resolve(data);
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, interval);
  });
}