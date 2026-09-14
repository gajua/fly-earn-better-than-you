import type { Timeframe } from "../types";

/**
 * Experimental agent constants — not biological MaleCNS parameters.
 * Keep magic numbers here instead of scattering them.
 */
export const EXPLORATION_TIMEFRAMES: readonly Timeframe[] = [
  "1d",
  "4h",
  "1h",
  "15m",
];

export const DEFAULT_SYMBOL_SEEDS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "BNBUSDT",
  "DOGEUSDT",
  "ADAUSDT",
] as const;

export const MAX_CANDIDATES = 8;

export const INTEREST_WEIGHTS = {
  novelty: 0.28,
  volatility: 0.16,
  volume: 0.14,
  conflict: 0.22,
  neural: 0.12,
  revisitPenalty: 0.18,
} as const;

export const INTEREST_THRESHOLD = 0.42;
export const HIGH_INTEREST_THRESHOLD = 0.62;
export const NEURAL_APPROACH_THRESHOLD = 0.72;

export const EXPLORATION_EPSILON = 0.22;

export const PAPER_GATES = {
  minTimeframes: 2,
  minRevisits: 2,
  minInterest: 0.58,
  minNeuralDrive: 0.72,
} as const;

export const PACING_MS = {
  symbolObserve: { min: 2_000, max: 8_000 },
  timeframeObserve: { min: 1_500, max: 5_000 },
  symbolChangeCooldown: { min: 3_000, max: 10_000 },
  rest: { min: 2_000, max: 6_000 },
  wake: { min: 1_200, max: 2_000 },
  orient: { min: 800, max: 1_600 },
} as const;

export const SPEED_MULTIPLIER = {
  slow: 1.65,
  normal: 1,
  fast: 0.55,
} as const;

export const MEMORY_LIMITS = {
  maxSymbols: 24,
  maxIntents: 12,
  maxLog: 10,
  maxAgeMs: 12 * 60 * 60 * 1000,
} as const;
