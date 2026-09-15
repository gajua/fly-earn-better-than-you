import {
  OUTCOME_HORIZON_MS,
  shouldUploadSummary,
  type ModularEvaluateResult,
  type OutcomeHorizon,
} from "@fly/core";
import { listContributionQueue } from "../storage/contribution-queue";
import { readPaperCycles } from "../storage/trade-ledger";
import {
  anonymizeSymbol,
  appendFutureOutcome,
  appendMarketObservation,
  appendModuleOutputs,
  deletePendingOutcomeIds,
  getLocalLearningStats,
  listPendingOutcomes,
  upsertPendingOutcomes,
  type LocalLearningStats,
} from "../storage/local-learning-store";
import type { ExtensionPreferences } from "../storage/preferences";
import { resolvePendingOutcomeMetrics } from "./outcome-price-fetch";

const pendingId = (observationId: string, horizon: OutcomeHorizon): string =>
  `${observationId}:${horizon}`;

export const recordModularObservation = async (input: {
  readonly preferences: ExtensionPreferences;
  readonly broker: string;
  readonly symbol: string;
  readonly instrumentId: string;
  readonly timeframe: string;
  readonly price: number;
  readonly momentum: number;
  readonly volatility: number;
  readonly relativeVolume: number;
  readonly trendConflict: number;
  readonly novelty: number;
  readonly presetVersion: string;
  readonly modular: ModularEvaluateResult;
}): Promise<{ observationId: string } | null> => {
  if (!input.preferences.localDataCollection) return null;
  const observationId = crypto.randomUUID();
  const observedAt = new Date().toISOString();
  await appendMarketObservation({
    id: observationId,
    observedAt,
    broker: input.broker,
    symbolCategory: anonymizeSymbol(input.symbol),
    timeframe: input.timeframe,
    priceReturn: input.momentum,
    momentum: input.momentum,
    volatility: input.volatility,
    relativeVolume: input.relativeVolume,
    trendConflict: input.trendConflict,
    novelty: input.novelty,
    source: "live",
  });
  const createdAt = observedAt;
  const presetVersion = input.presetVersion;
  const modelVersion = input.modular.modelVersion;
  await appendModuleOutputs([
    {
      id: crypto.randomUUID(),
      observationId,
      moduleType: "chart_observer",
      score1: input.modular.chart.bullish,
      score2: input.modular.chart.bearish,
      score3: input.modular.chart.neutral,
      confidence: input.modular.chart.confidence,
      modelVersion,
      presetVersion,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      observationId,
      moduleType: "volume_observer",
      score1: input.modular.volume.activity,
      score2: input.modular.volume.spike,
      score3: 0,
      confidence: input.modular.volume.confidence,
      modelVersion,
      presetVersion,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      observationId,
      moduleType: "risk_observer",
      score1: input.modular.risk.risk,
      score2: input.modular.risk.instability,
      score3: 0,
      confidence: input.modular.risk.confidence,
      modelVersion,
      presetVersion,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      observationId,
      moduleType: "market_scanner",
      score1: input.modular.scanner.interest,
      score2: input.modular.scanner.novelty,
      score3: input.modular.scanner.revisitScore,
      confidence: input.modular.scanner.interest,
      modelVersion,
      presetVersion,
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      observationId,
      moduleType: "decision",
      score1: input.modular.decision.buyDrive,
      score2: input.modular.decision.sellDrive,
      score3: input.modular.decision.confidence,
      confidence: input.modular.decision.confidence,
      modelVersion,
      presetVersion,
      createdAt,
    },
  ]);
  const horizons: OutcomeHorizon[] = ["5m", "30m", "1h", "4h", "1d"];
  await upsertPendingOutcomes(
    horizons.map((horizon) => ({
      id: pendingId(observationId, horizon),
      observationId,
      horizon,
      dueAt: Date.now() + OUTCOME_HORIZON_MS[horizon],
      anchorPrice: input.price,
      instrumentId: input.instrumentId,
      broker: input.broker,
    })),
  );
  void maybeEnqueueFilteredUpload({
    preferences: input.preferences,
    novelty: input.novelty,
    trendConflict: input.trendConflict,
    relativeVolume: input.relativeVolume,
    revisit: input.modular.scanner.revisitScore > 0.6,
    decisionIntent: input.modular.decision.intent,
    hasResolvedOutcome: false,
  });
  return { observationId };
};

const maybeEnqueueFilteredUpload = async (_input: {
  readonly preferences: ExtensionPreferences;
  readonly novelty: number;
  readonly trendConflict: number;
  readonly relativeVolume: number;
  readonly revisit: boolean;
  readonly decisionIntent: string;
  readonly hasResolvedOutcome: boolean;
}): Promise<void> => {
  if (!_input.preferences.contributeAnonymousLearning) return;
  const gate = shouldUploadSummary({
    novelty: _input.novelty,
    trendConflict: _input.trendConflict,
    relativeVolume: _input.relativeVolume,
    revisit: _input.revisit,
    decisionIntent: _input.decisionIntent,
    hasResolvedOutcome: _input.hasResolvedOutcome,
    random: Math.random,
  });
  if (!gate.upload) return;
  // Detailed modular upload rows land in a future edge function; Paper queue unchanged.
};

export const resolveDueOutcomes = async (): Promise<number> => {
  const pending = await listPendingOutcomes();
  const now = Date.now();
  let resolved = 0;
  const toDelete: string[] = [];
  for (const row of pending) {
    if (row.dueAt > now) continue;
    const metrics = await resolvePendingOutcomeMetrics(row);
    if (!metrics) continue;
    await appendFutureOutcome({
      id: crypto.randomUUID(),
      observationId: row.observationId,
      horizon: row.horizon,
      futureReturn: metrics.futureReturn,
      futureVolatility: metrics.futureVolatility,
      maxAdverseMove: metrics.maxAdverseMove,
      maxFavorableMove: metrics.maxFavorableMove,
      resolvedAt: new Date().toISOString(),
    });
    toDelete.push(`${row.observationId}:${row.horizon}`);
    resolved += 1;
  }
  await deletePendingOutcomeIds(toDelete);
  return resolved;
};

export const readLocalLearningStats = async (): Promise<LocalLearningStats> => {
  const cycles = await readPaperCycles();
  const closedTrades = cycles.filter((c) => c.status === "closed").length;
  const queue = await listContributionQueue();
  return getLocalLearningStats({
    closedTrades,
    queuedContributions: queue.length,
  });
};
