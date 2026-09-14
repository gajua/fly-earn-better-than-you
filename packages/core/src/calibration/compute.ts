import {
  DEFAULT_CALIBRATION_PROFILE,
  type CalibrationConfig,
  type CalibrationProfile,
  type LearningObservation,
} from "./types";

type Bucket = {
  readonly label: string;
  readonly min: number;
  readonly max: number;
};

const BUY_BUCKETS: readonly Bucket[] = [
  { label: "0.82-0.86", min: 0.82, max: 0.87 },
  { label: "0.87-0.90", min: 0.87, max: 0.91 },
  { label: "0.91+", min: 0.91, max: 1.01 },
];

const mean = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const scoredObservations = (
  observations: readonly LearningObservation[],
  side: "buy" | "sell",
): { drive: number; returnPct: number }[] =>
  observations
    .filter((row) =>
      side === "buy" ? row.action === "paper_buy" : row.action === "paper_sell",
    )
    .filter(
      (row) =>
        typeof row.returnPct === "number" && Number.isFinite(row.returnPct),
    )
    .map((row) => ({
      drive: side === "buy" ? row.buyDrive : row.sellDrive,
      returnPct: row.returnPct!,
    }));

const bestThreshold = (
  scored: readonly { drive: number; returnPct: number }[],
  fallback: number,
): number => {
  let bestMean = Number.NEGATIVE_INFINITY;
  let bestMin = fallback;
  for (const bucket of BUY_BUCKETS) {
    const inBucket = scored.filter(
      (row) => row.drive >= bucket.min && row.drive < bucket.max,
    );
    if (inBucket.length < 5) continue;
    const bucketMean = mean(inBucket.map((row) => row.returnPct));
    if (bucketMean > bestMean) {
      bestMean = bucketMean;
      bestMin = bucket.min;
    }
  }
  if (!Number.isFinite(bestMean)) return fallback;
  // Conservative: never drop below the default 0.82 floor.
  return Math.min(0.95, Math.max(0.82, bestMin));
};

/**
 * Statistical PersonalCalibration. Does not train neural nets and never
 * mutates MaleCNS topology / weights.
 */
export const computeCalibration = (
  observations: readonly LearningObservation[],
  config: CalibrationConfig,
  previous: CalibrationProfile = DEFAULT_CALIBRATION_PROFILE,
): CalibrationProfile => {
  const sampleCount = observations.filter(
    (row) => row.action === "paper_buy" || row.action === "paper_sell",
  ).length;

  if (!config.enabled || sampleCount < config.minSamples) {
    return {
      ...DEFAULT_CALIBRATION_PROFILE,
      sampleCount,
      updatedAt: previous.updatedAt,
    };
  }

  const buyScored = scoredObservations(observations, "buy");
  const sellScored = scoredObservations(observations, "sell");
  const buyThreshold = bestThreshold(
    buyScored,
    DEFAULT_CALIBRATION_PROFILE.buyThreshold,
  );
  const sellThreshold = bestThreshold(
    sellScored,
    DEFAULT_CALIBRATION_PROFILE.sellThreshold,
  );

  const avgReturn = mean(
    [...buyScored, ...sellScored].map((row) => row.returnPct),
  );
  const cooldownMultiplier = avgReturn < 0 ? 1.25 : avgReturn > 2 ? 0.9 : 1;

  return {
    buyThreshold,
    sellThreshold,
    cooldownMultiplier,
    behaviorConfidence: 1,
    sensoryScale: 1,
    updatedAt: new Date().toISOString(),
    sampleCount,
  };
};

export const applyCalibration = (
  profile: CalibrationProfile,
  config: CalibrationConfig,
): Pick<
  CalibrationProfile,
  "buyThreshold" | "sellThreshold" | "cooldownMultiplier"
> => {
  if (!config.enabled || profile.sampleCount < config.minSamples) {
    return {
      buyThreshold: DEFAULT_CALIBRATION_PROFILE.buyThreshold,
      sellThreshold: DEFAULT_CALIBRATION_PROFILE.sellThreshold,
      cooldownMultiplier: DEFAULT_CALIBRATION_PROFILE.cooldownMultiplier,
    };
  }
  return {
    buyThreshold: profile.buyThreshold,
    sellThreshold: profile.sellThreshold,
    cooldownMultiplier: profile.cooldownMultiplier,
  };
};

export const resetCalibration = (): CalibrationProfile => ({
  ...DEFAULT_CALIBRATION_PROFILE,
  updatedAt: new Date().toISOString(),
  sampleCount: 0,
});
