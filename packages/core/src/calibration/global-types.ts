export type GlobalCalibrationStatus =
  "candidate" | "ready_for_review" | "published" | "rolled_back";

export type GlobalCalibrationPreset = {
  readonly schemaVersion: number;
  readonly presetVersion: string;
  readonly generatedAt: string;
  readonly sampleCount: number;
  readonly buyThreshold: number;
  readonly sellThreshold: number;
  readonly confidenceThreshold: number;
  readonly proposalCooldownMs: number;
  readonly sensoryScale: {
    readonly momentum: number;
    readonly volatility: number;
    readonly volumeStrength: number;
    readonly return: number;
  };
  /** Hex SHA-256 of canonical JSON without checksumSha256 field. */
  readonly checksumSha256: string;
  readonly metadata: {
    readonly brainMode: "real-connectome";
    readonly minimumSamples: number;
    readonly trainingWindow?: string;
    readonly dataset: string;
    readonly source: string;
    readonly status: GlobalCalibrationStatus;
  };
};

export type AnonymousPaperObservation = {
  readonly schemaVersion: number;
  readonly brainMode: "real-connectome";
  readonly presetVersion: string;
  readonly brokerCategory: "crypto" | "kr-stock" | "us-stock" | "other";
  readonly marketFeatures: {
    readonly momentum: number;
    readonly volatility: number;
    readonly volumeStrength: number;
    readonly return: number;
  };
  readonly brain: {
    readonly buyDrive: number;
    readonly sellDrive: number;
    readonly curiosity: number;
    readonly danger: number;
    readonly activity: number;
  };
  readonly action: "paper_buy" | "paper_sell";
  readonly outcome: {
    readonly returnPct: number;
    readonly holdingDurationBucket: string;
  };
  readonly createdAt: string;
  /** Optional spam guard only — never linked to broker accounts. */
  readonly installId?: string;
};

export type GlobalPresetGates = {
  readonly buyThreshold: number;
  readonly sellThreshold: number;
  readonly confidenceThreshold: number;
  readonly proposalCooldownMs: number;
  readonly presetVersion: string;
};

export const GLOBAL_PRESET_SCHEMA_VERSION = 1;

export const BUNDLED_GLOBAL_PRESET_VERSION = "1.0.0";

/** Forbidden keys that must never appear in contribution payloads. */
export const FORBIDDEN_CONTRIBUTION_KEYS = [
  "password",
  "otp",
  "cookie",
  "session",
  "authorization",
  "apiKey",
  "api_key",
  "secret",
  "email",
  "account",
  "balance",
  "holdings",
  "symbol",
  "instrumentId",
] as const;
