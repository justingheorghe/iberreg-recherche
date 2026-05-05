function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function researchToCsv(researchCase) {
  const rows = [
    ["Feld", "Wert"],
    ["Recherche-ID", researchCase.id],
    ["Adresse", researchCase.address],
    ["Status Eigentümer", researchCase.owner.label],
    ["Eigentümername", researchCase.owner.name ?? "Nicht öffentlich bekannt"],
    [],
    ["Quelle", "Kategorie", "Ampel", "Status", "Aussage"]
  ];

  for (const source of researchCase.sources) {
    rows.push([
      source.name,
      categoryLabel(source.category),
      trafficLabel(source.trafficLight),
      statusLabel(source.status),
      source.messages.join(" ")
    ]);
    for (const item of source.evidence) {
      rows.push([`  ${item.label}`, item.value]);
    }
  }

  return rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
}

function categoryLabel(value) {
  const labels = {
    official: "Offizielle Quelle",
    public_indicator: "Öffentliches Indiz",
    unconfirmed: "Nicht bestätigter Treffer"
  };
  return labels[value] ?? value;
}

function trafficLabel(value) {
  const labels = {
    green: "Grün",
    yellow: "Gelb",
    red: "Rot"
  };
  return labels[value] ?? value;
}

function statusLabel(value) {
  const labels = {
    pending: "Quelle wird geprüft",
    checked: "Geprüft",
    failed: "Quelle nicht erreichbar",
    action_required: "Manueller offizieller Schritt nötig"
  };
  return labels[value] ?? value;
}

export function researchToPdf(researchCase) {
  const lines = [
    "Spanische Immobilienrecherche",
    `Recherche-ID: ${researchCase.id}`,
    `Adresse: ${researchCase.address}`,
    `Eigentümer: ${researchCase.owner.name ?? "Nicht öffentlich bekannt"}`,
    `Bewertung: ${researchCase.owner.message}`,
    "",
    "Quellenübersicht:",
    ...researchCase.sources.flatMap((source) => [
      `${source.name} [${trafficLabel(source.trafficLight)}]`,
      ...source.messages.map((message) => `- ${message}`)
    ])
  ];

  return createMinimalPdf(lines);
}

function createMinimalPdf(lines) {
  const objects = [];
  const escapedLines = lines.map((line) => escapePdfText(line).slice(0, 140));
  const content = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    "14 TL",
    ...escapedLines.map((line, index) => `${index === 0 ? "" : "T* "}${index === 0 ? `(${line}) Tj` : `(${line}) Tj`}`),
    "ET"
  ].join("\n");

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

function escapePdfText(value) {
  return String(value)
    .replace(/[^\x20-\x7EÄÖÜäöüß]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
