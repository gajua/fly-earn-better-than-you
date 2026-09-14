import type {
  AssetCandidate,
  AssetSnapshot,
  LoginState,
  MarketEnvironment,
  PortfolioSnapshot,
  Timeframe,
} from "@fly/core";
import { resolveLocator, revalidateTarget } from "./locator";
import {
  classifyDemoPage,
  observationFromCandles,
  type BrokerMarketDataProvider,
  type CandleBar,
} from "./page";
import {
  type BrokerAdapter,
  type BrokerTargets,
  type ResolvedBrokerTargets,
  targetsToUiRects,
} from "./types";
import { demoInstrumentId } from "@fly/core";

const readNumber = (value: string | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseCandleJson = (raw: string | undefined): CandleBar[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CandleBar[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Local demo trading screen adapter.
 * Uses explicit data-* landmarks + locator strategies.
 * Never clicks, never reads credentials/cookies/OTP.
 * Multi-timeframe candles come only from explicit demo JSON attributes —
 * never from synthetic scaling of a single snapshot.
 */
export const createDemoBrokerAdapter = (
  rootSelector = "[data-demo-broker]",
  documentRef: Document = document,
): BrokerAdapter => {
  const root = () => documentRef.querySelector<HTMLElement>(rootSelector);

  const resolveTargets = (): ResolvedBrokerTargets => {
    const node = root();
    const scope: ParentNode = node ?? documentRef;
    const modal = documentRef.querySelector<HTMLElement>(
      `[role="dialog"][data-fly-modal], [aria-modal="true"]`,
    );
    const view = documentRef.defaultView;
    const modalVisible =
      modal &&
      view &&
      view.getComputedStyle(modal).display !== "none" &&
      modal.getBoundingClientRect().width > 0;
    const searchRoot: ParentNode = modalVisible ? modal! : scope;

    return {
      buy: resolveLocator(documentRef, [
        { testId: "buy", confidence: 0.98, strategy: "data-fly-target" },
        {
          ariaLabel: "Buy",
          confidence: 0.9,
          strategy: "aria-label",
        },
        {
          visibleText: "BUY",
          confidence: 0.85,
          strategy: "visible-text",
        },
      ], searchRoot),
      sell: resolveLocator(documentRef, [
        { testId: "sell", confidence: 0.98, strategy: "data-fly-target" },
        { ariaLabel: "Sell", confidence: 0.9, strategy: "aria-label" },
        { visibleText: "SELL", confidence: 0.85, strategy: "visible-text" },
      ], searchRoot),
      chart: resolveLocator(documentRef, [
        { testId: "chart", confidence: 0.98, strategy: "data-fly-target" },
      ], scope),
      portfolio: resolveLocator(documentRef, [
        { testId: "portfolio", confidence: 0.98, strategy: "data-fly-target" },
      ], scope),
      search: resolveLocator(documentRef, [
        { testId: "search", confidence: 0.98, strategy: "data-fly-target" },
      ], scope),
      login: resolveLocator(documentRef, [
        { testId: "login", confidence: 0.98, strategy: "data-fly-target" },
      ], scope),
    };
  };

  const getTargets = (): BrokerTargets => {
    const resolved = resolveTargets();
    return {
      buy: revalidateTarget(resolved.buy)?.element,
      sell: revalidateTarget(resolved.sell)?.element,
      chart: revalidateTarget(resolved.chart)?.element,
      portfolio: revalidateTarget(resolved.portfolio)?.element,
      search: revalidateTarget(resolved.search)?.element,
      login: revalidateTarget(resolved.login)?.element,
    };
  };

  const readEnvironment = (): MarketEnvironment | null => {
    const node = root();
    if (!node) return null;
    const { dataset } = node;
    const symbol = dataset.symbol ?? "UNKNOWN";
    return {
      asset: {
        symbol,
        name: dataset.assetName,
        price: readNumber(dataset.price),
        changePercent: readNumber(dataset.changePercent),
        instrumentId: demoInstrumentId(symbol),
      },
      position: {
        quantity: readNumber(dataset.quantity),
        averagePrice: readNumber(dataset.averagePrice),
        pnlAmount: readNumber(dataset.pnlAmount),
        pnlPercent: readNumber(dataset.pnlPercent),
      },
      market: {
        momentum: readNumber(dataset.momentum),
        volatility: readNumber(dataset.volatility),
        volumeStrength: readNumber(dataset.volumeStrength, 0.5),
      },
      ui: targetsToUiRects(getTargets()),
    };
  };

  const marketDataProvider: BrokerMarketDataProvider = {
    id: "demo-market-data",
    async getCandles(instrumentId, timeframe) {
      void instrumentId;
      const node = root();
      if (!node) return null;
      const raw = node.getAttribute(`data-tf-${timeframe}`) ?? undefined;
      return parseCandleJson(raw);
    },
  };

  return {
    id: "demo",
    detect: () => root() !== null,
    detectLoginState: (): LoginState => {
      const node = root();
      if (!node) return "UNKNOWN";
      const state = node.dataset.loginState?.toUpperCase();
      if (state === "LOGGED_IN") return "LOGGED_IN";
      if (state === "LOGGED_OUT") return "LOGGED_OUT";
      return node.dataset.loginState === undefined ? "LOGGED_IN" : "UNKNOWN";
    },
    detectPageContext: () => {
      const node = root();
      const symbol = node?.dataset.symbol;
      return classifyDemoPage(
        documentRef,
        "demo",
        documentRef.defaultView?.location.href ?? "http://127.0.0.1/",
        (() => {
          const state = node?.dataset.loginState?.toUpperCase();
          if (state === "LOGGED_IN") return "LOGGED_IN";
          if (state === "LOGGED_OUT") return "LOGGED_OUT";
          return node?.dataset.loginState === undefined ? "LOGGED_IN" : "UNKNOWN";
        })(),
        symbol ? demoInstrumentId(symbol) : undefined,
      );
    },
    readCurrentAsset: (): AssetSnapshot | null => {
      const environment = readEnvironment();
      return environment?.asset ?? null;
    },
    readPortfolio: (): PortfolioSnapshot | null => {
      const environment = readEnvironment();
      if (!environment?.position || !environment.asset) return null;
      return {
        positions: [
          {
            symbol: environment.asset.symbol,
            instrumentId: environment.asset.instrumentId,
            quantity: environment.position.quantity,
            averagePrice: environment.position.averagePrice,
            marketPrice: environment.asset.price,
            pnlAmount: environment.position.pnlAmount,
            pnlPercent: environment.position.pnlPercent,
          },
        ],
      };
    },
    readWatchlist: (): AssetCandidate[] => {
      const node = root();
      if (!node) return [];
      const raw = node.dataset.watchlist ?? "";
      const symbols = raw
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean);
      const current = node.dataset.symbol;
      const candidates: AssetCandidate[] = symbols.map((symbol) => ({
        symbol,
        instrumentId: demoInstrumentId(symbol),
        source: "watchlist",
      }));
      if (
        current &&
        !candidates.some((candidate) => candidate.symbol === current)
      ) {
        candidates.unshift({
          symbol: current,
          instrumentId: demoInstrumentId(current),
          source: "current",
        });
      }
      return candidates;
    },
    readMarketEnvironment: readEnvironment,
    readEnvironment,
    getTargets,
    resolveTargets,
    getAvailableTimeframes: (): Timeframe[] => {
      const node = root();
      const raw = node?.dataset.timeframes ?? "1m,5m,15m,1h,1d";
      return raw
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is Timeframe =>
          ["1m", "5m", "15m", "1h", "4h", "1d"].includes(value),
        );
    },
    isMarketOpen: () => {
      const node = root();
      if (!node) return false;
      return (node.dataset.marketOpen ?? "true") !== "false";
    },
    getMarketDataProvider: () => marketDataProvider,
  };
};

export { observationFromCandles };
