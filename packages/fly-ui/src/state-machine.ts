import type { BrainOutput, FlyState } from "@fly/core";

export const MINIMUM_STATE_DURATION_MS = 1_600;

const driveForState = (state: FlyState, output: BrainOutput): number => {
  if (state === "approach_buy") return output.buyDrive;
  if (state === "approach_sell") return output.sellDrive;
  if (state === "panic") return output.danger;
  if (state === "observe_chart") return output.curiosity;
  return output.activity;
};

/**
 * Applies minimum duration and score hysteresis to avoid frantic transitions.
 */
export const canTransition = (
  current: FlyState,
  proposed: FlyState,
  output: BrainOutput,
  elapsedMs: number,
): boolean => {
  if (current === proposed) return false;
  if (proposed === "panic" && output.danger >= 0.78) return true;
  if (["sleep", "enter", "leave"].includes(current)) return false;
  if (elapsedMs < MINIMUM_STATE_DURATION_MS) return false;

  const currentDrive = driveForState(current, output);
  const proposedDrive = driveForState(proposed, output);
  return proposedDrive >= currentDrive + 0.08 || elapsedMs >= 5_500;
};
