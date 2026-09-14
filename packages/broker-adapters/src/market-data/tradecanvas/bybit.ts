import { toInstrumentId, type InstrumentRef } from "@fly/core";
import { validateCandleSeries } from "../candle-validator";
import { asInstrumentRef } from "../provider-chain";
import {
  defaultBrowserTransport,
  type CandleBar,
  type MarketDataProvider,
  type MarketDataTransport,
} from "../types";
import { TRADECANVAS_UPSTREAM } from "./provenance";
import { toBybitSymbol } from "./symbol-map";
import { BYBIT_INTERVAL, mapExact } from "./timeframe-map";

/** Adapted from TradeCanvas BybitAdapter REST helpers (MIT). No silent TF default. */

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const parseBybitRestRow = (row: unknown): CandleBar | null => {
  if (!Array.isArray(row) || row.length < 6) return null;
  const time = toFiniteNumber(row[0]);
  const open = toFiniteNumber(row[1]);
  const high = toFiniteNumber(row[2]);
  const low = toFiniteNumber(row[3]);
  const close = toFiniteNumber(row[4]);
  const volume = toFiniteNumber(row[5]);
  if (
    time === null ||
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

export const createTradeCanvasBybitProvider = (options?: {
  readonly restBase?: string;
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): MarketDataProvider => {
  const restBase = options?.restBase ?? "https://api.bybit.com";
  const transport = options?.transport ?? defaultBrowserTransport();
  const now = options?.now ?? Date.now;

  return {
    id: "tradecanvas-bybit",
    provenance: {
      source: "tradecanvas",
      upstream: TRADECANVAS_UPSTREAM,
      provider: "bybit",
      endpointFamily: "bybit-v5-market-kline",
    },
    supports(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      return Boolean(ref?.broker === "bybit" && mapExact(BYBIT_INTERVAL, timeframe));
    },
    async fetchCandles(instrument, timeframe, fetchOptions) {
      const ref = asInstrumentRef(instrument);
      if (!ref || ref.broker !== "bybit") {
        return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      }
      const interval = mapExact(BYBIT_INTERVAL, timeframe);
      if (!interval) return { ok: false, reason: "UNSUPPORTED_TIMEFRAME" };
      const symbol = toBybitSymbol(ref);
      if (!symbol) return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      const limit = Math.min(Math.max(fetchOptions?.limit ?? 200, 1), 1000);
      const url = `${restBase}/v5/market/kline?category=spot&symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
      try {
        const response = await transport.fetchText(url);
        if (!response.ok) {
          return {
            ok: false,
            reason: "DATA_PROVIDER_ERROR",
            message: `Bybit REST ${response.status}`,
          };
        }
        const json: unknown = JSON.parse(response.body);
        const list =
          typeof json === "object" &&
          json !== null &&
          "result" in json &&
          typeof (json as { result?: unknown }).result === "object" &&
          (json as { result: { list?: unknown } }).result !== null
            ? (json as { result: { list?: unknown } }).result.list
            : null;
        if (!Array.isArray(list)) {
          return { ok: false, reason: "DATA_PROVIDER_ERROR", message: "invalid" };
        }
        const candles = list
          .map(parseBybitRestRow)
          .filter((bar): bar is CandleBar => bar !== null)
          .sort(
            (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
          );
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
              provider: "bybit",
              endpointFamily: "bybit-v5-market-kline",
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

export const bybitInstrument = (
  symbol: string,
  quoteCurrency = "USDT",
): InstrumentRef => ({
  broker: "bybit",
  marketType: "spot",
  symbol: symbol.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
  quoteCurrency,
});
