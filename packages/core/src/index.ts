export interface DOMRectLike {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
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
