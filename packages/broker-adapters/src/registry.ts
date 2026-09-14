import type { BrokerDefinition } from "./types";
import { createDemoBrokerAdapter } from "./demo";
import { BINANCE_MANIFEST } from "./brokers/binance/manifest";
import { createBinanceBrokerAdapter } from "./brokers/binance/ui-adapter";
import { UPBIT_MANIFEST } from "./brokers/upbit/manifest";
import { createUpbitBrokerAdapter } from "./brokers/upbit/ui-adapter";

/**
 * Registry of brokers.
 * Market-data-ready ≠ Full broker supported.
 */
export const BROKER_REGISTRY: readonly BrokerDefinition[] = [
  {
    id: "demo",
    label: "Local Fly Demo",
    domains: ["127.0.0.1"],
    status: "SUPPORTED",
    optionalHostPermissions: [
      "http://127.0.0.1:5173/*",
      "http://127.0.0.1:5174/*",
    ],
    createAdapter: (documentRef) =>
      createDemoBrokerAdapter("[data-demo-broker]", documentRef ?? document),
  },
  {
    id: BINANCE_MANIFEST.id,
    label: BINANCE_MANIFEST.label,
    domains: [...BINANCE_MANIFEST.domains],
    status: BINANCE_MANIFEST.status,
    optionalHostPermissions: [...BINANCE_MANIFEST.optionalHostPermissions],
    createAdapter: (documentRef) =>
      createBinanceBrokerAdapter(documentRef ?? document),
  },
  {
    id: UPBIT_MANIFEST.id,
    label: UPBIT_MANIFEST.label,
    domains: [...UPBIT_MANIFEST.domains],
    status: UPBIT_MANIFEST.status,
    optionalHostPermissions: [...UPBIT_MANIFEST.optionalHostPermissions],
    createAdapter: (documentRef) =>
      createUpbitBrokerAdapter(documentRef ?? document),
  },
];

export const findBrokerByUrl = (
  url: string,
): BrokerDefinition | undefined => {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return undefined;
  }
  return BROKER_REGISTRY.find((broker) =>
    broker.domains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    ),
  );
};

export const listSupportedBrokers = (): readonly BrokerDefinition[] =>
  BROKER_REGISTRY.filter(
    (broker) => broker.status === "SUPPORTED" || broker.status === "PARTIAL",
  );
