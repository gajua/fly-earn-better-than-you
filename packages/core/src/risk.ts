import type {
  OrderProposal,
  PaperPosition,
  RiskPolicy,
} from "./types";
import { isValidPrice, isValidQuantity } from "./validate";

export interface ExposureSnapshot {
  readonly currentExposure: number;
  readonly dailyNewExposure: number;
  readonly positions: readonly PaperPosition[];
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
 * maxTradingCapital: Fly-controlled open long exposure + proposed buy.
 * maxPositionValue: existing instrument exposure + proposed buy.
 * SELL never increases exposure but must pass owned-quantity checks.
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

  if (
    !isValidPrice(proposal.estimatedPrice) ||
    !isValidQuantity(proposal.quantity ?? 0) ||
    !Number.isFinite(proposal.estimatedValue) ||
    proposal.estimatedValue <= 0
  ) {
    return {
      ok: false,
      reason: "invalid-numeric-input",
      remainingCapacity,
    };
  }

  const quantity = proposal.quantity ?? 0;
  const owned =
    exposure.positions.find(
      (position) => position.instrumentId === proposal.instrumentId,
    ) ??
    exposure.positions.find((position) => position.symbol === proposal.symbol);

  if (proposal.side === "sell") {
    if (!owned || owned.quantity <= 0) {
      return {
        ok: false,
        reason: "sell-without-position",
        remainingCapacity,
      };
    }
    if (quantity > owned.quantity + 1e-9) {
      return {
        ok: false,
        reason: "sell-exceeds-position",
        remainingCapacity,
      };
    }
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

  const existingInstrumentExposure = owned
    ? owned.quantity * owned.marketPrice
    : 0;
  if (
    existingInstrumentExposure + proposal.estimatedValue >
    policy.maxPositionValue
  ) {
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
