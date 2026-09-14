export type {
  ChartModuleOutput,
  DecisionIntent,
  DecisionModuleOutput,
  FutureOutcomeRecord,
  MarketObservationRecord,
  ModularEvaluateResult,
  ModuleId,
  ModuleOutputRecord,
  NeuralModuleDefinition,
  OutcomeHorizon,
  PendingOutcomeRecord,
  RiskModuleOutput,
  ScannerModuleOutput,
  VolumeModuleOutput,
} from "./types";
export { OUTCOME_HORIZON_MS } from "./types";
export {
  assertRealNeuronIds,
  registerConnectomeNeuronIds,
  validateModuleDefinitions,
} from "./validation";
export { evaluateModularMock } from "./mock-evaluate";
export { brainOutputFromModular } from "./brain-map";
export {
  DEFAULT_LEARNING_PIPELINE_CONFIG,
  shouldUploadSummary,
  type LearningPipelineConfig,
  type UploadEligibilityReason,
} from "./learning-config";
export { computeFutureOutcome, horizonToMs } from "./outcome";
export {
  shouldEvaluateBrain,
  type BrainGatingInput,
  type BrainGatingState,
} from "./gating";
