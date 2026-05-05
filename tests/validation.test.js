import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCadastralReference,
  normalizeAddress,
  parseSpanishAddress,
  validateSearchPayload
} from "../src/lib/validation.js";

test("normalisiert Adressen ohne Bedeutungsverlust", () => {
  assert.equal(normalizeAddress("  Calle de Alcalá   48 ,   Madrid "), "Calle de Alcalá 48, Madrid");
});

test("erkennt Referencia Catastral in freier Eingabe", () => {
  assert.equal(extractCadastralReference("Ref 9872023 VH5797S 0001 WX"), "9872023VH5797S0001WX");
});

test("validiert plausible spanische Adresse", () => {
  const result = validateSearchPayload({ address: "Calle de Alcalá 48, Madrid, Madrid, España" });
  assert.equal(result.ok, true);
});

test("weist offensichtlich unbrauchbare Eingaben ab", () => {
  const result = validateSearchPayload({ address: "abc" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 1);
});

test("zerlegt einfache spanische Adressen für Catastro-Parameter", () => {
  const parsed = parseSpanishAddress("Calle de Alcalá 48, Madrid, Madrid, España");
  assert.equal(parsed.streetType, "CL");
  assert.equal(parsed.streetName, "de Alcalá");
  assert.equal(parsed.number, "48");
  assert.equal(parsed.municipality, "Madrid");
  assert.equal(parsed.province, "Madrid");
});
