import {
  applyPaperFill,
  computeLongExposure,
  evaluateOrderRisk,
  type OrderProposal,
  type PaperPosition,
  type TradeRecord,
} from "@fly/core";
import type { ExtensionPreferences } from "../storage/preferences";
import { DAILY_EXPOSURE_KEY } from "../storage/preferences";
import {
  appendTrade,
  readPaperPositions,
  writePaperPositions,
} from "../storage/trade-ledger";

const todayKey = () => new Date().toISOString().slice(0, 10);

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

  const positions = await readPaperPositions();
  const decision = evaluateOrderRisk(proposal, preferences.riskPolicy, {
    currentExposure: computeLongExposure(positions),
    dailyNewExposure: await readDailyNewExposure(),
  });
  if (!decision.ok) {
    return { ok: false, reason: decision.reason };
  }

  const quantity = proposal.quantity ?? 1;
  const nextPositions = applyPaperFill(positions, {
    symbol: proposal.symbol,
    side: proposal.side,
    quantity,
    price: proposal.estimatedPrice,
  });
  await writePaperPositions(nextPositions);
  if (proposal.side === "buy") {
    await addDailyNewExposure(proposal.estimatedValue);
  }

  const trade: TradeRecord = {
    id: crypto.randomUUID(),
    mode: "paper",
    broker: proposal.broker,
    symbol: proposal.symbol,
    side: proposal.side,
    quantity,
    price: proposal.estimatedPrice,
    value: proposal.estimatedValue,
    timestamp: new Date().toISOString(),
    sourceProposalId: proposal.id,
    brainMode: proposal.brainMode,
    brainOutput: proposal.brainSnapshot,
  };
  await appendTrade(trade);
  return { ok: true, trade };
};

export const getExposureSummary = async (
  preferences: ExtensionPreferences,
): Promise<{
  positions: PaperPosition[];
  currentExposure: number;
  remainingCapacity: number;
}> => {
  const positions = await readPaperPositions();
  const currentExposure = computeLongExposure(positions);
  return {
    positions,
    currentExposure,
    remainingCapacity: Math.max(
      0,
      preferences.riskPolicy.maxTradingCapital - currentExposure,
    ),
  };
};
