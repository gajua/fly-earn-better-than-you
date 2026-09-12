import type {
  DataProviderProvenance,
  Timeframe,
  TimeframeObservation,
} from "@fly/core";
import type { CandleBar } from "./types";

/**
 * Broker-neutral OHLCV feature extraction.
 * Brokers must not invent their own momentum/volatility formulas.
 */
export const extractMarketFeatures = (input: {
  readonly symbol: string;
  readonly instrumentId: string;
  readonly timeframe: Timeframe;
  readonly candles: readonly CandleBar[];
  readonly source: TimeframeObservation["source"];
  readonly dataProvider?: DataProviderProvenance;
  readonly now?: number;
}): TimeframeObservation => {
  const candles = input.candles;
  const latest = candles.at(-1);
  const first = candles[0];
  const available = Boolean(latest && first && candles.length > 0);
  const closes = candles.map((candle) => candle.close);
  const returns = closes.slice(1).map((close, index) => {
    const previous = closes[index]!;
    return previous === 0 ? 0 : (close - previous) / previous;
  });
  const momentum =
    returns.length === 0
      ? 0
      : returns.slice(-5).reduce((sum, value) => sum + value, 0) /
        Math.min(5, returns.length);
  const mean =
    returns.reduce((sum, value) => sum + value, 0) / Math.max(1, returns.length);
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, returns.length);
  const volumeStrength =
    candles.length === 0
      ? 0.5
      : Math.min(
          1,
          candles.slice(-5).reduce((sum, candle) => sum + candle.volume, 0) /
            Math.max(
              1,
              candles.reduce((sum, candle) => sum + candle.volume, 0) /
                candles.length,
            ) /
            5,
        );

  const observedAt =
    latest?.timestamp ?? new Date(input.now ?? Date.now()).toISOString();
  return {
    symbol: input.symbol,
    instrumentId: input.instrumentId,
    timeframe: input.timeframe,
    price: latest?.close ?? 0,
    returnPercent:
      first && latest && first.close !== 0
        ? ((latest.close - first.close) / first.close) * 100
        : 0,
    momentum,
    volatility: Math.sqrt(Math.max(0, variance)),
    volumeStrength,
    timestamp: observedAt,
    observedAt,
    source: input.source,
    candleCount: candles.length,
    available,
    dataProvider: input.dataProvider,
  };
};
