import type { BrainOutput, Timeframe } from "../types";
import { MEMORY_LIMITS } from "./config";
import type {
  ActivityLogEntry,
  FlyMemory,
  FlyMemoryObservation,
  FlyIntent,
  MarketFeatures,
} from "./types";

export const emptyFlyMemory = (): FlyMemory => ({
  visitedSymbols: {},
  observations: {},
  interestingSymbols: [],
  previousIntents: [],
  openPaperPositions: [],
  activityLog: [],
});

const pruneVisited = (
  visited: FlyMemory["visitedSymbols"],
  now: number,
): FlyMemory["visitedSymbols"] => {
  const entries = Object.entries(visited)
    .filter(([, visit]) => now - visit.lastVisitedAt <= MEMORY_LIMITS.maxAgeMs)
    .sort((a, b) => b[1].lastVisitedAt - a[1].lastVisitedAt)
    .slice(0, MEMORY_LIMITS.maxSymbols);
  return Object.fromEntries(entries);
};

export const recordVisit = (
  memory: FlyMemory,
  input: {
    readonly symbol: string;
    readonly now: number;
    readonly interestScore: number;
  },
): FlyMemory => {
  const previous = memory.visitedSymbols[input.symbol];
  return {
    ...memory,
    visitedSymbols: pruneVisited(
      {
        ...memory.visitedSymbols,
        [input.symbol]: {
          firstSeenAt: previous?.firstSeenAt ?? input.now,
          lastVisitedAt: input.now,
          visitCount: (previous?.visitCount ?? 0) + 1,
          interestScore: input.interestScore,
        },
      },
      input.now,
    ),
  };
};

export const recordObservation = (
  memory: FlyMemory,
  input: {
    readonly symbol: string;
    readonly timeframe: Timeframe;
    readonly now: number;
    readonly features: MarketFeatures;
    readonly neural?: BrainOutput;
  },
): FlyMemory => {
  const observation: FlyMemoryObservation = {
    timestamp: input.now,
    features: input.features,
    neuralResponse: input.neural,
  };
  const bySymbol = {
    ...(memory.observations[input.symbol] ?? {}),
    [input.timeframe]: observation,
  };
  return {
    ...memory,
    observations: {
      ...memory.observations,
      [input.symbol]: bySymbol,
    },
  };
};

export const recordIntent = (
  memory: FlyMemory,
  symbol: string,
  intent: FlyIntent,
  now: number,
): FlyMemory => ({
  ...memory,
  previousIntents: [
    ...memory.previousIntents,
    { symbol, intent, timestamp: now },
  ].slice(-MEMORY_LIMITS.maxIntents),
});

export const appendActivityLog = (
  memory: FlyMemory,
  entry: ActivityLogEntry,
): FlyMemory => ({
  ...memory,
  activityLog: [...memory.activityLog, entry].slice(-MEMORY_LIMITS.maxLog),
});

export const observedTimeframes = (
  memory: FlyMemory,
  symbol: string,
): Timeframe[] => Object.keys(memory.observations[symbol] ?? {}) as Timeframe[];

export const revisitCount = (memory: FlyMemory, symbol: string): number =>
  Math.max(0, (memory.visitedSymbols[symbol]?.visitCount ?? 0) - 1);

export const setOpenPaperPositions = (
  memory: FlyMemory,
  symbols: readonly string[],
): FlyMemory => ({
  ...memory,
  openPaperPositions: [...symbols],
});

export const refreshInteresting = (
  memory: FlyMemory,
  ranked: FlyMemory["interestingSymbols"],
): FlyMemory => ({
  ...memory,
  interestingSymbols: ranked.slice(0, 8),
});
