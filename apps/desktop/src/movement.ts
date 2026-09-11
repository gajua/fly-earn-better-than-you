import type { BrainOutput, DesktopMode } from "./contracts";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface MovementBounds {
  readonly width: number;
  readonly height: number;
  readonly inset: number;
}

export const FLY_RADIUS = 22;
export const OBSERVATION_STALE_MS = 12_000;

export const clampPoint = (point: Point, bounds: MovementBounds): Point => ({
  x: Math.min(bounds.width - bounds.inset, Math.max(bounds.inset, point.x)),
  y: Math.min(bounds.height - bounds.inset, Math.max(bounds.inset, point.y)),
});

export const randomSafePoint = (
  bounds: MovementBounds,
  random = Math.random,
): Point =>
  clampPoint(
    {
      x: random() * bounds.width,
      y: random() * bounds.height,
    },
    bounds,
  );

export const targetForBrainOutput = (
  output: BrainOutput,
  bounds: MovementBounds,
): Point | null => {
  if (output.state === "approach_buy") {
    return clampPoint(
      { x: bounds.width * 0.75, y: bounds.height * 0.62 },
      bounds,
    );
  }
  if (output.state === "approach_sell") {
    return clampPoint(
      { x: bounds.width * 0.25, y: bounds.height * 0.62 },
      bounds,
    );
  }
  if (output.state === "observe_chart" || output.state === "interested") {
    return clampPoint(
      { x: bounds.width * 0.5, y: bounds.height * 0.42 },
      bounds,
    );
  }
  return null;
};

export const nextDesktopMode = (
  current: DesktopMode,
  hasFreshObservation: boolean,
  hasMarketTarget: boolean,
): DesktopMode => {
  if (hasFreshObservation) return "MARKET_OBSERVING";
  if (current === "MARKET_OBSERVING" && hasMarketTarget) return "LEAVE_MARKET";
  return "IDLE_DESKTOP";
};
