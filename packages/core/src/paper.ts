import type {
  PaperPosition,
  PerformanceSnapshot,
  TradeRecord,
} from "./types";

export const applyPaperFill = (
  positions: readonly PaperPosition[],
  trade: Pick<TradeRecord, "symbol" | "side" | "quantity" | "price">,
): PaperPosition[] => {
  const next = positions.map((position) => ({ ...position }));
  const index = next.findIndex((position) => position.symbol === trade.symbol);
  const existing: PaperPosition =
    index >= 0
      ? next[index]!
      : {
          symbol: trade.symbol,
          quantity: 0,
          averagePrice: 0,
          marketPrice: trade.price,
        };

  if (trade.side === "buy") {
    const totalQuantity = existing.quantity + trade.quantity;
    const averagePrice =
      totalQuantity <= 0
        ? 0
        : (existing.quantity * existing.averagePrice +
            trade.quantity * trade.price) /
          totalQuantity;
    const updated: PaperPosition = {
      symbol: trade.symbol,
      quantity: totalQuantity,
      averagePrice,
      marketPrice: trade.price,
    };
    if (index >= 0) next[index] = updated;
    else next.push(updated);
    return next.filter((position) => position.quantity > 0);
  }

  if (index < 0) return next;
  const remaining = existing.quantity - trade.quantity;
  if (remaining <= 1e-9) {
    next.splice(index, 1);
    return next;
  }
  next[index] = {
    symbol: existing.symbol,
    quantity: remaining,
    averagePrice: existing.averagePrice,
    marketPrice: trade.price,
  };
  return next;
};

export const computePerformance = (
  trades: readonly TradeRecord[],
  positions: readonly PaperPosition[],
  startingCapital: number,
): PerformanceSnapshot => {
  let realizedPnl = 0;
  let wins = 0;
  let losses = 0;
  let gainSum = 0;
  let lossSum = 0;
  let equity = startingCapital;
  let peak = startingCapital;
  let maximumDrawdown = 0;
  const lots = new Map<string, { quantity: number; averagePrice: number }>();

  for (const trade of trades) {
    const lot = lots.get(trade.symbol) ?? { quantity: 0, averagePrice: 0 };
    if (trade.side === "buy") {
      const quantity = lot.quantity + trade.quantity;
      lot.averagePrice =
        quantity <= 0
          ? 0
          : (lot.quantity * lot.averagePrice + trade.quantity * trade.price) /
            quantity;
      lot.quantity = quantity;
      lots.set(trade.symbol, lot);
      continue;
    }

    const closed = Math.min(lot.quantity, trade.quantity);
    const pnl = closed * (trade.price - lot.averagePrice);
    realizedPnl += pnl;
    equity += pnl;
    peak = Math.max(peak, equity);
    maximumDrawdown = Math.max(maximumDrawdown, peak - equity);
    if (pnl >= 0) {
      wins += 1;
      gainSum += pnl;
    } else {
      losses += 1;
      lossSum += pnl;
    }
    lot.quantity -= closed;
    if (lot.quantity <= 1e-9) lots.delete(trade.symbol);
    else lots.set(trade.symbol, lot);
  }

  const unrealizedPnl = positions.reduce(
    (sum, position) =>
      sum + position.quantity * (position.marketPrice - position.averagePrice),
    0,
  );
  const closedCount = wins + losses;
  const totalEquity = startingCapital + realizedPnl + unrealizedPnl;

  return {
    totalTrades: trades.length,
    openPositions: positions.filter((position) => position.quantity > 0).length,
    realizedPnl,
    unrealizedPnl,
    totalReturnPercent:
      startingCapital > 0
        ? ((totalEquity - startingCapital) / startingCapital) * 100
        : 0,
    winRate: closedCount > 0 ? wins / closedCount : 0,
    averageGain: wins > 0 ? gainSum / wins : 0,
    averageLoss: losses > 0 ? lossSum / losses : 0,
    maximumDrawdown,
    benchmarkReturn: 0,
  };
};
