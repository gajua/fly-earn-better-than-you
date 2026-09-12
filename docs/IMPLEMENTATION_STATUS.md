# Implementation Status

Status reflects executable evidence, not intent.

## DONE

- Extension-first Shadow DOM Fly on local demo broker.
- BrokerRegistry + expanded BrokerAdapter (page context, locator resolve,
  modal detect, market-data provider hook).
- Removal of synthetic multi-timeframe scaling from content evaluation.
- TimeframeObservation provenance (`source`, `candleCount`, `available`);
  unavailable/stale/under-candled frames excluded from aggregation.
- Demo multi-timeframe candles only when explicit `data-tf-*` JSON is present;
  missing TF marked unavailable (not invented).
- ProposalGuard cooldown / same-direction dedupe.
- RiskEngine: sell ownership checks; maxPositionValue includes existing
  instrument exposure; maxTradingCapital includes open exposure + buy.
- PositionCycle BUY/SELL matching with partial exits, weighted averages,
  close, reject after close, re-entry as new cycle.
- Paper fill validation (invalid numerics, sell without position, oversell).
- Mark-to-market helper for open position prices + stale flag.
- Performance: gross/net fields; `benchmarkReturn: null` when unavailable;
  drawdown basis labeled `realized-only`.
- IndexedDB trades + cycles; chrome.storage.local for preferences/lightweight
  positions; TradeRepository abstraction (local-first).
- MutationObserver debounce; history push/replace/popstate re-publish.
- Popup diagnostics for page/targets/timeframe availability.
- MaleCNS pipeline preserved; real-connectome still no Mock fallback.
- Acceptance unit tests for round-trip lifecycle + risk/guard/timeframe honesty.

## PARTIAL

- PageClassifier / PageProfile: demo URL+landmark classifier works; production
  broker profiles not implemented.
- Modal support: basic dialog/aria-modal detection; order-modal targeting
  prefers modal root when visible — limited fixture coverage.
- SPA navigation: history hooks + debounced mutation republish; Chrome
  `webNavigation.onHistoryStateUpdated` not wired.
- iframe / cross-origin frame model: types/context field present; no matching
  child-frame content-script orchestration yet
  (`UNAVAILABLE_CROSS_ORIGIN_FRAME` path not end-to-end).
- Shadow DOM host-page traversal: open-shadow locator traversal not complete;
  extension Fly uses its own open shadow root.
- Live-assist reconciliation / fill confidence: types exist; broker order-history
  verification UI not implemented.
- Candidate scan queue/rate-limit: watchlist read exists; concurrent multi-asset
  MaleCNS scan queue not fully productized.
- Fee/slippage config: supported in risk policy + paper fill; UI defaults remain 0.
- Multi-tab ActiveBrokerSession: tab scan exists; focused-tab arbitration is basic.
- Selector health panel: popup JSON diagnostics; not a full developer panel.

## NOT IMPLEMENTED

- Production broker adapter (Binance/Toss/etc.) with verified live DOM selectors.
- Production public market-data API integration.
- Automatic live order submit / click / form submit.
- Supabase / cloud sync (intentionally optional; no hard dependency).
- Closed-shadow piercing beyond what the platform allows.
- Canvas/WebGL candle OCR.
- Short selling.
- Benchmark return series.

## Honest note on first production adapter

Architecture is hardened so a production adapter can plug into
`BrokerAdapter` + `BrokerMarketDataProvider`. No production DOM/API was
verified in this iteration, so it is **not** marked DONE.
