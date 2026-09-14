import type { BrainMode, PositionCycle, TradeRecord } from "./types";

export type PerformanceRange = "all" | "7d" | "30d";

export type ExtendedPerformance = {
  readonly totalRealizedPnl: number;
  readonly totalReturnPercent: number;
  readonly totalTrades: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly breakEvenCount: number;
  readonly winRate: number;
  readonly averageWinPercent: number;
  readonly averageLossPercent: number;
  readonly bestTradePercent: number | null;
  readonly worstTradePercent: number | null;
  readonly profitFactor: number | null;
  readonly maxDrawdownPercent: number;
  readonly startingPaperCapital: number;
};

export type BrainModePerformance = ExtendedPerformance & {
  readonly brainMode: BrainMode;
};

const rangeStartMs = (range: PerformanceRange, nowMs: number): number => {
  if (range === "7d") return nowMs - 7 * 24 * 60 * 60_000;
  if (range === "30d") return nowMs - 30 * 24 * 60 * 60_000;
  return 0;
};

export const filterClosedCycles = (
  cycles: readonly PositionCycle[],
  range: PerformanceRange = "all",
  nowMs = Date.now(),
): PositionCycle[] => {
  const start = rangeStartMs(range, nowMs);
  return cycles.filter((cycle) => {
    if (cycle.status !== "closed" || !cycle.closedAt) return false;
    const closedAt = Date.parse(cycle.closedAt);
    return Number.isFinite(closedAt) && closedAt >= start;
  });
};

/**
 * Paper performance analytics on closed PositionCycles.
 * Win = realizedPnl > 0, Loss = realizedPnl < 0, break-even is neutral.
 */
export const computeExtendedPerformance = (
  cycles: readonly PositionCycle[],
  startingPaperCapital: number,
  range: PerformanceRange = "all",
  nowMs = Date.now(),
): ExtendedPerformance => {
  const closed = filterClosedCycles(cycles, range, nowMs);
  let wins = 0;
  let losses = 0;
  let breakEven = 0;
  let winPctSum = 0;
  let lossPctSum = 0;
  let positivePnl = 0;
  let negativePnl = 0;
  let best: number | null = null;
  let worst: number | null = null;
  let equity = startingPaperCapital;
  let peak = startingPaperCapital;
  let maxDd = 0;
  let realized = 0;

  const ordered = [...closed].sort((a, b) =>
    (a.closedAt ?? "").localeCompare(b.closedAt ?? ""),
  );

  for (const cycle of ordered) {
    const pnl = cycle.realizedPnl ?? 0;
    const ret = cycle.realizedReturnPercent ?? 0;
    realized += pnl;
    equity += pnl;
    peak = Math.max(peak, equity);
    if (peak > 0) {
      maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
    }
    if (pnl > 0) {
      wins += 1;
      winPctSum += ret;
      positivePnl += pnl;
    } else if (pnl < 0) {
      losses += 1;
      lossPctSum += ret;
      negativePnl += pnl;
    } else {
      breakEven += 1;
    }
    best = best == null ? ret : Math.max(best, ret);
    worst = worst == null ? ret : Math.min(worst, ret);
  }

  const decided = wins + losses;
  const profitFactor =
    negativePnl === 0
      ? positivePnl > 0
        ? null
        : 0
      : positivePnl / Math.abs(negativePnl);

  return {
    totalRealizedPnl: realized,
    totalReturnPercent:
      startingPaperCapital > 0 ? (realized / startingPaperCapital) * 100 : 0,
    totalTrades: closed.length,
    winCount: wins,
    lossCount: losses,
    breakEvenCount: breakEven,
    winRate: decided > 0 ? wins / decided : 0,
    averageWinPercent: wins > 0 ? winPctSum / wins : 0,
    averageLossPercent: losses > 0 ? lossPctSum / losses : 0,
    bestTradePercent: best,
    worstTradePercent: worst,
    profitFactor,
    maxDrawdownPercent: maxDd,
    startingPaperCapital,
  };
};

export const computePerformanceByBrainMode = (
  cycles: readonly PositionCycle[],
  trades: readonly TradeRecord[],
  startingPaperCapital: number,
  range: PerformanceRange = "all",
  nowMs = Date.now(),
): BrainModePerformance[] => {
  const modes: BrainMode[] = ["real-connectome", "mock", "shuffled-control"];
  const cycleMode = new Map<string, BrainMode>();
  for (const trade of trades) {
    if (trade.cycleId && trade.side === "buy") {
      cycleMode.set(trade.cycleId, trade.brainMode);
    }
  }

  return modes.map((brainMode) => {
    const subset = filterClosedCycles(cycles, range, nowMs).filter(
      (cycle) => cycleMode.get(cycle.id) === brainMode,
    );
    return {
      brainMode,
      ...computeExtendedPerformance(subset, startingPaperCapital, "all", nowMs),
    };
  });
};
