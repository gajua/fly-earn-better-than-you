export interface ViewportRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** @deprecated Prefer ViewportRect when the coordinate system matters. */
export type DOMRectLike = ViewportRect;

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scaleFactor: number;
}

export interface MarketEnvironment {
  readonly asset?: {
    readonly symbol: string;
    readonly name?: string;
    readonly price: number;
    readonly changePercent: number;
  };
  readonly position?: {
    readonly quantity: number;
    readonly averagePrice: number;
    readonly pnlAmount: number;
    readonly pnlPercent: number;
  };
  readonly market: {
    readonly momentum: number;
    readonly volatility: number;
    readonly volumeStrength: number;
  };
  readonly ui: {
    readonly chart?: DOMRectLike;
    readonly buy?: DOMRectLike;
    readonly sell?: DOMRectLike;
    readonly portfolio?: DOMRectLike;
  };
}

export type FlyState =
  | "sleep"
  | "enter"
  | "explore"
  | "observe_chart"
  | "inspect_portfolio"
  | "interested"
  | "approach_buy"
  | "approach_sell"
  | "panic"
  | "leave";

export interface BrainOutput {
  readonly state: FlyState;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly curiosity: number;
  readonly danger: number;
  readonly activity: number;
}

export interface FlyBrain {
  evaluate(environment: MarketEnvironment): Promise<BrainOutput>;
}

export type BrainMode = "mock" | "real-connectome" | "shuffled-control";

export interface SensoryStimulus {
  readonly visualPositive: number;
  readonly visualNegative: number;
  readonly motionIntensity: number;
  readonly volatilityStimulus: number;
  readonly rewardLikeStimulus: number;
}

export interface ActiveNeuron {
  readonly bodyId: number;
  readonly activity: number;
}

export interface BrainDiagnostics {
  readonly mode: BrainMode;
  readonly dataset?: string;
  readonly isConnectomeLoaded: boolean;
  readonly neuronCount?: number;
  readonly edgeCount?: number;
  readonly activeInputNeurons: readonly ActiveNeuron[];
  readonly topOutputNeurons: readonly ActiveNeuron[];
  readonly simulationMs?: number;
  readonly lastOutput?: BrainOutput;
  readonly error?: string;
}

export interface InspectableFlyBrain extends FlyBrain {
  readonly mode: BrainMode;
  getDiagnostics(): BrainDiagnostics;
  subscribe(listener: () => void): () => void;
}

export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export const toDOMRectLike = (rect: DOMRect): DOMRectLike => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  left: rect.left,
});
