import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(packageDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

execFileSync("tsc", ["--project", "tsconfig.json"], {
  cwd: packageDirectory,
  stdio: "inherit",
});

await cp(path.join(packageDirectory, "public"), outputDirectory, {
  recursive: true,
});
