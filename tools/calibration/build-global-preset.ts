/**
 * Offline calibration tooling.
 *
 * Usage (from repo root, with Node 22+):
 *   node --experimental-strip-types tools/calibration/build-global-preset.ts ./path/to/observations.json
 *
 * Or import from @fly/core in tests — these scripts are thin wrappers.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildGlobalPresetCandidate,
  observationToSample,
  type AnonymousPaperObservation,
} from "../../packages/core/src/calibration/index.ts";

const inputPath = resolve(
  process.argv[2] ?? "tools/calibration/fixtures/synthetic-observations.json",
);
const outPath = resolve(
  process.argv[3] ?? "tools/calibration/out/candidate-preset.json",
);
const version = process.argv[4] ?? "1.1.0-candidate";

const raw = JSON.parse(
  readFileSync(inputPath, "utf8"),
) as AnonymousPaperObservation[];
const samples = raw
  .map((row) => observationToSample(row))
  .filter((row): row is NonNullable<typeof row> => row != null);

const result = await buildGlobalPresetCandidate({
  samples,
  presetVersion: version,
  generatedAt: new Date().toISOString(),
  minimumSamples: Math.min(500, Math.max(50, samples.length)),
});

writeFileSync(
  outPath,
  JSON.stringify(
    {
      gate: result.gate,
      rejectReasons: result.rejectReasons,
      train: result.train,
      validation: result.validation,
      holdout: result.holdout,
      preset: result.preset,
    },
    null,
    2,
  ),
);

console.log(
  JSON.stringify(
    {
      gate: result.gate,
      rejectReasons: result.rejectReasons,
      presetVersion: result.preset.presetVersion,
      buyThreshold: result.preset.buyThreshold,
      sellThreshold: result.preset.sellThreshold,
      checksumSha256: result.preset.checksumSha256,
      outPath,
    },
    null,
    2,
  ),
);
