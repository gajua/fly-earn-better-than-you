#!/usr/bin/env node
/**
 * stop — run completion gates with local binaries (avoid broken pnpm shims).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const rootBin = (...parts) =>
  path.join(process.cwd(), "node_modules", ".bin", ...parts);

const run = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
  });
  return result.status === 0;
};

let ok = true;
ok = run(rootBin("eslint"), [".", "--max-warnings", "0"]) && ok;
ok = run(process.execPath, ["scripts/typecheck.mjs"]) && ok;
ok =
  run(rootBin("vitest"), [
    "run",
    "packages",
    "apps/desktop/src",
    "apps/extension/src",
    "--exclude",
    "**/template/**",
  ]) && ok;
ok = run(process.execPath, ["apps/extension/scripts/build.mjs"]) && ok;

const python = path.join(
  process.cwd(),
  "services",
  "brain",
  ".venv",
  "bin",
  "python",
);
if (existsSync(python)) {
  ok = run(python, ["-m", "pytest", "-q", "services/brain/tests"]) && ok;
}

const cargoToml = path.join(
  process.cwd(),
  "apps",
  "desktop",
  "src-tauri",
  "Cargo.toml",
);
if (existsSync(cargoToml) && spawnSync("cargo", ["--version"]).status === 0) {
  ok =
    run("cargo", [
      "test",
      "--manifest-path",
      "apps/desktop/src-tauri/Cargo.toml",
    ]) && ok;
}

if (!ok) {
  process.stdout.write(
    JSON.stringify({
      followup_message:
        "Completion gates failed (lint/typecheck/test/build). Fix before claiming done.",
    }),
  );
  process.exit(0);
}

process.stdout.write("{}\n");
process.exit(0);
