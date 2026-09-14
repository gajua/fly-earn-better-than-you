import { describe, expect, it } from "vitest";
import {
  DEFAULT_RISK_POLICY,
  applyPaperFill,
  canAcceptProposal,
  computeLongExposure,
  computePerformance,
  demoInstrumentId,
  emptyProposalGuardState,
  evaluateOrderRisk,
  filterUsableTimeframeObservations,
  markProposalAccepted,
  summarizeClosedCycles,
  type BrainOutput,
  type OrderProposal,
  type PaperPosition,
  type PositionCycle,
  type TimeframeObservation,
} from "./index";

const brain: BrainOutput = {
  state: "approach_buy",
  buyDrive: 0.9,
  sellDrive: 0.1,
  curiosity: 0.4,
  danger: 0.2,
  activity: 0.7,
};

const instrumentId = demoInstrumentId("AAPL");

const proposal = (
  value: number,
  side: "buy" | "sell" = "buy",
  quantity = value / 100,
): OrderProposal => ({
  id: crypto.randomUUID(),
  broker: "demo",
  symbol: "AAPL",
  instrumentId,
  side,
  quantity,
  estimatedPrice: 100,
  estimatedValue: value,
  createdAt: new Date().toISOString(),
  brainSnapshot: brain,
  brainMode: "mock",
});

describe("RiskEngine hardening", () => {
  it("rejects buys that exceed maxTradingCapital including exposure", () => {
    const decision = evaluateOrderRisk(proposal(500_000), DEFAULT_RISK_POLICY, {
      currentExposure: 700_000,
      dailyNewExposure: 0,
      positions: [],
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("exceeds-max-trading-capital");
    }
  });

  it("rejects buy when existing instrument + proposal exceeds maxPositionValue", () => {
    const positions: PaperPosition[] = [
      {
        symbol: "AAPL",
        instrumentId,
        quantity: 4_000,
        averagePrice: 100,
        marketPrice: 100,
        priceUpdatedAt: new Date().toISOString(),
      },
    ];
    const decision = evaluateOrderRisk(proposal(200_000), DEFAULT_RISK_POLICY, {
      currentExposure: computeLongExposure(positions),
      dailyNewExposure: 0,
      positions,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe("exceeds-max-position-value");
  });

  it("rejects sell without position and oversell", () => {
    expect(
      evaluateOrderRisk(proposal(100, "sell", 1), DEFAULT_RISK_POLICY, {
        currentExposure: 0,
        dailyNewExposure: 0,
        positions: [],
      }).ok,
    ).toBe(false);

    const positions: PaperPosition[] = [
      {
        symbol: "AAPL",
        instrumentId,
        quantity: 5,
        averagePrice: 100,
        marketPrice: 100,
        priceUpdatedAt: new Date().toISOString(),
      },
    ];
    const oversell = evaluateOrderRisk(
      proposal(1_000, "sell", 10),
      DEFAULT_RISK_POLICY,
      {
        currentExposure: computeLongExposure(positions),
        dailyNewExposure: 0,
        positions,
      },
    );
    expect(oversell.ok).toBe(false);
  });
});

describe("acceptance round-trip lifecycle", () => {
  it("handles buy average, partial sell, close, reject, and re-entry", () => {
    let positions: PaperPosition[] = [];
    let cycles: PositionCycle[] = [];
    const trades = [];

    const buy1 = applyPaperFill(positions, cycles, {
      mode: "paper",
      broker: "demo",
      symbol: "AAPL",
      instrumentId,
      side: "buy",
      quantity: 10,
      price: 100,
      value: 1_000,
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(buy1.ok).toBe(true);
    if (!buy1.ok) return;
    positions = buy1.positions;
    cycles = buy1.cycles;
    trades.push(buy1.trade);

    const buy2 = applyPaperFill(positions, cycles, {
      mode: "paper",
      broker: "demo",
      symbol: "AAPL",
      instrumentId,
      side: "buy",
      quantity: 10,
      price: 120,
      value: 1_200,
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(buy2.ok).toBe(true);
    if (!buy2.ok) return;
    positions = buy2.positions;
    cycles = buy2.cycles;
    trades.push(buy2.trade);
    expect(positions[0]?.averagePrice).toBe(110);

    const sellPartial = applyPaperFill(positions, cycles, {
      mode: "paper",
      broker: "demo",
      symbol: "AAPL",
      instrumentId,
      side: "sell",
      quantity: 5,
      price: 130,
      value: 650,
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(sellPartial.ok).toBe(true);
    if (!sellPartial.ok) return;
    positions = sellPartial.positions;
    cycles = sellPartial.cycles;
    trades.push(sellPartial.trade);
    expect(cycles[0]?.status).toBe("open");
    expect(positions[0]?.quantity).toBe(15);

    const sellRest = applyPaperFill(positions, cycles, {
      mode: "paper",
      broker: "demo",
      symbol: "AAPL",
      instrumentId,
      side: "sell",
      quantity: 15,
      price: 125,
      value: 1_875,
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(sellRest.ok).toBe(true);
    if (!sellRest.ok) return;
    positions = sellRest.positions;
    cycles = sellRest.cycles;
    trades.push(sellRest.trade);

    expect(positions).toHaveLength(0);
    expect(cycles.filter((cycle) => cycle.status === "closed")).toHaveLength(1);
    const closed = cycles[0]!;
    expect(closed.buyAveragePrice).toBe(110);
    expect(closed.sellAveragePrice).toBeCloseTo(126.25, 5);
    expect(closed.realizedReturnPercent).toBeCloseTo(
      ((126.25 - 110) / 110) * 100,
      5,
    );

    const reject = applyPaperFill(positions, cycles, {
      mode: "paper",
      broker: "demo",
      symbol: "AAPL",
      instrumentId,
      side: "sell",
      quantity: 1,
      price: 125,
      value: 125,
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(reject.ok).toBe(false);
    expect(cycles.filter((cycle) => cycle.status === "closed")).toHaveLength(1);

    const reentry = applyPaperFill(positions, cycles, {
      mode: "paper",
      broker: "demo",
      symbol: "AAPL",
      instrumentId,
      side: "buy",
      quantity: 2,
      price: 140,
      value: 280,
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(reentry.ok).toBe(true);
    if (!reentry.ok) return;
    expect(reentry.cycles.filter((cycle) => cycle.status === "open")).toHaveLength(
      1,
    );
    expect(reentry.cycles).toHaveLength(2);

    const summary = summarizeClosedCycles(reentry.cycles);
    expect(summary[0]?.symbol).toBe("AAPL");

    const performance = computePerformance(
      [...trades, sellRest.trade],
      reentry.positions,
      10_000,
      reentry.cycles,
    );
    expect(performance.benchmarkReturn).toBeNull();
    expect(performance.maximumDrawdownBasis).toBe("realized-only");
  });
});

describe("proposal guard and timeframe honesty", () => {
  it("blocks duplicate proposals inside cooldown", () => {
    let state = emptyProposalGuardState();
    const first = proposal(100);
    expect(canAcceptProposal(first, state, 1_000, 30_000).ok).toBe(true);
    state = markProposalAccepted(state, first, 1_000);
    const second = proposal(100);
    expect(canAcceptProposal(second, state, 5_000, 30_000).ok).toBe(false);
  });

  it("excludes unavailable and under-candled timeframe observations", () => {
    const now = Date.now();
    const observations: TimeframeObservation[] = [
      {
        symbol: "AAPL",
        instrumentId,
        timeframe: "1m",
        price: 100,
        returnPercent: 1,
        momentum: 0.5,
        volatility: 0.2,
        volumeStrength: 0.5,
        timestamp: new Date(now).toISOString(),
        observedAt: new Date(now).toISOString(),
        source: "demo",
        candleCount: 30,
        available: true,
      },
      {
        symbol: "AAPL",
        instrumentId,
        timeframe: "5m",
        price: 100,
        returnPercent: 1,
        momentum: 0.5,
        volatility: 0.2,
        volumeStrength: 0.5,
        timestamp: new Date(now).toISOString(),
        observedAt: new Date(now).toISOString(),
        source: "demo",
        candleCount: 2,
        available: true,
      },
      {
        symbol: "AAPL",
        instrumentId,
        timeframe: "15m",
        price: 100,
        returnPercent: 1,
        momentum: 0.5,
        volatility: 0.2,
        volumeStrength: 0.5,
        timestamp: new Date(now).toISOString(),
        observedAt: new Date(now).toISOString(),
        source: "demo",
        candleCount: 30,
        available: false,
      },
    ];
    const usable = filterUsableTimeframeObservations(observations, now);
    expect(usable.map((item) => item.timeframe)).toEqual(["1m"]);
  });
});
