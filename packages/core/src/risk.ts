import type { OrderProposal, PaperPosition, RiskPolicy } from "./types";

export interface ExposureSnapshot {
  /** Sum of mark-to-market value of Fly-controlled long positions. */
  readonly currentExposure: number;
  readonly dailyNewExposure: number;
}

export type RiskDecision =
  | { readonly ok: true; readonly remainingCapacity: number }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly remainingCapacity: number;
    };

/**
 * RiskEngine is completely separate from MaleCNS.
 * Neural output cannot bypass these checks.
 *
 * maxTradingCapital is defined as the maximum Fly-controlled open long
 * exposure (mark-to-market), not cumulative historical BUY notional.
 * SELL orders never increase exposure.
 */
export const evaluateOrderRisk = (
  proposal: OrderProposal,
  policy: RiskPolicy,
  exposure: ExposureSnapshot,
): RiskDecision => {
  const remainingCapacity = Math.max(
    0,
    policy.maxTradingCapital - exposure.currentExposure,
  );

  if (proposal.estimatedValue <= 0 || !Number.isFinite(proposal.estimatedValue)) {
    return {
      ok: false,
      reason: "invalid-order-value",
      remainingCapacity,
    };
  }

  if (proposal.side === "sell") {
    return { ok: true, remainingCapacity };
  }

  if (proposal.estimatedValue > remainingCapacity) {
    return {
      ok: false,
      reason: "exceeds-max-trading-capital",
      remainingCapacity,
    };
  }

  if (proposal.estimatedValue > policy.maxSingleOrderValue) {
    return {
      ok: false,
      reason: "exceeds-max-single-order-value",
      remainingCapacity,
    };
  }

  if (proposal.estimatedValue > policy.maxPositionValue) {
    return {
      ok: false,
      reason: "exceeds-max-position-value",
      remainingCapacity,
    };
  }

  if (
    exposure.dailyNewExposure + proposal.estimatedValue >
    policy.maxDailyNewExposure
  ) {
    return {
      ok: false,
      reason: "exceeds-max-daily-new-exposure",
      remainingCapacity,
    };
  }

  return { ok: true, remainingCapacity };
};

export const computeLongExposure = (
  positions: readonly PaperPosition[],
): number =>
  positions.reduce((sum, position) => {
    if (position.quantity <= 0) return sum;
    return sum + position.quantity * position.marketPrice;
  }, 0);
