import type {
  BrokerPageContext,
  BrokerPageKind,
  LoginState,
  Timeframe,
  TimeframeObservation,
} from "@fly/core";
import { detectModal } from "./modal";
import { extractMarketFeatures } from "./market-data/features";
import type {
  BrokerMarketDataProvider,
  CandleBar,
} from "./market-data/types";

export type { BrokerMarketDataProvider, CandleBar };

export const classifyDemoPage = (
  documentRef: Document,
  brokerId: string,
  url: string,
  loginState: LoginState,
  instrumentId?: string,
): BrokerPageContext => {
  const root = documentRef.querySelector<HTMLElement>("[data-demo-broker]");
  const explicit = root?.dataset.pageKind as BrokerPageKind | undefined;
  let pageKind: BrokerPageKind = "unknown";
  let confidence = 0.4;

  const hasTrade =
    Boolean(root?.querySelector("[data-fly-target='buy']")) &&
    Boolean(root?.querySelector("[data-fly-target='sell']"));
  const hasPortfolio = Boolean(
    root?.querySelector("[data-fly-target='portfolio']"),
  );
  const hasLogin = Boolean(root?.querySelector("[data-fly-target='login']"));

  if (explicit && explicit !== "unknown") {
    pageKind = explicit;
    confidence = 0.95;
  } else if (loginState !== "LOGGED_IN" && hasLogin) {
    pageKind = "login";
    confidence = 0.9;
  } else if (hasTrade) {
    pageKind = "trade";
    confidence = 0.88;
  } else if (hasPortfolio) {
    pageKind = "portfolio";
    confidence = 0.84;
  } else if (/portfolio/i.test(url)) {
    pageKind = "portfolio";
    confidence = 0.7;
  } else if (/login/i.test(url)) {
    pageKind = "login";
    confidence = 0.7;
  }

  return {
    brokerId,
    url,
    pageKind,
    symbol: root?.dataset.symbol,
    instrumentId,
    loginState,
    modal: detectModal(documentRef),
    confidence,
    detectedAt: new Date().toISOString(),
  };
};

export const observationFromCandles = (input: {
  symbol: string;
  instrumentId: string;
  timeframe: Timeframe;
  candles: CandleBar[];
  source: TimeframeObservation["source"];
  dataProvider?: TimeframeObservation["dataProvider"];
  now?: number;
}): TimeframeObservation =>
  extractMarketFeatures({
    symbol: input.symbol,
    instrumentId: input.instrumentId,
    timeframe: input.timeframe,
    candles: input.candles,
    source: input.source,
    dataProvider: input.dataProvider,
    now: input.now,
  });
