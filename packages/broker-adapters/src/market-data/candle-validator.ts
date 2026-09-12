import {
  MIN_CANDLES_BY_TIMEFRAME,
  STALE_MS_BY_TIMEFRAME,
  type Timeframe,
} from "@fly/core";
import type { CandleBar } from "./types";

export type CandleValidationFailure =
  | "EMPTY"
  | "INVALID_NUMERIC"
  | "OHLC_INCONSISTENT"
  | "NON_CHRONOLOGICAL"
  | "DUPLICATE_TIMESTAMP"
  | "FUTURE_TIMESTAMP"
  | "STALE"
  | "UNDER_MINIMUM";

export interface CandleValidationResult {
  readonly ok: boolean;
  readonly candles: readonly CandleBar[];
  readonly failures: readonly CandleValidationFailure[];
}

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

export const validateCandleSeries = (
  candles: readonly CandleBar[],
  timeframe: Timeframe,
  options?: {
    readonly now?: number;
    readonly minCount?: number;
    readonly rejectDuplicates?: boolean;
  },
): CandleValidationResult => {
  const now = options?.now ?? Date.now();
  const minCount = options?.minCount ?? MIN_CANDLES_BY_TIMEFRAME[timeframe];
  const rejectDuplicates = options?.rejectDuplicates ?? true;
  const failures: CandleValidationFailure[] = [];

  if (candles.length === 0) {
    return { ok: false, candles: [], failures: ["EMPTY"] };
  }

  const cleaned: CandleBar[] = [];
  let previousTs = Number.NEGATIVE_INFINITY;
  const seen = new Set<string>();

  for (const candle of candles) {
    const ts = Date.parse(candle.timestamp);
    if (!Number.isFinite(ts)) {
      failures.push("INVALID_NUMERIC");
      continue;
    }
    if (
      !isFiniteNumber(candle.open) ||
      !isFiniteNumber(candle.high) ||
      !isFiniteNumber(candle.low) ||
      !isFiniteNumber(candle.close) ||
      !isFiniteNumber(candle.volume)
    ) {
      failures.push("INVALID_NUMERIC");
      continue;
    }
    if (
      candle.high < candle.open ||
      candle.high < candle.close ||
      candle.low > candle.open ||
      candle.low > candle.close
    ) {
      failures.push("OHLC_INCONSISTENT");
      continue;
    }
    if (ts > now + 60_000) {
      failures.push("FUTURE_TIMESTAMP");
      continue;
    }
    if (seen.has(candle.timestamp)) {
      failures.push("DUPLICATE_TIMESTAMP");
      if (rejectDuplicates) continue;
    }
    if (ts < previousTs) {
      failures.push("NON_CHRONOLOGICAL");
      continue;
    }
    seen.add(candle.timestamp);
    previousTs = ts;
    cleaned.push(candle);
  }

  if (cleaned.length < minCount) {
    failures.push("UNDER_MINIMUM");
  }

  const latest = cleaned.at(-1);
  if (latest) {
    const age = now - Date.parse(latest.timestamp);
    if (age > STALE_MS_BY_TIMEFRAME[timeframe]) {
      failures.push("STALE");
    }
  }

  const hardFailures = new Set(failures);
  const ok =
    cleaned.length >= minCount &&
    !hardFailures.has("STALE") &&
    !hardFailures.has("NON_CHRONOLOGICAL") &&
    !hardFailures.has("EMPTY");

  return { ok, candles: cleaned, failures: [...new Set(failures)] };
};
