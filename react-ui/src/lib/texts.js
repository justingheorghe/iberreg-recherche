export const TEXT = {
  appName: "IberReg Recherche",
  claim: "Offizielle spanische Immobilieninformationen rechtssicher einordnen",
  search: {
    label: "Spanische Immobilienadresse",
    placeholder: "z. B. Calle de Alcalá 48, Madrid, Madrid, España",
    hint: "Die Software nutzt ausschließlich legale und offizielle Recherchewege.",
    examples: [
      "Calle de Alcalá 48, Madrid, Madrid, España",
      "Avenida Diagonal 640, Barcelona, Barcelona, España",
      "9872023VH5797S0001WX"
    ],
    button: "Adresse prüfen",
    loading: "Recherche wird gestartet..."
  },
  csv: {
    title: "CSV-Datei durchsuchen",
    description: "Laden Sie eine CSV-Datei hoch, um mehrere Adressen gleichzeitig zu prüfen. Die App erkennt automatisch die Adressspalte.",
    uploadButton: "CSV-Datei auswählen",
    dropZone: "CSV-Datei hierher ziehen oder klicken",
    detectedColumns: "Erkannte Spalten",
    addressColumn: "Adressspalte",
    refCatastralColumn: "Referencia-Catastral-Spalte (optional)",
    preview: "Vorschau der zu prüfenden Adressen",
    rowsFound: "Zeilen gefunden",
    addressesDetected: "Adressen erkannt",
    startBatch: "Batch-Recherche starten",
    stopBatch: "Stoppen",
    batchProgress: "Fortschritt",
    rowStatus: {
      queued: "Wartend",
      running: "Wird geprüft...",
      completed: "Abgeschlossen",
      failed: "Fehlgeschlagen"
    }
  },
  nav: {
    newSearch: "Neue Recherche",
    themeLight: "Hell",
    themeDark: "Dunkel",
    singleSearch: "Einzelrecherche",
    batchSearch: "Batch-Recherche"
  },
  result: {
    title: "Rechercheübersicht",
    ownerTitle: "Eigentümerbewertung",
    noOwner: "Nicht öffentlich bekannt",
    confidence: "Sicherheit",
    exports: "Export",
    csv: "CSV",
    pdf: "PDF",
    official: "Offiziell verifizierte Daten",
    indicators: "Öffentlich auffindbare Indizien",
    unconfirmed: "Nicht bestätigte Treffer",
    emptyOfficial: "Noch keine offiziell bestätigten Eigentümerdaten vorhanden.",
    emptyIndicators: "Keine zusätzlichen öffentlichen Indizien dokumentiert.",
    emptyUnconfirmed: "Keine unbestätigten Treffer ausgegeben.",
    pending: "Quelle wird geprüft..."
  },
  traffic: {
    green: "Grün: offiziell bestätigt",
    yellow: "Gelb: möglicher Treffer / prüfen",
    red: "Rot: keine belastbare Bestätigung"
  },
  status: {
    queued: "Recherche wartet",
    running: "Quellen werden geprüft",
    completed: "Recherche abgeschlossen",
    failed: "Recherche fehlgeschlagen",
    pending: "Quelle wird geprüft",
    checked: "Geprüft",
    failedSource: "Quelle nicht erreichbar",
    action_required: "Manueller offizieller Schritt nötig"
  },
  compliance: {
    title: "Rechtliche Grenzen",
    items: [
      "Keine Rechtsberatung.",
      "Keine Garantie auf Vollständigkeit.",
      "Personenbezogene Daten nur im gesetzlich zulässigen Rahmen.",
      "Keine Speicherung sensibler Personendaten ohne Zweck und Rechtsgrundlage."
    ]
  },
  glossary: {
    title: "Glossar",
    items: [
      ["Nota Simple", "Informative Registerauskunft des Registro de la Propiedad."],
      ["Registro de la Propiedad", "Spanisches Grundbuchregister für dingliche Rechte an Immobilien."],
      ["Catastro", "Spanisches Kataster mit Objekt-, Lage- und Nutzungsdaten; Titularität ist geschützt."],
      ["Referencia Catastral", "Offizielle eindeutige Katasterreferenz eines Grundstücks oder Objekts."],
      ["Titularität", "Rechtliche Zuordnung einer Person oder Gesellschaft zu einem Recht am Objekt."]
    ]
  },
  errors: {
    generic: "Die Anfrage konnte nicht verarbeitet werden.",
    network: "Der Server ist gerade nicht erreichbar.",
    notFound: "Die Recherche wurde nicht gefunden."
  }
};