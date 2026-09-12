import {
  applyPaperFill,
  applySlippage,
  canAcceptProposal,
  computeFee,
  computeLongExposure,
  demoInstrumentId,
  emptyProposalGuardState,
  evaluateOrderRisk,
  markProposalAccepted,
  updatePositionMarketPrices,
  type OrderProposal,
  type PaperPosition,
  type PositionCycle,
  type ProposalGuardState,
  type TradeRecord,
} from "@fly/core";
import type { ExtensionPreferences } from "../storage/preferences";
import { DAILY_EXPOSURE_KEY } from "../storage/preferences";
import {
  appendTrade,
  readPaperCycles,
  readPaperPositions,
  writePaperCycles,
  writePaperPositions,
} from "../storage/trade-ledger";

const todayKey = () => new Date().toISOString().slice(0, 10);

let proposalGuard: ProposalGuardState = emptyProposalGuardState();

export const resetProposalGuardForTests = () => {
  proposalGuard = emptyProposalGuardState();
};

export const readDailyNewExposure = async (): Promise<number> => {
  const stored = await chrome.storage.local.get(DAILY_EXPOSURE_KEY);
  const value = stored[DAILY_EXPOSURE_KEY] as
    | { day: string; amount: number }
    | undefined;
  if (!value || value.day !== todayKey()) return 0;
  return value.amount;
};

export const addDailyNewExposure = async (amount: number): Promise<void> => {
  const current = await readDailyNewExposure();
  await chrome.storage.local.set({
    [DAILY_EXPOSURE_KEY]: { day: todayKey(), amount: current + amount },
  });
};

export const maybeExecutePaperTrade = async (
  preferences: ExtensionPreferences,
  proposal: OrderProposal,
): Promise<{ ok: true; trade: TradeRecord } | { ok: false; reason: string }> => {
  if (preferences.tradingMode !== "paper") {
    return { ok: false, reason: "live-assist-requires-confirmation" };
  }

  const cooldown =
    preferences.riskPolicy.proposalCooldownMs ??
    DEFAULT_COOLDOWN_MS;
  const guard = canAcceptProposal(
    proposal,
    proposalGuard,
    Date.now(),
    cooldown,
  );
  if (!guard.ok) return guard;

  const positions = await readPaperPositions();
  const cycles = await readPaperCycles();
  const decision = evaluateOrderRisk(proposal, preferences.riskPolicy, {
    currentExposure: computeLongExposure(positions),
    dailyNewExposure: await readDailyNewExposure(),
    positions,
  });
  if (!decision.ok) {
    return { ok: false, reason: decision.reason };
  }

  const quantity = proposal.quantity ?? 1;
  const fillPrice = applySlippage(
    proposal.estimatedPrice,
    proposal.side,
    preferences.riskPolicy.slippageBps ?? 0,
  );
  const value = fillPrice * quantity;
  const fee = computeFee(value, preferences.riskPolicy.feeRate ?? 0);

  const fill = applyPaperFill(positions, cycles, {
    mode: "paper",
    broker: proposal.broker,
    symbol: proposal.symbol,
    instrumentId: proposal.instrumentId || demoInstrumentId(proposal.symbol),
    side: proposal.side,
    quantity,
    price: fillPrice,
    value,
    fee,
    sourceProposalId: proposal.id,
    brainMode: proposal.brainMode,
    brainOutput: proposal.brainSnapshot,
  });
  if (!fill.ok) return fill;

  await writePaperPositions(fill.positions);
  await writePaperCycles(fill.cycles);
  await appendTrade(fill.trade);
  if (proposal.side === "buy") {
    await addDailyNewExposure(value);
  }
  proposalGuard = markProposalAccepted(proposalGuard, proposal, Date.now());
  return { ok: true, trade: fill.trade };
};

const DEFAULT_COOLDOWN_MS = 30_000;

export const markToMarketPositions = async (
  quotes: ReadonlyMap<string, { price: number; observedAt: string }>,
): Promise<PaperPosition[]> => {
  const positions = await readPaperPositions();
  const next = updatePositionMarketPrices(positions, quotes, 5 * 60_000);
  await writePaperPositions(next);
  return next;
};

export const getExposureSummary = async (
  preferences: ExtensionPreferences,
): Promise<{
  positions: PaperPosition[];
  cycles: PositionCycle[];
  currentExposure: number;
  remainingCapacity: number;
}> => {
  const positions = await readPaperPositions();
  const cycles = await readPaperCycles();
  const currentExposure = computeLongExposure(positions);
  return {
    positions,
    cycles,
    currentExposure,
    remainingCapacity: Math.max(
      0,
      preferences.riskPolicy.maxTradingCapital - currentExposure,
    ),
  };
};
