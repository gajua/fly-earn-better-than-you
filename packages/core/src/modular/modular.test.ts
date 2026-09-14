import { describe, expect, it } from "vitest";
import { computeFutureOutcome, horizonToMs } from "./outcome";
import { shouldUploadSummary } from "./learning-config";
import { shouldEvaluateBrain } from "./gating";
import {
  assertRealNeuronIds,
  registerConnectomeNeuronIds,
  validateModuleDefinitions,
} from "./validation";

describe("modular validation", () => {
  it("rejects unknown neuron ids when universe registered", () => {
    registerConnectomeNeuronIds([100, 200, 300]);
    const result = validateModuleDefinitions([
      {
        id: "chart_observer",
        inputNeuronIds: [100],
        outputNeuronIds: [999],
        description: "test",
        assignment: "experimental",
      },
    ]);
    expect(result.ok).toBe(false);
  });

  it("assertRealNeuronIds rejects non-positive", () => {
    expect(assertRealNeuronIds([1, 2, 3])).toBe(true);
    expect(assertRealNeuronIds([0])).toBe(false);
  });
});

describe("future outcome without leakage", () => {
  it("uses only candles after anchor within horizon", () => {
    const anchorMs = Date.parse("2026-01-01T00:00:00.000Z");
    const candles = [
      {
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1,
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        open: 100,
        high: 105,
        low: 99,
        close: 104,
        volume: 1,
        timestamp: "2026-01-01T00:30:00.000Z",
      },
      {
        open: 104,
        high: 110,
        low: 103,
        close: 108,
        volume: 1,
        timestamp: "2026-01-01T01:00:00.000Z",
      },
    ];
    const outcome = computeFutureOutcome({
      anchorPrice: 100,
      anchorMs,
      horizonMs: horizonToMs("1h"),
      candles,
    });
    expect(outcome).not.toBeNull();
    expect(outcome!.futureReturn).toBeCloseTo(0.08, 2);
  });
});

describe("upload filter", () => {
  it("local_only path skips by default unless interesting", () => {
    const quiet = shouldUploadSummary({
      novelty: 0.1,
      trendConflict: 0.1,
      relativeVolume: 1,
      revisit: false,
      decisionIntent: "IGNORE",
      hasResolvedOutcome: false,
      random: () => 0.99,
    });
    expect(quiet.upload).toBe(false);
  });
});

describe("brain gating", () => {
  it("extends quiet interval without events", () => {
    const first = shouldEvaluateBrain(
      { lastEvalAt: 0, lastPrice: 100, lastSymbol: "BTC", lastTimeframe: "1h" },
      {
        now: 1000,
        symbol: "BTC",
        timeframe: "1h",
        price: 100.1,
        novelty: 0.1,
        trendConflict: 0.1,
        relativeVolume: 1,
        symbolChanged: false,
        timeframeChanged: false,
        revisit: false,
      },
    );
    expect(first.evaluate).toBe(false);
  });
});
