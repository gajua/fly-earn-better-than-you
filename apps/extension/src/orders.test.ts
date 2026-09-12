import { describe, expect, it } from "vitest";
import { createOrderProposal } from "./orders";
import {
  DEFAULT_RISK_POLICY,
  deriveSessionState,
  evaluateOrderRisk,
} from "@fly/core";

describe("extension order safety", () => {
  it("never marks live-assist paper execution as automatic confirm bypass", () => {
    const proposal = createOrderProposal({
      broker: "demo",
      symbol: "AAPL",
      side: "buy",
      price: 100,
      quantity: 10,
      brainMode: "mock",
      brainOutput: {
        state: "approach_buy",
        buyDrive: 0.9,
        sellDrive: 0.1,
        curiosity: 0.2,
        danger: 0.1,
        activity: 0.8,
      },
    });
    expect(proposal.instrumentId).toContain("AAPL");
    expect(proposal.estimatedValue).toBe(1_000);
    const decision = evaluateOrderRisk(proposal, DEFAULT_RISK_POLICY, {
      currentExposure: 999_500,
      dailyNewExposure: 0,
      positions: [],
    });
    expect(decision.ok).toBe(false);
  });

  it("maps broker absence to NO_BROKER", () => {
    expect(
      deriveSessionState({
        hasBrokerTab: false,
        loginState: "LOGGED_IN",
        marketOpen: true,
      }),
    ).toBe("NO_BROKER");
  });
});
