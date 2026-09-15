/** Compact Paper Fly card (current symbol only — no exploration HUD). */
export type PaperFlyUxState =
  "OBSERVING" | "WATCHING" | "BUYING" | "HOLDING" | "SELLING" | "RESTING";

export interface PaperFlyCardSnapshot {
  readonly symbol: string;
  /** Localized status line for the card. */
  readonly uxState: string;
  readonly startingCapital: number;
  readonly currentEquity: number;
  readonly cumulativeReturnPct: number;
  readonly positionLine: string;
  readonly unrealizedPct: number | null;
  readonly currencyLabel: string;
}
