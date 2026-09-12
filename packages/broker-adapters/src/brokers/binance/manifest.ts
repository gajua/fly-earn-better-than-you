import type { AdapterStatus } from "@fly/core";

export const BINANCE_MANIFEST = {
  id: "binance" as const,
  label: "Binance Spot",
  domains: ["binance.com", "www.binance.com"] as const,
  /** UI verified on public trade page 2026-09; portfolio/login remain PARTIAL. */
  status: "PARTIAL" as AdapterStatus,
  marketDataStatus: "READY" as const,
  uiStatus: "PARTIAL" as const,
  fullSupport: false,
  optionalHostPermissions: [
    "https://www.binance.com/*",
    "https://binance.com/*",
    "https://api.binance.com/*",
  ] as const,
  contentMatches: ["https://www.binance.com/*", "https://binance.com/*"] as const,
};
