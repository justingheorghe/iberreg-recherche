const SPANISH_POSTCODE = /\b(?:0[1-9]|[1-4][0-9]|5[0-2])\d{3}\b/;
const CADASTRAL_REFERENCE = /\b[A-Z0-9]{7}\s?[A-Z0-9]{7}\s?[A-Z0-9]{4}\s?[A-Z0-9]{0,2}\b/i;

export function normalizeAddress(address) {
  return String(address ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s+/g, ", ");
}

export function extractCadastralReference(input) {
  const match = normalizeAddress(input).match(CADASTRAL_REFERENCE);
  if (!match) return null;
  const value = match[0].replace(/\s+/g, "").toUpperCase();
  return value.length >= 14 && value.length <= 20 ? value : null;
}

export function looksLikeSpanishAddress(input) {
  const value = normalizeAddress(input).toLowerCase();
  return (
    SPANISH_POSTCODE.test(value) ||
    /\b(españa|espana|spain)\b/.test(value) ||
    /\b(calle|c\/|avda|avenida|plaza|paseo|rambla|carretera|camino|gran via|travessera|carrer)\b/.test(value)
  );
}

export function validateSearchPayload(payload) {
  const address = normalizeAddress(payload?.address);
  const errors = [];

  if (!address) {
    errors.push("Bitte geben Sie eine spanische Immobilienadresse ein.");
  }

  if (address && address.length < 5) {
    errors.push("Die Adresse ist zu kurz für eine seriöse Recherche.");
  }

  if (address.length > 260) {
    errors.push("Die Adresse ist zu lang. Bitte kürzen Sie sie auf die relevanten Adressbestandteile.");
  }

  if (address && !looksLikeSpanishAddress(address) && !extractCadastralReference(address)) {
    errors.push("Die Eingabe wirkt nicht wie eine spanische Adresse oder Referencia Catastral.");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      address,
      referenceCatastral: extractCadastralReference(address)
    }
  };
}

export function parseSpanishAddress(input) {
  const normalized = normalizeAddress(input);
  const withoutCountry = normalized.replace(/,\s*(España|Espana|Spain)$/i, "");
  const parts = withoutCountry.split(",").map((part) => part.trim()).filter(Boolean);
  const first = parts[0] ?? withoutCountry;
  const province = parts.length >= 3 ? parts.at(-1) : parts.at(-1) ?? "";
  const municipality = parts.length >= 2 ? parts.at(-2) : parts.at(-1) ?? "";

  const streetMatch = first.match(
    /^(?<type>calle|c\/|avenida|avda\.?|plaza|paseo|rambla|carretera|camino|carrer|travessera|gran via)\s+(?<name>.+?)(?:\s+(?<number>\d+[A-Z]?))?$/i
  );

  let streetType = "";
  let streetName = first;
  let number = "";

  if (streetMatch?.groups) {
    streetType = mapStreetType(streetMatch.groups.type);
    streetName = streetMatch.groups.name ?? first;
    number = streetMatch.groups.number ?? "";
  } else {
    const numberMatch = first.match(/^(?<name>.*?)[,\s]+(?<number>\d+[A-Z]?)$/i);
    if (numberMatch?.groups) {
      streetName = numberMatch.groups.name;
      number = numberMatch.groups.number;
    }
  }

  return {
    raw: normalized,
    province,
    municipality,
    streetType,
    streetName: streetName.trim(),
    number
  };
}

function mapStreetType(type) {
  const normalized = type.toLowerCase().replace(".", "");
  const map = {
    "calle": "CL",
    "c/": "CL",
    "avenida": "AV",
    "avda": "AV",
    "plaza": "PZ",
    "paseo": "PS",
    "rambla": "RB",
    "carretera": "CR",
    "camino": "CM",
    "carrer": "CL",
    "travessera": "TV",
    "gran via": "GV"
  };
  return map[normalized] ?? "";
}
