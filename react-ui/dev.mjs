#!/usr/bin/env node
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, symlinkSync, rmSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;
const hasNonAscii = /[^\x00-\x7F]/.test(projectRoot);

if (!hasNonAscii) {
  const { createServer } = await import("vite");
  const server = await createServer({ root: projectRoot, configFile: resolve(projectRoot, "vite.config.js") });
  await server.listen();
  server.printUrls();
} else {
  const tmpDir = resolve(process.env.HOME || "/tmp", ".iberreg-react-ui-dev");

  console.log("Non-ASCII path detected. Using temp directory for dev server...");
  console.log(`Project: ${projectRoot}`);
  console.log(`Temp:    ${tmpDir}`);

  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  cpSync(resolve(projectRoot, "src"), resolve(tmpDir, "src"), { recursive: true });
  cpSync(resolve(projectRoot, "index.html"), resolve(tmpDir, "index.html"));
  cpSync(resolve(projectRoot, "vite.config.js"), resolve(tmpDir, "vite.config.js"));

  const pkg = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf-8"));
  writeFileSync(resolve(tmpDir, "package.json"), JSON.stringify(pkg, null, 2));

  const existingLock = resolve(projectRoot, "package-lock.json");
  if (existsSync(existingLock)) {
    cpSync(existingLock, resolve(tmpDir, "package-lock.json"));
  }

  const existingModules = resolve(projectRoot, "node_modules");
  if (existsSync(existingModules)) {
    try {
      symlinkSync(existingModules, resolve(tmpDir, "node_modules"));
    } catch {
      cpSync(existingModules, resolve(tmpDir, "node_modules"), { recursive: true });
    }
  } else {
    execSync("npm install", { cwd: tmpDir, stdio: "inherit" });
  }

  console.log(`\nStarting dev server from: ${tmpDir}`);
  console.log("Open http://localhost:5180 in your browser.\n");

  const child = spawn("npx", ["vite", "--port", "5180"], {
    cwd: tmpDir,
    stdio: "inherit",
    shell: true
  });

  child.on("exit", (code) => process.exit(code || 0));
}