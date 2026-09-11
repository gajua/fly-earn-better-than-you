import { describe, expect, it } from "vitest";
import {
  DEFAULT_RISK_POLICY,
  applyPaperFill,
  computeLongExposure,
  computePerformance,
  deriveSessionState,
  evaluateOrderRisk,
  aggregateTimeframeObservations,
  type OrderProposal,
  type BrainOutput,
} from "./index";

const brain: BrainOutput = {
  state: "approach_buy",
  buyDrive: 0.9,
  sellDrive: 0.1,
  curiosity: 0.4,
  danger: 0.2,
  activity: 0.7,
};

const proposal = (value: number, side: "buy" | "sell" = "buy"): OrderProposal => ({
  id: "p1",
  broker: "demo",
  symbol: "AAPL",
  side,
  estimatedPrice: 100,
  estimatedValue: value,
  createdAt: new Date().toISOString(),
  brainSnapshot: brain,
  brainMode: "mock",
});

describe("RiskEngine", () => {
  it("rejects buys that exceed maxTradingCapital exposure", () => {
    const decision = evaluateOrderRisk(proposal(500_000), DEFAULT_RISK_POLICY, {
      currentExposure: 700_000,
      dailyNewExposure: 0,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.reason).toBe("exceeds-max-trading-capital");
      expect(decision.remainingCapacity).toBe(300_000);
    }
  });

  it("does not treat sell as additional exposure", () => {
    const decision = evaluateOrderRisk(
      proposal(500_000, "sell"),
      DEFAULT_RISK_POLICY,
      { currentExposure: 700_000, dailyNewExposure: 0 },
    );
    expect(decision.ok).toBe(true);
  });
});

describe("paper trading", () => {
  it("updates positions and performance separately from brain", () => {
    let positions = applyPaperFill([], {
      symbol: "AAPL",
      side: "buy",
      quantity: 10,
      price: 100,
    });
    expect(computeLongExposure(positions)).toBe(1_000);

    positions = applyPaperFill(positions, {
      symbol: "AAPL",
      side: "sell",
      quantity: 4,
      price: 110,
    });

    const performance = computePerformance(
      [
        {
          id: "t1",
          mode: "paper",
          broker: "demo",
          symbol: "AAPL",
          side: "buy",
          quantity: 10,
          price: 100,
          value: 1_000,
          timestamp: "2026-01-01T00:00:00.000Z",
          brainMode: "mock",
          brainOutput: brain,
        },
        {
          id: "t2",
          mode: "paper",
          broker: "demo",
          symbol: "AAPL",
          side: "sell",
          quantity: 4,
          price: 110,
          value: 440,
          timestamp: "2026-01-01T01:00:00.000Z",
          brainMode: "mock",
          brainOutput: brain,
        },
      ],
      positions,
      10_000,
    );

    expect(performance.realizedPnl).toBe(40);
    expect(positions[0]?.quantity).toBe(6);
  });
});

describe("session + temporal", () => {
  it("maps missing broker tabs to NO_BROKER sleep UX", () => {
    expect(
      deriveSessionState({
        hasBrokerTab: false,
        loginState: "UNKNOWN",
        marketOpen: true,
      }),
    ).toBe("NO_BROKER");
  });

  it("aggregates timeframes without direct buy rules", () => {
    const environment = aggregateTimeframeObservations([
      {
        symbol: "AAPL",
        timeframe: "1m",
        price: 100,
        returnPercent: 1,
        momentum: 0.8,
        volatility: 0.2,
        volumeStrength: 0.5,
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        symbol: "AAPL",
        timeframe: "1d",
        price: 101,
        returnPercent: -0.5,
        momentum: -0.2,
        volatility: 0.4,
        volumeStrength: 0.6,
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(environment.market.momentum).toBeLessThan(0.8);
    expect(environment.market.momentum).toBeGreaterThan(-0.2);
  });
});
