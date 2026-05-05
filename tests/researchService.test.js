import test from "node:test";
import assert from "node:assert/strict";
import { ResearchService, buildOwnerSummary } from "../src/services/researchService.js";
import { createSourceResult } from "../src/connectors/base.js";

class MemoryRepository {
  constructor() {
    this.items = new Map();
  }

  async save(item) {
    this.items.set(item.id, item);
    return item;
  }

  async findById(id) {
    return this.items.get(id) ?? null;
  }

  async list() {
    return [...this.items.values()];
  }
}

test("Eigentümer bleibt unbekannt, wenn keine offizielle Quelle einen Namen liefert", () => {
  const summary = buildOwnerSummary([
    createSourceResult({
      id: "catastro-public",
      name: "Catastro",
      trafficLight: "green",
      category: "official",
      ownerName: null
    })
  ]);

  assert.equal(summary.status, "not_publicly_known");
  assert.equal(summary.name, null);
});

test("offizieller grüner Treffer darf Eigentümername tragen", () => {
  const summary = buildOwnerSummary([
    createSourceResult({
      id: "official-upload",
      name: "Offizielle Registerauskunft",
      trafficLight: "green",
      category: "official",
      confidence: 0.95,
      ownerName: "Muster Inmuebles S.L."
    })
  ]);

  assert.equal(summary.status, "officially_confirmed");
  assert.equal(summary.name, "Muster Inmuebles S.L.");
});

test("ResearchService führt Connectoren aus und kategorisiert Ergebnisse", async () => {
  const connectors = [
    {
      id: "test-official",
      name: "Offizielle Testquelle",
      async run() {
        return createSourceResult({
          id: "test-official",
          name: "Offizielle Testquelle",
          trafficLight: "green",
          category: "official",
          confidence: 0.8,
          evidence: [{ label: "Referencia Catastral", value: "9872023VH5797S0001WX" }]
        });
      }
    }
  ];

  const service = new ResearchService(new MemoryRepository(), connectors);
  const created = await service.createCase({ address: "9872023VH5797S0001WX" });
  const completed = await service.runCase(created.id);

  assert.equal(completed.status, "completed");
  assert.equal(completed.categories.officialVerifiedData.length, 1);
  assert.equal(completed.owner.status, "not_publicly_known");
});
