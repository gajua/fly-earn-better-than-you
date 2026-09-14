import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateGlobalPreset,
  verifyPresetChecksum,
} from "../../packages/core/src/calibration/index.ts";

const path = resolve(
  process.argv[2] ?? "packages/core/calibration/global-v1.0.0.json",
);
const raw = JSON.parse(readFileSync(path, "utf8"));
const validated = validateGlobalPreset(raw);
if (!validated.ok) {
  console.error("INVALID", validated.reason);
  process.exit(1);
}
const checksumOk = await verifyPresetChecksum(validated.preset);
if (!checksumOk) {
  console.error("CHECKSUM_MISMATCH");
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      ok: true,
      presetVersion: validated.preset.presetVersion,
      status: validated.preset.metadata.status,
      sampleCount: validated.preset.sampleCount,
      checksumSha256: validated.preset.checksumSha256,
    },
    null,
    2,
  ),
);
