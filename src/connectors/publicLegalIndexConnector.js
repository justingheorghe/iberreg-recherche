import { createSourceResult } from "./base.js";

const SOURCE = {
  id: "public-legal-index",
  name: "Öffentliche Bekanntmachungen und legal nutzbare Verzeichnisse",
  officialUrl: "https://www.boe.es/"
};

export class PublicLegalIndexConnector {
  id = SOURCE.id;
  name = SOURCE.name;

  async run(context) {
    return createSourceResult({
      ...SOURCE,
      category: "public_indicator",
      trafficLight: "yellow",
      status: "checked",
      confidence: 0.25,
      evidence: [
        { label: "Adresse", value: context.address },
        { label: "Bewertung", value: "Öffentliche Bekanntmachungen können Hinweise enthalten, sind aber kein Eigentumsnachweis." }
      ],
      messages: [
        "Allgemeine Web- oder Bekanntmachungstreffer werden nicht als Eigentümerbestätigung gewertet.",
        "Die produktive Suche sollte nur Quellen verwenden, deren Nutzungsbedingungen automatisierte Abfragen erlauben.",
        "Für diese lokale Version wird kein personenbezogenes Web-Scraping ausgeführt."
      ],
      legalNotes: [
        "Treffer aus Bekanntmachungen können veraltet, kontextgebunden oder personenbezogen sensibel sein.",
        "Eine offizielle Registerquelle hat Vorrang vor Indizien."
      ]
    });
  }
}
