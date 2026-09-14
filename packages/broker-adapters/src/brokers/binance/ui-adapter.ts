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
import {
  type BrokerAdapter,
  type BrokerTargets,
  type ResolvedBrokerTargets,
  targetsToUiRects,
} from "../../types";
import { createBinanceMarketDataBridge } from "./market-data";
import {
  BINANCE_BUY_LOCATORS,
  BINANCE_CHART_LOCATORS,
  BINANCE_LOGIN_LOCATORS,
  BINANCE_PORTFOLIO_LOCATORS,
  BINANCE_SELL_LOCATORS,
} from "./locators";
import { classifyBinancePage } from "./page-classifier";
import { parseBinanceTradeSymbol } from "../../shared/symbol-resolver";
import { detectTradingViewLikeChart } from "../../shared/tradingview";

const readPriceFromDom = (documentRef: Document): number => {
  const title = documentRef.title;
  const titleMatch = title.match(/([\d,]+\.?\d*)/);
  if (titleMatch?.[1]) {
    const parsed = Number(titleMatch[1].replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const input = documentRef.querySelector<HTMLInputElement>(
    'input[inputmode="decimal"], input[value]',
  );
  if (input?.value) {
    const parsed = Number(input.value.replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const readChangePercent = (documentRef: Document): number => {
  const link = Array.from(documentRef.querySelectorAll("a")).find((node) =>
    /BTC\/USDT/i.test(node.textContent ?? ""),
  );
  const match = link?.textContent?.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  return match?.[1] ? Number(match[1]) : 0;
};

export const createBinanceBrokerAdapter = (
  documentRef: Document = document,
  options?: {
    readonly marketData?: BrokerMarketDataProvider | null;
  },
): BrokerAdapter => {
  const marketData =
    options?.marketData === undefined
      ? createBinanceMarketDataBridge()
      : options.marketData;

  const resolveTargets = (): ResolvedBrokerTargets => ({
    buy: resolveLocator(documentRef, BINANCE_BUY_LOCATORS),
    sell: resolveLocator(documentRef, BINANCE_SELL_LOCATORS),
    chart: resolveLocator(documentRef, BINANCE_CHART_LOCATORS),
    portfolio: resolveLocator(documentRef, BINANCE_PORTFOLIO_LOCATORS),
    search: null,
    login: resolveLocator(documentRef, BINANCE_LOGIN_LOCATORS),
  });

  const getTargets = (): BrokerTargets => {
    const resolved = resolveTargets();
    return {
      buy: revalidateTarget(resolved.buy)?.element,
      sell: revalidateTarget(resolved.sell)?.element,
      chart: revalidateTarget(resolved.chart)?.element,
      portfolio: revalidateTarget(resolved.portfolio)?.element,
      search: undefined,
      login: revalidateTarget(resolved.login)?.element,
    };
  };

  const currentSymbol = (): {
    symbol: string;
    quote: string;
    instrumentId: string;
  } | null => {
    const url = documentRef.defaultView?.location.href ?? "";
    const parsed = parseBinanceTradeSymbol(url);
    if (!parsed) return null;
    const symbol = parsed.normalized;
    const quote = parsed.quoteCurrency ?? "USDT";
    return {
      symbol,
      quote,
      instrumentId: toInstrumentId({
        broker: "binance",
        marketType: "spot",
        symbol,
        quoteCurrency: quote,
      }),
    };
  };

  const detectLoginState = (): LoginState => {
    if (documentRef.querySelector("#toLoginPage")) return "LOGGED_OUT";
    // Without account menu verification we stay UNKNOWN (guest observation OK).
    return "UNKNOWN";
  };

  const readEnvironment = (): MarketEnvironment | null => {
    const current = currentSymbol();
    if (!current) return null;
    const chart = detectTradingViewLikeChart(documentRef);
    return {
      asset: {
        symbol: current.symbol,
        name: documentRef.querySelector("h1")?.textContent?.trim(),
        price: readPriceFromDom(documentRef),
        changePercent: readChangePercent(documentRef),
        instrumentId: current.instrumentId,
      },
      market: {
        momentum: 0,
        volatility: 0,
        volumeStrength: 0.5,
      },
      ui: {
        ...targetsToUiRects(getTargets()),
        chart:
          chart.rect !== undefined
            ? {
                x: chart.rect.x,
                y: chart.rect.y,
                width: chart.rect.width,
                height: chart.rect.height,
                top: chart.rect.top,
                right: chart.rect.right,
                bottom: chart.rect.bottom,
                left: chart.rect.left,
              }
            : targetsToUiRects(getTargets()).chart,
      },
    };
  };

  return {
    id: "binance",
    detect: () => {
      const host = documentRef.defaultView?.location.hostname ?? "";
      return host === "binance.com" || host.endsWith(".binance.com");
    },
    detectLoginState,
    detectPageContext: () =>
      classifyBinancePage(
        documentRef,
        documentRef.defaultView?.location.href ?? "",
        detectLoginState(),
      ),
    readCurrentAsset: (): AssetSnapshot | null =>
      readEnvironment()?.asset ?? null,
    readPortfolio: (): PortfolioSnapshot | null => null,
    readWatchlist: (): AssetCandidate[] => {
      const current = currentSymbol();
      if (!current) return [];
      const candidates: AssetCandidate[] = [
        {
          symbol: current.symbol,
          instrumentId: current.instrumentId,
          source: "current",
        },
      ];
      const links = Array.from(documentRef.querySelectorAll("a")).slice(0, 40);
      for (const link of links) {
        const text = (link.textContent ?? "").trim();
        const match = text.match(/^([A-Z0-9]+)\/([A-Z0-9]+)/i);
        if (!match) continue;
        const symbol = `${match[1]!.toUpperCase()}${match[2]!.toUpperCase()}`;
        if (candidates.some((item) => item.symbol === symbol)) continue;
        candidates.push({
          symbol,
          instrumentId: toInstrumentId({
            broker: "binance",
            marketType: "spot",
            symbol,
            quoteCurrency: match[2]!.toUpperCase(),
          }),
          source: "watchlist",
        });
        if (candidates.length >= 20) break;
      }
      return candidates;
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
