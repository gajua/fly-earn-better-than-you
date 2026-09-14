export type {
  BrokerAdapter,
  BrokerDefinition,
  BrokerTargets,
  ResolvedBrokerTargets,
} from "./types";
export { rectFromElement, targetsToUiRects } from "./types";
export { createDemoBrokerAdapter, observationFromCandles } from "./demo";
export {
  BROKER_REGISTRY,
  findBrokerByUrl,
  listSupportedBrokers,
} from "./registry";
export {
  LOCATOR_CONFIDENCE_THRESHOLD,
  resolveLocator,
  revalidateTarget,
  type LocatedTarget,
  type LocatorCandidate,
} from "./locator";
export { detectModal } from "./modal";
export {
  classifyDemoPage,
  type BrokerMarketDataProvider,
  type CandleBar,
} from "./page";
export {
  createTradeCanvasBinanceProvider,
  createTradeCanvasBybitProvider,
  createTradeCanvasCoinbaseProvider,
  createTradeCanvasKrakenProvider,
  binanceInstrument,
  bybitInstrument,
  coinbaseInstrument,
  krakenInstrument,
} from "./market-data/tradecanvas/adapter";
export { createUpbitOfficialPublicProvider, upbitInstrument } from "./market-data/upbit/official-public";
export { validateCandleSeries } from "./market-data/candle-validator";
export { extractMarketFeatures } from "./market-data/features";
export { createProviderChain } from "./market-data/provider-chain";
export { BrokerSymbolResolver } from "./shared/symbol-resolver";
export { createBinanceBrokerAdapter } from "./brokers/binance/ui-adapter";
export { createUpbitBrokerAdapter } from "./brokers/upbit/ui-adapter";
export { BROKER_HEALTH } from "./health";
export { scanCandidates } from "./candidate-scanner";
