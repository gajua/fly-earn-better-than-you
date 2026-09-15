import type { BrainOutput, FlyState } from "../types";
import type { DecisionIntent, ModularEvaluateResult } from "./types";

const intentToState = (intent: DecisionIntent): FlyState => {
  switch (intent) {
    case "APPROACH_BUY":
      return "approach_buy";
    case "APPROACH_SELL":
      return "approach_sell";
    case "WATCH":
      return "observe_chart";
    default:
      return "explore";
  }
};

export const brainOutputFromModular = (
  modular: ModularEvaluateResult,
): BrainOutput => ({
  state: intentToState(modular.decision.intent),
  buyDrive: modular.decision.buyDrive,
  sellDrive: modular.decision.sellDrive,
  curiosity: modular.scanner.interest,
  danger: modular.risk.risk,
  activity: modular.volume.activity,
});
