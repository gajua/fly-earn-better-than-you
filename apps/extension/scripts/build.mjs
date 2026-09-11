import * as esbuild from "esbuild";
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

await esbuild.build({
  entryPoints: {
    background: path.join(packageDirectory, "src/background.ts"),
    content: path.join(packageDirectory, "src/content.ts"),
    popup: path.join(packageDirectory, "src/popup.ts"),
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome116"],
  outdir: outputDirectory,
  sourcemap: true,
  logLevel: "info",
});

await cp(path.join(packageDirectory, "public"), outputDirectory, {
  recursive: true,
});
