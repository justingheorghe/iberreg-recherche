import Papa from "papaparse";

const ADDRESS_KEYWORDS = [
  "adresse", "address", "addr", "dirección", "direccion",
  "calle", "avenida", "avda", "plaza", "paseo", "rambla",
  "straße", "strasse", "str", "via", "carrer",
  "ubicación", "ubicacion", "localización", "localizacion", "location",
  "street", "ort", "lugar", "site", "domicilio"
];

const REF_CATASTRAL_KEYWORDS = [
  "referencia", "ref", "catastral", "refcat", "referencia_catastral",
  "catastro_ref", "rc"
];

function columnScore(header, keywords) {
  const lower = header.toLowerCase().trim();
  for (const keyword of keywords) {
    if (lower === keyword) return 10;
    if (lower.includes(keyword)) return 5;
  }
  return 0;
}

export function detectColumns(headers) {
  let addressColumn = null;
  let refCatastralColumn = null;
  let addressScore = 0;
  let refScore = 0;

  for (const header of headers) {
    const aScore = columnScore(header, ADDRESS_KEYWORDS);
    if (aScore > addressScore) {
      addressScore = aScore;
      addressColumn = header;
    }
    const rScore = columnScore(header, REF_CATASTRAL_KEYWORDS);
    if (rScore > refScore) {
      refScore = rScore;
      refCatastralColumn = header;
    }
  }

  if (!addressColumn && headers.length > 0) {
    addressColumn = headers[0];
  }

  return { addressColumn, refCatastralColumn };
}

export function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: results.data,
          errors: results.errors
        });
      },
      error: (error) => reject(error)
    });
  });
}

export function extractAddresses(rows, addressColumn, refCatastralColumn) {
  return rows
    .map((row, index) => {
      const address = (row[addressColumn] || "").trim();
      if (!address) return null;
      return {
        index,
        address,
        referenceCatastral: refCatastralColumn ? (row[refCatastralColumn] || "").trim() : null,
        originalRow: row
      };
    })
    .filter(Boolean);
}