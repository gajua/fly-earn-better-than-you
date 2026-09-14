import { clamp01 } from "../math";
import type { BrainOutput, Timeframe } from "../types";
import { INTEREST_WEIGHTS } from "./config";
import type { FlyMemory, MarketFeatures } from "./types";

export const recentlyVisitedPenalty = (
  memory: FlyMemory,
  symbol: string,
  now: number,
): number => {
  const visit = memory.visitedSymbols[symbol];
  if (!visit) return 0;
  const ageMs = Math.max(0, now - visit.lastVisitedAt);
  const recency = clamp01(1 - ageMs / (20 * 60_000));
  const frequency = clamp01(visit.visitCount / 6);
  return clamp01(recency * 0.7 + frequency * 0.3);
};

export const computeNovelty = (input: {
  readonly memory: FlyMemory;
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly features: MarketFeatures | null;
  readonly now: number;
}): number => {
  const visit = input.memory.visitedSymbols[input.symbol];
  if (!visit) return 1;
  const ageMs = Math.max(0, input.now - visit.lastVisitedAt);
  const stale = clamp01(ageMs / (45 * 60_000));
  const previous =
    input.memory.observations[input.symbol]?.[input.timeframe]?.features;
  if (!input.features) return clamp01(0.35 + stale * 0.5);
  if (!previous) return clamp01(0.55 + stale * 0.3);
  const delta =
    Math.abs(input.features.momentum - previous.momentum) * 4 +
    Math.abs(input.features.volatility - previous.volatility) * 8 +
    Math.abs(input.features.relativeVolume - previous.relativeVolume) * 0.35 +
    (input.features.trendDirection !== previous.trendDirection ? 0.45 : 0);
  const volumeSpike = input.features.relativeVolume > 1.8 ? 0.25 : 0;
  const volSpike = input.features.volatility > 0.04 ? 0.15 : 0;
  return clamp01(stale * 0.35 + delta * 0.4 + volumeSpike + volSpike);
};

export const neuralResponseStrength = (
  output: BrainOutput | null | undefined,
): number => {
  if (!output) return 0;
  return clamp01(
    Math.max(
      output.buyDrive,
      output.sellDrive,
      output.curiosity,
      output.activity,
    ),
  );
};

export const computeInterestScore = (input: {
  readonly novelty: number;
  readonly features: MarketFeatures | null;
  readonly neural: BrainOutput | null;
  readonly recentlyVisitedPenalty: number;
}): number => {
  const volatility = clamp01((input.features?.volatility ?? 0) * 25);
  const volume = clamp01((input.features?.relativeVolume ?? 0) / 2);
  const conflict = clamp01(input.features?.trendConflict ?? 0);
  const neural = neuralResponseStrength(input.neural);
  return clamp01(
    INTEREST_WEIGHTS.novelty * input.novelty +
      INTEREST_WEIGHTS.volatility * volatility +
      INTEREST_WEIGHTS.volume * volume +
      INTEREST_WEIGHTS.conflict * conflict +
      INTEREST_WEIGHTS.neural * neural -
      INTEREST_WEIGHTS.revisitPenalty * input.recentlyVisitedPenalty,
  );
};
