import type {
  PaperPosition,
  PerformanceSnapshot,
  PositionCycle,
  TradeRecord,
} from "./types";
import { applyFillToCycles } from "./lifecycle";
import { isValidPrice, isValidQuantity } from "./validate";

export type PaperFillDecision =
  | {
      readonly ok: true;
      readonly positions: PaperPosition[];
      readonly cycles: PositionCycle[];
      readonly trade: TradeRecord;
    }
  | { readonly ok: false; readonly reason: string };

export const applyPaperFill = (
  positions: readonly PaperPosition[],
  cycles: readonly PositionCycle[],
  trade: Omit<TradeRecord, "id" | "timestamp"> & {
    readonly id?: string;
    readonly timestamp?: string;
  },
): PaperFillDecision => {
  if (!isValidPrice(trade.price) || !isValidQuantity(trade.quantity)) {
    return { ok: false, reason: "invalid-numeric-input" };
  }

  const timestamp = trade.timestamp ?? new Date().toISOString();
  const record: TradeRecord = {
    ...trade,
    id: trade.id ?? crypto.randomUUID(),
    timestamp,
    instrumentId: trade.instrumentId,
    value: trade.price * trade.quantity,
  };

  const owned = positions.find(
    (position) => position.instrumentId === record.instrumentId,
  );

  if (record.side === "sell") {
    if (!owned || owned.quantity <= 0) {
      return { ok: false, reason: "sell-without-position" };
    }
    if (record.quantity > owned.quantity + 1e-9) {
      return { ok: false, reason: "sell-exceeds-position" };
    }
  }

  let nextCycles: PositionCycle[];
  let applied: TradeRecord;
  try {
    const result = applyFillToCycles(cycles, record);
    nextCycles = [...result.cycles];
    applied = result.appliedTrade;
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "lifecycle-reject",
    };
  }

  const next = positions.map((position) => ({ ...position }));
  const index = next.findIndex(
    (position) => position.instrumentId === record.instrumentId,
  );

  if (record.side === "buy") {
    const existing =
      index >= 0
        ? next[index]!
        : {
            symbol: record.symbol,
            instrumentId: record.instrumentId,
            quantity: 0,
            averagePrice: 0,
            marketPrice: record.price,
            priceUpdatedAt: timestamp,
          };
    const quantity = existing.quantity + record.quantity;
    const averagePrice =
      (existing.quantity * existing.averagePrice +
        record.quantity * record.price) /
      quantity;
    const updated: PaperPosition = {
      symbol: record.symbol,
      instrumentId: record.instrumentId,
      quantity,
      averagePrice,
      marketPrice: record.price,
      priceUpdatedAt: timestamp,
      priceStale: false,
    };
    if (index >= 0) next[index] = updated;
    else next.push(updated);
    return {
      ok: true,
      positions: next.filter((position) => position.quantity > 0),
      cycles: nextCycles,
      trade: applied,
    };
  }

  const remaining = owned!.quantity - record.quantity;
  if (remaining <= 1e-9) {
    if (index >= 0) next.splice(index, 1);
  } else if (index >= 0) {
    next[index] = {
      ...owned!,
      quantity: remaining,
      marketPrice: record.price,
      priceUpdatedAt: timestamp,
      priceStale: false,
    };
  }

  return {
    ok: true,
    positions: next.filter((position) => position.quantity > 0),
    cycles: nextCycles,
    trade: applied,
  };
};

export const updatePositionMarketPrices = (
  positions: readonly PaperPosition[],
  prices: ReadonlyMap<string, { price: number; observedAt: string }>,
  staleAfterMs: number,
  nowMs = Date.now(),
): PaperPosition[] =>
  positions.map((position) => {
    const quote = prices.get(position.instrumentId);
    if (!quote || !isValidPrice(quote.price)) {
      const age = nowMs - Date.parse(position.priceUpdatedAt);
      return {
        ...position,
        priceStale: !Number.isFinite(age) || age > staleAfterMs,
      };
    }
    return {
      ...position,
      marketPrice: quote.price,
      priceUpdatedAt: quote.observedAt,
      priceStale: nowMs - Date.parse(quote.observedAt) > staleAfterMs,
    };
  });

export const computePerformance = (
  trades: readonly TradeRecord[],
  positions: readonly PaperPosition[],
  startingCapital: number,
  cycles: readonly PositionCycle[] = [],
): PerformanceSnapshot => {
  const closed = cycles.filter((cycle) => cycle.status === "closed");
  const realizedFromCycles = closed.reduce(
    (sum, cycle) => sum + (cycle.realizedPnl ?? 0),
    0,
  );
  const fees = trades.reduce((sum, trade) => sum + (trade.fee ?? 0), 0);
  const grossRealizedPnl =
    closed.length > 0
      ? closed.reduce(
          (sum, cycle) =>
            sum +
            ((cycle.sellAveragePrice ?? 0) - cycle.buyAveragePrice) *
              cycle.quantityClosed,
          0,
        )
      : realizedFromCycles;
  const netRealizedPnl =
    closed.length > 0 ? realizedFromCycles : grossRealizedPnl - fees;

  let wins = 0;
  let losses = 0;
  let gainSum = 0;
  let lossSum = 0;
  let equity = startingCapital;
  let peak = startingCapital;
  let maximumDrawdown = 0;

  for (const cycle of closed) {
    const pnl = cycle.realizedPnl ?? 0;
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
  }

  const unrealizedPnl = positions.reduce(
    (sum, position) =>
      sum + position.quantity * (position.marketPrice - position.averagePrice),
    0,
  );
  const unrealizedPnlStale = positions.some((position) => position.priceStale);
  const closedCount = wins + losses;
  const totalEquity = startingCapital + netRealizedPnl + unrealizedPnl;

  return {
    totalTrades: trades.filter((trade) => trade.liveConfidence !== "UNVERIFIED")
      .length,
    openPositions: positions.filter((position) => position.quantity > 0).length,
    realizedPnl: netRealizedPnl,
    unrealizedPnl,
    grossRealizedPnl,
    netRealizedPnl,
    totalReturnPercent:
      startingCapital > 0
        ? ((totalEquity - startingCapital) / startingCapital) * 100
        : 0,
    winRate: closedCount > 0 ? wins / closedCount : 0,
    averageGain: wins > 0 ? gainSum / wins : 0,
    averageLoss: losses > 0 ? lossSum / losses : 0,
    maximumDrawdown,
    maximumDrawdownBasis: "realized-only",
    benchmarkReturn: null,
    unrealizedPnlStale,
  };
};
