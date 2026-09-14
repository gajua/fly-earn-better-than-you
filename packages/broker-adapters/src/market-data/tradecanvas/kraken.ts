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
import { toKrakenWsSymbol } from "./symbol-map";
import { KRAKEN_INTERVAL_MIN, mapExact } from "./timeframe-map";

/** Adapted from TradeCanvas KrakenAdapter (MIT). No silent interval default. */

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseKrakenOhlcRow = (row: unknown): CandleBar | null => {
  if (!Array.isArray(row) || row.length < 7) return null;
  const time = toFiniteNumber(row[0]);
  const open = toFiniteNumber(row[1]);
  const high = toFiniteNumber(row[2]);
  const low = toFiniteNumber(row[3]);
  const close = toFiniteNumber(row[4]);
  const volume = toFiniteNumber(row[6]);
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
    timestamp: new Date(time * 1000).toISOString(),
  };
};

export const createTradeCanvasKrakenProvider = (options?: {
  readonly restBase?: string;
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): MarketDataProvider => {
  const restBase = options?.restBase ?? "https://api.kraken.com";
  const transport = options?.transport ?? defaultBrowserTransport();
  const now = options?.now ?? Date.now;

  return {
    id: "tradecanvas-kraken",
    provenance: {
      source: "tradecanvas",
      upstream: TRADECANVAS_UPSTREAM,
      provider: "kraken",
      endpointFamily: "kraken-public-ohlc",
    },
    supports(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      return Boolean(
        ref?.broker === "kraken" && mapExact(KRAKEN_INTERVAL_MIN, timeframe),
      );
    },
    async fetchCandles(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      if (!ref || ref.broker !== "kraken") {
        return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      }
      const interval = mapExact(KRAKEN_INTERVAL_MIN, timeframe);
      if (interval === null) {
        return { ok: false, reason: "UNSUPPORTED_TIMEFRAME" };
      }
      const wsSymbol = toKrakenWsSymbol(ref);
      if (!wsSymbol) return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      const pair = wsSymbol.replace("/", "");
      const url = `${restBase}/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${interval}`;
      try {
        const response = await transport.fetchText(url);
        if (!response.ok) {
          return {
            ok: false,
            reason: "DATA_PROVIDER_ERROR",
            message: `Kraken REST ${response.status}`,
          };
        }
        const json: unknown = JSON.parse(response.body);
        if (!isObject(json) || !isObject(json.result)) {
          return { ok: false, reason: "DATA_PROVIDER_ERROR", message: "invalid" };
        }
        let rows: unknown = null;
        for (const [key, value] of Object.entries(json.result)) {
          if (key === "last") continue;
          if (Array.isArray(value)) {
            rows = value;
            break;
          }
        }
        if (!Array.isArray(rows)) {
          return { ok: false, reason: "DATA_PROVIDER_ERROR", message: "empty" };
        }
        const candles = rows
          .map(parseKrakenOhlcRow)
          .filter((bar): bar is CandleBar => bar !== null)
          .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
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
              provider: "kraken",
              endpointFamily: "kraken-public-ohlc",
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

export const krakenInstrument = (
  symbol: string,
  quoteCurrency = "USD",
): InstrumentRef => ({
  broker: "kraken",
  marketType: "spot",
  symbol: symbol.includes("/")
    ? symbol.toUpperCase()
    : `${symbol.replace(new RegExp(`${quoteCurrency}$`, "i"), "").toUpperCase()}/${quoteCurrency.toUpperCase()}`,
  quoteCurrency,
});
