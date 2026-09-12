export type LayerHealth = "HEALTHY" | "DEGRADED" | "BROKEN" | "NOT_IMPLEMENTED";

export interface BrokerHealth {
  readonly brokerId: string;
  readonly ui: LayerHealth;
  readonly market: LayerHealth;
  /** True only when both UI and market are verified enough for full support. */
  readonly fullSupport: boolean;
}

export const BROKER_HEALTH: readonly BrokerHealth[] = [
  {
    brokerId: "demo",
    ui: "HEALTHY",
    market: "HEALTHY",
    fullSupport: true,
  },
  {
    brokerId: "binance",
    ui: "DEGRADED",
    market: "HEALTHY",
    fullSupport: false,
  },
  {
    brokerId: "upbit",
    ui: "DEGRADED",
    market: "HEALTHY",
    fullSupport: false,
  },
  {
    brokerId: "bybit",
    ui: "NOT_IMPLEMENTED",
    market: "HEALTHY",
    fullSupport: false,
  },
  {
    brokerId: "kraken",
    ui: "NOT_IMPLEMENTED",
    market: "HEALTHY",
    fullSupport: false,
  },
  {
    brokerId: "coinbase",
    ui: "NOT_IMPLEMENTED",
    market: "HEALTHY",
    fullSupport: false,
  },
];
