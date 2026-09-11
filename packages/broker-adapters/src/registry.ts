import type { BrokerDefinition } from "./types";
import { createDemoBrokerAdapter } from "./demo";

/**
 * Registry of supported brokers. Start small; grant optional_host_permissions
 * per broker when the user enables that site.
 */
export const BROKER_REGISTRY: readonly BrokerDefinition[] = [
  {
    id: "demo",
    label: "Local Fly Demo",
    domains: ["127.0.0.1"],
    status: "SUPPORTED",
    optionalHostPermissions: ["http://127.0.0.1:5173/*", "http://127.0.0.1:5174/*"],
    createAdapter: (documentRef) =>
      createDemoBrokerAdapter("[data-demo-broker]", documentRef ?? document),
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
  BROKER_REGISTRY.filter((broker) => broker.status === "SUPPORTED");
