import type { BrainOutput, Timeframe } from "../types";

export type FlyIntent =
  "IGNORE" | "WATCH" | "EXPLORE" | "REVISIT" | "APPROACH_BUY" | "APPROACH_SELL";

export type ExplorationState =
  | "SLEEP"
  | "WAKE"
  | "ORIENT"
  | "SCAN_MARKET"
  | "INSPECT_SYMBOL"
  | "CHANGE_TIMEFRAME"
  | "OBSERVE"
  | "COMPARE"
  | "CURIOUS"
  | "REVISIT"
  | "FOCUS"
  | "DECIDE"
  | "REST";

export type ExplorationSpeed = "slow" | "normal" | "fast";

export type ExplorationMotion =
  | "wide"
  | "orbit-symbol"
  | "orbit-timeframe"
  | "orbit-chart"
  | "curious"
  | "focus"
  | "rest";

export interface OhlcvBar {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly timestamp?: string;
}

/**
 * MODELED market descriptors computed from OHLCV.
 * Not a claim that MaleCNS computes technical indicators.
 */
export interface MarketFeatures {
  readonly return1: number;
  readonly returnN: number;
  readonly ma5: number;
  readonly ma20: number;
  readonly ma60?: number;
  readonly ma120?: number;
  readonly priceVsMa20: number;
  readonly ma5VsMa20: number;
  readonly ma20Slope: number;
  readonly relativeVolume: number;
  readonly volumeChange: number;
  readonly volatility: number;
  readonly rangeRatio: number;
  readonly momentum: number;
  readonly acceleration: number;
  readonly trendDirection: -1 | 0 | 1;
  readonly rsi?: number;
  readonly trendConflict?: number;
  readonly novelty?: number;
}

export interface FlyMemoryVisit {
  readonly firstSeenAt: number;
  readonly lastVisitedAt: number;
  readonly visitCount: number;
  readonly interestScore: number;
}

export interface FlyMemoryObservation {
  readonly timestamp: number;
  readonly features: MarketFeatures;
  readonly neuralResponse?: BrainOutput;
}

export interface InterestingSymbol {
  readonly symbol: string;
  readonly score: number;
  readonly reason: readonly string[];
}

export interface IntentRecord {
  readonly symbol: string;
  readonly intent: FlyIntent;
  readonly timestamp: number;
}

export interface ActivityLogEntry {
  readonly timestamp: number;
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly state: ExplorationState;
  readonly summary: string;
}

export interface FlyMemory {
  readonly visitedSymbols: Readonly<Record<string, FlyMemoryVisit>>;
  readonly observations: Readonly<
    Record<string, Partial<Record<Timeframe, FlyMemoryObservation>>>
  >;
  readonly interestingSymbols: readonly InterestingSymbol[];
  readonly previousIntents: readonly IntentRecord[];
  readonly openPaperPositions: readonly string[];
  readonly activityLog: readonly ActivityLogEntry[];
}

export interface AgentState {
  readonly curiosity: number;
  readonly novelty: number;
  readonly interest: number;
}

export interface SymbolCandidate {
  readonly symbol: string;
  readonly source: "current" | "seed" | "public-liquidity" | "visible";
  readonly quoteVolume?: number;
}

export interface ExplorerResult {
  readonly ok: boolean;
  readonly confidence: number;
  readonly reason?: string;
}

export interface ExplorationEvent {
  readonly timestamp: number;
  readonly broker: string;
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly state: ExplorationState;
  readonly reason: readonly string[];
  readonly featuresSummary?: string;
  readonly curiosity: number;
  readonly interestScore: number;
  readonly neuralSummary?: string;
  readonly action: string;
}

export interface HudSnapshot {
  readonly compactTitle: string;
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly intent: FlyIntent;
  readonly watching: readonly string[];
  readonly curiosity: number;
  readonly novelty: number;
  readonly volatility: number;
  readonly trendConflict: number;
  readonly relativeVolume: number;
  readonly approach: number;
  readonly avoid: number;
  readonly explore: number;
  readonly nextHint: string;
  readonly thought: string;
  readonly log: readonly string[];
  readonly uiControlNote?: string;
  readonly paused: boolean;
  readonly detailed: boolean;
}
