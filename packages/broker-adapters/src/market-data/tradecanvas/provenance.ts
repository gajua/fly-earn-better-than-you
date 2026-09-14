/**
 * TradeCanvas market-data reuse provenance.
 *
 * Decision: CODE_REUSE (not npm dependency).
 * Reason: `@tradecanvas/core@1.0.0` unpacks ~3.4MB (full canvas engine) with no
 * adapter-only export path. We adapt MIT-licensed REST kline fetch/parse logic
 * from packages/core/src/realtime/adapters/* behind our MarketDataProvider.
 *
 * Upstream: https://github.com/bonguynvan/tradecanvas
 * Commit: f7bdb2f3603a9dba72bf767343e692c002f0ea79
 * License: MIT (Copyright (c) 2026 TradeCanvas Contributors)
 */

export const TRADECANVAS_UPSTREAM = "bonguynvan/tradecanvas";
export const TRADECANVAS_COMMIT = "f7bdb2f3603a9dba72bf767343e692c002f0ea79";
export const TRADECANVAS_LICENSE = "MIT";
