import { describe, expect, it } from "vitest";
import { BUNDLED_GLOBAL_PRESET } from "./bundled-preset";
import {
  applyGlobalPreset,
  assertAnonymousObservationSafe,
  attachChecksum,
  comparePresetVersions,
  validateGlobalPreset,
  verifyPresetChecksum,
} from "./global-preset";

describe("GlobalCalibrationPreset", () => {
  it("validates and verifies the bundled preset checksum", async () => {
    const validated = validateGlobalPreset(BUNDLED_GLOBAL_PRESET);
    expect(validated.ok).toBe(true);
    expect(await verifyPresetChecksum(BUNDLED_GLOBAL_PRESET)).toBe(true);
  });

  it("rejects checksum mismatch", async () => {
    const tampered = {
      ...BUNDLED_GLOBAL_PRESET,
      buyThreshold: 0.99,
    };
    expect(await verifyPresetChecksum(tampered)).toBe(false);
  });

  it("applies identical gates for the same preset", () => {
    const a = applyGlobalPreset(BUNDLED_GLOBAL_PRESET);
    const b = applyGlobalPreset(BUNDLED_GLOBAL_PRESET);
    expect(a).toEqual(b);
    expect(a.buyThreshold).toBe(0.82);
    expect(a.presetVersion).toBe("1.0.0");
  });

  it("compares versions and rejects unsafe observations", () => {
    expect(comparePresetVersions("1.2.0", "1.1.0")).toBeGreaterThan(0);
    const bad = assertAnonymousObservationSafe({
      schemaVersion: 1,
      brainMode: "real-connectome",
      password: "nope",
      action: "paper_buy",
    });
    expect(bad.ok).toBe(false);
  });

  it("attaches deterministic checksums", async () => {
    const { checksumSha256, ...rest } = BUNDLED_GLOBAL_PRESET;
    void checksumSha256;
    const again = await attachChecksum(rest);
    expect(again.checksumSha256).toBe(BUNDLED_GLOBAL_PRESET.checksumSha256);
  });

  it("rejects invalid remote schema", () => {
    expect(
      validateGlobalPreset({
        ...BUNDLED_GLOBAL_PRESET,
        schemaVersion: 99,
      }).ok,
    ).toBe(false);
  });

  it("accepts a safe anonymous paper observation", () => {
    const ok = assertAnonymousObservationSafe({
      schemaVersion: 1,
      brainMode: "real-connectome",
      presetVersion: "1.0.0",
      brokerCategory: "crypto",
      marketFeatures: {
        momentum: 0.1,
        volatility: 0.2,
        volumeStrength: 0.5,
        return: 0.01,
      },
      brain: {
        buyDrive: 0.8,
        sellDrive: 0.2,
        curiosity: 0.3,
        danger: 0.1,
        activity: 0.4,
      },
      action: "paper_sell",
      outcome: { returnPct: 1.2, holdingDurationBucket: "5m_1h" },
      createdAt: "2026-09-14T00:00:00.000Z",
    });
    expect(ok.ok).toBe(true);
  });
});
