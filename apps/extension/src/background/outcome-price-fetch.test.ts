import { describe, expect, it } from "vitest";
import {
  fetchBinanceKlines,
  resolvePendingOutcomeMetrics,
  toBinanceRestSymbol,
} from "./outcome-price-fetch";

describe("toBinanceRestSymbol", () => {
  it("parses instrument id", () => {
    expect(toBinanceRestSymbol("binance", "binance:spot:BTC:USDT")).toBe(
      "BTCUSDT",
    );
  });
});

describe("resolvePendingOutcomeMetrics", () => {
  it("uses binance klines without future leakage", async () => {
    const anchorMs = 1_700_000_000_000;
    const endMs = anchorMs + 5 * 60_000;
    const rows = [
      [
        anchorMs,
        "100",
        "101",
        "99",
        "100",
        "1",
        anchorMs + 60_000,
        "0",
        1,
        "0",
        "0",
        "0",
      ],
      [
        anchorMs + 5 * 60_000,
        "100",
        "103",
        "100",
        "102",
        "1",
        endMs + 60_000,
        "0",
        1,
        "0",
        "0",
        "0",
      ],
    ];
    const fetchImpl = async (url: string) => {
      expect(url).toContain("api.binance.com");
      return {
        ok: true,
        json: async () => rows,
      } as Response;
    };
    const metrics = await resolvePendingOutcomeMetrics(
      {
        id: "obs:5m",
        observationId: "obs",
        horizon: "5m",
        dueAt: endMs,
        anchorPrice: 100,
        instrumentId: "binance:spot:BTC:USDT",
        broker: "binance",
      },
      { fetchImpl },
    );
    expect(metrics).not.toBeNull();
    expect(metrics!.futureReturn).toBeCloseTo(0.02, 5);
  });
});

describe("fetchBinanceKlines", () => {
  it("returns empty on HTTP error", async () => {
    const bars = await fetchBinanceKlines({
      symbol: "BTCUSDT",
      interval: "1m",
      startTime: 0,
      endTime: 1,
      fetchImpl: async () => ({ ok: false }) as Response,
    });
    expect(bars).toEqual([]);
  });
});
