import type { OhlcvBar } from "../exploration/types";
import type { OutcomeHorizon } from "./types";

export interface OutcomeMetrics {
  readonly futureReturn: number;
  readonly futureVolatility: number;
  readonly maxAdverseMove: number;
  readonly maxFavorableMove: number;
}

/** Uses only candles with timestamp <= anchorMs — no future leakage in features. */
export const computeFutureOutcome = (input: {
  readonly anchorPrice: number;
  readonly anchorMs: number;
  readonly horizonMs: number;
  readonly candles: readonly OhlcvBar[];
}): OutcomeMetrics | null => {
  if (input.anchorPrice <= 0 || input.candles.length === 0) return null;
  const window = input.candles.filter((bar) => {
    const ts = bar.timestamp ? Date.parse(bar.timestamp) : NaN;
    if (!Number.isFinite(ts)) return false;
    return ts > input.anchorMs && ts <= input.anchorMs + input.horizonMs;
  });
  if (window.length === 0) return null;
  const closes = window.map((b) => b.close);
  const last = closes[closes.length - 1]!;
  const futureReturn = (last - input.anchorPrice) / input.anchorPrice;
  let maxHigh = input.anchorPrice;
  let minLow = input.anchorPrice;
  for (const bar of window) {
    maxHigh = Math.max(maxHigh, bar.high);
    minLow = Math.min(minLow, bar.low);
  }
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1]!;
    if (prev > 0) returns.push((closes[i]! - prev) / prev);
  }
  const mean =
    returns.length > 0
      ? returns.reduce((a, b) => a + b, 0) / returns.length
      : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1)
      : 0;
  return {
    futureReturn,
    futureVolatility: Math.sqrt(Math.max(0, variance)),
    maxAdverseMove: (minLow - input.anchorPrice) / input.anchorPrice,
    maxFavorableMove: (maxHigh - input.anchorPrice) / input.anchorPrice,
  };
};

export const horizonToMs = (horizon: OutcomeHorizon): number => {
  const map: Record<OutcomeHorizon, number> = {
    "5m": 5 * 60_000,
    "30m": 30 * 60_000,
    "1h": 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
  };
  return map[horizon];
};
