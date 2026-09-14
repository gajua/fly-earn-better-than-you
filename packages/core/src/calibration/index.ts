/**
 * Experimental PersonalCalibration (developer-only).
 * Product default is GlobalCalibrationPreset — same quality for every user.
 */
export {
  DEFAULT_CALIBRATION_CONFIG,
  DEFAULT_CALIBRATION_PROFILE,
  observationFromBrain,
  type CalibrationConfig,
  type CalibrationProfile,
  type LearningObservation,
} from "./types";
export {
  applyCalibration,
  computeCalibration,
  resetCalibration,
} from "./compute";

export type {
  AnonymousPaperObservation,
  GlobalCalibrationPreset,
  GlobalCalibrationStatus,
  GlobalPresetGates,
} from "./global-types";
export {
  BUNDLED_GLOBAL_PRESET_VERSION,
  FORBIDDEN_CONTRIBUTION_KEYS,
  GLOBAL_PRESET_SCHEMA_VERSION,
} from "./global-types";
export { BUNDLED_GLOBAL_PRESET } from "./bundled-preset";
export {
  applyGlobalPreset,
  assertAnonymousObservationSafe,
  attachChecksum,
  brokerCategoryFromBrokerId,
  canonicalPresetPayload,
  comparePresetVersions,
  holdingDurationBucket,
  sha256Hex,
  validateGlobalPreset,
  verifyPresetChecksum,
} from "./global-preset";
export {
  buildGlobalPresetCandidate,
  clipReturnPct,
  observationToSample,
  scoreCalibration,
  splitByTime,
  type BuildGlobalPresetInput,
  type BuildPresetResult,
  type CalibrationSample,
  type PresetCandidateMetrics,
  type SplitDataset,
} from "./builder";
