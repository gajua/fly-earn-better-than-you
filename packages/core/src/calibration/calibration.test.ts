import { describe, expect, it } from "vitest";
import {
  applyCalibration,
  computeCalibration,
  resetCalibration,
  DEFAULT_CALIBRATION_CONFIG,
  DEFAULT_CALIBRATION_PROFILE,
  type LearningObservation,
} from "./index";

const sample = (
  overrides: Partial<LearningObservation> &
    Pick<
      LearningObservation,
      "action" | "buyDrive" | "sellDrive" | "returnPct"
    >,
): LearningObservation => ({
  id: crypto.randomUUID(),
  broker: "upbit",
  symbol: "KRW-BTC",
  timestamp: new Date().toISOString(),
  brainMode: "mock",
  brainState: "approach_buy",
  curiosity: 0.2,
  danger: 0.1,
  marketFeatures: {},
  ...overrides,
});

describe("PersonalCalibration", () => {
  it("does not calibrate below minSamples", () => {
    const observations = Array.from({ length: 10 }, () =>
      sample({
        action: "paper_buy",
        buyDrive: 0.92,
        sellDrive: 0.1,
        returnPct: 5,
      }),
    );
    const profile = computeCalibration(observations, {
      ...DEFAULT_CALIBRATION_CONFIG,
      enabled: true,
    });
    expect(profile.buyThreshold).toBe(DEFAULT_CALIBRATION_PROFILE.buyThreshold);
    expect(
      applyCalibration(profile, { enabled: true, minSamples: 30 }),
    ).toEqual({
      buyThreshold: 0.82,
      sellThreshold: 0.82,
      cooldownMultiplier: 1,
    });
  });

  it("raises threshold toward stronger drive buckets when enabled", () => {
    const weak = Array.from({ length: 15 }, () =>
      sample({
        action: "paper_buy",
        buyDrive: 0.84,
        sellDrive: 0.1,
        returnPct: -2,
      }),
    );
    const strong = Array.from({ length: 20 }, () =>
      sample({
        action: "paper_buy",
        buyDrive: 0.93,
        sellDrive: 0.1,
        returnPct: 4,
      }),
    );
    const profile = computeCalibration([...weak, ...strong], {
      enabled: true,
      minSamples: 30,
    });
    expect(profile.sampleCount).toBe(35);
    expect(profile.buyThreshold).toBeGreaterThanOrEqual(0.91);
  });

  it("respects disabled config and reset", () => {
    const observations = Array.from({ length: 40 }, () =>
      sample({
        action: "paper_sell",
        buyDrive: 0.1,
        sellDrive: 0.93,
        returnPct: 3,
      }),
    );
    const disabled = computeCalibration(observations, {
      enabled: false,
      minSamples: 30,
    });
    expect(disabled.buyThreshold).toBe(0.82);
    expect(resetCalibration().sampleCount).toBe(0);
  });
});
