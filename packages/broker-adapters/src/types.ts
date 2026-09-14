import {
  toDOMRectLike,
  type AdapterStatus,
  type AssetCandidate,
  type AssetSnapshot,
  type BrokerPageContext,
  type LoginState,
  type MarketEnvironment,
  type PortfolioSnapshot,
  type Timeframe,
  type TimeframeObservation,
  type ViewportRect,
} from "@fly/core";
import type { LocatedTarget } from "./locator";
import type { BrokerMarketDataProvider } from "./page";

export interface BrokerTargets {
  readonly buy?: HTMLElement;
  readonly sell?: HTMLElement;
  readonly chart?: HTMLElement;
  readonly search?: HTMLElement;
  readonly portfolio?: HTMLElement;
  readonly login?: HTMLElement;
}

export interface ResolvedBrokerTargets {
  readonly buy: LocatedTarget | null;
  readonly sell: LocatedTarget | null;
  readonly chart: LocatedTarget | null;
  readonly search: LocatedTarget | null;
  readonly portfolio: LocatedTarget | null;
  readonly login: LocatedTarget | null;
}

export interface BrokerAdapter {
  readonly id: string;
  detect(): boolean;
  detectLoginState(): LoginState;
  detectPageContext(): BrokerPageContext;
  readCurrentAsset(): AssetSnapshot | null;
  readPortfolio(): PortfolioSnapshot | null;
  readWatchlist(): AssetCandidate[];
  readMarketEnvironment(): MarketEnvironment | null;
  /** @deprecated Prefer readMarketEnvironment(). */
  readEnvironment(): MarketEnvironment | null;
  getTargets(): BrokerTargets;
  resolveTargets(): ResolvedBrokerTargets;
  getAvailableTimeframes(): Timeframe[];
  selectTimeframe?(timeframe: Timeframe): Promise<void>;
  inspectAsset?(candidate: AssetCandidate): Promise<{
    readonly symbol: string;
    readonly observations: MarketEnvironment["market"];
  }>;
  isMarketOpen(): boolean;
  getMarketDataProvider(): BrokerMarketDataProvider | null;
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

export type { TimeframeObservation, LocatedTarget, BrokerMarketDataProvider };
