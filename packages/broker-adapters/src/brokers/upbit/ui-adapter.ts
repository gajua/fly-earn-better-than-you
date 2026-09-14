import {
  toInstrumentId,
  type AssetCandidate,
  type AssetSnapshot,
  type LoginState,
  type MarketEnvironment,
  type PortfolioSnapshot,
  type Timeframe,
} from "@fly/core";
import {
  resolveLocator,
  revalidateTarget,
  type LocatedTarget,
} from "../../locator";
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

/** Prefer price next to pair text: `▲ 104,623,000 BTC/KRW +0.10% | ...`. */
export const readPriceFromTitle = (documentRef: Document): number => {
  const title = documentRef.title;
  const nearPair = title.match(/([\d,]+)\s*[A-Z0-9]{2,15}\/[A-Z]{2,10}/i);
  const fallback = title.match(/([\d,]{5,})/);
  const raw = nearPair?.[1] ?? fallback?.[1];
  if (!raw) return 0;
  const parsed = Number(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const areaOf = (element: HTMLElement): number => {
  const rect = element.getBoundingClientRect();
  return Math.max(0, rect.width) * Math.max(0, rect.height);
};

const isRoughlyInView = (element: HTMLElement): boolean => {
  const view = element.ownerDocument.defaultView;
  if (!view) return true;
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < view.innerHeight &&
    rect.left < view.innerWidth &&
    rect.width >= 160 &&
    rect.height >= 120
  );
};

const pickLargestInView = (
  elements: readonly HTMLElement[],
): HTMLElement | null => {
  let best: HTMLElement | null = null;
  let bestArea = 0;
  for (const element of elements) {
    if (!element.isConnected || !isRoughlyInView(element)) continue;
    const area = areaOf(element);
    if (area > bestArea) {
      best = element;
      bestArea = area;
    }
  }
  return best;
};

/**
 * Upbit exchange chart is commonly hosted in a large iframe (TradingView),
 * while tiny `.highcharts-container` nodes also exist. Prefer the visible
 * primary surface so the fly actually visits the chart the user sees.
 */
export const resolveUpbitChartTarget = (
  documentRef: Document,
): LocatedTarget | null => {
  const iframes = Array.from(
    documentRef.querySelectorAll<HTMLElement>("iframe"),
  );
  const iframeChart = pickLargestInView(iframes);
  if (iframeChart && areaOf(iframeChart) >= 80_000) {
    return {
      element: iframeChart,
      confidence: 0.94,
      strategy: "upbit-iframe-chart",
    };
  }

  const highcharts = Array.from(
    documentRef.querySelectorAll<HTMLElement>(".highcharts-container"),
  );
  const largestHighcharts = pickLargestInView(highcharts);
  if (largestHighcharts) {
    return {
      element: largestHighcharts,
      confidence: 0.9,
      strategy: "upbit-highcharts-largest",
    };
  }

  return resolveLocator(documentRef, UPBIT_CHART_LOCATORS);
};

/**
 * Right-side market list: search input `코인명/심볼검색` plus tall panel.
 */
export const resolveUpbitSearchTarget = (
  documentRef: Document,
): LocatedTarget | null => {
  const input = documentRef.querySelector<HTMLInputElement>(
    'input[placeholder*="심볼검색"], input[placeholder*="코인명"]',
  );
  if (!input) return null;

  let panel: HTMLElement | null = input;
  for (let depth = 0; depth < 10 && panel; depth += 1) {
    const rect = panel.getBoundingClientRect();
    if (rect.width >= 260 && rect.height >= 360) {
      return {
        element: panel,
        confidence: 0.9,
        strategy: "upbit-market-list-panel",
      };
    }
    panel = panel.parentElement;
  }

  return {
    element: input,
    confidence: 0.85,
    strategy: "upbit-symbol-search-input",
  };
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
    chart: resolveUpbitChartTarget(documentRef),
    portfolio: null,
    search: resolveUpbitSearchTarget(documentRef),
    login: resolveLocator(documentRef, UPBIT_LOGIN_LOCATORS),
  });

  const getTargets = (): BrokerTargets => {
    const resolved = resolveTargets();
    return {
      buy: revalidateTarget(resolved.buy)?.element,
      sell: revalidateTarget(resolved.sell)?.element,
      chart: revalidateTarget(resolved.chart)?.element,
      search: revalidateTarget(resolved.search)?.element,
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
