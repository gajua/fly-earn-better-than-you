#!/usr/bin/env node
/**
 * Production Chrome Web Store package.
 * Creates release/fly-earn-better-than-you-vX.Y.Z.zip with manifest.json at ZIP root.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = path.join(root, "apps/extension");
const distDir = path.join(extensionDir, "dist");
const releaseDir = path.join(root, "release");
const stagingDir = path.join(releaseDir, ".staging");

const manifest = JSON.parse(
  readFileSync(path.join(extensionDir, "public/manifest.json"), "utf8"),
);
const version = manifest.version;
const zipName = `fly-earn-better-than-you-v${version}.zip`;
const zipPath = path.join(releaseDir, zipName);

const FORBIDDEN = [
  /service_role/i,
  /SUPABASE_SERVICE_ROLE/i,
  /sb_secret_/i,
  /database.?password/i,
  /broker.?api.?secret/i,
  /private.?token/i,
  /__FLY_E2E__\s*[:=]\s*true/i,
  /E2E_TEST_MODE.?=.?1/,
  /flyE2EForce/i,
  /__flyE2EForce/i,
];

mkdirSync(releaseDir, { recursive: true });
rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

const env = {
  ...process.env,
  E2E_TEST_MODE: "0",
  FLY_GLOBAL_LEARNING_ENABLED: process.env.FLY_GLOBAL_LEARNING_ENABLED ?? "1",
  FLY_SUPABASE_URL:
    process.env.FLY_SUPABASE_URL ?? "https://sfimnzdjndmipmtlnniq.supabase.co",
  FLY_SUPABASE_PUBLISHABLE_KEY: process.env.FLY_SUPABASE_PUBLISHABLE_KEY ?? "",
};

if (!env.FLY_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "WARN: FLY_SUPABASE_PUBLISHABLE_KEY unset — Global Learning remote ingest disabled; bundled preset still works.",
  );
}

const build = spawnSync("node", ["scripts/build.mjs"], {
  cwd: extensionDir,
  env,
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(build.stdout);
  console.error(build.stderr);
  process.exit(build.status ?? 1);
}

const copyTree = (from, to) => {
  for (const entry of readdirSync(from)) {
    const src = path.join(from, entry);
    const dest = path.join(to, entry);
    if (statSync(src).isDirectory()) {
      mkdirSync(dest, { recursive: true });
      copyTree(src, dest);
      continue;
    }
    if (entry.endsWith(".map")) continue; // omit sourcemaps from store ZIP
    cpSync(src, dest);
  }
};

copyTree(distDir, stagingDir);

if (!existsSync(path.join(stagingDir, "manifest.json"))) {
  console.error("manifest.json missing at ZIP root staging");
  process.exit(1);
}

const scanDir = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      scanDir(full);
      continue;
    }
    if (!/\.(js|html|css|json|txt|md)$/i.test(entry)) continue;
    const text = readFileSync(full, "utf8");
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) {
        console.error(`FORBIDDEN pattern ${pattern} in ${full}`);
        process.exit(1);
      }
    }
  }
};
scanDir(stagingDir);

// Ensure E2E forcing API is fully eliminated from production JS
for (const entry of readdirSync(stagingDir)) {
  if (!entry.endsWith(".js")) continue;
  const text = readFileSync(path.join(stagingDir, entry), "utf8");
  if (
    text.includes("flyE2EForce") ||
    text.includes("__flyE2EForce") ||
    /__FLY_E2E__\s*[:=]\s*true/.test(text)
  ) {
    console.error(`E2E forcing API leaked into production ${entry}`);
    process.exit(1);
  }
}

rmSync(zipPath, { force: true });
const zip = spawnSync("zip", ["-r", "-X", zipPath, "."], {
  cwd: stagingDir,
  encoding: "utf8",
});
if (zip.status !== 0) {
  console.error(zip.stderr);
  process.exit(zip.status ?? 1);
}

rmSync(stagingDir, { recursive: true, force: true });

const listing = spawnSync("unzip", ["-l", zipPath], { encoding: "utf8" });
const hasRootManifest = listing.stdout
  .split("\n")
  .some((line) => /\smanifest\.json\s*$/.test(line) && !line.includes("/"));
if (!hasRootManifest) {
  // unzip -l shows "manifest.json" without path prefix when at root
  const names = listing.stdout
    .split("\n")
    .map((line) => line.trim().split(/\s+/).pop())
    .filter(Boolean);
  if (!names.includes("manifest.json")) {
    console.error("ZIP does not contain root manifest.json");
    console.error(listing.stdout);
    process.exit(1);
  }
}

writeFileSync(
  path.join(releaseDir, `fly-earn-better-than-you-v${version}.sha256.txt`),
  `${spawnSync("shasum", ["-a", "256", zipPath], { encoding: "utf8" }).stdout}`,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      version,
      zipPath: path.relative(root, zipPath),
      bytes: statSync(zipPath).size,
      globalLearningEnabled: env.FLY_GLOBAL_LEARNING_ENABLED === "1",
      supabaseConfigured: Boolean(env.FLY_SUPABASE_PUBLISHABLE_KEY),
    },
    null,
    2,
  ),
);
