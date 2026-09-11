import {
  clamp01,
  type BrainOutput,
  type FlyBrain,
  type FlyState,
  type MarketEnvironment,
} from "@fly/core";

export interface MockFlyBrainOptions {
  readonly random?: () => number;
  readonly noiseAmount?: number;
}

/**
 * Temporary heuristic brain for product prototyping.
 *
 * This is not a biological simulation and does not use MaleCNS data. Its
 * contract is intentionally shared with a future MaleCNSBrain implementation.
 */
export const createMockFlyBrain = ({
  random = Math.random,
  noiseAmount = 0.035,
}: MockFlyBrainOptions = {}): FlyBrain => {
  const noise = () => (random() - 0.5) * 2 * noiseAmount;

  return {
    async evaluate(environment): Promise<BrainOutput> {
      const { momentum, volatility, volumeStrength } = environment.market;
      const pnlPercent = environment.position?.pnlPercent ?? 0;
      const normalizedGain = clamp01(pnlPercent / 20);
      const normalizedLoss = clamp01(-pnlPercent / 20);

      const danger = clamp01(
        volatility * 0.72 +
          Math.max(0, -momentum) * 0.25 +
          normalizedLoss * 0.3 +
          noise(),
      );
      const buyDrive = clamp01(
        Math.max(0, momentum) * 0.78 +
          normalizedGain * 0.12 +
          volumeStrength * 0.14 -
          danger * 0.22 +
          noise(),
      );
      const sellDrive = clamp01(
        Math.max(0, -momentum) * 0.72 +
          normalizedLoss * 0.34 +
          volatility * 0.16 +
          noise(),
      );
      const signalStrength = Math.max(buyDrive, sellDrive, danger);
      const curiosity = clamp01(0.86 - signalStrength * 0.65 + noise());
      const activity = clamp01(
        0.25 + volatility * 0.55 + Math.abs(momentum) * 0.35 + noise(),
      );

      const state = chooseState({
        environment,
        buyDrive,
        sellDrive,
        curiosity,
        danger,
      });

      return { state, buyDrive, sellDrive, curiosity, danger, activity };
    },
  };
};

interface StateInputs {
  readonly environment: MarketEnvironment;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly curiosity: number;
  readonly danger: number;
}

const chooseState = ({
  environment,
  buyDrive,
  sellDrive,
  curiosity,
  danger,
}: StateInputs): FlyState => {
  if (danger >= 0.68) return "panic";
  if (sellDrive >= 0.6 && sellDrive > buyDrive + 0.08) return "approach_sell";
  if (buyDrive >= 0.6 && buyDrive > sellDrive + 0.08) return "approach_buy";
  if (environment.position && Math.abs(environment.position.pnlPercent) >= 8) {
    return "inspect_portfolio";
  }
  if (Math.max(buyDrive, sellDrive) >= 0.48) return "interested";
  if (curiosity >= 0.55 && environment.ui.chart) return "observe_chart";
  return "explore";
};
