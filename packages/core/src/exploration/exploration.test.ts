import { describe, expect, it } from "vitest";
import type { BrainOutput } from "../types";
import { calculateTrendConflict, computeMarketFeatures } from "./features";
import {
  computeInterestScore,
  computeNovelty,
  recentlyVisitedPenalty,
} from "./curiosity";
import { canProposePaperTrade } from "./gating";
import { emptyFlyMemory, recordObservation, recordVisit } from "./memory";
import {
  decideIntent,
  nextTimeframe,
  selectSymbol,
  stepExploration,
} from "./policy";
import type { MarketFeatures, OhlcvBar } from "./types";
import type { RankedCandidate } from "./policy";

const rng = (values: number[]): (() => number) => {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0.1;
    index += 1;
    return value;
  };
};

const trendingCandles = (direction: 1 | -1, count = 40): OhlcvBar[] => {
  const candles: OhlcvBar[] = [];
  let price = 100;
  for (let index = 0; index < count; index += 1) {
    price += direction * (0.8 + (index % 3) * 0.1);
    candles.push({
      open: price - direction * 0.4,
      high: price + 0.6,
      low: price - 0.6,
      close: price,
      volume: 1_000 + (index === count - 1 ? 4_000 : 0),
    });
  }
  return candles;
};

const quietFeatures = (): MarketFeatures => ({
  return1: 0,
  returnN: 0.01,
  ma5: 100,
  ma20: 100,
  priceVsMa20: 0,
  ma5VsMa20: 0,
  ma20Slope: 0,
  relativeVolume: 1,
  volumeChange: 0,
  volatility: 0.004,
  rangeRatio: 0.01,
  momentum: 0.001,
  acceleration: 0,
  trendDirection: 0,
});

const neural = (overrides: Partial<BrainOutput> = {}): BrainOutput => ({
  state: "observe_chart",
  buyDrive: 0.2,
  sellDrive: 0.1,
  curiosity: 0.4,
  danger: 0.1,
  activity: 0.3,
  ...overrides,
});

describe("market features and trend conflict", () => {
  it("computes MA / volume / volatility from OHLCV", () => {
    const features = computeMarketFeatures(trendingCandles(1));
    expect(features).not.toBeNull();
    expect(features!.trendDirection).toBe(1);
    expect(features!.relativeVolume).toBeGreaterThan(1);
    expect(features!.ma20).toBeGreaterThan(0);
  });

  it("scores disagreement across timeframes as conflict, not a trade side", () => {
    expect(calculateTrendConflict([1, 1, -1, -1])).toBe(1);
    expect(calculateTrendConflict([1, 1, 1, 1])).toBe(0);
  });
});

describe("curiosity / novelty / visit penalty", () => {
  it("treats unseen symbols as maximally novel", () => {
    const novelty = computeNovelty({
      memory: emptyFlyMemory(),
      symbol: "ETHUSDT",
      timeframe: "1d",
      features: quietFeatures(),
      now: 1_000,
    });
    expect(novelty).toBe(1);
  });

  it("penalizes a symbol that was just visited", () => {
    const memory = recordVisit(emptyFlyMemory(), {
      symbol: "BTCUSDT",
      now: 10_000,
      interestScore: 0.4,
    });
    expect(recentlyVisitedPenalty(memory, "BTCUSDT", 11_000)).toBeGreaterThan(
      0.4,
    );
    expect(recentlyVisitedPenalty(memory, "ETHUSDT", 11_000)).toBe(0);
  });

  it("raises interest when novelty and conflict are high", () => {
    const low = computeInterestScore({
      novelty: 0.1,
      features: quietFeatures(),
      neural: neural(),
      recentlyVisitedPenalty: 0.8,
    });
    const high = computeInterestScore({
      novelty: 0.9,
      features: { ...quietFeatures(), trendConflict: 0.9, volatility: 0.05 },
      neural: neural({ activity: 0.8 }),
      recentlyVisitedPenalty: 0,
    });
    expect(high).toBeGreaterThan(low);
  });
});

describe("symbol / timeframe selection and intents", () => {
  it("usually prefers higher-ranked candidates but allows epsilon exploration", () => {
    const ranked: RankedCandidate[] = [
      {
        symbol: "BTCUSDT",
        score: 0.9,
        novelty: 0.8,
        penalty: 0,
        reasons: ["novelty"],
      },
      {
        symbol: "ETHUSDT",
        score: 0.2,
        novelty: 0.4,
        penalty: 0,
        reasons: ["scan"],
      },
    ];
    expect(selectSymbol(ranked, "BTCUSDT", rng([0.3, 0.01]))?.symbol).toBe(
      "BTCUSDT",
    );
    expect(selectSymbol(ranked, "BTCUSDT", rng([0.1, 0.99]))?.symbol).toBe(
      "ETHUSDT",
    );
  });

  it("deepens timeframes when interest is high and skips when low", () => {
    const empty = emptyFlyMemory();
    expect(nextTimeframe(empty, "BTCUSDT", "1h", 0.8)).toBe("1d");
    const after1d = recordObservation(empty, {
      symbol: "BTCUSDT",
      timeframe: "1d",
      now: 1,
      features: quietFeatures(),
    });
    expect(nextTimeframe(after1d, "BTCUSDT", "1d", 0.8)).toBe("4h");
    expect(nextTimeframe(after1d, "BTCUSDT", "1d", 0.1)).toBe("4h");
    const after4h = recordObservation(after1d, {
      symbol: "BTCUSDT",
      timeframe: "4h",
      now: 2,
      features: quietFeatures(),
    });
    expect(nextTimeframe(after4h, "BTCUSDT", "4h", 0.1)).toBe("1h");
    expect(nextTimeframe(after4h, "BTCUSDT", "4h", 0.8)).toBe("1h");
    const after1h = recordObservation(after4h, {
      symbol: "BTCUSDT",
      timeframe: "1h",
      now: 3,
      features: quietFeatures(),
    });
    expect(nextTimeframe(after1h, "BTCUSDT", "1h", 0.1)).toBe(null);
  });

  it("defaults to IGNORE/WATCH instead of BUY/SELL", () => {
    expect(
      decideIntent({
        interest: 0.3,
        novelty: 0.2,
        neural: neural(),
        memory: emptyFlyMemory(),
        symbol: "BTCUSDT",
      }),
    ).toBe("IGNORE");
    expect(
      decideIntent({
        interest: 0.7,
        novelty: 0.4,
        neural: neural({ buyDrive: 0.9 }),
        memory: emptyFlyMemory(),
        symbol: "BTCUSDT",
      }),
    ).toBe("WATCH");
  });
});

describe("paper proposal gating", () => {
  it("blocks proposals until enough observations or revisits", () => {
    const neuralHot = neural({ buyDrive: 0.9, state: "approach_buy" });
    expect(
      canProposePaperTrade({
        memory: emptyFlyMemory(),
        symbol: "BTCUSDT",
        interest: 0.9,
        neural: neuralHot,
      }),
    ).toBe(false);

    let memory = recordObservation(emptyFlyMemory(), {
      symbol: "BTCUSDT",
      timeframe: "1d",
      now: 1,
      features: quietFeatures(),
    });
    memory = recordObservation(memory, {
      symbol: "BTCUSDT",
      timeframe: "4h",
      now: 2,
      features: quietFeatures(),
    });
    expect(
      canProposePaperTrade({
        memory,
        symbol: "BTCUSDT",
        interest: 0.9,
        neural: neuralHot,
      }),
    ).toBe(true);
  });
});

describe("exploration policy loop", () => {
  it("wakes into scan and can leave a familiar symbol", () => {
    const first = stepExploration({
      state: "SLEEP",
      symbol: "BTCUSDT",
      timeframe: "1h",
      memory: emptyFlyMemory(),
      candidates: [
        { symbol: "BTCUSDT", source: "current" },
        { symbol: "ETHUSDT", source: "seed" },
      ],
      features: quietFeatures(),
      featuresBySymbol: { BTCUSDT: { "1h": quietFeatures() } },
      neural: neural(),
      now: 1_000,
      speed: "fast",
      paused: false,
      random: rng([0.1, 0.1, 0.1]),
      locale: "en",
    });
    expect(first.state).toBe("WAKE");
    const scan = stepExploration({
      ...first,
      state: "SCAN_MARKET",
      candidates: [
        { symbol: "BTCUSDT", source: "current" },
        { symbol: "ETHUSDT", source: "seed" },
      ],
      features: quietFeatures(),
      featuresBySymbol: {
        BTCUSDT: { "1d": quietFeatures() },
        ETHUSDT: { "1d": quietFeatures() },
      },
      now: 2_000,
      speed: "fast",
      paused: false,
      random: rng([0.9, 0.01]),
      locale: "en",
      neural: neural(),
    });
    expect(["ETHUSDT", "BTCUSDT"]).toContain(scan.symbol);
    expect(scan.intent).not.toBe("APPROACH_BUY");
    expect(scan.intent).not.toBe("APPROACH_SELL");
  });
});
