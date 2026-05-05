export function createSourceResult(overrides) {
  return {
    id: overrides.id,
    name: overrides.name,
    category: overrides.category ?? "official",
    trafficLight: overrides.trafficLight ?? "yellow",
    status: overrides.status ?? "checked",
    confidence: overrides.confidence ?? 0,
    ownerName: overrides.ownerName ?? null,
    officialUrl: overrides.officialUrl ?? null,
    evidence: overrides.evidence ?? [],
    messages: overrides.messages ?? [],
    fetchedAt: new Date().toISOString(),
    legalNotes: overrides.legalNotes ?? []
  };
}

export function failedSourceResult({ id, name, officialUrl, message, category = "official" }) {
  return createSourceResult({
    id,
    name,
    officialUrl,
    category,
    trafficLight: "red",
    status: "failed",
    confidence: 0,
    messages: [message],
    legalNotes: ["Es wurden keine Daten erfunden oder als bestätigt dargestellt."]
  });
}
