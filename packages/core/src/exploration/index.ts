export {
  DEFAULT_SYMBOL_SEEDS,
  EXPLORATION_EPSILON,
  EXPLORATION_TIMEFRAMES,
  HIGH_INTEREST_THRESHOLD,
  INTEREST_THRESHOLD,
  INTEREST_WEIGHTS,
  MAX_CANDIDATES,
  MEMORY_LIMITS,
  NEURAL_APPROACH_THRESHOLD,
  PACING_MS,
  PAPER_GATES,
  SPEED_MULTIPLIER,
} from "./config";
export {
  attachConflictAndNovelty,
  calculateTrendConflict,
  computeMarketFeatures,
  featuresToMarketSlice,
  timeframeRank,
} from "./features";
export {
  computeInterestScore,
  computeNovelty,
  neuralResponseStrength,
  recentlyVisitedPenalty,
} from "./curiosity";
export {
  appendActivityLog,
  emptyFlyMemory,
  observedTimeframes,
  recordIntent,
  recordObservation,
  recordVisit,
  refreshInteresting,
  revisitCount,
  setOpenPaperPositions,
} from "./memory";
export { canProposePaperTrade } from "./gating";
export {
  decideIntent,
  dwellForState,
  motionForState,
  nextTimeframe,
  rankCandidates,
  selectSymbol,
  stepExploration,
  type PolicyInput,
  type PolicyResult,
  type RankedCandidate,
} from "./policy";
export { formatLogLine, thoughtFor } from "./thoughts";
export type {
  ActivityLogEntry,
  AgentState,
  ExplorationEvent,
  ExplorationMotion,
  ExplorationSpeed,
  ExplorationState,
  ExplorerResult,
  FlyIntent,
  FlyMemory,
  FlyMemoryObservation,
  FlyMemoryVisit,
  HudSnapshot,
  InterestingSymbol,
  IntentRecord,
  MarketFeatures,
  OhlcvBar,
  SymbolCandidate,
} from "./types";
