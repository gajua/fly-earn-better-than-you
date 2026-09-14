import type {
  AssetCandidate,
  BrainOutput,
  CandidateEvaluation,
  Timeframe,
  TimeframeObservation,
} from "@fly/core";
import {
  filterUsableTimeframeObservations,
  type FlyBrain,
} from "@fly/core";
import { extractMarketFeatures } from "./market-data/features";
import type { MarketDataProvider } from "./market-data/types";
import type { BrokerAdapter } from "./types";

export interface CandidateScanOptions {
  readonly maxCandidates?: number;
  readonly concurrency?: number;
  readonly timeframes?: readonly Timeframe[];
  readonly brainMode: CandidateEvaluation["brainMode"];
}

const DEFAULT_TIMEFRAMES: readonly Timeframe[] = [
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
];

/**
 * Rate-limited candidate scan. Never invents candles; skips provider failures.
 */
export const scanCandidates = async (input: {
  readonly adapter: BrokerAdapter;
  readonly provider: MarketDataProvider;
  readonly brain: FlyBrain;
  readonly options: CandidateScanOptions;
}): Promise<readonly CandidateEvaluation[]> => {
  const maxCandidates = Math.min(
    Math.max(input.options.maxCandidates ?? 10, 1),
    20,
  );
  const concurrency = Math.max(1, input.options.concurrency ?? 2);
  const timeframes = input.options.timeframes ?? DEFAULT_TIMEFRAMES;
  const candidates = input.adapter.readWatchlist().slice(0, maxCandidates);
  const results: CandidateEvaluation[] = [];

  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((candidate) =>
        evaluateCandidate({
          candidate,
          provider: input.provider,
          brain: input.brain,
          timeframes,
          brainMode: input.options.brainMode,
        }),
      ),
    );
    results.push(...batchResults.filter((item): item is CandidateEvaluation => item !== null));
  }
  return results;
};

const evaluateCandidate = async (input: {
  readonly candidate: AssetCandidate;
  readonly provider: MarketDataProvider;
  readonly brain: FlyBrain;
  readonly timeframes: readonly Timeframe[];
  readonly brainMode: CandidateEvaluation["brainMode"];
}): Promise<CandidateEvaluation | null> => {
  if (!input.candidate.instrumentId) return null;
  const observations: TimeframeObservation[] = [];
  for (const timeframe of input.timeframes) {
    if (!input.provider.supports(input.candidate.instrumentId, timeframe)) {
      observations.push(unavailableObservation(input.candidate, timeframe));
      continue;
    }
    const result = await input.provider.fetchCandles(
      input.candidate.instrumentId,
      timeframe,
    );
    if (!result.ok) {
      observations.push(unavailableObservation(input.candidate, timeframe));
      continue;
    }
    observations.push(
      extractMarketFeatures({
        symbol: input.candidate.symbol,
        instrumentId: input.candidate.instrumentId,
        timeframe,
        candles: result.series.candles,
        source: result.series.provenance.source,
        dataProvider: result.series.provenance,
      }),
    );
  }
  const usable = filterUsableTimeframeObservations(observations);
  if (usable.length === 0) return null;
  const primary = usable[0]!;
  const output: BrainOutput = await input.brain.evaluate({
    asset: {
      symbol: input.candidate.symbol,
      price: primary.price,
      changePercent: primary.returnPercent,
      instrumentId: input.candidate.instrumentId,
    },
    market: {
      momentum: primary.momentum,
      volatility: primary.volatility,
      volumeStrength: primary.volumeStrength,
    },
    ui: {},
  });
  return {
    symbol: input.candidate.symbol,
    instrumentId: input.candidate.instrumentId,
    evaluatedAt: new Date().toISOString(),
    brainMode: input.brainMode,
    timeframes: observations,
    output,
  };
};

const unavailableObservation = (
  candidate: AssetCandidate,
  timeframe: Timeframe,
): TimeframeObservation => ({
  symbol: candidate.symbol,
  instrumentId: candidate.instrumentId,
  timeframe,
  price: 0,
  returnPercent: 0,
  momentum: 0,
  volatility: 0,
  volumeStrength: 0,
  timestamp: new Date().toISOString(),
  observedAt: new Date().toISOString(),
  source: "unavailable",
  candleCount: 0,
  available: false,
});
