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
