import {
  type AssetCandidate,
  type AssetSnapshot,
  type LoginState,
  type MarketEnvironment,
  type PortfolioSnapshot,
  type Timeframe,
} from "@fly/core";
import {
  type BrokerAdapter,
  type BrokerTargets,
  targetsToUiRects,
} from "./types";

const readNumber = (value: string | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const queryHtml = (
  documentRef: Document,
  root: ParentNode,
  selector: string,
): HTMLElement | undefined =>
  root.querySelector<HTMLElement>(selector) ??
  documentRef.querySelector<HTMLElement>(selector) ??
  undefined;

/**
 * Local demo trading screen adapter.
 * First vertical-slice broker: explicit data-* attributes only.
 * Never clicks, never reads credentials/cookies/OTP.
 */
export const createDemoBrokerAdapter = (
  rootSelector = "[data-demo-broker]",
  documentRef: Document = document,
): BrokerAdapter => {
  const root = () =>
    documentRef.querySelector<HTMLElement>(rootSelector);

  const readEnvironment = (): MarketEnvironment | null => {
    const node = root();
    if (!node) return null;
    const { dataset } = node;
    const targets = getTargets();
    return {
      asset: {
        symbol: dataset.symbol ?? "UNKNOWN",
        name: dataset.assetName,
        price: readNumber(dataset.price),
        changePercent: readNumber(dataset.changePercent),
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
      ui: targetsToUiRects(targets),
    };
  };

  const getTargets = (): BrokerTargets => {
    const node = root();
    const scope: ParentNode = node ?? documentRef;
    return {
      chart: queryHtml(documentRef, scope, "[data-fly-target='chart']"),
      buy: queryHtml(documentRef, scope, "[data-fly-target='buy']"),
      sell: queryHtml(documentRef, scope, "[data-fly-target='sell']"),
      portfolio: queryHtml(documentRef, scope, "[data-fly-target='portfolio']"),
      search: queryHtml(documentRef, scope, "[data-fly-target='search']"),
      login: queryHtml(documentRef, scope, "[data-fly-target='login']"),
    };
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
      // Demo defaults to logged-in when attribute omitted (backward compatible).
      return node.dataset.loginState === undefined ? "LOGGED_IN" : "UNKNOWN";
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
        source: "watchlist",
      }));
      if (current && !candidates.some((candidate) => candidate.symbol === current)) {
        candidates.unshift({ symbol: current, source: "current" });
      }
      return candidates;
    },
    readMarketEnvironment: readEnvironment,
    readEnvironment,
    getTargets,
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
  };
};
