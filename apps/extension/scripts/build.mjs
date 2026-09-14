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

const isE2E = process.env.E2E_TEST_MODE === "1";

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
  // Drop if(false) E2E host hooks from production bundles.
  minifySyntax: true,
  // Production builds keep this false so controlled-brain paths are inactive.
  define: {
    __FLY_E2E__: JSON.stringify(isE2E),
    __FLY_GLOBAL_LEARNING_ENABLED__: JSON.stringify(
      process.env.FLY_GLOBAL_LEARNING_ENABLED === "1",
    ),
    __FLY_SUPABASE_URL__: JSON.stringify(process.env.FLY_SUPABASE_URL ?? ""),
    __FLY_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(
      process.env.FLY_SUPABASE_PUBLISHABLE_KEY ?? "",
    ),
  },
});

await cp(path.join(packageDirectory, "public"), outputDirectory, {
  recursive: true,
});
