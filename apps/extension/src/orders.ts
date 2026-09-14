import type { BrainMode, BrainOutput, OrderProposal } from "@fly/core";
import { demoInstrumentId } from "@fly/core";

/** Size Paper clips to a small notional so KRW BTC (~1e8) fits risk caps. */
export const paperQuantityForPrice = (
  price: number,
  targetNotional = 100_000,
): number => {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(targetNotional) || targetNotional <= 0) return 0;
  return targetNotional / price;
};

export const marketFeaturesFromEnvironment = (environment: {
  readonly market: {
    readonly momentum: number;
    readonly volatility: number;
    readonly volumeStrength: number;
  };
  readonly asset?: { readonly changePercent?: number };
}): OrderProposal["marketFeatures"] | undefined => {
  const momentum = environment.market.momentum;
  const volatility = environment.market.volatility;
  const volumeStrength = environment.market.volumeStrength;
  const changePercent = environment.asset?.changePercent;
  const marketReturn =
    typeof changePercent === "number" && Number.isFinite(changePercent)
      ? changePercent / 100
      : undefined;
  if (
    !Number.isFinite(momentum) ||
    !Number.isFinite(volatility) ||
    !Number.isFinite(volumeStrength) ||
    marketReturn === undefined
  ) {
    return undefined;
  }
  return {
    momentum,
    volatility,
    volumeStrength,
    return: marketReturn,
  };
};

export const createOrderProposal = (input: {
  broker: string;
  symbol: string;
  instrumentId?: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  brainOutput: BrainOutput;
  brainMode: BrainMode;
  marketFeatures?: OrderProposal["marketFeatures"];
}): OrderProposal => ({
  id: crypto.randomUUID(),
  broker: input.broker,
  symbol: input.symbol,
  instrumentId: input.instrumentId ?? demoInstrumentId(input.symbol),
  side: input.side,
  quantity: input.quantity,
  estimatedPrice: input.price,
  estimatedValue: input.price * input.quantity,
  createdAt: new Date().toISOString(),
  brainSnapshot: input.brainOutput,
  brainMode: input.brainMode,
  status: "pending",
  marketFeatures: input.marketFeatures,
});
