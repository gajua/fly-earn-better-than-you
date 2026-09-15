export type ModuleId =
  | "market_scanner"
  | "chart_observer"
  | "volume_observer"
  | "risk_observer"
  | "decision";

export interface NeuralModuleDefinition {
  readonly id: ModuleId;
  readonly inputNeuronIds: readonly number[];
  readonly intermediateNeuronIds?: readonly number[];
  readonly outputNeuronIds: readonly number[];
  readonly description: string;
  readonly assignment: "experimental";
}

export interface ChartModuleOutput {
  readonly bullish: number;
  readonly bearish: number;
  readonly neutral: number;
  readonly confidence: number;
}

export interface VolumeModuleOutput {
  readonly activity: number;
  readonly spike: number;
  readonly confidence: number;
}

export interface RiskModuleOutput {
  readonly risk: number;
  readonly instability: number;
  readonly confidence: number;
}

export interface ScannerModuleOutput {
  readonly interest: number;
  readonly novelty: number;
  readonly revisitScore: number;
}

export type DecisionIntent =
  "IGNORE" | "WATCH" | "APPROACH_BUY" | "APPROACH_SELL";

export interface DecisionModuleOutput {
  readonly intent: DecisionIntent;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly confidence: number;
}

export interface ModularEvaluateResult {
  readonly chart: ChartModuleOutput;
  readonly volume: VolumeModuleOutput;
  readonly risk: RiskModuleOutput;
  readonly scanner: ScannerModuleOutput;
  readonly decision: DecisionModuleOutput;
  readonly modelVersion: string;
}

export type OutcomeHorizon = "5m" | "30m" | "1h" | "4h" | "1d";

export const OUTCOME_HORIZON_MS: Record<OutcomeHorizon, number> = {
  "5m": 5 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export interface MarketObservationRecord {
  readonly id: string;
  readonly observedAt: string;
  readonly broker: string;
  readonly symbolCategory: string;
  readonly timeframe: string;
  readonly priceReturn: number;
  readonly momentum: number;
  readonly volatility: number;
  readonly relativeVolume: number;
  readonly trendConflict: number;
  readonly novelty: number;
  readonly source: string;
}

export interface ModuleOutputRecord {
  readonly id: string;
  readonly observationId: string;
  readonly moduleType: ModuleId;
  readonly score1: number;
  readonly score2: number;
  readonly score3: number;
  readonly confidence: number;
  readonly modelVersion: string;
  readonly presetVersion: string;
  readonly createdAt: string;
}

export interface FutureOutcomeRecord {
  readonly id: string;
  readonly observationId: string;
  readonly horizon: OutcomeHorizon;
  readonly futureReturn: number;
  readonly futureVolatility: number;
  readonly maxAdverseMove: number;
  readonly maxFavorableMove: number;
  readonly resolvedAt: string;
}

export interface PendingOutcomeRecord {
  readonly id: string;
  readonly observationId: string;
  readonly horizon: OutcomeHorizon;
  readonly dueAt: number;
  readonly anchorPrice: number;
  readonly instrumentId: string;
  readonly broker: string;
}
