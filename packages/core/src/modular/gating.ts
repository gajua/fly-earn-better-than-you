export interface BrainGatingState {
  readonly lastSymbol: string | null;
  readonly lastTimeframe: string | null;
  readonly lastPrice: number | null;
  readonly lastEvalAt: number;
}

export interface BrainGatingInput {
  readonly now: number;
  readonly symbol: string | null;
  readonly timeframe: string | null;
  readonly price: number | null;
  readonly novelty: number;
  readonly trendConflict: number;
  readonly relativeVolume: number;
  readonly symbolChanged: boolean;
  readonly timeframeChanged: boolean;
  readonly revisit: boolean;
}

const QUIET_INTERVAL_MS = 8_000;
const ACTIVE_INTERVAL_MS = 2_000;

export const shouldEvaluateBrain = (
  state: BrainGatingState,
  input: BrainGatingInput,
): { evaluate: boolean; next: BrainGatingState } => {
  const elapsed = input.now - state.lastEvalAt;
  const priceDelta =
    state.lastPrice && input.price
      ? Math.abs(input.price - state.lastPrice) / Math.max(state.lastPrice, 1)
      : 0;
  const event =
    input.symbolChanged ||
    input.timeframeChanged ||
    input.revisit ||
    input.novelty >= 0.65 ||
    input.trendConflict >= 0.55 ||
    input.relativeVolume >= 1.6 ||
    priceDelta >= 0.004;
  const minInterval = event ? ACTIVE_INTERVAL_MS : QUIET_INTERVAL_MS;
  if (elapsed < minInterval) {
    return { evaluate: false, next: state };
  }
  return {
    evaluate: true,
    next: {
      lastSymbol: input.symbol,
      lastTimeframe: input.timeframe,
      lastPrice: input.price,
      lastEvalAt: input.now,
    },
  };
};
