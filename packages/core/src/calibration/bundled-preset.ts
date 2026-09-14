import type { GlobalCalibrationPreset } from "./global-types";

/**
 * Bundled GlobalCalibrationPreset v1.0.0.
 * Network-optional: Fly always works with this preset alone.
 * Local learning does not modify the MaleCNS connectome.
 */
export const BUNDLED_GLOBAL_PRESET = {
  schemaVersion: 1,
  presetVersion: "1.0.0",
  generatedAt: "2026-09-14T00:00:00.000Z",
  sampleCount: 0,
  buyThreshold: 0.82,
  sellThreshold: 0.82,
  confidenceThreshold: 0.8,
  proposalCooldownMs: 30_000,
  sensoryScale: {
    momentum: 1,
    volatility: 1,
    volumeStrength: 1,
    return: 1,
  },
  checksumSha256:
    "428468abfbd41a47c2a4c936e50281deec3e497d153588a0cd0d455bf5e4f158",
  metadata: {
    brainMode: "real-connectome",
    minimumSamples: 500,
    trainingWindow: "bootstrap-bundled",
    dataset: "male-cns:v1.0",
    source: "bundled-default",
    status: "published",
  },
} as const satisfies GlobalCalibrationPreset;
