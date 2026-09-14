import { clamp01 } from "../math";
import type { MarketEnvironment } from "../types";
import type {
  ChartModuleOutput,
  DecisionModuleOutput,
  ModularEvaluateResult,
  RiskModuleOutput,
  ScannerModuleOutput,
  VolumeModuleOutput,
} from "./types";

/** MODELED mock modular outputs when MaleCNS service is unavailable. */
export const evaluateModularMock = (
  environment: MarketEnvironment,
): ModularEvaluateResult => {
  const { momentum, volatility, volumeStrength } = environment.market;
  const novelty = environment.market.novelty ?? 0;
  const conflict = environment.market.trendConflict ?? 0;

  const chart: ChartModuleOutput = {
    bullish: clamp01(Math.max(0, momentum) * 0.85 + conflict * 0.05),
    bearish: clamp01(Math.max(0, -momentum) * 0.85 + conflict * 0.05),
    neutral: clamp01(1 - Math.abs(momentum) * 0.7),
    confidence: clamp01(0.45 + Math.abs(momentum) * 0.35),
  };
  const volume: VolumeModuleOutput = {
    activity: clamp01(volumeStrength),
    spike: clamp01(volumeStrength * 1.1 - 0.15),
    confidence: clamp01(volumeStrength * 0.6 + 0.25),
  };
  const risk: RiskModuleOutput = {
    risk: clamp01(volatility * 0.9 + conflict * 0.15),
    instability: clamp01(volatility * 0.75 + Math.abs(momentum) * 0.2),
    confidence: clamp01(volatility * 0.5 + 0.3),
  };
  const scanner: ScannerModuleOutput = {
    interest: clamp01(novelty * 0.5 + volumeStrength * 0.25 + conflict * 0.25),
    novelty: clamp01(novelty),
    revisitScore: clamp01(1 - novelty * 0.4),
  };
  const buyDrive = clamp01(
    chart.bullish * 0.35 +
      scanner.interest * 0.25 +
      volume.activity * 0.2 -
      risk.risk * 0.2,
  );
  const sellDrive = clamp01(
    chart.bearish * 0.35 + risk.instability * 0.25 - chart.bullish * 0.1,
  );
  const confidence = clamp01(
    (chart.confidence + volume.confidence + risk.confidence) / 3,
  );
  let intent: DecisionModuleOutput["intent"] = "IGNORE";
  if (buyDrive >= 0.58 && buyDrive > sellDrive + 0.08) intent = "APPROACH_BUY";
  else if (sellDrive >= 0.58 && sellDrive > buyDrive + 0.08)
    intent = "APPROACH_SELL";
  else if (max(buyDrive, sellDrive, scanner.interest) >= 0.38) intent = "WATCH";

  const decision: DecisionModuleOutput = {
    intent,
    buyDrive,
    sellDrive,
    confidence,
  };
  return {
    chart,
    volume,
    risk,
    scanner,
    decision,
    modelVersion: "mock-modular-v1",
  };
};

const max = (...values: number[]): number => Math.max(...values);
