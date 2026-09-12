import type {
  BrokerPageContext,
  BrokerPageKind,
  LoginState,
  Timeframe,
  TimeframeObservation,
} from "@fly/core";
import { detectModal } from "./modal";

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

export interface CandleBar {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly timestamp: string;
}

export interface BrokerMarketDataProvider {
  readonly id: string;
  getCandles(
    instrumentId: string,
    timeframe: Timeframe,
  ): Promise<CandleBar[] | null>;
}

export const observationFromCandles = (input: {
  symbol: string;
  instrumentId: string;
  timeframe: Timeframe;
  candles: CandleBar[];
  source: TimeframeObservation["source"];
  now?: number;
}): TimeframeObservation => {
  const candles = input.candles;
  const latest = candles.at(-1);
  const first = candles[0];
  const available = Boolean(latest && first && candles.length > 0);
  const closes = candles.map((candle) => candle.close);
  const returns = closes.slice(1).map((close, index) => {
    const previous = closes[index]!;
    return previous === 0 ? 0 : (close - previous) / previous;
  });
  const momentum =
    returns.length === 0
      ? 0
      : returns.slice(-5).reduce((sum, value) => sum + value, 0) /
        Math.min(5, returns.length);
  const mean =
    returns.reduce((sum, value) => sum + value, 0) / Math.max(1, returns.length);
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, returns.length);
  const volumeStrength =
    candles.length === 0
      ? 0.5
      : Math.min(
          1,
          candles.slice(-5).reduce((sum, candle) => sum + candle.volume, 0) /
            Math.max(
              1,
              candles.reduce((sum, candle) => sum + candle.volume, 0) /
                candles.length,
            ) /
            5,
        );

  const observedAt = latest?.timestamp ?? new Date(input.now ?? Date.now()).toISOString();
  return {
    symbol: input.symbol,
    instrumentId: input.instrumentId,
    timeframe: input.timeframe,
    price: latest?.close ?? 0,
    returnPercent:
      first && latest && first.close !== 0
        ? ((latest.close - first.close) / first.close) * 100
        : 0,
    momentum,
    volatility: Math.sqrt(Math.max(0, variance)),
    volumeStrength,
    timestamp: observedAt,
    observedAt,
    source: input.source,
    candleCount: candles.length,
    available,
  };
};
