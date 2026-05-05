import test from "node:test";
import assert from "node:assert/strict";
import { researchToCsv, researchToPdf } from "../src/services/exportService.js";

const researchCase = {
  id: "00000000-0000-4000-8000-000000000000",
  address: "Calle de Alcalá 48, Madrid",
  owner: {
    label: "Nicht öffentlich bekannt",
    name: null,
    message: "Kein offizieller Eigentümername gefunden."
  },
  sources: [
    {
      name: "Catastro",
      category: "official",
      trafficLight: "green",
      status: "checked",
      messages: ["Objektdaten gefunden."],
      evidence: [{ label: "Referencia Catastral", value: "9872023VH5797S0001WX" }]
    }
  ]
};

test("CSV Export enthält nur dokumentierte Recherchefelder", () => {
  const csv = researchToCsv(researchCase);
  assert.match(csv, /Recherche-ID/);
  assert.match(csv, /Nicht öffentlich bekannt/);
  assert.match(csv, /9872023VH5797S0001WX/);
});

test("PDF Export erzeugt PDF-Dateiinhalt", () => {
  const pdf = researchToPdf(researchCase);
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
});
