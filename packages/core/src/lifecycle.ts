import type { PositionCycle, TradeRecord } from "./types";

export type LifecycleResult = {
  readonly cycles: PositionCycle[];
  readonly appliedTrade: TradeRecord;
  readonly affectedCycleId: string;
};

/**
 * Applies a verified fill to PositionCycle state.
 * Invalid sells must be rejected before calling this.
 */
export const applyFillToCycles = (
  cycles: readonly PositionCycle[],
  trade: TradeRecord,
): LifecycleResult => {
  const openIndex = cycles.findIndex(
    (cycle) =>
      cycle.instrumentId === trade.instrumentId && cycle.status === "open",
  );
  const next = cycles.map((cycle) => ({ ...cycle }));

  if (trade.side === "buy") {
    if (openIndex < 0) {
      const cycle: PositionCycle = {
        id: crypto.randomUUID(),
        instrumentId: trade.instrumentId,
        broker: trade.broker,
        symbol: trade.symbol,
        status: "open",
        buyAveragePrice: trade.price,
        quantityOpened: trade.quantity,
        quantityClosed: 0,
        openedAt: trade.timestamp,
        fees: trade.fee ?? 0,
      };
      next.push(cycle);
      return {
        cycles: next,
        appliedTrade: { ...trade, cycleId: cycle.id },
        affectedCycleId: cycle.id,
      };
    }

    const open = next[openIndex]!;
    const quantityOpened = open.quantityOpened + trade.quantity;
    const buyAveragePrice =
      (open.buyAveragePrice * open.quantityOpened +
        trade.price * trade.quantity) /
      quantityOpened;
    next[openIndex] = {
      ...open,
      quantityOpened,
      buyAveragePrice,
      fees: (open.fees ?? 0) + (trade.fee ?? 0),
    };
    return {
      cycles: next,
      appliedTrade: { ...trade, cycleId: open.id },
      affectedCycleId: open.id,
    };
  }

  if (openIndex < 0) {
    throw new Error("sell-without-open-cycle");
  }

  const open = next[openIndex]!;
  const remainingOpen = open.quantityOpened - open.quantityClosed;
  if (trade.quantity > remainingOpen + 1e-9) {
    throw new Error("sell-exceeds-open-cycle");
  }

  const quantityClosed = open.quantityClosed + trade.quantity;
  const previousSoldNotional =
    (open.sellAveragePrice ?? 0) * open.quantityClosed;
  const sellAveragePrice =
    (previousSoldNotional + trade.price * trade.quantity) / quantityClosed;
  const fullyClosed = quantityClosed >= open.quantityOpened - 1e-9;
  const realizedPnl =
    (sellAveragePrice - open.buyAveragePrice) * quantityClosed -
    ((open.fees ?? 0) + (trade.fee ?? 0));
  const realizedReturnPercent =
    open.buyAveragePrice > 0
      ? ((sellAveragePrice - open.buyAveragePrice) / open.buyAveragePrice) * 100
      : 0;

  next[openIndex] = {
    ...open,
    quantityClosed,
    sellAveragePrice,
    fees: (open.fees ?? 0) + (trade.fee ?? 0),
    status: fullyClosed ? "closed" : "open",
    closedAt: fullyClosed ? trade.timestamp : undefined,
    realizedPnl: fullyClosed ? realizedPnl : undefined,
    realizedReturnPercent: fullyClosed ? realizedReturnPercent : undefined,
  };

  return {
    cycles: next,
    appliedTrade: { ...trade, cycleId: open.id },
    affectedCycleId: open.id,
  };
};

export const summarizeClosedCycles = (
  cycles: readonly PositionCycle[],
): readonly {
  symbol: string;
  buyAveragePrice: number;
  sellAveragePrice: number;
  realizedReturnPercent: number;
}[] =>
  cycles
    .filter(
      (cycle) =>
        cycle.status === "closed" &&
        cycle.sellAveragePrice != null &&
        cycle.realizedReturnPercent != null,
    )
    .map((cycle) => ({
      symbol: cycle.symbol,
      buyAveragePrice: cycle.buyAveragePrice,
      sellAveragePrice: cycle.sellAveragePrice!,
      realizedReturnPercent: cycle.realizedReturnPercent!,
    }));
