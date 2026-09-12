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
import { toCoinbaseProductId } from "./symbol-map";
import { COINBASE_GRANULARITY_SEC, mapExact } from "./timeframe-map";

/** Adapted from TradeCanvas CoinbaseAdapter (MIT). 4h → UNAVAILABLE (no silent 1h). */

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const parseCoinbaseCandle = (row: unknown): CandleBar | null => {
  if (!Array.isArray(row) || row.length < 6) return null;
  const time = toFiniteNumber(row[0]);
  const low = toFiniteNumber(row[1]);
  const high = toFiniteNumber(row[2]);
  const open = toFiniteNumber(row[3]);
  const close = toFiniteNumber(row[4]);
  const volume = toFiniteNumber(row[5]);
  if (
    time === null ||
    low === null ||
    high === null ||
    open === null ||
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

export const createTradeCanvasCoinbaseProvider = (options?: {
  readonly restBase?: string;
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): MarketDataProvider => {
  const restBase = options?.restBase ?? "https://api.exchange.coinbase.com";
  const transport = options?.transport ?? defaultBrowserTransport();
  const now = options?.now ?? Date.now;

  return {
    id: "tradecanvas-coinbase",
    provenance: {
      source: "tradecanvas",
      upstream: TRADECANVAS_UPSTREAM,
      provider: "coinbase",
      endpointFamily: "coinbase-exchange-candles",
    },
    supports(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      return Boolean(
        ref?.broker === "coinbase" &&
          mapExact(COINBASE_GRANULARITY_SEC, timeframe) !== null,
      );
    },
    async fetchCandles(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      if (!ref || ref.broker !== "coinbase") {
        return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      }
      const granularity = mapExact(COINBASE_GRANULARITY_SEC, timeframe);
      if (granularity === null) {
        return { ok: false, reason: "UNSUPPORTED_TIMEFRAME" };
      }
      const productId = toCoinbaseProductId(ref);
      if (!productId) return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      const url = `${restBase}/products/${encodeURIComponent(productId)}/candles?granularity=${granularity}`;
      try {
        const response = await transport.fetchText(url);
        if (!response.ok) {
          return {
            ok: false,
            reason: "DATA_PROVIDER_ERROR",
            message: `Coinbase REST ${response.status}`,
          };
        }
        const data: unknown = JSON.parse(response.body);
        if (!Array.isArray(data)) {
          return { ok: false, reason: "DATA_PROVIDER_ERROR", message: "invalid" };
        }
        const candles = data
          .map(parseCoinbaseCandle)
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
              provider: "coinbase",
              endpointFamily: "coinbase-exchange-candles",
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

export const coinbaseInstrument = (
  productId: string,
  quoteCurrency = "USD",
): InstrumentRef => ({
  broker: "coinbase",
  marketType: "spot",
  symbol: productId.toUpperCase(),
  quoteCurrency,
});
