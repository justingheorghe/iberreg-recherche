import { createSourceResult } from "./base.js";

const SOURCE = {
  id: "registro-propiedad-nota-simple",
  name: "Registro de la Propiedad - Nota Simple / Nota Online",
  officialUrl: "https://sede.registradores.org/site/propiedad?lang=es_ES"
};

export class RegistroPropiedadConnector {
  id = SOURCE.id;
  name = SOURCE.name;

  async run(context) {
    const evidence = [
      { label: "Offizieller Weg", value: "Nota Simple oder Nota Online beim Registro de la Propiedad" },
      { label: "Suchkriterium", value: context.referenceCatastral ? "Referencia Catastral" : "Adresse / Lageangaben" }
    ];

    if (context.referenceCatastral) {
      evidence.push({ label: "Referencia Catastral", value: context.referenceCatastral });
    }

    return createSourceResult({
      ...SOURCE,
      category: "official",
      trafficLight: "yellow",
      status: "action_required",
      confidence: 0.6,
      evidence,
      messages: [
        "Belastbare Eigentümerinformationen werden über eine offizielle Registerauskunft geprüft.",
        "Die App ruft keine geschützten Registerdaten ohne Antrag, Berechtigung oder Zahlungs-/Identifikationsprozess ab.",
        "Wenn die Registerauskunft später eine Titularität enthält, darf sie als offiziell bestätigter Treffer dokumentiert werden."
      ],
      legalNotes: [
        "Eine Nota Simple hat informativen Charakter und enthält üblicherweise Identifikation der Finca, Titularität und Rechte/Lasten.",
        "Ohne offizielle Auskunft wird kein Eigentümername behauptet."
      ]
    });
  }
}
