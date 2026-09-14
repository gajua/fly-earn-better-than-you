import type {
  AssetCandidate,
  AssetSnapshot,
  LoginState,
  MarketEnvironment,
  PortfolioSnapshot,
  Timeframe,
} from "@fly/core";
import { resolveLocator, revalidateTarget } from "../src/locator";
import type { BrokerMarketDataProvider } from "../src/page";
import {
  type BrokerAdapter,
  type BrokerTargets,
  type ResolvedBrokerTargets,
  targetsToUiRects,
} from "../src/types";
import {
  TODO_BUY_LOCATORS,
  TODO_CHART_LOCATORS,
  TODO_SELL_LOCATORS,
} from "./locators";
import { createTodoMarketDataBridge } from "./market-data";
import { classifyTodoBrokerPage } from "./page-classifier";

/**
 * TODO: implement detect/login/symbol/targets for the live site.
 * Keep marketData injectable so UI and market layers stay independent.
 */
export const createTodoBrokerAdapter = (
  documentRef: Document = document,
  options?: { readonly marketData?: BrokerMarketDataProvider | null },
): BrokerAdapter => {
  const marketData =
    options?.marketData === undefined
      ? createTodoMarketDataBridge()
      : options.marketData;

  const resolveTargets = (): ResolvedBrokerTargets => ({
    buy: resolveLocator(documentRef, TODO_BUY_LOCATORS),
    sell: resolveLocator(documentRef, TODO_SELL_LOCATORS),
    chart: resolveLocator(documentRef, TODO_CHART_LOCATORS),
    portfolio: null,
    search: null,
    login: null,
  });

  const getTargets = (): BrokerTargets => {
    const resolved = resolveTargets();
    return {
      buy: revalidateTarget(resolved.buy)?.element,
      sell: revalidateTarget(resolved.sell)?.element,
      chart: revalidateTarget(resolved.chart)?.element,
    };
  };

  const readEnvironment = (): MarketEnvironment | null => null;

  return {
    id: "TODO_BROKER_ID",
    detect: () => false,
    detectLoginState: (): LoginState => "UNKNOWN",
    detectPageContext: () =>
      classifyTodoBrokerPage(
        documentRef,
        documentRef.defaultView?.location.href ?? "",
        "UNKNOWN",
      ),
    readCurrentAsset: (): AssetSnapshot | null => null,
    readPortfolio: (): PortfolioSnapshot | null => null,
    readWatchlist: (): AssetCandidate[] => [],
    readMarketEnvironment: readEnvironment,
    readEnvironment,
    getTargets,
    resolveTargets,
    getAvailableTimeframes: (): Timeframe[] => [
      "1m",
      "5m",
      "15m",
      "1h",
      "4h",
      "1d",
    ],
    isMarketOpen: () => false,
    getMarketDataProvider: () => marketData,
  };
};
