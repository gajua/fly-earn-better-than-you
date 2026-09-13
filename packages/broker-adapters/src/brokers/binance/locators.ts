import type { LocatorCandidate } from "../../locator";

/** Verified on www.binance.com/en/trade/BTC_USDT?type=spot (2026-09-13).
 * Spot order form is a dual Max Buy / Max Sell panel (tabs may be absent).
 */
export const BINANCE_BUY_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "visible-text",
    visibleText: "Max Buy",
    confidence: 0.9,
  },
  {
    strategy: "role-text",
    selector: '[role="tab"].bn-tab__buySell',
    visibleText: "Buy",
    confidence: 0.88,
  },
  {
    strategy: "visible-text",
    visibleText: "Buy",
    confidence: 0.8,
  },
];

export const BINANCE_SELL_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "visible-text",
    visibleText: "Max Sell",
    confidence: 0.9,
  },
  {
    strategy: "role-text",
    selector: '[role="tab"].bn-tab__buySell',
    visibleText: "Sell",
    confidence: 0.88,
  },
  {
    strategy: "visible-text",
    visibleText: "Sell",
    confidence: 0.8,
  },
];

export const BINANCE_CHART_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "css",
    selector: ".chart-widget-shell",
    confidence: 0.92,
  },
];

export const BINANCE_LOGIN_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "css",
    selector: "#toLoginPage",
    confidence: 0.95,
  },
  {
    strategy: "visible-text",
    visibleText: "Log In",
    confidence: 0.8,
  },
];

export const BINANCE_PORTFOLIO_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "visible-text",
    visibleText: "Holdings",
    confidence: 0.8,
  },
];
