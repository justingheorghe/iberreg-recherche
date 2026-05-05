import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function boolFromEnv(value, fallback) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "ja", "on"].includes(String(value).toLowerCase());
}

function intFromEnv(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  rootDir,
  publicDir: path.join(rootDir, "public"),
  sharedDir: path.join(rootDir, "shared"),
  port: intFromEnv(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  externalLookupsEnabled: boolFromEnv(process.env.EXTERNAL_LOOKUPS_ENABLED, true),
  catastroTimeoutMs: intFromEnv(process.env.CATASTRO_TIMEOUT_MS, 4500),
  catastroPublicBaseUrl:
    process.env.CATASTRO_PUBLIC_BASE_URL ??
    "https://ovc.catastro.meh.es/ovcservweb/ovcswlocalizacionrc/ovccallejero.asmx",
  dataFile: path.resolve(rootDir, process.env.DATA_FILE ?? "./data/recherchen.jsonl"),
  databaseUrl: process.env.DATABASE_URL,
  retentionDays: intFromEnv(process.env.RETENTION_DAYS, 30)
};
