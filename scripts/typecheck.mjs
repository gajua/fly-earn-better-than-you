#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const packages = [
  "packages/core",
  "packages/broker-adapters",
  "packages/brain-client",
  "packages/fly-ui",
  "apps/extension",
  "apps/demo",
  "apps/desktop",
];

const tsc = path.join(
  process.cwd(),
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

for (const pkg of packages) {
  const result = spawnSync(
    process.execPath,
    [tsc, "-p", path.join(pkg, "tsconfig.json"), "--noEmit"],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
