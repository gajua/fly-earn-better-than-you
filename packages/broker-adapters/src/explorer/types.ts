import type { ExplorerResult, Timeframe } from "@fly/core";

export interface BrokerUIExplorer {
  getCurrentSymbol(): Promise<string | null>;
  listVisibleSymbols?(): Promise<string[]>;
  navigateToSymbol(symbol: string): Promise<ExplorerResult>;
  getCurrentTimeframe(): Promise<Timeframe | null>;
  changeTimeframe(timeframe: Timeframe): Promise<ExplorerResult>;
  focusChart(): Promise<ExplorerResult>;
  scrollChart?(): Promise<ExplorerResult>;
}

export interface SymbolUniverseProvider {
  getCandidates(currentSymbol?: string | null): Promise<
    Array<{
      readonly symbol: string;
      readonly source: "current" | "seed" | "public-liquidity" | "visible";
      readonly quoteVolume?: number;
    }>
  >;
}
