import { describe, expect, it } from "vitest";
import { toInstrumentId } from "@fly/core";
import { validateCandleSeries } from "./market-data/candle-validator";
import { createProviderChain } from "./market-data/provider-chain";
import {
  binanceInstrument,
  bybitInstrument,
  coinbaseInstrument,
  createTradeCanvasBinanceProvider,
  createTradeCanvasBybitProvider,
  createTradeCanvasCoinbaseProvider,
  createTradeCanvasKrakenProvider,
  krakenInstrument,
  mapExact,
  COINBASE_GRANULARITY_SEC,
  BINANCE_INTERVAL,
} from "./market-data/tradecanvas/adapter";
import { createUpbitOfficialPublicProvider, upbitInstrument } from "./market-data/upbit/official-public";
import { BrokerSymbolResolver } from "./shared/symbol-resolver";
import { scanCandidates } from "./candidate-scanner";
import { BROKER_HEALTH } from "./health";
import type { CandleBar, MarketDataProvider, MarketDataTransport } from "./market-data/types";
import type { BrokerAdapter } from "./types";
import type { BrainOutput, Timeframe } from "@fly/core";

const makeCandles = (count: number, now = Date.UTC(2026, 8, 12, 6, 0, 0)): CandleBar[] =>
  Array.from({ length: count }, (_, index) => {
    const open = 100 + index;
    const close = open + 0.5;
    return {
      open,
      high: close + 0.2,
      low: open - 0.2,
      close,
      volume: 10 + index,
      timestamp: new Date(now - (count - index) * 60_000).toISOString(),
    };
  });

const jsonTransport = (payload: unknown, status = 200): MarketDataTransport => ({
  async fetchText() {
    return {
      ok: status >= 200 && status < 300,
      status,
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    };
  },
});

describe("TradeCanvas wrappers", () => {
  it("maps Binance timeframes exactly and rejects nothing in Fly set", () => {
    for (const timeframe of Object.keys(BINANCE_INTERVAL) as Timeframe[]) {
      expect(mapExact(BINANCE_INTERVAL, timeframe)).toBeTruthy();
    }
  });

  it("rejects Coinbase 4h as unsupported (no silent 1h fallback)", async () => {
    expect(mapExact(COINBASE_GRANULARITY_SEC, "4h")).toBeNull();
    const provider = createTradeCanvasCoinbaseProvider({
      transport: jsonTransport([]),
    });
    const result = await provider.fetchCandles(coinbaseInstrument("BTC-USD"), "4h");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNSUPPORTED_TIMEFRAME");
  });

  it("fetches Binance candles via mocked transport", async () => {
    const now = Date.UTC(2026, 8, 12, 6, 0, 0);
    const rows = makeCandles(25, now).map((candle) => [
      Date.parse(candle.timestamp),
      String(candle.open),
      String(candle.high),
      String(candle.low),
      String(candle.close),
      String(candle.volume),
    ]);
    const provider = createTradeCanvasBinanceProvider({
      transport: jsonTransport(rows),
      now: () => now,
    });
    const result = await provider.fetchCandles(binanceInstrument("BTCUSDT"), "1m");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.series.provenance.source).toBe("tradecanvas");
      expect(result.series.provenance.upstream).toBe("bonguynvan/tradecanvas");
      expect(result.series.candles.length).toBeGreaterThanOrEqual(20);
    }
  });

  it("fetches Bybit/Kraken/Coinbase with fixtures", async () => {
    const now = Date.UTC(2026, 8, 12, 6, 0, 0);
    const bars = makeCandles(25, now);

    const bybit = createTradeCanvasBybitProvider({
      now: () => now,
      transport: jsonTransport({
        result: {
          list: [...bars]
            .reverse()
            .map((c) => [
              Date.parse(c.timestamp),
              String(c.open),
              String(c.high),
              String(c.low),
              String(c.close),
              String(c.volume),
              "0",
            ]),
        },
      }),
    });
    const bybitResult = await bybit.fetchCandles(bybitInstrument("BTCUSDT"), "5m");
    expect(bybitResult.ok).toBe(true);

    const coinbase = createTradeCanvasCoinbaseProvider({
      now: () => now,
      transport: jsonTransport(
        [...bars]
          .reverse()
          .map((c) => [
            Date.parse(c.timestamp) / 1000,
            c.low,
            c.high,
            c.open,
            c.close,
            c.volume,
          ]),
      ),
    });
    const coinbaseResult = await coinbase.fetchCandles(
      coinbaseInstrument("BTC-USD"),
      "15m",
    );
    expect(coinbaseResult.ok).toBe(true);

    const kraken = createTradeCanvasKrakenProvider({
      now: () => now,
      transport: jsonTransport({
        result: {
          XXBTZUSD: bars.map((c) => [
            Date.parse(c.timestamp) / 1000,
            String(c.open),
            String(c.high),
            String(c.low),
            String(c.close),
            "0",
            String(c.volume),
            1,
          ]),
          last: 1,
        },
      }),
    });
    const krakenResult = await kraken.fetchCandles(
      krakenInstrument("BTC/USD"),
      "1h",
    );
    expect(krakenResult.ok).toBe(true);
  });

  it("marks network failure as DATA_PROVIDER_ERROR without mock candles", async () => {
    const provider = createTradeCanvasBinanceProvider({
      transport: {
        async fetchText() {
          throw new Error("offline");
        },
      },
    });
    const result = await provider.fetchCandles(binanceInstrument("BTCUSDT"), "1m");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("DATA_PROVIDER_ERROR");
  });
});

describe("candle validation", () => {
  it("rejects inconsistent OHLC and stale series", () => {
    const now = Date.UTC(2026, 8, 12, 6, 0, 0);
    const bad = makeCandles(25, now);
    bad[0] = { ...bad[0]!, high: bad[0]!.open - 10 };
    const inconsistent = validateCandleSeries(bad, "1m", { now });
    expect(inconsistent.failures).toContain("OHLC_INCONSISTENT");

    const stale = validateCandleSeries(makeCandles(25, now - 10 * 60_000), "1m", {
      now,
    });
    expect(stale.ok).toBe(false);
    expect(stale.failures).toContain("STALE");
  });
});

describe("provider fallback", () => {
  it("skips same endpointFamily after DATA_PROVIDER_ERROR", async () => {
    let calls = 0;
    const failing = (id: string, family: string): MarketDataProvider => ({
      id,
      provenance: {
        source: "tradecanvas",
        provider: id,
        endpointFamily: family,
      },
      supports: () => true,
      async fetchCandles() {
        calls += 1;
        return { ok: false, reason: "DATA_PROVIDER_ERROR" };
      },
    });
    const chain = createProviderChain("binance-chain", [
      failing("a", "binance-api-v3-klines"),
      failing("b", "binance-api-v3-klines"),
      failing("c", "other-family"),
    ]);
    await chain.fetchCandles(binanceInstrument("BTCUSDT"), "1m");
    expect(calls).toBe(2);
  });
});

describe("symbol normalization", () => {
  it("parses verified URL patterns", () => {
    expect(
      BrokerSymbolResolver.binance(
        "https://www.binance.com/en/trade/BTC_USDT?type=spot",
      ),
    ).toMatchObject({ normalized: "BTCUSDT", quoteCurrency: "USDT" });
    expect(
      BrokerSymbolResolver.bybit("https://www.bybit.com/trade/spot/BTC/USDT"),
    ).toMatchObject({ normalized: "BTCUSDT" });
    expect(
      BrokerSymbolResolver.kraken("https://www.kraken.com/trade/BTC-USD"),
    ).toMatchObject({ normalized: "BTC/USD" });
    expect(
      BrokerSymbolResolver.coinbase(
        "https://www.coinbase.com/advanced-trade/spot/BTC-USD",
      ),
    ).toMatchObject({ normalized: "BTC-USD" });
    expect(
      BrokerSymbolResolver.upbit(
        "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC",
      ),
    ).toMatchObject({ normalized: "KRW-BTC", quoteCurrency: "KRW" });
  });

  it("keeps instrument ids unique per broker", () => {
    const a = toInstrumentId(binanceInstrument("BTCUSDT"));
    const b = toInstrumentId(bybitInstrument("BTCUSDT"));
    expect(a).not.toBe(b);
    expect(a).toBe("binance:spot:BTCUSDT:USDT");
  });
});

describe("Upbit official public provider", () => {
  it("parses fixture candles", async () => {
    const now = Date.UTC(2026, 8, 12, 6, 28, 0);
    const fixture = makeCandles(25, now).reverse().map((c) => ({
      market: "KRW-BTC",
      candle_date_time_utc: c.timestamp.replace("Z", "").replace(/\.\d+$/, ""),
      opening_price: c.open,
      high_price: c.high,
      low_price: c.low,
      trade_price: c.close,
      candle_acc_trade_volume: c.volume,
    }));
    const provider = createUpbitOfficialPublicProvider({
      now: () => now,
      transport: jsonTransport(fixture),
    });
    const result = await provider.fetchCandles(upbitInstrument("KRW-BTC"), "1m");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.series.provenance.source).toBe("official-public");
    }
  });
});

describe("candidate scan rate limit", () => {
  it("caps candidates and concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const provider: MarketDataProvider = {
      id: "mock",
      provenance: { source: "demo" },
      supports: () => true,
      async fetchCandles(instrument, timeframe) {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        const id = typeof instrument === "string" ? instrument : toInstrumentId(instrument);
        return {
          ok: true,
          series: {
            instrumentId: id,
            timeframe,
            candles: makeCandles(25),
            provenance: { source: "demo" },
          },
        };
      },
    };
    const adapter = {
      readWatchlist: () =>
        Array.from({ length: 15 }, (_, i) => ({
          symbol: `S${i}`,
          instrumentId: `demo:demo:S${i}:USD`,
          source: "watchlist" as const,
        })),
    } as unknown as BrokerAdapter;
    const brain = {
      async evaluate(): Promise<BrainOutput> {
        return {
          state: "observe_chart",
          buyDrive: 0.1,
          sellDrive: 0.1,
          curiosity: 0.2,
          danger: 0,
          activity: 0.2,
        };
      },
    };
    const results = await scanCandidates({
      adapter,
      provider,
      brain,
      options: { maxCandidates: 10, concurrency: 2, brainMode: "mock" },
    });
    expect(results.length).toBeLessThanOrEqual(10);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe("adapter health matrix", () => {
  it("separates market-ready from full support", () => {
    const binance = BROKER_HEALTH.find((row) => row.brokerId === "binance");
    const kraken = BROKER_HEALTH.find((row) => row.brokerId === "kraken");
    expect(binance?.market).toBe("HEALTHY");
    expect(binance?.fullSupport).toBe(false);
    expect(kraken?.ui).toBe("NOT_IMPLEMENTED");
    expect(kraken?.market).toBe("HEALTHY");
  });
});
