import { clamp01 } from "../math";
import type { Timeframe } from "../types";
import type { MarketFeatures, OhlcvBar } from "./types";

const mean = (values: readonly number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const sma = (values: readonly number[], period: number): number => {
  if (values.length === 0) return 0;
  return mean(values.slice(-Math.min(period, values.length)));
};

const rsi = (closes: readonly number[], period = 14): number | undefined => {
  if (closes.length < period + 1) return undefined;
  let gain = 0;
  let loss = 0;
  for (let index = closes.length - period; index < closes.length; index += 1) {
    const delta = closes[index]! - closes[index - 1]!;
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const trendFromSlope = (slope: number): -1 | 0 | 1 => {
  if (slope > 0.0015) return 1;
  if (slope < -0.0015) return -1;
  return 0;
};

/**
 * Compute MODELED MarketFeatures from OHLCV only. No external indicator APIs.
 */
export const computeMarketFeatures = (
  candles: readonly OhlcvBar[],
): MarketFeatures | null => {
  if (candles.length < 5) return null;
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const latest = candles.at(-1)!;
  const previous = candles.at(-2)!;
  const return1 =
    previous.close === 0 ? 0 : (latest.close - previous.close) / previous.close;
  const lookback = Math.min(20, closes.length - 1);
  const base = closes[closes.length - 1 - lookback]!;
  const returnN = base === 0 ? 0 : (latest.close - base) / base;
  const ma5 = sma(closes, 5);
  const ma20 = sma(closes, 20);
  const ma60 = closes.length >= 60 ? sma(closes, 60) : undefined;
  const ma120 = closes.length >= 120 ? sma(closes, 120) : undefined;
  const ma20Prev = sma(closes.slice(0, -1), Math.min(20, closes.length - 1));
  const ma20Slope = ma20Prev === 0 ? 0 : (ma20 - ma20Prev) / Math.abs(ma20Prev);
  const avgVolume = mean(volumes.slice(-20));
  const recentVolume = mean(volumes.slice(-5));
  const prevVolume = mean(volumes.slice(-10, -5));
  const returns = closes.slice(1).map((close, index) => {
    const prior = closes[index]!;
    return prior === 0 ? 0 : (close - prior) / prior;
  });
  const recentReturns = returns.slice(-15);
  const variance = mean(
    recentReturns.map((value) => (value - mean(recentReturns)) ** 2),
  );
  const volatility = Math.sqrt(Math.max(0, variance));
  const rangeRatio =
    latest.close === 0 ? 0 : (latest.high - latest.low) / latest.close;
  const momentum = mean(returns.slice(-5));
  const priorMomentum = mean(returns.slice(-10, -5));
  const acceleration = momentum - priorMomentum;
  const priceVsMa20 = ma20 === 0 ? 0 : (latest.close - ma20) / ma20;
  const ma5VsMa20 = ma20 === 0 ? 0 : (ma5 - ma20) / ma20;

  return {
    return1,
    returnN,
    ma5,
    ma20,
    ma60,
    ma120,
    priceVsMa20,
    ma5VsMa20,
    ma20Slope,
    relativeVolume: avgVolume === 0 ? 0 : recentVolume / avgVolume,
    volumeChange:
      prevVolume === 0 ? 0 : (recentVolume - prevVolume) / prevVolume,
    volatility,
    rangeRatio,
    momentum,
    acceleration,
    trendDirection: trendFromSlope(ma20Slope + momentum),
    rsi: rsi(closes),
  };
};

export const calculateTrendConflict = (
  directions: readonly (-1 | 0 | 1)[],
): number => {
  if (directions.length < 2) return 0;
  const nonzero = directions.filter((value) => value !== 0);
  if (nonzero.length < 2) return 0;
  const up = nonzero.filter((value) => value > 0).length;
  const down = nonzero.length - up;
  return clamp01((2 * Math.min(up, down)) / nonzero.length);
};

export const attachConflictAndNovelty = (
  features: MarketFeatures,
  extras: { readonly trendConflict?: number; readonly novelty?: number },
): MarketFeatures => ({
  ...features,
  trendConflict: extras.trendConflict,
  novelty: extras.novelty,
});

export const featuresToMarketSlice = (
  features: MarketFeatures,
): {
  momentum: number;
  volatility: number;
  volumeStrength: number;
  novelty?: number;
  trendConflict?: number;
} => ({
  momentum: Math.max(-1, Math.min(1, features.momentum * 8)),
  volatility: clamp01(features.volatility * 25),
  volumeStrength: clamp01(features.relativeVolume / 2),
  novelty: features.novelty,
  trendConflict: features.trendConflict,
});

export const timeframeRank = (timeframe: Timeframe): number => {
  const order: Timeframe[] = ["1d", "4h", "1h", "15m", "5m", "1m"];
  const index = order.indexOf(timeframe);
  return index === -1 ? order.length : index;
};
