import type {
  PaperFlyCardSnapshot,
  PaperFlyUxState,
} from "@fly/fly-ui/paper-overlay-types";
import type { BrainOutput } from "@fly/core";

const formatPct = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatUsdt = (value: number): string =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`;

export const mapBrainToUxState = (
  output: BrainOutput | null,
  hasPosition: boolean,
  sleeping: boolean,
): PaperFlyUxState => {
  if (sleeping) return "RESTING";
  if (!output) return "OBSERVING";
  if (output.state === "approach_buy")
    return hasPosition ? "WATCHING" : "BUYING";
  if (output.state === "approach_sell")
    return hasPosition ? "SELLING" : "WATCHING";
  if (hasPosition) return "HOLDING";
  if (output.state === "interested" || output.buyDrive > 0.55)
    return "WATCHING";
  return "OBSERVING";
};

export const buildPaperCardSnapshot = (input: {
  readonly symbol: string;
  readonly output: BrainOutput | null;
  readonly startingCapital: number;
  readonly currentEquity: number;
  readonly cumulativeReturnPct: number;
  readonly hasPosition: boolean;
  readonly unrealizedPct: number | null;
  readonly avgEntry: number | null;
  readonly sleeping: boolean;
  readonly uxStateLabels: Record<PaperFlyUxState, string>;
  readonly positionNoneLabel: string;
  readonly positionHoldingLabel: string;
}): PaperFlyCardSnapshot => {
  const uxState = mapBrainToUxState(
    input.output,
    input.hasPosition,
    input.sleeping,
  );
  const positionLine = input.hasPosition
    ? input.avgEntry != null
      ? `${input.positionHoldingLabel} @ ${input.avgEntry.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
      : input.positionHoldingLabel
    : input.positionNoneLabel;
  return {
    symbol: input.symbol,
    uxState: input.uxStateLabels[uxState],
    startingCapital: input.startingCapital,
    currentEquity: input.currentEquity,
    cumulativeReturnPct: input.cumulativeReturnPct,
    positionLine,
    unrealizedPct: input.unrealizedPct,
    currencyLabel: "USDT",
  };
};

export { formatPct, formatUsdt };
