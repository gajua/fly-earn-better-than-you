import type { BrainMode, BrainOutput, OrderProposal } from "@fly/core";

export const createOrderProposal = (input: {
  broker: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  brainOutput: BrainOutput;
  brainMode: BrainMode;
}): OrderProposal => ({
  id: crypto.randomUUID(),
  broker: input.broker,
  symbol: input.symbol,
  side: input.side,
  quantity: input.quantity,
  estimatedPrice: input.price,
  estimatedValue: input.price * input.quantity,
  createdAt: new Date().toISOString(),
  brainSnapshot: input.brainOutput,
  brainMode: input.brainMode,
});
