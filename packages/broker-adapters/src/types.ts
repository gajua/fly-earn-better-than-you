import {
  toDOMRectLike,
  type AdapterStatus,
  type AssetCandidate,
  type AssetSnapshot,
  type LoginState,
  type MarketEnvironment,
  type PortfolioSnapshot,
  type Timeframe,
  type ViewportRect,
} from "@fly/core";

export interface BrokerTargets {
  readonly buy?: HTMLElement;
  readonly sell?: HTMLElement;
  readonly chart?: HTMLElement;
  readonly search?: HTMLElement;
  readonly portfolio?: HTMLElement;
  readonly login?: HTMLElement;
}

export interface BrokerAdapter {
  readonly id: string;
  detect(): boolean;
  detectLoginState(): LoginState;
  readCurrentAsset(): AssetSnapshot | null;
  readPortfolio(): PortfolioSnapshot | null;
  readWatchlist(): AssetCandidate[];
  readMarketEnvironment(): MarketEnvironment | null;
  /** @deprecated Prefer readMarketEnvironment(). */
  readEnvironment(): MarketEnvironment | null;
  getTargets(): BrokerTargets;
  getAvailableTimeframes(): Timeframe[];
  selectTimeframe?(timeframe: Timeframe): Promise<void>;
  inspectAsset?(candidate: AssetCandidate): Promise<{
    readonly symbol: string;
    readonly observations: MarketEnvironment["market"];
  }>;
  isMarketOpen(): boolean;
}

export interface BrokerDefinition {
  readonly id: string;
  readonly label: string;
  readonly domains: readonly string[];
  readonly status: AdapterStatus;
  readonly optionalHostPermissions: readonly string[];
  createAdapter(documentRef?: Document): BrokerAdapter;
}

export const rectFromElement = (
  element: HTMLElement | null | undefined,
): ViewportRect | undefined =>
  element ? toDOMRectLike(element.getBoundingClientRect()) : undefined;

export const targetsToUiRects = (
  targets: BrokerTargets,
): MarketEnvironment["ui"] => ({
  buy: rectFromElement(targets.buy),
  sell: rectFromElement(targets.sell),
  chart: rectFromElement(targets.chart),
  search: rectFromElement(targets.search),
  portfolio: rectFromElement(targets.portfolio),
  login: rectFromElement(targets.login),
});
