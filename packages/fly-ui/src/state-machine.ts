import type { BrainOutput, FlyState } from "@fly/core";

export const MINIMUM_STATE_DURATION_MS = 1_600;

const driveForState = (state: FlyState, output: BrainOutput): number => {
  if (state === "approach_buy") return output.buyDrive;
  if (state === "approach_sell") return output.sellDrive;
  if (state === "panic") return output.danger;
  if (state === "observe_chart" || state === "scan_assets")
    return output.curiosity;
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
  // Allow leaving the initial enter hop after a short settle.
  if (current === "enter") return elapsedMs >= 900;
  if (["sleep", "leave", "login_hint"].includes(current)) return false;
  if (elapsedMs < MINIMUM_STATE_DURATION_MS) return false;

  const currentDrive = driveForState(current, output);
  const proposedDrive = driveForState(proposed, output);
  return proposedDrive >= currentDrive + 0.08 || elapsedMs >= 5_500;
};
