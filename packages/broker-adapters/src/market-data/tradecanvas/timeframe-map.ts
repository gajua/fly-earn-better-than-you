import type { Timeframe } from "@fly/core";

/**
 * Exact timeframe maps adapted from TradeCanvas adapters.
 * Unsupported Fly timeframes MUST return null — never silently default.
 *
 * Upstream silent defaults we deliberately do NOT replicate:
 * - BinanceAdapter: `TF_MAP[tf] ?? '15m'`
 * - BybitAdapter: `INTERVAL[tf] ?? '1'`
 * - CoinbaseAdapter: `GRANULARITY[tf] ?? 3600`
 * - KrakenAdapter: `INTERVAL[tf] ?? 1`
 */

export const BINANCE_INTERVAL: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

export const BYBIT_INTERVAL: Record<Timeframe, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

/** Coinbase Exchange does not support 4h. */
export const COINBASE_GRANULARITY_SEC: Partial<Record<Timeframe, number>> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

export const KRAKEN_INTERVAL_MIN: Record<Timeframe, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

export const mapExact = <T>(
  map: Partial<Record<Timeframe, T>>,
  timeframe: Timeframe,
): T | null => {
  const value = map[timeframe];
  return value === undefined ? null : value;
};
