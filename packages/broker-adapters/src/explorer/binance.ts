import type { ExplorerResult, Timeframe } from "@fly/core";
import { parseBinanceTradeSymbol } from "../shared/symbol-resolver";
import { classifyClickCandidate, guardedClick } from "./click-guard";
import type { BrokerUIExplorer } from "./types";

const TIMEFRAME_TEXT: Record<Timeframe, readonly string[]> = {
  "1m": ["1m"],
  "5m": ["5m"],
  "15m": ["15m"],
  "1h": ["1h", "1H"],
  "4h": ["4h", "4H"],
  "1d": ["1D", "1d"],
};

const toTradePath = (symbol: string): string | null => {
  const normalized = symbol.replace("/", "").replace("_", "").toUpperCase();
  const match = normalized.match(/^([A-Z0-9]+)(USDT|USDC|BTC|ETH)$/);
  if (!match) return null;
  return `${match[1]}_${match[2]}`;
};

const visibleClickables = (documentRef: Document): HTMLElement[] =>
  Array.from(
    documentRef.querySelectorAll<HTMLElement>("button, a, div, span, li"),
  ).filter((element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.top < 900
    );
  });

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
      const labels = visibleClickables(documentRef)
        .map((element) => element.textContent?.trim() ?? "")
        .filter((text) => /^[A-Z0-9]{2,10}\/[A-Z]{3,5}$/i.test(text))
        .map((text) => text.replace("/", "").toUpperCase());
      return [...new Set(labels)].slice(0, 12);
    },
    async navigateToSymbol(symbol) {
      const current = await getCurrentSymbol();
      if (current === symbol.replace("/", "").replace("_", "").toUpperCase()) {
        return { ok: true, confidence: 1, reason: "already-current" };
      }
      const pair = symbol.includes("/")
        ? symbol
        : symbol.replace(/USDT$/, "/USDT");
      const listed = visibleClickables(documentRef).find((element) => {
        const text = element.textContent?.trim() ?? "";
        return text.replace(/\s/g, "").toUpperCase() === pair.toUpperCase();
      });
      if (listed && classifyClickCandidate(listed).allowed) {
        const ok = guardedClick(listed);
        return {
          ok,
          confidence: ok ? 0.86 : 0,
          reason: ok ? "visible-pair" : "click-blocked",
        };
      }
      const path = toTradePath(symbol);
      const view = documentRef.defaultView;
      if (!path || !view) {
        return { ok: false, confidence: 0, reason: "unknown-symbol-path" };
      }
      const url = new URL(view.location.href);
      url.pathname = url.pathname.replace(
        /\/trade\/[A-Za-z0-9]+_[A-Za-z0-9]+/,
        `/trade/${path}`,
      );
      url.searchParams.set("type", "spot");
      view.location.assign(url.toString());
      return { ok: true, confidence: 0.7, reason: "url-assign" };
    },
    async getCurrentTimeframe() {
      const active = visibleClickables(documentRef).find((element) => {
        const selected =
          element.getAttribute("aria-selected") === "true" ||
          /active|selected/i.test(element.className);
        return selected && classifyClickCandidate(element).kind === "timeframe";
      });
      const classified = active ? classifyClickCandidate(active) : null;
      return classified?.timeframe ?? null;
    },
    async changeTimeframe(timeframe) {
      const labels = TIMEFRAME_TEXT[timeframe] ?? [];
      const target = visibleClickables(documentRef).find((element) => {
        const text = element.textContent?.trim() ?? "";
        return labels.includes(text) && classifyClickCandidate(element).allowed;
      });
      if (!target) {
        return { ok: false, confidence: 0, reason: "timeframe-not-found" };
      }
      const ok = guardedClick(target);
      return {
        ok,
        confidence: ok ? 0.84 : 0,
        reason: ok ? "timeframe-click" : "click-blocked",
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
