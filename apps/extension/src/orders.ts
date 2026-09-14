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

export const createOrderProposal = (input: {
  broker: string;
  symbol: string;
  instrumentId?: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  brainOutput: BrainOutput;
  brainMode: BrainMode;
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
});
