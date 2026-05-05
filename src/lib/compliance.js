import { config } from "../config.js";
import { serverTexts } from "./texts.js";

export function createAuditEvent(type, message, sourceId = "system") {
  return {
    type,
    message,
    sourceId,
    time: new Date().toISOString()
  };
}

export function createComplianceEnvelope() {
  return {
    disclaimers: serverTexts.disclaimers,
    privacy: {
      purpose:
        "Recherche und Dokumentation rechtmäßig zugänglicher Informationen zu einer konkret eingegebenen spanischen Immobilienadresse.",
      retentionDays: config.retentionDays,
      sensitiveDataPolicy:
        "Eigentümernamen werden nur gespeichert, wenn sie aus einer belastbaren offiziellen Quelle stammen und die Verarbeitung zweckgebunden dokumentiert ist.",
      dataMinimization:
        "Die App speichert standardmäßig nur Adresse, Quellenstatus, technische Auditinformationen und legal bezogene Ergebnisdaten."
    }
  };
}
