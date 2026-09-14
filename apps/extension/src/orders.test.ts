import { describe, expect, it } from "vitest";
import {
  createOrderProposal,
  marketFeaturesFromEnvironment,
  paperQuantityForPrice,
} from "./orders";
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

  it("sizes Upbit-scale KRW prices under maxSingleOrderValue", () => {
    const price = 104_623_000;
    const quantity = paperQuantityForPrice(price);
    const proposal = createOrderProposal({
      broker: "upbit",
      symbol: "KRW-BTC",
      side: "buy",
      price,
      quantity,
      brainMode: "mock",
      brainOutput: {
        state: "approach_buy",
        buyDrive: 0.95,
        sellDrive: 0.05,
        curiosity: 0.2,
        danger: 0,
        activity: 0.6,
      },
    });
    expect(proposal.estimatedValue).toBeCloseTo(100_000, 5);
    const decision = evaluateOrderRisk(proposal, DEFAULT_RISK_POLICY, {
      currentExposure: 0,
      dailyNewExposure: 0,
      positions: [],
    });
    expect(decision.ok).toBe(true);
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

  it("maps MarketEnvironment features onto proposals without inventing stubs", () => {
    const features = marketFeaturesFromEnvironment({
      market: { momentum: 0.21, volatility: 0.33, volumeStrength: 0.44 },
      asset: { changePercent: 1.5 },
    });
    expect(features).toEqual({
      momentum: 0.21,
      volatility: 0.33,
      volumeStrength: 0.44,
      return: 0.015,
    });
    expect(
      marketFeaturesFromEnvironment({
        market: { momentum: Number.NaN, volatility: 0.1, volumeStrength: 0.2 },
        asset: { changePercent: 1 },
      }),
    ).toBeUndefined();
  });
});
