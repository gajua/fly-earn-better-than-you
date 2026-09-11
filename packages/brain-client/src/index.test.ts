import { describe, expect, it } from "vitest";
import type { MarketEnvironment } from "@fly/core";
import { createMockFlyBrain } from "./index";

const environment = (
  overrides: Partial<MarketEnvironment["market"]>,
  pnlPercent = 0,
): MarketEnvironment => ({
  asset: { symbol: "AAPL", price: 232.14, changePercent: 0 },
  position: {
    quantity: 12,
    averagePrice: 210,
    pnlAmount: 0,
    pnlPercent,
  },
  market: {
    momentum: 0,
    volatility: 0.2,
    volumeStrength: 0.5,
    ...overrides,
  },
  ui: {
    chart: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
    },
  },
});

const brain = createMockFlyBrain({ random: () => 0.5, noiseAmount: 0 });

describe("MockFlyBrain", () => {
  it("approaches buy in a strong, low-risk uptrend", async () => {
    const output = await brain.evaluate(
      environment({ momentum: 0.95, volatility: 0.12, volumeStrength: 0.9 }),
    );

    expect(output.state).toBe("approach_buy");
    expect(output.buyDrive).toBeGreaterThan(output.sellDrive);
  });

  it("approaches sell in a downtrend", async () => {
    const output = await brain.evaluate(
      environment({ momentum: -0.9, volatility: 0.3 }, -5),
    );

    expect(output.state).toBe("approach_sell");
  });

  it("panics during dangerous volatility and clamps every drive", async () => {
    const output = await brain.evaluate(
      environment({ momentum: -0.75, volatility: 1 }, -20),
    );

    expect(output.state).toBe("panic");
    for (const value of [
      output.buyDrive,
      output.sellDrive,
      output.curiosity,
      output.danger,
      output.activity,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
