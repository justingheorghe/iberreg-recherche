import { config } from "../config.js";
import { createSourceResult, failedSourceResult } from "./base.js";
import { parseSpanishAddress } from "../lib/validation.js";

const SOURCE = {
  id: "catastro-public",
  name: "Sede Electrónica del Catastro - nicht geschützte Daten",
  officialUrl: "https://www.sedecatastro.gob.es/"
};

export class CatastroPublicConnector {
  id = SOURCE.id;
  name = SOURCE.name;

  async run(context) {
    if (!config.externalLookupsEnabled) {
      return createSourceResult({
        ...SOURCE,
        trafficLight: "yellow",
        status: "action_required",
        confidence: 0.2,
        evidence: [
          { label: "Quelle", value: "Offizielle Catastro-Suche ist vorbereitet, aber in dieser Umgebung deaktiviert." }
        ],
        messages: [
          "Die freie Catastro-Abfrage wurde nicht ausgeführt, weil EXTERNAL_LOOKUPS_ENABLED=false gesetzt ist.",
          "Catastro-Titularität und Katasterwerte sind geschützte Daten und werden in der freien Abfrage nicht ausgegeben."
        ],
        legalNotes: [
          "Freier Zugriff umfasst nicht geschützte Daten wie Lage, Referencia Catastral und Objektmerkmale.",
          "Namen von Katastertitularen sind geschützte personenbezogene Daten."
        ]
      });
    }

    try {
      const request = buildCatastroRequest(context);
      if (!request) {
        return createSourceResult({
          ...SOURCE,
          trafficLight: "yellow",
          status: "action_required",
          confidence: 0.35,
          evidence: [
            { label: "Eingabe", value: context.address },
            { label: "Nächster Schritt", value: "Adresse mit Provinz, Gemeinde, Straße und Hausnummer präzisieren." }
          ],
          messages: [
            "Die Adresse konnte nicht sicher genug in Catastro-Parameter zerlegt werden.",
            "Bitte prüfen Sie die Referencia Catastral direkt in der offiziellen Catastro-Suche."
          ],
          legalNotes: [
            "Kein Eigentümername wurde ermittelt oder behauptet.",
            "Die manuelle Catastro-Suche darf nur nicht geschützte Daten frei anzeigen."
          ]
        });
      }

      const xml = await fetchTextWithTimeout(request.url, config.catastroTimeoutMs);
      const parsed = parseCatastroXml(xml);

      if (parsed.error) {
        return createSourceResult({
          ...SOURCE,
          trafficLight: "yellow",
          status: "checked",
          confidence: 0.25,
          evidence: [
            { label: "Catastro-Antwort", value: parsed.error },
            { label: "Abfragetyp", value: request.type }
          ],
          messages: [
            "Catastro hat keine frei verwertbare eindeutige Objektinformation zur Eingabe geliefert.",
            "Eigentümerinformationen sind in dieser freien Quelle nicht enthalten."
          ],
          legalNotes: ["Es wurden nur nicht geschützte Catastro-Daten abgefragt."]
        });
      }

      const evidence = [
        { label: "Abfragetyp", value: request.type },
        ...parsed.references.map((reference) => ({ label: "Referencia Catastral", value: reference })),
        ...parsed.addresses.map((address) => ({ label: "Catastro-Adresse", value: address })),
        ...parsed.attributes
      ];

      return createSourceResult({
        ...SOURCE,
        trafficLight: parsed.references.length > 0 ? "green" : "yellow",
        status: "checked",
        confidence: parsed.references.length > 0 ? 0.82 : 0.45,
        evidence,
        messages: [
          parsed.references.length > 0
            ? "Offizielle Catastro-Daten zum Objekt wurden gefunden. Diese Daten bestätigen nicht automatisch den Eigentümer."
            : "Catastro lieferte keine eindeutige Referencia Catastral.",
          "Catastro-Titularität und Katasterwerte sind geschützte Daten und werden ohne Berechtigung nicht angezeigt."
        ],
        legalNotes: [
          "Freie Catastro-Daten dürfen als Objekt- und Lageindiz genutzt werden.",
          "Die Catastro-Quelle allein ist kein belastbarer Eigentümernachweis."
        ]
      });
    } catch (error) {
      return failedSourceResult({
        ...SOURCE,
        message:
          "Die offizielle Catastro-Quelle konnte technisch nicht abgefragt werden. Bitte versuchen Sie es später erneut oder prüfen Sie die Adresse manuell in der Sede Electrónica del Catastro."
      });
    }
  }
}

function buildCatastroRequest(context) {
  const base = config.catastroPublicBaseUrl.replace(/\/$/, "");
  if (context.referenceCatastral) {
    const url = new URL(`${base}/Consulta_DNPRC`);
    url.searchParams.set("Provincia", "");
    url.searchParams.set("Municipio", "");
    url.searchParams.set("RC", context.referenceCatastral);
    return { type: "Referencia Catastral", url };
  }

  const parsed = parseSpanishAddress(context.address);
  if (!parsed.province || !parsed.municipality || !parsed.streetName || !parsed.number) {
    return null;
  }

  const url = new URL(`${base}/Consulta_DNPLOC`);
  url.searchParams.set("Provincia", parsed.province);
  url.searchParams.set("Municipio", parsed.municipality);
  url.searchParams.set("Sigla", parsed.streetType);
  url.searchParams.set("Calle", parsed.streetName);
  url.searchParams.set("Numero", parsed.number);
  url.searchParams.set("Bloque", "");
  url.searchParams.set("Escalera", "");
  url.searchParams.set("Planta", "");
  url.searchParams.set("Puerta", "");
  return { type: "Adresse", url };
}

async function fetchTextWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "SpanienEigentuemerRecherche/1.0 (+legal-tech; non-protected public data)"
      }
    });
    if (!response.ok) {
      throw new Error(`Catastro HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseCatastroXml(xml) {
  const error = extractTag(xml, "err") || extractTag(xml, "des");
  const references = [...new Set([...extractRcBlocks(xml), ...extractFullTags(xml, "rc")])].filter(Boolean);
  const addresses = [...new Set([...extractFullTags(xml, "ldt"), ...extractFullTags(xml, "dom")])].filter(Boolean);
  const attributes = [];

  const use = extractTag(xml, "luso");
  const surface = extractTag(xml, "sfc");
  const age = extractTag(xml, "ant");

  if (use) attributes.push({ label: "Nutzung", value: use });
  if (surface) attributes.push({ label: "Fläche", value: `${surface} m2` });
  if (age) attributes.push({ label: "Baujahr/Alter", value: age });

  return {
    error: references.length === 0 ? error : null,
    references,
    addresses,
    attributes
  };
}

function extractTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  if (!match) return null;
  return stripXml(match[1]);
}

function extractFullTags(xml, tagName) {
  return [...xml.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"))]
    .map((match) => stripXml(match[1]))
    .filter(Boolean);
}

function extractRcBlocks(xml) {
  return [...xml.matchAll(/<rc[^>]*>([\s\S]*?)<\/rc>/gi)]
    .map((match) => {
      const block = match[1];
      const pieces = ["pc1", "pc2", "car", "cc1", "cc2"].map((tag) => extractTag(block, tag)).filter(Boolean);
      return pieces.join("");
    })
    .filter((value) => value.length >= 14);
}

function stripXml(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#xD;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
