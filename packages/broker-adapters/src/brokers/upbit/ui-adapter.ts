import {
  toInstrumentId,
  type AssetCandidate,
  type AssetSnapshot,
  type LoginState,
  type MarketEnvironment,
  type PortfolioSnapshot,
  type Timeframe,
} from "@fly/core";
import { resolveLocator, revalidateTarget } from "../../locator";
import type { BrokerMarketDataProvider } from "../../page";
import { parseUpbitExchangeSymbol } from "../../shared/symbol-resolver";
import {
  type BrokerAdapter,
  type BrokerTargets,
  type ResolvedBrokerTargets,
  targetsToUiRects,
} from "../../types";
import {
  UPBIT_BUY_LOCATORS,
  UPBIT_CHART_LOCATORS,
  UPBIT_LOGIN_LOCATORS,
  UPBIT_SELL_LOCATORS,
} from "./locators";
import { createUpbitMarketDataBridge } from "./market-data";
import { classifyUpbitPage } from "./page-classifier";

const readPriceFromTitle = (documentRef: Document): number => {
  const match = documentRef.title.match(/([\d,]+)/);
  if (!match?.[1]) return 0;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const createUpbitBrokerAdapter = (
  documentRef: Document = document,
  options?: {
    readonly marketData?: BrokerMarketDataProvider | null;
  },
): BrokerAdapter => {
  const marketData =
    options?.marketData === undefined
      ? createUpbitMarketDataBridge()
      : options.marketData;

  const resolveTargets = (): ResolvedBrokerTargets => ({
    buy: resolveLocator(documentRef, UPBIT_BUY_LOCATORS),
    sell: resolveLocator(documentRef, UPBIT_SELL_LOCATORS),
    chart: resolveLocator(documentRef, UPBIT_CHART_LOCATORS),
    portfolio: null,
    search: null,
    login: resolveLocator(documentRef, UPBIT_LOGIN_LOCATORS),
  });

  const getTargets = (): BrokerTargets => {
    const resolved = resolveTargets();
    return {
      buy: revalidateTarget(resolved.buy)?.element,
      sell: revalidateTarget(resolved.sell)?.element,
      chart: revalidateTarget(resolved.chart)?.element,
      login: revalidateTarget(resolved.login)?.element,
    };
  };

  const current = () => {
    const url = documentRef.defaultView?.location.href ?? "";
    const parsed = parseUpbitExchangeSymbol(url);
    if (!parsed) return null;
    return {
      symbol: parsed.normalized,
      quote: parsed.quoteCurrency ?? "KRW",
      instrumentId: toInstrumentId({
        broker: "upbit",
        marketType: "spot",
        symbol: parsed.normalized,
        quoteCurrency: parsed.quoteCurrency ?? "KRW",
      }),
    };
  };

  const detectLoginState = (): LoginState => {
    const login = Array.from(documentRef.querySelectorAll("a")).some(
      (node) => (node.textContent ?? "").trim() === "로그인",
    );
    return login ? "LOGGED_OUT" : "UNKNOWN";
  };

  const readEnvironment = (): MarketEnvironment | null => {
    const asset = current();
    if (!asset) return null;
    return {
      asset: {
        symbol: asset.symbol,
        name: documentRef.querySelector("a")?.textContent?.includes("BTC")
          ? "Bitcoin"
          : undefined,
        price: readPriceFromTitle(documentRef),
        changePercent: 0,
        instrumentId: asset.instrumentId,
      },
      market: {
        momentum: 0,
        volatility: 0,
        volumeStrength: 0.5,
      },
      ui: targetsToUiRects(getTargets()),
    };
  };

  return {
    id: "upbit",
    detect: () => {
      const host = documentRef.defaultView?.location.hostname ?? "";
      return host === "upbit.com" || host.endsWith(".upbit.com");
    },
    detectLoginState,
    detectPageContext: () =>
      classifyUpbitPage(
        documentRef,
        documentRef.defaultView?.location.href ?? "",
        detectLoginState(),
      ),
    readCurrentAsset: (): AssetSnapshot | null =>
      readEnvironment()?.asset ?? null,
    readPortfolio: (): PortfolioSnapshot | null => null,
    readWatchlist: (): AssetCandidate[] => {
      const asset = current();
      return asset
        ? [
            {
              symbol: asset.symbol,
              instrumentId: asset.instrumentId,
              source: "current",
            },
          ]
        : [];
    },
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
    isMarketOpen: () => true,
    getMarketDataProvider: () => marketData,
  };
};
