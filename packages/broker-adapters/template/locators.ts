import type { LocatorCandidate } from "../src/locator";

/** TODO: replace with verified live-site locators + confidence evidence. */
export const TODO_BUY_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "todo",
    visibleText: "TODO_BUY_LABEL",
    confidence: 0.5,
  },
];

export const TODO_SELL_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "todo",
    visibleText: "TODO_SELL_LABEL",
    confidence: 0.5,
  },
];

export const TODO_CHART_LOCATORS: readonly LocatorCandidate[] = [
  {
    strategy: "todo",
    selector: "#TODO_CHART_SELECTOR",
    confidence: 0.5,
  },
];
