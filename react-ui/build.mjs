#!/usr/bin/env node
import { build } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;
const tmpDir = resolve(process.env.HOME || "/tmp", ".iberreg-build-temp");
const hasNonAscii = /[^\x00-\x7F]/.test(projectRoot);

async function main() {
  if (hasNonAscii) {
    console.log("Non-ASCII path detected, building from temp directory...");
    console.log("Project root:", projectRoot);

    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(resolve(tmpDir, "src"), { recursive: true });

    cpSync(resolve(projectRoot, "src"), resolve(tmpDir, "src"), { recursive: true });
    cpSync(resolve(projectRoot, "index.html"), resolve(tmpDir, "index.html"));
    cpSync(resolve(projectRoot, "vite.config.js"), resolve(tmpDir, "vite.config.js"));

    const pkg = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf-8"));
    writeFileSync(resolve(tmpDir, "package.json"), JSON.stringify(pkg, null, 2));

    cpSync(resolve(projectRoot, "package-lock.json"), resolve(tmpDir, "package-lock.json"));

    const { execSync } = await import("node:child_process");
    execSync("npm install", { cwd: tmpDir, stdio: "inherit" });

    const distDir = resolve(tmpDir, "dist");

    await build({
      root: tmpDir,
      logLevel: "info",
      configFile: resolve(tmpDir, "vite.config.js"),
      build: {
        outDir: distDir,
        emptyOutDir: true
      }
    });

    const outDir = resolve(projectRoot, "dist");
    if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
    cpSync(distDir, outDir, { recursive: true });

    console.log("Build completed! Output in:", outDir);
  } else {
    console.log("Building...");
    await build({
      root: projectRoot,
      logLevel: "info",
      configFile: resolve(projectRoot, "vite.config.js"),
      build: {
        outDir: resolve(projectRoot, "dist"),
        emptyOutDir: true
      }
    });
    console.log("Build completed!");
  }
}

main().catch((error) => {
  console.error("Build failed:", error.message || error);
  process.exit(1);
});