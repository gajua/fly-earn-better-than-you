import { describe, expect, it } from "vitest";
import {
  buildGlobalPresetCandidate,
  observationToSample,
  scoreCalibration,
  splitByTime,
  type CalibrationSample,
} from "./builder";
import type { AnonymousPaperObservation } from "./global-types";

const sample = (
  index: number,
  overrides: Partial<CalibrationSample> = {},
): CalibrationSample => ({
  createdAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
  buyDrive: 0.85,
  sellDrive: 0.4,
  returnPct: index % 3 === 0 ? -1.2 : 1.5,
  brainMode: "real-connectome",
  ...overrides,
});

describe("global calibration builder", () => {
  it("splits by time without future leakage", () => {
    const samples = Array.from({ length: 10 }, (_, i) => sample(i));
    const split = splitByTime(samples);
    expect(split.train).toHaveLength(6);
    expect(split.validation).toHaveLength(2);
    expect(split.holdout).toHaveLength(2);
    expect(split.train.at(-1)!.createdAt < split.validation[0]!.createdAt).toBe(
      true,
    );
  });

  it("builds deterministic candidate presets", async () => {
    const samples = Array.from({ length: 520 }, (_, i) =>
      sample(i, {
        buyDrive: 0.7 + (i % 10) / 40,
        sellDrive: 0.55 + (i % 7) / 50,
        returnPct: ((i % 11) - 5) * 0.8,
      }),
    );
    const a = await buildGlobalPresetCandidate({
      samples,
      presetVersion: "1.1.0",
      generatedAt: "2026-09-14T00:00:00.000Z",
      minimumSamples: 500,
    });
    const b = await buildGlobalPresetCandidate({
      samples,
      presetVersion: "1.1.0",
      generatedAt: "2026-09-14T00:00:00.000Z",
      minimumSamples: 500,
    });
    expect(a.preset).toEqual(b.preset);
    expect(a.preset.metadata.status).toBe("candidate");
    expect(a.preset.metadata.brainMode).toBe("real-connectome");
    expect(a.gate === "READY_FOR_REVIEW" || a.gate === "REJECTED").toBe(true);
  });

  it("rejects mock/shuffled observations from training samples", () => {
    const obs = {
      schemaVersion: 1,
      brainMode: "mock",
      presetVersion: "1.0.0",
      brokerCategory: "crypto",
      marketFeatures: {
        momentum: 0,
        volatility: 0,
        volumeStrength: 0.5,
        return: 0.01,
      },
      brain: {
        buyDrive: 0.9,
        sellDrive: 0.1,
        curiosity: 0.2,
        danger: 0.1,
        activity: 0.5,
      },
      action: "paper_sell",
      outcome: { returnPct: 2, holdingDurationBucket: "5m_1h" },
      createdAt: "2026-09-14T00:00:00.000Z",
    } as unknown as AnonymousPaperObservation;
    expect(observationToSample(obs)).toBeNull();
  });

  it("scores with drawdown penalty", () => {
    const healthy = scoreCalibration({
      totalReturnPct: 10,
      maxDrawdownPct: 5,
      tradeCount: 40,
      winRate: 0.55,
      profitFactor: 1.4,
    });
    const deepDd = scoreCalibration({
      totalReturnPct: 10,
      maxDrawdownPct: 40,
      tradeCount: 40,
      winRate: 0.55,
      profitFactor: 1.4,
    });
    expect(healthy).toBeGreaterThan(deepDd);
  });
});
