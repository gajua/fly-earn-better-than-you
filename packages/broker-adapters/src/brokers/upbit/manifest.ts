import type { AdapterStatus } from "@fly/core";

export const UPBIT_MANIFEST = {
  id: "upbit" as const,
  label: "Upbit",
  domains: ["upbit.com", "www.upbit.com"] as const,
  status: "PARTIAL" as AdapterStatus,
  marketDataStatus: "READY" as const,
  uiStatus: "PARTIAL" as const,
  fullSupport: false,
  optionalHostPermissions: [
    "https://www.upbit.com/*",
    "https://upbit.com/*",
    "https://api.upbit.com/*",
  ] as const,
  contentMatches: ["https://www.upbit.com/*", "https://upbit.com/*"] as const,
};
