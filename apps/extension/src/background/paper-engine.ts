import {
  applyPaperFill,
  applySlippage,
  brokerCategoryFromBrokerId,
  canAcceptProposal,
  computeFee,
  computeLongExposure,
  demoInstrumentId,
  emptyProposalGuardState,
  evaluateOrderRisk,
  holdingDurationBucket,
  markProposalAccepted,
  updatePositionMarketPrices,
  type OrderProposal,
  type PaperPosition,
  type PositionCycle,
  type ProposalGuardState,
  type TradeRecord,
} from "@fly/core";
import { loadActiveGlobalPreset } from "../global-preset-runtime";
import type { ExtensionPreferences } from "../storage/preferences";
import { DAILY_EXPOSURE_KEY } from "../storage/preferences";
import { enqueueContribution } from "../storage/contribution-queue";
import {
  appendTrade,
  readPaperCycles,
  readPaperPositions,
  writePaperCycles,
  writePaperPositions,
} from "../storage/trade-ledger";

const todayKey = () => new Date().toISOString().slice(0, 10);
const DEFAULT_COOLDOWN_MS = 30_000;
const INSTALL_ID_KEY = "fly-install-id";

let proposalGuard: ProposalGuardState = emptyProposalGuardState();

export const resetProposalGuardForTests = () => {
  proposalGuard = emptyProposalGuardState();
};

export const readDailyNewExposure = async (): Promise<number> => {
  const stored = await chrome.storage.local.get(DAILY_EXPOSURE_KEY);
  const value = stored[DAILY_EXPOSURE_KEY] as
    { day: string; amount: number } | undefined;
  if (!value || value.day !== todayKey()) return 0;
  return value.amount;
};

export const addDailyNewExposure = async (amount: number): Promise<void> => {
  const current = await readDailyNewExposure();
  await chrome.storage.local.set({
    [DAILY_EXPOSURE_KEY]: { day: todayKey(), amount: current + amount },
  });
};

const readInstallId = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(INSTALL_ID_KEY);
  const existing = stored[INSTALL_ID_KEY];
  if (typeof existing === "string" && existing.length > 0) return existing;
  const created = crypto.randomUUID();
  await chrome.storage.local.set({ [INSTALL_ID_KEY]: created });
  return created;
};

export const maybeExecutePaperTrade = async (
  preferences: ExtensionPreferences,
  proposal: OrderProposal,
): Promise<
  { ok: true; trade: TradeRecord } | { ok: false; reason: string }
> => {
  if (preferences.tradingMode !== "paper") {
    return { ok: false, reason: "live-assist-requires-confirmation" };
  }

  const { gates, preset } = await loadActiveGlobalPreset();
  const cooldown =
    gates.proposalCooldownMs ||
    preferences.riskPolicy.proposalCooldownMs ||
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
  if (proposal.side === "buy") {
    const existingLong = positions.find(
      (position) =>
        position.instrumentId === proposal.instrumentId &&
        position.quantity > 0,
    );
    if (existingLong) {
      return { ok: false, reason: "already-long" };
    }
  }
  let quantity = proposal.quantity ?? 1;
  if (proposal.side === "sell") {
    const owned =
      positions.find(
        (position) => position.instrumentId === proposal.instrumentId,
      ) ?? positions.find((position) => position.symbol === proposal.symbol);
    if (owned && owned.quantity > 0) {
      quantity = Math.min(quantity, owned.quantity);
    }
  }
  const decision = evaluateOrderRisk(
    {
      ...proposal,
      quantity,
      estimatedValue: proposal.estimatedPrice * quantity,
    },
    preferences.riskPolicy,
    {
      currentExposure: computeLongExposure(positions),
      dailyNewExposure: await readDailyNewExposure(),
      positions,
    },
  );
  if (!decision.ok) {
    return { ok: false, reason: decision.reason };
  }

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

  // Shared global learning: Paper + real-connectome + opt-in only.
  // Live Assist / real-money paths must never enqueue contributions.
  if (
    preferences.tradingMode === "paper" &&
    preferences.contributeAnonymousLearning &&
    proposal.brainMode === "real-connectome" &&
    proposal.side === "sell"
  ) {
    const closed = fill.cycles.find(
      (cycle) => cycle.id === fill.trade.cycleId && cycle.status === "closed",
    );
    if (closed && typeof closed.realizedReturnPercent === "number") {
      const features = proposal.marketFeatures;
      if (
        !features ||
        !Number.isFinite(features.momentum) ||
        !Number.isFinite(features.volatility) ||
        !Number.isFinite(features.volumeStrength) ||
        !Number.isFinite(features.return)
      ) {
        // Skip contribution rather than inventing stub market features.
      } else {
        void enqueueContribution({
          schemaVersion: 1,
          brainMode: "real-connectome",
          presetVersion: preset.presetVersion,
          brokerCategory: brokerCategoryFromBrokerId(proposal.broker),
          marketFeatures: {
            momentum: features.momentum,
            volatility: features.volatility,
            volumeStrength: features.volumeStrength,
            return: features.return,
          },
          brain: {
            buyDrive: proposal.brainSnapshot.buyDrive,
            sellDrive: proposal.brainSnapshot.sellDrive,
            curiosity: proposal.brainSnapshot.curiosity,
            danger: proposal.brainSnapshot.danger,
            activity: proposal.brainSnapshot.activity,
          },
          action: "paper_sell",
          outcome: {
            returnPct: closed.realizedReturnPercent,
            holdingDurationBucket: holdingDurationBucket(
              closed.openedAt,
              closed.closedAt ?? fill.trade.timestamp,
            ),
          },
          createdAt: new Date().toISOString(),
          installId: await readInstallId(),
        });
      }
    }
  }

  return { ok: true, trade: fill.trade };
};

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
  currentExposure: number;
  positions: PaperPosition[];
  cycles: PositionCycle[];
  remainingCapacity: number;
}> => {
  const positions = await readPaperPositions();
  const cycles = await readPaperCycles();
  const currentExposure = computeLongExposure(positions);
  return {
    currentExposure,
    positions,
    cycles,
    remainingCapacity: Math.max(
      0,
      preferences.riskPolicy.maxTradingCapital - currentExposure,
    ),
  };
};
