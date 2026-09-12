import { toInstrumentId, type InstrumentRef, type Timeframe } from "@fly/core";
import { validateCandleSeries } from "../candle-validator";
import { asInstrumentRef } from "../provider-chain";
import {
  defaultBrowserTransport,
  type CandleBar,
  type MarketDataProvider,
  type MarketDataTransport,
} from "../types";

/**
 * Upbit official public candles (no API key).
 * Docs: https://docs.upbit.com/reference
 *
 * Mapping (exact — unsupported → UNAVAILABLE):
 * 1m→minutes/1, 5m→minutes/5, 15m→minutes/15,
 * 1h→minutes/60, 4h→minutes/240, 1d→days
 */

const UPBIT_PATH: Record<Timeframe, { path: string }> = {
  "1m": { path: "/v1/candles/minutes/1" },
  "5m": { path: "/v1/candles/minutes/5" },
  "15m": { path: "/v1/candles/minutes/15" },
  "1h": { path: "/v1/candles/minutes/60" },
  "4h": { path: "/v1/candles/minutes/240" },
  "1d": { path: "/v1/candles/days" },
};

export const toUpbitMarket = (instrument: InstrumentRef): string | null => {
  if (instrument.broker !== "upbit") return null;
  // Prefer KRW-BTC style already stored as symbol.
  if (/^[A-Z0-9]+-[A-Z0-9]+$/i.test(instrument.symbol)) {
    return instrument.symbol.toUpperCase();
  }
  const quote = instrument.quoteCurrency.toUpperCase();
  const base = instrument.symbol
    .replace(new RegExp(`^${quote}-`, "i"), "")
    .replace(new RegExp(`-${quote}$`, "i"), "")
    .toUpperCase();
  if (!base) return null;
  return `${quote}-${base}`;
};

export const parseUpbitCandle = (row: unknown): CandleBar | null => {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const open = Number(record.opening_price);
  const high = Number(record.high_price);
  const low = Number(record.low_price);
  const close = Number(record.trade_price);
  const volume = Number(record.candle_acc_trade_volume);
  const utc = record.candle_date_time_utc;
  if (
    typeof utc !== "string" ||
    ![open, high, low, close, volume].every(Number.isFinite)
  ) {
    return null;
  }
  return {
    open,
    high,
    low,
    close,
    volume,
    timestamp: new Date(`${utc}Z`).toISOString(),
  };
};

export const createUpbitOfficialPublicProvider = (options?: {
  readonly restBase?: string;
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): MarketDataProvider => {
  const restBase = options?.restBase ?? "https://api.upbit.com";
  const transport = options?.transport ?? defaultBrowserTransport();
  const now = options?.now ?? Date.now;

  return {
    id: "upbit-official-public",
    provenance: {
      source: "official-public",
      upstream: "upbit-api",
      provider: "upbit",
      endpointFamily: "upbit-v1-candles",
    },
    supports(instrument, timeframe) {
      const ref = asInstrumentRef(instrument);
      return Boolean(ref?.broker === "upbit" && UPBIT_PATH[timeframe]);
    },
    async fetchCandles(instrument, timeframe, fetchOptions) {
      const ref = asInstrumentRef(instrument);
      if (!ref || ref.broker !== "upbit") {
        return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      }
      const route = UPBIT_PATH[timeframe];
      if (!route) return { ok: false, reason: "UNSUPPORTED_TIMEFRAME" };
      const market = toUpbitMarket(ref);
      if (!market) return { ok: false, reason: "UNSUPPORTED_INSTRUMENT" };
      const count = Math.min(Math.max(fetchOptions?.limit ?? 200, 1), 200);
      const url = `${restBase}${route.path}?market=${encodeURIComponent(market)}&count=${count}`;
      try {
        const response = await transport.fetchText(url);
        if (!response.ok) {
          return {
            ok: false,
            reason: "DATA_PROVIDER_ERROR",
            message: `Upbit REST ${response.status}`,
          };
        }
        const data: unknown = JSON.parse(response.body);
        if (!Array.isArray(data)) {
          return { ok: false, reason: "DATA_PROVIDER_ERROR", message: "invalid" };
        }
        // Upbit returns newest-first.
        const candles = data
          .map(parseUpbitCandle)
          .filter((bar): bar is CandleBar => bar !== null)
          .reverse();
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
              source: "official-public",
              upstream: "upbit-api",
              provider: "upbit",
              endpointFamily: "upbit-v1-candles",
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

export const upbitInstrument = (market: string): InstrumentRef => {
  const normalized = market.toUpperCase();
  const [quote] = normalized.split("-");
  return {
    broker: "upbit",
    marketType: "spot",
    symbol: normalized,
    quoteCurrency: quote ?? "KRW",
  };
};
