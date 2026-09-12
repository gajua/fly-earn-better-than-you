/**
 * Independent TradingView-style chart reader helpers.
 * Ideas observed from suave-tech/extension-trade-assistant (REFERENCE ONLY —
 * no license confirmed, no source copied).
 *
 * NEVER invent OHLCV from canvas pixels.
 */

export interface TradingViewChartPresence {
  readonly present: boolean;
  readonly container?: Element;
  readonly rect?: DOMRect;
}

export const detectTradingViewLikeChart = (
  documentRef: Document,
): TradingViewChartPresence => {
  const container =
    documentRef.querySelector(".chart-widget-shell") ??
    documentRef.querySelector(".chart-container") ??
    documentRef.querySelector("#tv_chart_container") ??
    documentRef.querySelector("[class*='tradingview']") ??
    documentRef.querySelector(".highcharts-container");
  if (!container) return { present: false };
  const rect = container.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) {
    return { present: true, container };
  }
  return { present: true, container, rect };
};

export const readVisibleSymbolFallback = (
  documentRef: Document,
): string | null => {
  const h1 = documentRef.querySelector("h1")?.textContent?.trim();
  if (h1 && /[A-Z0-9]+[\\/\\-][A-Z0-9]+/i.test(h1)) {
    return h1.split(/\s+/)[0] ?? null;
  }
  return null;
};

export const readActiveTimeframeLabel = (
  documentRef: Document,
): string | null => {
  const active =
    documentRef.querySelector(
      "[class*='interval'][class*='active'], button[aria-pressed='true']",
    ) ??
    documentRef.querySelector(".bn-tab.active.chart, .bn-tab__default.active");
  const text = active?.textContent?.trim();
  return text || null;
};
