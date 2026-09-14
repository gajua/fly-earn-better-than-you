import type { AdapterStatus } from "@fly/core";

/** TODO_BROKER_ID: lowercase registry id, e.g. "example". */
export const TODO_BROKER_MANIFEST = {
  id: "TODO_BROKER_ID" as const,
  label: "TODO_BROKER_LABEL",
  domains: ["TODO_DOMAIN.example"] as const,
  status: "PARTIAL" as AdapterStatus,
  marketDataStatus: "NOT_IMPLEMENTED" as const,
  uiStatus: "NOT_IMPLEMENTED" as const,
  fullSupport: false,
  optionalHostPermissions: ["https://TODO_DOMAIN.example/*"] as const,
  contentMatches: ["https://TODO_DOMAIN.example/*"] as const,
};
