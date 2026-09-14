import type { BrainOutput } from "../types";
import { PAPER_GATES } from "./config";
import { observedTimeframes, revisitCount } from "./memory";
import type { FlyMemory } from "./types";

export const canProposePaperTrade = (input: {
  readonly memory: FlyMemory;
  readonly symbol: string;
  readonly interest: number;
  readonly neural: BrainOutput | null;
}): boolean => {
  const timeframes = observedTimeframes(input.memory, input.symbol).length;
  const revisits = revisitCount(input.memory, input.symbol);
  const enoughContext =
    timeframes >= PAPER_GATES.minTimeframes ||
    revisits >= PAPER_GATES.minRevisits;
  const drive = Math.max(
    input.neural?.buyDrive ?? 0,
    input.neural?.sellDrive ?? 0,
  );
  return (
    enoughContext &&
    input.interest >= PAPER_GATES.minInterest &&
    drive >= PAPER_GATES.minNeuralDrive
  );
};
