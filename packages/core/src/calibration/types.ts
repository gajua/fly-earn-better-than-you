import type { BrainMode, BrainOutput, FlyState } from "../types";

/** Local-only learning sample. Does not modify MaleCNS connectome data. */
export type LearningObservation = {
  readonly id: string;
  readonly broker: string;
  readonly symbol: string;
  readonly timestamp: string;
  readonly brainMode: BrainMode;
  readonly brainState: FlyState;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly curiosity: number;
  readonly danger: number;
  readonly marketFeatures: {
    readonly momentum?: number;
    readonly volatility?: number;
    readonly volumeStrength?: number;
    readonly returnPercent?: number;
  };
  readonly action: "paper_buy" | "paper_sell" | "none";
  readonly entryPrice?: number;
  readonly exitPrice?: number;
  readonly pnl?: number;
  readonly returnPct?: number;
};

export type CalibrationConfig = {
  readonly enabled: boolean;
  readonly minSamples: number;
};

export type CalibrationProfile = {
  readonly buyThreshold: number;
  readonly sellThreshold: number;
  readonly cooldownMultiplier: number;
  readonly behaviorConfidence: number;
  readonly sensoryScale: number;
  readonly updatedAt: string;
  readonly sampleCount: number;
};

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  enabled: false,
  minSamples: 30,
};

export const DEFAULT_CALIBRATION_PROFILE: CalibrationProfile = {
  buyThreshold: 0.82,
  sellThreshold: 0.82,
  cooldownMultiplier: 1,
  behaviorConfidence: 1,
  sensoryScale: 1,
  updatedAt: new Date(0).toISOString(),
  sampleCount: 0,
};

export const observationFromBrain = (input: {
  readonly id?: string;
  readonly broker: string;
  readonly symbol: string;
  readonly brainMode: BrainMode;
  readonly brain: BrainOutput;
  readonly action: LearningObservation["action"];
  readonly marketFeatures?: LearningObservation["marketFeatures"];
  readonly entryPrice?: number;
  readonly exitPrice?: number;
  readonly pnl?: number;
  readonly returnPct?: number;
  readonly timestamp?: string;
}): LearningObservation => ({
  id: input.id ?? crypto.randomUUID(),
  broker: input.broker,
  symbol: input.symbol,
  timestamp: input.timestamp ?? new Date().toISOString(),
  brainMode: input.brainMode,
  brainState: input.brain.state,
  buyDrive: input.brain.buyDrive,
  sellDrive: input.brain.sellDrive,
  curiosity: input.brain.curiosity,
  danger: input.brain.danger,
  marketFeatures: input.marketFeatures ?? {},
  action: input.action,
  entryPrice: input.entryPrice,
  exitPrice: input.exitPrice,
  pnl: input.pnl,
  returnPct: input.returnPct,
});
