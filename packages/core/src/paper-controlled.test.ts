import { describe, expect, it } from "vitest";
import {
  applyPaperFill,
  computePerformance,
  toInstrumentId,
  type BrainOutput,
} from "@fly/core";

const brain: BrainOutput = {
  state: "approach_buy",
  buyDrive: 0.9,
  sellDrive: 0.1,
  curiosity: 0.2,
  danger: 0,
  activity: 0.5,
};

describe("controlled paper lifecycle", () => {
  it("BUY then SELL closes cycle with expected PnL", () => {
    const instrumentId = toInstrumentId({
      broker: "binance",
      marketType: "spot",
      symbol: "BTCUSDT",
      quoteCurrency: "USDT",
    });

    const buyFill = applyPaperFill([], [], {
      id: "t-buy",
      mode: "paper",
      broker: "binance",
      symbol: "BTCUSDT",
      instrumentId,
      side: "buy",
      quantity: 10,
      price: 100,
      value: 1000,
      timestamp: "2026-09-13T00:00:00.000Z",
      brainMode: "mock",
      brainOutput: brain,
    });
    expect(buyFill.ok).toBe(true);
    if (!buyFill.ok) return;

    const sellFill = applyPaperFill(buyFill.positions, buyFill.cycles, {
      id: "t-sell",
      mode: "paper",
      broker: "binance",
      symbol: "BTCUSDT",
      instrumentId,
      side: "sell",
      quantity: 10,
      price: 110,
      value: 1100,
      timestamp: "2026-09-13T01:00:00.000Z",
      brainMode: "mock",
      brainOutput: {
        ...brain,
        state: "approach_sell",
        buyDrive: 0.1,
        sellDrive: 0.9,
      },
    });
    expect(sellFill.ok).toBe(true);
    if (!sellFill.ok) return;

    const cycle = sellFill.cycles.find((item) => item.status === "closed");
    expect(cycle?.buyAveragePrice).toBe(100);
    expect(cycle?.sellAveragePrice).toBe(110);
    expect(cycle?.realizedPnl).toBe(100);
    expect(cycle?.realizedReturnPercent).toBeCloseTo(10, 5);

    const performance = computePerformance(
      [buyFill.trade, sellFill.trade],
      sellFill.positions,
      1_000_000,
      sellFill.cycles,
    );
    expect(performance.realizedPnl).toBe(100);
    expect(performance.totalTrades).toBe(2);
  });
});
