import { clamp01 } from "./math";
import type { MarketEnvironment, TimeframeObservation } from "./types";

/**
 * Aggregates multi-timeframe observations into a broker-neutral MarketEnvironment.
 * Never maps a single timeframe directly to BUY/SELL.
 */
export const aggregateTimeframeObservations = (
  observations: readonly TimeframeObservation[],
  base?: Partial<MarketEnvironment>,
): MarketEnvironment => {
  if (observations.length === 0) {
    return {
      market: {
        momentum: 0,
        volatility: 0,
        volumeStrength: 0.5,
      },
      ui: base?.ui ?? {},
      asset: base?.asset,
      position: base?.position,
    };
  }

  const weights: Record<string, number> = {
    "1m": 0.08,
    "5m": 0.12,
    "15m": 0.18,
    "1h": 0.22,
    "4h": 0.2,
    "1d": 0.2,
  };

  let weightSum = 0;
  let momentum = 0;
  let volatility = 0;
  let volumeStrength = 0;

  for (const observation of observations) {
    const weight = weights[observation.timeframe] ?? 0.1;
    weightSum += weight;
    momentum += observation.momentum * weight;
    volatility += observation.volatility * weight;
    volumeStrength += observation.volumeStrength * weight;
  }

  const latest = observations.at(-1);
  if (!latest) {
    return {
      market: { momentum: 0, volatility: 0, volumeStrength: 0.5 },
      ui: base?.ui ?? {},
      asset: base?.asset,
      position: base?.position,
    };
  }
  const scale = weightSum > 0 ? weightSum : 1;

  return {
    asset: base?.asset ?? {
      symbol: latest.symbol,
      price: latest.price,
      changePercent: latest.returnPercent,
    },
    position: base?.position,
    market: {
      momentum: clamp01Signed(momentum / scale),
      volatility: clamp01(volatility / scale),
      volumeStrength: clamp01(volumeStrength / scale),
    },
    ui: base?.ui ?? {},
  };
};

const clamp01Signed = (value: number): number =>
  Math.min(1, Math.max(-1, Number.isFinite(value) ? value : 0));
