export interface LearningPipelineConfig {
  readonly uploadBatchSize: number;
  readonly maxDailyUploads: number;
  readonly randomSampleRate: number;
  readonly localRetentionDays: number;
  readonly dedupeWindowMs: number;
  readonly uploadRetryBackoffMs: number;
}

export const DEFAULT_LEARNING_PIPELINE_CONFIG: LearningPipelineConfig = {
  uploadBatchSize: 100,
  maxDailyUploads: 5000,
  randomSampleRate: 0.05,
  localRetentionDays: 30,
  dedupeWindowMs: 60_000,
  uploadRetryBackoffMs: 30_000,
};

export type UploadEligibilityReason =
  | "high-novelty"
  | "trend-conflict"
  | "volume-anomaly"
  | "revisit"
  | "decision"
  | "resolved-outcome"
  | "random-sample"
  | "skip";

export interface UploadEligibilityInput {
  readonly novelty: number;
  readonly trendConflict: number;
  readonly relativeVolume: number;
  readonly revisit: boolean;
  readonly decisionIntent: string;
  readonly hasResolvedOutcome: boolean;
  readonly random: () => number;
  readonly config?: LearningPipelineConfig;
}

export const shouldUploadSummary = (
  input: UploadEligibilityInput,
): { upload: boolean; reason: UploadEligibilityReason } => {
  const config = input.config ?? DEFAULT_LEARNING_PIPELINE_CONFIG;
  if (input.hasResolvedOutcome) {
    return { upload: true, reason: "resolved-outcome" };
  }
  if (
    input.decisionIntent === "APPROACH_BUY" ||
    input.decisionIntent === "APPROACH_SELL"
  ) {
    return { upload: true, reason: "decision" };
  }
  if (input.novelty >= 0.72) return { upload: true, reason: "high-novelty" };
  if (input.trendConflict >= 0.55)
    return { upload: true, reason: "trend-conflict" };
  if (input.relativeVolume >= 1.8)
    return { upload: true, reason: "volume-anomaly" };
  if (input.revisit) return { upload: true, reason: "revisit" };
  if (input.random() < config.randomSampleRate) {
    return { upload: true, reason: "random-sample" };
  }
  return { upload: false, reason: "skip" };
};
