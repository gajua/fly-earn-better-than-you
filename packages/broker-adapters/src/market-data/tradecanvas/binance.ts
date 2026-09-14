import { toInstrumentId, type InstrumentRef, type Timeframe } from "@fly/core";
import { validateCandleSeries } from "../candle-validator";
import { asInstrumentRef } from "../provider-chain";
import {
  defaultBrowserTransport,
  type CandleBar,
  type MarketDataFetchResult,
  type MarketDataProvider,
  type MarketDataTransport,
} from "../types";
import { TRADECANVAS_UPSTREAM } from "./provenance";
import { toBinanceSymbol } from "./symbol-map";
import { BINANCE_INTERVAL, mapExact } from "./timeframe-map";

/**
 * Adapted from TradeCanvas BinanceAdapter REST kline parsing (MIT).
 * Silent `?? '15m'` timeframe fallback is intentionally omitted.
 */

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const parseBinanceRestKline = (raw: unknown): CandleBar | null => {
  if (!Array.isArray(raw) || raw.length < 6) return null;
  const time = raw[0];
  if (typeof time !== "number" || !Number.isFinite(time)) return null;
  const open = toFiniteNumber(raw[1]);
  const high = toFiniteNumber(raw[2]);
  const low = toFiniteNumber(raw[3]);
  const close = toFiniteNumber(raw[4]);
  const volume = toFiniteNumber(raw[5]);
  if (
    open === null ||
    high === null ||
    low === null ||
    close === null ||
    volume === null
  ) {
    return null;
  }
  return {
    open,
    high,
    low,
    close,
    volume,
    timestamp: new Date(time).toISOString(),
  };
};

export const createTradeCanvasBinanceProvider = (options?: {
  readonly restBase?: string;
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): MarketDataProvider => {
  const restBase = options?.restBase ?? "https://api.binance.com/api/v3";
  const transport = options?.transport ?? defaultBrowserTransport();
  const now = options?.now ?? Date.now;

  return {
    id: "tradecanvas-binance",
    provenance: {
      source: "tradecanvas",
      upstream: TRADECANVAS_UPSTREAM,
      provider: "binance",
      endpointFamily: "binance-api-v3-klines",
    },
    supports(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      if (!ref || ref.broker !== "binance") return false;
      return mapExact(BINANCE_INTERVAL, timeframe) !== null;
    },
    async fetchCandles(instrument, timeframe, fetchOptions) {
      const ref = asInstrumentRef(instrument);
      if (!ref || ref.broker !== "binance") {
        return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      }
      const interval = mapExact(BINANCE_INTERVAL, timeframe);
      if (!interval) {
        return { ok: false, reason: "UNSUPPORTED_TIMEFRAME" };
      }
      const symbol = toBinanceSymbol(ref);
      if (!symbol) {
        return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      }
      const limit = Math.min(Math.max(fetchOptions?.limit ?? 200, 1), 1000);
      const url = `${restBase}/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
      try {
        const response = await transport.fetchText(url);
        if (!response.ok) {
          return {
            ok: false,
            reason: "DATA_PROVIDER_ERROR",
            message: `Binance REST ${response.status}`,
          };
        }
        const data: unknown = JSON.parse(response.body);
        if (!Array.isArray(data)) {
          return {
            ok: false,
            reason: "DATA_PROVIDER_ERROR",
            message: "invalid payload",
          };
        }
        const candles = data
          .map(parseBinanceRestKline)
          .filter((bar): bar is CandleBar => bar !== null);
        const validated = validateCandleSeries(candles, timeframe, {
          now: now(),
        });
        if (!validated.ok) {
          return {
            ok: false,
            reason: "VALIDATION_FAILED",
            message: validated.failures.join(","),
          };
        }
        return {
          ok: true,
          series: {
            instrumentId: toInstrumentId(ref),
            timeframe,
            candles: validated.candles,
            provenance: {
              source: "tradecanvas",
              upstream: TRADECANVAS_UPSTREAM,
              provider: "binance",
              endpointFamily: "binance-api-v3-klines",
            },
          },
        };
      } catch (error) {
        return {
          ok: false,
          reason: "DATA_PROVIDER_ERROR",
          message: error instanceof Error ? error.message : "network",
        };
      }
    },
  };
};

export const binanceInstrument = (
  symbol: string,
  quoteCurrency = "USDT",
): InstrumentRef => ({
  broker: "binance",
  marketType: "spot",
  symbol: symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
  quoteCurrency,
});

export type { Timeframe, MarketDataFetchResult };
