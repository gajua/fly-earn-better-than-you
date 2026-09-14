import { attachChecksum } from "./global-preset";
import type {
  AnonymousPaperObservation,
  GlobalCalibrationPreset,
} from "./global-types";

export type CalibrationSample = {
  readonly createdAt: string;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly returnPct: number;
  readonly brainMode: string;
};

export type SplitDataset = {
  readonly train: readonly CalibrationSample[];
  readonly validation: readonly CalibrationSample[];
  readonly holdout: readonly CalibrationSample[];
};

export type PresetCandidateMetrics = {
  readonly tradeCount: number;
  readonly winRate: number;
  readonly totalReturnPct: number;
  readonly maxDrawdownPct: number;
  readonly profitFactor: number | null;
  readonly score: number;
};

export type BuildPresetResult = {
  readonly preset: GlobalCalibrationPreset;
  readonly train: PresetCandidateMetrics;
  readonly validation: PresetCandidateMetrics;
  readonly holdout: PresetCandidateMetrics;
  readonly gate: "READY_FOR_REVIEW" | "REJECTED";
  readonly rejectReasons: readonly string[];
};

/** score = riskAdjustedReturn - drawdownPenalty (see docs/GLOBAL_LEARNING.md). */
export const scoreCalibration = (metrics: {
  readonly totalReturnPct: number;
  readonly maxDrawdownPct: number;
  readonly tradeCount: number;
  readonly winRate: number;
  readonly profitFactor: number | null;
}): number => {
  const riskAdjusted =
    metrics.totalReturnPct /
    Math.max(1, Math.sqrt(Math.max(metrics.maxDrawdownPct, 1)));
  const drawdownPenalty = Math.max(0, metrics.maxDrawdownPct - 15) * 0.35;
  const sparsePenalty = metrics.tradeCount < 20 ? 5 : 0;
  const pfBonus =
    metrics.profitFactor == null
      ? 1
      : Math.min(2, Math.max(0, metrics.profitFactor - 1));
  return (
    riskAdjusted - drawdownPenalty - sparsePenalty + pfBonus * metrics.winRate
  );
};

export const clipReturnPct = (value: number): number | null => {
  if (!Number.isFinite(value) || Number.isNaN(value)) return null;
  if (Math.abs(value) > 200) return null;
  return Math.max(-50, Math.min(50, value));
};

export const observationToSample = (
  observation: AnonymousPaperObservation,
): CalibrationSample | null => {
  if (observation.brainMode !== "real-connectome") return null;
  if (observation.action !== "paper_sell") return null;
  const clipped = clipReturnPct(observation.outcome.returnPct);
  if (clipped == null) return null;
  if (
    !Number.isFinite(observation.brain.buyDrive) ||
    !Number.isFinite(observation.brain.sellDrive)
  ) {
    return null;
  }
  return {
    createdAt: observation.createdAt,
    buyDrive: observation.brain.buyDrive,
    sellDrive: observation.brain.sellDrive,
    returnPct: clipped,
    brainMode: observation.brainMode,
  };
};

/**
 * Time-ordered split: 60% train / 20% validation / 20% holdout.
 * No future leakage — earlier samples only in train.
 */
export const splitByTime = (
  samples: readonly CalibrationSample[],
): SplitDataset => {
  const ordered = [...samples].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const n = ordered.length;
  const trainEnd = Math.floor(n * 0.6);
  const valEnd = Math.floor(n * 0.8);
  return {
    train: ordered.slice(0, trainEnd),
    validation: ordered.slice(trainEnd, valEnd),
    holdout: ordered.slice(valEnd),
  };
};

const simulate = (
  samples: readonly CalibrationSample[],
  buyThreshold: number,
  sellThreshold: number,
): PresetCandidateMetrics => {
  let equity = 100;
  let peak = 100;
  let maxDrawdownPct = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let tradeCount = 0;
  let totalReturnPct = 0;

  for (const sample of samples) {
    const takeBuy =
      sample.buyDrive >= buyThreshold && sample.buyDrive >= sample.sellDrive;
    const takeSell =
      sample.sellDrive >= sellThreshold && sample.sellDrive > sample.buyDrive;
    if (!takeBuy && !takeSell) continue;
    tradeCount += 1;
    const ret = sample.returnPct;
    totalReturnPct += ret;
    equity *= 1 + ret / 100;
    peak = Math.max(peak, equity);
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    maxDrawdownPct = Math.max(maxDrawdownPct, dd);
    if (ret >= 0) {
      wins += 1;
      grossWin += ret;
    } else {
      grossLoss += Math.abs(ret);
    }
  }

  const winRate = tradeCount === 0 ? 0 : wins / tradeCount;
  const profitFactor =
    grossLoss === 0 ? (grossWin > 0 ? null : 0) : grossWin / grossLoss;
  const metrics = {
    tradeCount,
    winRate,
    totalReturnPct,
    maxDrawdownPct,
    profitFactor,
  };
  return { ...metrics, score: scoreCalibration(metrics) };
};

const BUY_CANDIDATES = [
  0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.94,
] as const;
const SELL_CANDIDATES = [
  0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.94,
] as const;

export type BuildGlobalPresetInput = {
  readonly samples: readonly CalibrationSample[];
  readonly presetVersion: string;
  readonly generatedAt?: string;
  readonly currentBuyThreshold?: number;
  readonly currentSellThreshold?: number;
  readonly minimumSamples?: number;
};

/**
 * Offline threshold grid search. Never auto-publishes — status is candidate.
 * Deterministic for the same input samples + version.
 */
export const buildGlobalPresetCandidate = async (
  input: BuildGlobalPresetInput,
): Promise<BuildPresetResult> => {
  const minimumSamples = input.minimumSamples ?? 500;
  const generatedAt = input.generatedAt ?? "1970-01-01T00:00:00.000Z";
  const split = splitByTime(input.samples);
  const rejectReasons: string[] = [];

  if (input.samples.length < minimumSamples) {
    rejectReasons.push(`insufficient-samples:${input.samples.length}`);
  }

  let best = {
    buyThreshold: input.currentBuyThreshold ?? 0.82,
    sellThreshold: input.currentSellThreshold ?? 0.82,
    train: simulate(
      split.train,
      input.currentBuyThreshold ?? 0.82,
      input.currentSellThreshold ?? 0.82,
    ),
    validation: simulate(
      split.validation,
      input.currentBuyThreshold ?? 0.82,
      input.currentSellThreshold ?? 0.82,
    ),
  };

  for (const buyThreshold of BUY_CANDIDATES) {
    for (const sellThreshold of SELL_CANDIDATES) {
      const train = simulate(split.train, buyThreshold, sellThreshold);
      const validation = simulate(
        split.validation,
        buyThreshold,
        sellThreshold,
      );
      if (validation.tradeCount < 10) continue;
      const better =
        validation.score > best.validation.score ||
        (validation.score === best.validation.score &&
          (buyThreshold < best.buyThreshold ||
            (buyThreshold === best.buyThreshold &&
              sellThreshold < best.sellThreshold)));
      if (better) {
        best = { buyThreshold, sellThreshold, train, validation };
      }
    }
  }

  const holdout = simulate(
    split.holdout,
    best.buyThreshold,
    best.sellThreshold,
  );
  const baselineValidation = simulate(
    split.validation,
    input.currentBuyThreshold ?? 0.82,
    input.currentSellThreshold ?? 0.82,
  );

  if (best.validation.maxDrawdownPct > baselineValidation.maxDrawdownPct + 8) {
    rejectReasons.push("drawdown-regression");
  }
  if (best.validation.tradeCount < 10) {
    rejectReasons.push("sparse-validation-trades");
  }
  if (best.validation.totalReturnPct + 1 < baselineValidation.totalReturnPct) {
    rejectReasons.push("return-regression");
  }

  const gate = rejectReasons.length === 0 ? "READY_FOR_REVIEW" : "REJECTED";

  const withoutChecksum = {
    schemaVersion: 1 as const,
    presetVersion: input.presetVersion,
    generatedAt,
    sampleCount: input.samples.length,
    buyThreshold: best.buyThreshold,
    sellThreshold: best.sellThreshold,
    confidenceThreshold: 0.8,
    proposalCooldownMs: 30_000,
    sensoryScale: {
      momentum: 1,
      volatility: 1,
      volumeStrength: 1,
      return: 1,
    },
    metadata: {
      brainMode: "real-connectome" as const,
      minimumSamples,
      trainingWindow: "time-split-60-20-20",
      dataset: "male-cns:v1.0",
      source: "aggregated-paper-observations",
      status: "candidate" as const,
    },
  };

  const preset = await attachChecksum(withoutChecksum);
  return {
    preset,
    train: best.train,
    validation: best.validation,
    holdout,
    gate,
    rejectReasons,
  };
};
