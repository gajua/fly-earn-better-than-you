import type { LocatorCandidate } from "../../locator";

/** Verified on www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC (2026-09). */
export const UPBIT_BUY_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "role-text",
    selector: "a.tabB__button",
    visibleText: "매수",
    confidence: 0.92,
  },
  {
    strategy: "visible-text",
    visibleText: "매수",
    confidence: 0.85,
  },
];

export const UPBIT_SELL_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "role-text",
    selector: "a.tabB__button",
    visibleText: "매도",
    confidence: 0.92,
  },
  {
    strategy: "visible-text",
    visibleText: "매도",
    confidence: 0.85,
  },
];

export const UPBIT_CHART_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "css",
    selector: ".highcharts-container",
    confidence: 0.9,
  },
  {
    strategy: "css",
    selector: ".chart-widget-shell",
    confidence: 0.85,
  },
];

export const UPBIT_LOGIN_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "visible-text",
    visibleText: "로그인",
    confidence: 0.85,
  },
];
