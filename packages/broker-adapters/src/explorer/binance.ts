import {
  DEFAULT_SYMBOL_SEEDS,
  type ExplorerResult,
  type Timeframe,
} from "@fly/core";
import { parseBinanceTradeSymbol } from "../shared/symbol-resolver";
import { classifyClickCandidate, guardedClick } from "./click-guard";
import type { BrokerUIExplorer } from "./types";

const TIMEFRAME_TEXT: Record<Timeframe, readonly string[]> = {
  "1m": ["1m"],
  "5m": ["5m"],
  "15m": ["15m"],
  "1h": ["1h", "1H"],
  "4h": ["4h", "4H"],
  "1d": ["1d", "1D"],
};

const LABEL_TO_TIMEFRAME: Record<string, Timeframe> = {
  "15m": "15m",
  "1h": "1h",
  "1H": "1h",
  "4h": "4h",
  "4H": "4h",
  "1d": "1d",
  "1D": "1d",
};

const toTradePath = (symbol: string): string | null => {
  const normalized = symbol.replace("/", "").replace("_", "").toUpperCase();
  const match = normalized.match(/^([A-Z0-9]+)(USDT|USDC|BTC|ETH)$/);
  if (!match) return null;
  return `${match[1]}_${match[2]}`;
};

const INTERVAL_CHILD = /^(15m|1h|1H|4h|4H|1d|1D)$/;

const parentLooksLikeIntervalRow = (parent: HTMLElement | null): boolean => {
  if (!parent) return false;
  const count = parent.childElementCount;
  if (count < 4 || count > 20) return false;
  const texts = Array.from(parent.children, (child) =>
    (child.textContent ?? "").trim(),
  );
  return (
    texts.includes("15m") &&
    (texts.includes("1h") || texts.includes("1H")) &&
    (texts.includes("4H") || texts.includes("4h")) &&
    (texts.includes("1D") || texts.includes("1d"))
  );
};

const findIntervalRow = (documentRef: Document): HTMLElement | null => {
  const snapshot = documentRef.evaluate(
    "//*[normalize-space()='4H' or normalize-space()='4h']",
    documentRef,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  );
  for (
    let index = 0;
    index < Math.min(snapshot.snapshotLength, 24);
    index += 1
  ) {
    const node = snapshot.snapshotItem(index);
    if (!(node instanceof HTMLElement)) continue;
    let parent = node.parentElement;
    for (let depth = 0; depth < 3 && parent; depth += 1) {
      if (parentLooksLikeIntervalRow(parent)) return parent;
      parent = parent.parentElement;
    }
  }
  return null;
};

const intervalLeaves = (documentRef: Document): HTMLElement[] => {
  const row = findIntervalRow(documentRef);
  if (!row) return [];
  return Array.from(row.children).filter((node): node is HTMLElement => {
    if (!(node instanceof HTMLElement)) return false;
    return INTERVAL_CHILD.test(node.textContent?.trim() ?? "");
  });
};

const clickableLabel = (
  root: HTMLElement,
  labels: readonly string[],
): HTMLElement => {
  const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")];
  const exact = nodes.find(
    (node) =>
      labels.includes(node.textContent?.trim() ?? "") &&
      node.childElementCount === 0,
  );
  return exact ?? root;
};

const isActiveInterval = (element: HTMLElement): boolean => {
  const nodes = [element, ...element.querySelectorAll<HTMLElement>("*")];
  return nodes.some((node) => {
    const className = String(node.className);
    return (
      className.includes("text-PrimaryText") &&
      !className.includes("text-TertiaryText")
    );
  });
};

const waitForActiveTimeframe = async (
  documentRef: Document,
  timeframe: Timeframe,
  timeoutMs = 2_000,
): Promise<boolean> => {
  const started = Date.now();
  const labels = new Set(TIMEFRAME_TEXT[timeframe]);
  const view = documentRef.defaultView;
  while (Date.now() - started < timeoutMs) {
    const active = intervalLeaves(documentRef).find(isActiveInterval);
    const text = active?.textContent?.trim() ?? "";
    if (labels.has(text)) return true;
    await new Promise(
      (resolve) => view?.setTimeout(resolve, 100) ?? resolve(undefined),
    );
  }
  return false;
};

export const createBinanceUiExplorer = (
  documentRef: Document = document,
): BrokerUIExplorer => {
  const getCurrentSymbol = async (): Promise<string | null> => {
    const href = documentRef.defaultView?.location.href ?? "";
    return parseBinanceTradeSymbol(href)?.normalized ?? null;
  };

  return {
    getCurrentSymbol,
    async listVisibleSymbols() {
      return [];
    },
    async navigateToSymbol(symbol) {
      const current = await getCurrentSymbol();
      const normalized = symbol.replace("/", "").replace("_", "").toUpperCase();
      if (current === normalized) {
        return { ok: true, confidence: 1, reason: "already-current" };
      }
      if (!(DEFAULT_SYMBOL_SEEDS as readonly string[]).includes(normalized)) {
        return { ok: false, confidence: 0, reason: "outside-seed-universe" };
      }
      const path = toTradePath(normalized);
      const view = documentRef.defaultView;
      if (!path || !view) {
        return { ok: false, confidence: 0, reason: "unknown-symbol-path" };
      }
      const nextPath = view.location.pathname.replace(
        /\/trade\/[A-Za-z0-9]+_[A-Za-z0-9]+/,
        `/trade/${path}`,
      );
      if (nextPath === view.location.pathname) {
        return { ok: false, confidence: 0, reason: "path-unmatched" };
      }
      const url = new URL(view.location.href);
      url.pathname = nextPath;
      url.searchParams.set("type", "spot");
      view.location.assign(url.toString());
      return { ok: true, confidence: 0.9, reason: "url-assign" };
    },
    async getCurrentTimeframe() {
      const active = intervalLeaves(documentRef).find(isActiveInterval);
      const text = active?.textContent?.trim() ?? "";
      return LABEL_TO_TIMEFRAME[text] ?? null;
    },
    async changeTimeframe(timeframe) {
      const labels = TIMEFRAME_TEXT[timeframe] ?? [];
      const target = intervalLeaves(documentRef).find((element) =>
        labels.includes(element.textContent?.trim() ?? ""),
      );
      if (!target) {
        return { ok: false, confidence: 0, reason: "timeframe-not-found" };
      }
      const clickTarget = clickableLabel(target, labels);
      if (!classifyClickCandidate(clickTarget).allowed) {
        return { ok: false, confidence: 0, reason: "click-blocked" };
      }
      const ok = guardedClick(clickTarget);
      if (!ok) {
        return { ok: false, confidence: 0, reason: "click-blocked" };
      }
      const confirmed = await waitForActiveTimeframe(
        documentRef,
        timeframe,
        4_000,
      );
      return {
        ok: confirmed,
        confidence: confirmed ? 0.9 : 0.4,
        reason: confirmed ? "timeframe-click" : "timeframe-unconfirmed",
      };
    },
    async focusChart() {
      const chart = documentRef.querySelector<HTMLElement>(
        ".chart-widget-shell, [class*='chart']",
      );
      if (!chart) return { ok: false, confidence: 0, reason: "chart-missing" };
      chart.scrollIntoView({ block: "center", inline: "nearest" });
      return { ok: true, confidence: 0.8, reason: "scrolled-chart" };
    },
    async scrollChart() {
      const chart = documentRef.querySelector<HTMLElement>(
        ".chart-widget-shell",
      );
      chart?.scrollBy?.({ top: 12, behavior: "smooth" });
      return { ok: Boolean(chart), confidence: chart ? 0.6 : 0 };
    },
  };
};

export type { BrokerUIExplorer, ExplorerResult };
