import { describe, expect, it } from "vitest";
import type { PositionCycle } from "./types";
import {
  computeExtendedPerformance,
  computePerformanceByBrainMode,
} from "./performance-analytics";

const closed = (
  overrides: Partial<PositionCycle> &
    Pick<PositionCycle, "realizedPnl" | "realizedReturnPercent">,
): PositionCycle => ({
  id: crypto.randomUUID(),
  instrumentId: "upbit:spot:KRW-BTC",
  broker: "upbit",
  symbol: "KRW-BTC",
  status: "closed",
  buyAveragePrice: 100,
  quantityOpened: 1,
  quantityClosed: 1,
  sellAveragePrice: 110,
  openedAt: "2026-01-01T00:00:00.000Z",
  closedAt: "2026-01-02T00:00:00.000Z",
  ...overrides,
});

describe("performance analytics", () => {
  it("handles empty history", () => {
    const stats = computeExtendedPerformance([], 1_000_000);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(0);
    expect(stats.maxDrawdownPercent).toBe(0);
  });

  it("treats break-even as neutral and computes win rate", () => {
    const stats = computeExtendedPerformance(
      [
        closed({ realizedPnl: 10, realizedReturnPercent: 5 }),
        closed({ realizedPnl: -5, realizedReturnPercent: -2 }),
        closed({ realizedPnl: 0, realizedReturnPercent: 0 }),
      ],
      100,
    );
    expect(stats.winCount).toBe(1);
    expect(stats.lossCount).toBe(1);
    expect(stats.breakEvenCount).toBe(1);
    expect(stats.winRate).toBeCloseTo(0.5);
    expect(stats.profitFactor).toBeCloseTo(2);
  });

  it("handles no losses for profit factor safely", () => {
    const stats = computeExtendedPerformance(
      [closed({ realizedPnl: 12, realizedReturnPercent: 3 })],
      100,
    );
    expect(stats.profitFactor).toBeNull();
    expect(stats.bestTradePercent).toBe(3);
  });

  it("computes max drawdown on equity curve", () => {
    const stats = computeExtendedPerformance(
      [
        closed({
          realizedPnl: 50,
          realizedReturnPercent: 5,
          closedAt: "2026-01-01T00:00:00.000Z",
        }),
        closed({
          realizedPnl: -80,
          realizedReturnPercent: -8,
          closedAt: "2026-01-02T00:00:00.000Z",
        }),
      ],
      100,
    );
    // peak 150 → trough 70 = 53.33%
    expect(stats.maxDrawdownPercent).toBeCloseTo((80 / 150) * 100, 5);
  });

  it("groups by brain mode using buy trade mapping", () => {
    const cycleId = "cycle-1";
    const grouped = computePerformanceByBrainMode(
      [
        closed({
          id: cycleId,
          realizedPnl: 10,
          realizedReturnPercent: 2,
        }),
      ],
      [
        {
          id: "t1",
          mode: "paper",
          broker: "upbit",
          symbol: "KRW-BTC",
          instrumentId: "upbit:spot:KRW-BTC",
          side: "buy",
          quantity: 1,
          price: 100,
          value: 100,
          timestamp: "2026-01-01T00:00:00.000Z",
          brainMode: "real-connectome",
          brainOutput: {
            state: "approach_buy",
            buyDrive: 0.9,
            sellDrive: 0.1,
            curiosity: 0.2,
            danger: 0.1,
            activity: 0.5,
          },
          cycleId,
        },
      ],
      1_000_000,
    );
    const male = grouped.find((row) => row.brainMode === "real-connectome");
    expect(male?.totalTrades).toBe(1);
    expect(grouped.find((row) => row.brainMode === "mock")?.totalTrades).toBe(
      0,
    );
  });
});
