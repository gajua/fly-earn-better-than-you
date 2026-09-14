import type { BrainOutput, Timeframe } from "../types";
import {
  EXPLORATION_EPSILON,
  EXPLORATION_TIMEFRAMES,
  HIGH_INTEREST_THRESHOLD,
  INTEREST_THRESHOLD,
  NEURAL_APPROACH_THRESHOLD,
  PACING_MS,
  SPEED_MULTIPLIER,
} from "./config";
import {
  computeInterestScore,
  computeNovelty,
  recentlyVisitedPenalty,
} from "./curiosity";
import { calculateTrendConflict, timeframeRank } from "./features";
import {
  appendActivityLog,
  observedTimeframes,
  recordIntent,
  recordObservation,
  recordVisit,
  refreshInteresting,
  revisitCount,
} from "./memory";
import { thoughtFor } from "./thoughts";
import type {
  AgentState,
  ExplorationMotion,
  ExplorationSpeed,
  ExplorationState,
  FlyIntent,
  FlyMemory,
  MarketFeatures,
  SymbolCandidate,
} from "./types";
import { canProposePaperTrade } from "./gating";

export interface RankedCandidate {
  readonly symbol: string;
  readonly score: number;
  readonly novelty: number;
  readonly penalty: number;
  readonly reasons: readonly string[];
}

export const rankCandidates = (input: {
  readonly candidates: readonly SymbolCandidate[];
  readonly memory: FlyMemory;
  readonly featuresBySymbol: Readonly<
    Record<string, Partial<Record<Timeframe, MarketFeatures>>>
  >;
  readonly neural: BrainOutput | null;
  readonly now: number;
}): RankedCandidate[] =>
  input.candidates.map((candidate) => {
    const features =
      input.featuresBySymbol[candidate.symbol]?.["1d"] ??
      input.featuresBySymbol[candidate.symbol]?.["4h"] ??
      Object.values(input.featuresBySymbol[candidate.symbol] ?? {})[0] ??
      null;
    const novelty = computeNovelty({
      memory: input.memory,
      symbol: candidate.symbol,
      timeframe: "1d",
      features,
      now: input.now,
    });
    const penalty = recentlyVisitedPenalty(
      input.memory,
      candidate.symbol,
      input.now,
    );
    const score = computeInterestScore({
      novelty,
      features,
      neural: input.neural,
      recentlyVisitedPenalty: penalty,
    });
    const reasons: string[] = [];
    if (novelty >= 0.7) reasons.push("novelty");
    if ((features?.trendConflict ?? 0) >= 0.5) reasons.push("trend-conflict");
    if ((features?.relativeVolume ?? 0) >= 1.6) reasons.push("volume");
    if ((features?.volatility ?? 0) >= 0.025) reasons.push("volatility");
    if (reasons.length === 0) reasons.push("scan");
    return {
      symbol: candidate.symbol,
      score,
      novelty,
      penalty,
      reasons,
    };
  });

export const selectSymbol = (
  ranked: readonly RankedCandidate[],
  current: string | null,
  random: () => number,
): RankedCandidate | null => {
  if (ranked.length === 0) return null;
  const sorted = [...ranked].sort((a, b) => b.score - a.score);
  if (random() < EXPLORATION_EPSILON) {
    const explorePool = sorted.filter((item) => item.symbol !== current);
    const pool = explorePool.length > 0 ? explorePool : sorted;
    return pool[Math.floor(random() * pool.length)] ?? sorted[0]!;
  }
  const top = sorted.slice(0, Math.min(3, sorted.length));
  const weights = top.map((item) => Math.max(0.05, item.score));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let pick = random() * total;
  for (let index = 0; index < top.length; index += 1) {
    pick -= weights[index]!;
    if (pick <= 0) return top[index]!;
  }
  return top[0]!;
};

export const nextTimeframe = (
  memory: FlyMemory,
  symbol: string,
  current: Timeframe,
  interest: number,
): Timeframe | null => {
  const seen = new Set(observedTimeframes(memory, symbol));
  const remaining = EXPLORATION_TIMEFRAMES.filter(
    (timeframe) => !seen.has(timeframe),
  );
  if (remaining.length === 0) return null;
  if (interest < INTEREST_THRESHOLD) {
    return remaining[0] === "1d" || remaining[0] === "4h"
      ? remaining[0]!
      : null;
  }
  const ordered = [...remaining].sort(
    (a, b) => timeframeRank(a) - timeframeRank(b),
  );
  if (ordered[0] === current) return ordered[1] ?? null;
  return ordered[0]!;
};

export const decideIntent = (input: {
  readonly interest: number;
  readonly novelty: number;
  readonly neural: BrainOutput | null;
  readonly memory: FlyMemory;
  readonly symbol: string;
}): FlyIntent => {
  const allow = canProposePaperTrade({
    memory: input.memory,
    symbol: input.symbol,
    interest: input.interest,
    neural: input.neural,
  });
  const buy = input.neural?.buyDrive ?? 0;
  const sell = input.neural?.sellDrive ?? 0;
  if (allow && buy >= NEURAL_APPROACH_THRESHOLD && buy > sell + 0.08) {
    return "APPROACH_BUY";
  }
  if (allow && sell >= NEURAL_APPROACH_THRESHOLD && sell > buy + 0.08) {
    return "APPROACH_SELL";
  }
  if (input.interest >= HIGH_INTEREST_THRESHOLD) return "WATCH";
  if (input.novelty >= 0.7) return "EXPLORE";
  if (
    revisitCount(input.memory, input.symbol) >= 1 &&
    input.interest >= INTEREST_THRESHOLD
  ) {
    return "REVISIT";
  }
  return "IGNORE";
};

export const motionForState = (state: ExplorationState): ExplorationMotion => {
  switch (state) {
    case "SCAN_MARKET":
    case "ORIENT":
    case "WAKE":
      return "wide";
    case "INSPECT_SYMBOL":
      return "orbit-symbol";
    case "CHANGE_TIMEFRAME":
      return "orbit-timeframe";
    case "OBSERVE":
    case "COMPARE":
      return "orbit-chart";
    case "CURIOUS":
      return "curious";
    case "FOCUS":
    case "REVISIT":
    case "DECIDE":
      return "focus";
    case "REST":
    case "SLEEP":
    default:
      return "rest";
  }
};

export const dwellForState = (
  state: ExplorationState,
  speed: ExplorationSpeed,
  random: () => number,
): number => {
  const range =
    state === "REST"
      ? PACING_MS.rest
      : state === "WAKE"
        ? PACING_MS.wake
        : state === "ORIENT"
          ? PACING_MS.orient
          : state === "CHANGE_TIMEFRAME" || state === "OBSERVE"
            ? PACING_MS.timeframeObserve
            : PACING_MS.symbolObserve;
  const span = range.max - range.min;
  return (range.min + random() * span) * SPEED_MULTIPLIER[speed];
};

export interface PolicyInput {
  readonly state: ExplorationState;
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly memory: FlyMemory;
  readonly candidates: readonly SymbolCandidate[];
  readonly features: MarketFeatures | null;
  readonly featuresBySymbol: Readonly<
    Record<string, Partial<Record<Timeframe, MarketFeatures>>>
  >;
  readonly neural: BrainOutput | null;
  readonly now: number;
  readonly speed: ExplorationSpeed;
  readonly paused: boolean;
  readonly random: () => number;
  readonly locale: "en" | "ko";
}

export interface PolicyResult {
  readonly state: ExplorationState;
  readonly symbol: string;
  readonly timeframe: Timeframe;
  readonly intent: FlyIntent;
  readonly memory: FlyMemory;
  readonly agent: AgentState;
  readonly thought: string;
  readonly reasons: readonly string[];
  readonly motion: ExplorationMotion;
  readonly dwellMs: number;
  readonly navigateSymbol?: string;
  readonly changeTimeframe?: Timeframe;
  readonly allowPaperProposal: boolean;
}

const conflictForSymbol = (
  featuresByTf: Partial<Record<Timeframe, MarketFeatures>> | undefined,
): number => {
  if (!featuresByTf) return 0;
  const directions = EXPLORATION_TIMEFRAMES.map(
    (timeframe) => featuresByTf[timeframe]?.trendDirection ?? 0,
  );
  return calculateTrendConflict(directions);
};

export const stepExploration = (input: PolicyInput): PolicyResult => {
  const ranked = rankCandidates({
    candidates: input.candidates,
    memory: input.memory,
    featuresBySymbol: input.featuresBySymbol,
    neural: input.neural,
    now: input.now,
  });
  const currentRank =
    ranked.find((item) => item.symbol === input.symbol) ?? ranked[0];
  const novelty = currentRank?.novelty ?? 0;
  const penalty = currentRank?.penalty ?? 0;
  const featuresWithConflict = input.features
    ? {
        ...input.features,
        trendConflict: conflictForSymbol(input.featuresBySymbol[input.symbol]),
        novelty,
      }
    : null;
  const interest = computeInterestScore({
    novelty,
    features: featuresWithConflict,
    neural: input.neural,
    recentlyVisitedPenalty: penalty,
  });
  const agent: AgentState = {
    curiosity: interest,
    novelty,
    interest,
  };
  const reasons = [...(currentRank?.reasons ?? ["scan"])];
  if ((featuresWithConflict?.trendConflict ?? 0) >= 0.5) {
    reasons.push("trend-conflict");
  }

  if (input.paused) {
    return {
      state: "REST",
      symbol: input.symbol,
      timeframe: input.timeframe,
      intent: "WATCH",
      memory: input.memory,
      agent,
      thought: thoughtFor("REST", input.locale, reasons),
      reasons,
      motion: "rest",
      dwellMs: dwellForState("REST", input.speed, input.random),
      allowPaperProposal: false,
    };
  }

  let memory = refreshInteresting(
    input.memory,
    ranked.map((item) => ({
      symbol: item.symbol,
      score: item.score,
      reason: item.reasons,
    })),
  );

  const finish = (
    next: Omit<
      PolicyResult,
      "agent" | "motion" | "dwellMs" | "allowPaperProposal"
    > &
      Partial<Pick<PolicyResult, "allowPaperProposal">>,
  ): PolicyResult => {
    const logged = appendActivityLog(next.memory, {
      timestamp: input.now,
      symbol: next.symbol,
      timeframe: next.timeframe,
      state: next.state,
      summary: `${next.symbol} ${next.timeframe} — ${next.thought}`,
    });
    const intentMemory = recordIntent(
      logged,
      next.symbol,
      next.intent,
      input.now,
    );
    return {
      ...next,
      memory: intentMemory,
      agent,
      motion: motionForState(next.state),
      dwellMs: dwellForState(next.state, input.speed, input.random),
      allowPaperProposal: next.allowPaperProposal ?? false,
    };
  };

  switch (input.state) {
    case "SLEEP":
      return finish({
        state: "WAKE",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "EXPLORE",
        memory,
        thought: thoughtFor("WAKE", input.locale, reasons),
        reasons,
      });
    case "WAKE":
      return finish({
        state: "ORIENT",
        symbol: input.symbol,
        timeframe: "1d",
        intent: "EXPLORE",
        memory,
        thought: thoughtFor("ORIENT", input.locale, reasons),
        reasons,
        changeTimeframe: input.timeframe === "1d" ? undefined : "1d",
      });
    case "ORIENT":
      return finish({
        state: "SCAN_MARKET",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "EXPLORE",
        memory,
        thought: thoughtFor("SCAN_MARKET", input.locale, reasons),
        reasons,
      });
    case "SCAN_MARKET": {
      const seenCurrent = Boolean(memory.visitedSymbols[input.symbol]);
      if (!seenCurrent) {
        return finish({
          state: "INSPECT_SYMBOL",
          symbol: input.symbol,
          timeframe: input.timeframe,
          intent: "EXPLORE",
          memory: recordVisit(memory, {
            symbol: input.symbol,
            now: input.now,
            interestScore: interest,
          }),
          thought: thoughtFor("INSPECT_SYMBOL", input.locale, reasons),
          reasons,
        });
      }
      const picked = selectSymbol(ranked, input.symbol, input.random);
      const symbol = picked?.symbol ?? input.symbol;
      return finish({
        state: "INSPECT_SYMBOL",
        symbol,
        timeframe: input.timeframe,
        intent: "EXPLORE",
        memory: recordVisit(memory, {
          symbol,
          now: input.now,
          interestScore: picked?.score ?? interest,
        }),
        thought: thoughtFor(
          "INSPECT_SYMBOL",
          input.locale,
          picked?.reasons ?? reasons,
        ),
        reasons: [...(picked?.reasons ?? reasons)],
        navigateSymbol: symbol === input.symbol ? undefined : symbol,
      });
    }
    case "INSPECT_SYMBOL": {
      const nextTf = nextTimeframe(
        memory,
        input.symbol,
        input.timeframe,
        interest,
      );
      if (nextTf && nextTf !== input.timeframe) {
        return finish({
          state: "CHANGE_TIMEFRAME",
          symbol: input.symbol,
          timeframe: nextTf,
          intent: "WATCH",
          memory,
          thought: thoughtFor("CHANGE_TIMEFRAME", input.locale, reasons),
          reasons,
          changeTimeframe: nextTf,
        });
      }
      return finish({
        state: "OBSERVE",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "WATCH",
        memory,
        thought: thoughtFor("OBSERVE", input.locale, reasons),
        reasons,
      });
    }
    case "CHANGE_TIMEFRAME":
      return finish({
        state: "OBSERVE",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "WATCH",
        memory,
        thought: thoughtFor("OBSERVE", input.locale, reasons),
        reasons,
      });
    case "OBSERVE": {
      memory = featuresWithConflict
        ? recordObservation(memory, {
            symbol: input.symbol,
            timeframe: input.timeframe,
            now: input.now,
            features: featuresWithConflict,
            neural: input.neural ?? undefined,
          })
        : memory;
      const enoughTf = observedTimeframes(memory, input.symbol).length >= 2;
      return finish({
        state: enoughTf ? "COMPARE" : "CURIOUS",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "WATCH",
        memory,
        thought: thoughtFor(
          enoughTf ? "COMPARE" : "CURIOUS",
          input.locale,
          reasons,
        ),
        reasons,
      });
    }
    case "COMPARE":
      return finish({
        state: "CURIOUS",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: interest >= INTEREST_THRESHOLD ? "WATCH" : "IGNORE",
        memory,
        thought: thoughtFor("CURIOUS", input.locale, reasons),
        reasons,
      });
    case "CURIOUS": {
      if (interest >= HIGH_INTEREST_THRESHOLD) {
        return finish({
          state: "REVISIT",
          symbol: input.symbol,
          timeframe: input.timeframe,
          intent: "REVISIT",
          memory: recordVisit(memory, {
            symbol: input.symbol,
            now: input.now,
            interestScore: interest,
          }),
          thought: thoughtFor("REVISIT", input.locale, reasons),
          reasons,
        });
      }
      const deeper = nextTimeframe(
        memory,
        input.symbol,
        input.timeframe,
        interest,
      );
      if (deeper) {
        return finish({
          state: "CHANGE_TIMEFRAME",
          symbol: input.symbol,
          timeframe: deeper,
          intent: "WATCH",
          memory,
          thought: thoughtFor("CHANGE_TIMEFRAME", input.locale, reasons),
          reasons,
          changeTimeframe: deeper,
        });
      }
      return finish({
        state: "SCAN_MARKET",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "IGNORE",
        memory,
        thought: thoughtFor("SCAN_MARKET", input.locale, ["low-interest"]),
        reasons: ["low-interest"],
      });
    }
    case "REVISIT":
      return finish({
        state: "FOCUS",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "REVISIT",
        memory,
        thought: thoughtFor("FOCUS", input.locale, reasons),
        reasons,
      });
    case "FOCUS":
      return finish({
        state: "DECIDE",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "WATCH",
        memory,
        thought: thoughtFor("DECIDE", input.locale, reasons),
        reasons,
      });
    case "DECIDE": {
      const intent = decideIntent({
        interest,
        novelty,
        neural: input.neural,
        memory,
        symbol: input.symbol,
      });
      const allowPaperProposal =
        intent === "APPROACH_BUY" || intent === "APPROACH_SELL";
      return finish({
        state: allowPaperProposal ? "FOCUS" : "REST",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent,
        memory,
        thought: thoughtFor("DECIDE", input.locale, reasons),
        reasons,
        allowPaperProposal,
      });
    }
    case "REST":
      return finish({
        state: "SCAN_MARKET",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "EXPLORE",
        memory,
        thought: thoughtFor("REST", input.locale, reasons),
        reasons,
      });
    default:
      return finish({
        state: "SCAN_MARKET",
        symbol: input.symbol,
        timeframe: input.timeframe,
        intent: "EXPLORE",
        memory,
        thought: thoughtFor("SCAN_MARKET", input.locale, reasons),
        reasons,
      });
  }
};
