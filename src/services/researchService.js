import crypto from "node:crypto";
import { config } from "../config.js";
import { serverTexts } from "../lib/texts.js";
import { createAuditEvent, createComplianceEnvelope } from "../lib/compliance.js";
import { normalizeAddress, validateSearchPayload } from "../lib/validation.js";
import { CatastroPublicConnector } from "../connectors/catastroPublicConnector.js";
import { RegistroPropiedadConnector } from "../connectors/registroPropiedadConnector.js";
import { PublicLegalIndexConnector } from "../connectors/publicLegalIndexConnector.js";

export class ResearchService {
  constructor(repository, connectors = defaultConnectors()) {
    this.repository = repository;
    this.connectors = connectors;
  }

  validate(payload) {
    return validateSearchPayload(payload);
  }

  async createCase(payload) {
    const validation = this.validate(payload);
    if (!validation.ok) {
      const error = new Error("Die Recherche konnte nicht gestartet werden.");
      error.statusCode = 422;
      error.details = validation.errors;
      throw error;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.retentionDays * 24 * 60 * 60 * 1000);
    const id = crypto.randomUUID();
    const researchCase = {
      id,
      address: validation.value.address,
      normalizedAddress: normalizeAddress(validation.value.address),
      referenceCatastral: validation.value.referenceCatastral,
      status: "queued",
      owner: buildOwnerSummary([]),
      sources: this.connectors.map((connector) => ({
        id: connector.id,
        name: connector.name,
        category: "official",
        trafficLight: "yellow",
        status: "pending",
        confidence: 0,
        ownerName: null,
        officialUrl: null,
        evidence: [],
        messages: ["Quelle wird geprüft..."],
        fetchedAt: null,
        legalNotes: []
      })),
      categories: {
        officialVerifiedData: [],
        publicIndicators: [],
        unconfirmedMatches: []
      },
      compliance: createComplianceEnvelope(),
      auditLog: [createAuditEvent("case_created", "Recherche wurde mit Datenminimierung angelegt.")],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    return this.repository.save(researchCase);
  }

  async runCase(id) {
    let researchCase = await this.repository.findById(id);
    if (!researchCase) {
      throw new Error("Recherche nicht gefunden.");
    }

    researchCase = await this.repository.save({
      ...researchCase,
      status: "running",
      auditLog: [
        ...researchCase.auditLog,
        createAuditEvent("case_running", "Recherche-Connectoren werden nacheinander ausgeführt.")
      ]
    });

    const context = {
      id: researchCase.id,
      address: researchCase.address,
      referenceCatastral: researchCase.referenceCatastral
    };

    const sourceResults = [];
    for (const connector of this.connectors) {
      const result = await connector.run(context);
      sourceResults.push(result);
      researchCase = await this.repository.save({
        ...researchCase,
        sources: mergeSourceResult(researchCase.sources, result),
        owner: buildOwnerSummary(sourceResults),
        categories: categorizeSources(sourceResults),
        auditLog: [
          ...researchCase.auditLog,
          createAuditEvent(
            "source_checked",
            `${result.name}: ${result.trafficLight.toUpperCase()} - ${result.status}`,
            result.id
          )
        ]
      });
    }

    return this.repository.save({
      ...researchCase,
      status: "completed",
      owner: buildOwnerSummary(sourceResults),
      categories: categorizeSources(sourceResults),
      auditLog: [
        ...researchCase.auditLog,
        createAuditEvent("case_completed", "Recherche abgeschlossen; Ergebnislogik angewendet.")
      ]
    });
  }

  async getCase(id) {
    return this.repository.findById(id);
  }

  async listCases() {
    return this.repository.list(25);
  }
}

export function defaultConnectors() {
  return [new CatastroPublicConnector(), new RegistroPropiedadConnector(), new PublicLegalIndexConnector()];
}

export function buildOwnerSummary(sourceResults) {
  const officialOwner = sourceResults.find(
    (source) => source.ownerName && source.category === "official" && source.trafficLight === "green"
  );

  if (officialOwner) {
    const isCertain = officialOwner.confidence >= 0.9;
    return {
      status: isCertain ? "officially_confirmed" : "official_but_uncertain",
      label: isCertain ? "Offiziell bestätigt" : "Offizieller Treffer, nicht 100 Prozent sicher",
      name: officialOwner.ownerName,
      confidence: officialOwner.confidence,
      sourceId: officialOwner.id,
      message: isCertain
        ? `Der Eigentümer wurde durch ${officialOwner.name} offiziell bestätigt.`
        : `${serverTexts.uncertain} Quelle: ${officialOwner.name}.`
    };
  }

  return {
    status: "not_publicly_known",
    label: "Nicht öffentlich bekannt",
    name: null,
    confidence: 0,
    sourceId: null,
    message: serverTexts.ownerNotPublic
  };
}

function mergeSourceResult(existingSources, result) {
  const next = existingSources.filter((source) => source.id !== result.id);
  next.push(result);
  return next.sort((a, b) => sourceOrder(a.id) - sourceOrder(b.id));
}

function sourceOrder(id) {
  const order = ["catastro-public", "registro-propiedad-nota-simple", "public-legal-index"];
  const index = order.indexOf(id);
  return index === -1 ? 99 : index;
}

export function categorizeSources(sourceResults) {
  return {
    officialVerifiedData: sourceResults.filter(
      (source) => source.category === "official" && source.trafficLight === "green"
    ),
    publicIndicators: sourceResults.filter(
      (source) => source.category === "public_indicator" || source.trafficLight === "yellow"
    ),
    unconfirmedMatches: sourceResults.filter(
      (source) => source.category === "unconfirmed" || source.trafficLight === "red"
    )
  };
}
