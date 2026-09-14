import {
  BUY_VOCABULARY,
  SEARCH_VOCABULARY,
  SELL_VOCABULARY,
  matchesVocabulary,
} from "./vocabulary";
import {
  GENERIC_DETECTOR_CONFIDENCE_THRESHOLD,
  type CandidateTarget,
  type GenericBrokerDetection,
} from "./types";

const visibleText = (element: HTMLElement): string =>
  (
    element.getAttribute("aria-label") ??
    element.getAttribute("placeholder") ??
    element.textContent ??
    ""
  )
    .replace(/\s+/g, " ")
    .trim();

const isVisible = (element: HTMLElement, view: Window): boolean => {
  const style = view.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (style.opacity !== "" && Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const scoreButtonLike = (
  element: HTMLElement,
  vocabulary: readonly string[],
  view: Window,
): CandidateTarget | null => {
  if (!isVisible(element, view)) return null;
  const text = visibleText(element);
  if (!matchesVocabulary(text, vocabulary)) return null;
  const role = element.getAttribute("role");
  const aria = element.getAttribute("aria-label");
  const rect = element.getBoundingClientRect();
  let score = 0.55;
  const reasons: string[] = ["vocab-match"];
  if (element.matches("button, a, [role='button'], [role='tab']")) {
    score += 0.2;
    reasons.push("interactive");
  }
  if (role === "button" || role === "tab") {
    score += 0.05;
    reasons.push("role");
  }
  if (aria) {
    score += 0.05;
    reasons.push("aria");
  }
  if (rect.width >= 60 && rect.height >= 24) {
    score += 0.08;
    reasons.push("size");
  }
  score = Math.min(0.98, score);
  return {
    element,
    confidence: score,
    strategy: "generic-semantic",
    score,
    reasons,
  };
};

const scoreChart = (
  element: HTMLElement,
  view: Window,
): CandidateTarget | null => {
  if (!isVisible(element, view)) return null;
  const rect = element.getBoundingClientRect();
  const area = rect.width * rect.height;
  if (rect.width < 200 || rect.height < 120) return null;
  let score = 0.5;
  const reasons: string[] = ["chart-dimensions"];
  if (element.tagName === "IFRAME" || element.tagName === "CANVAS") {
    score += 0.2;
    reasons.push("canvas-or-iframe");
  }
  if (/chart|highcharts|tradingview/i.test(element.className || "")) {
    score += 0.15;
    reasons.push("chart-class");
  }
  if (area >= 80_000) {
    score += 0.1;
    reasons.push("large-area");
  }
  score = Math.min(0.96, score);
  return {
    element,
    confidence: score,
    strategy: "generic-chart",
    score,
    reasons,
  };
};

const scoreSearch = (
  element: HTMLElement,
  view: Window,
): CandidateTarget | null => {
  if (element.tagName !== "INPUT") return null;
  if (!isVisible(element, view)) return null;
  const text = visibleText(element);
  if (!matchesVocabulary(text, SEARCH_VOCABULARY)) return null;
  return {
    element,
    confidence: 0.88,
    strategy: "generic-search",
    score: 0.88,
    reasons: ["search-vocab"],
  };
};

const pickBest = (
  candidates: readonly CandidateTarget[],
): CandidateTarget | undefined =>
  [...candidates].sort((a, b) => b.score - a.score)[0];

const detectSymbol = (documentRef: Document): string | undefined => {
  const title = documentRef.title;
  const pair = title.match(/\b([A-Z0-9]{2,15}\/[A-Z]{2,10})\b/);
  if (pair?.[1]) return pair[1].replace("/", "");
  const code = documentRef.defaultView?.location.href.match(
    /CRIX\.UPBIT\.(KRW-[A-Z0-9]+)/i,
  );
  if (code?.[1]) return code[1].toUpperCase();
  return undefined;
};

/**
 * DOM semantic GenericBrokerDetector foundation.
 * No deep learning / hosted LLM. Paper-only when confidence is high enough.
 */
export const detectGenericBrokerPage = (
  documentRef: Document = document,
): GenericBrokerDetection => {
  const view = documentRef.defaultView;
  if (!view) {
    return {
      pageKind: "unknown",
      confidence: 0,
      paperOnly: true,
    };
  }

  const interactive = Array.from(
    documentRef.querySelectorAll<HTMLElement>(
      "button, a, [role='button'], [role='tab'], span, div",
    ),
  ).slice(0, 2_500);

  const buys = interactive
    .map((node) => scoreButtonLike(node, BUY_VOCABULARY, view))
    .filter((item): item is CandidateTarget => item !== null);
  const sells = interactive
    .map((node) => scoreButtonLike(node, SELL_VOCABULARY, view))
    .filter((item): item is CandidateTarget => item !== null);

  const chartCandidates = Array.from(
    documentRef.querySelectorAll<HTMLElement>(
      "iframe, canvas, .highcharts-container, [class*='chart']",
    ),
  )
    .map((node) => scoreChart(node, view))
    .filter((item): item is CandidateTarget => item !== null);

  const searchCandidates = Array.from(
    documentRef.querySelectorAll<HTMLElement>("input"),
  )
    .map((node) => scoreSearch(node, view))
    .filter((item): item is CandidateTarget => item !== null);

  const buy = pickBest(buys);
  const sell = pickBest(sells);
  const chart = pickBest(chartCandidates);
  const search = pickBest(searchCandidates);
  const symbol = detectSymbol(documentRef);

  const parts = [
    buy?.confidence ?? 0,
    sell?.confidence ?? 0,
    chart?.confidence ?? 0,
  ];
  const confidence =
    parts.filter((value) => value > 0).length === 0
      ? 0
      : parts.reduce((sum, value) => sum + value, 0) /
        parts.filter((value) => value > 0).length;

  const pageKind =
    buy && sell && confidence >= GENERIC_DETECTOR_CONFIDENCE_THRESHOLD
      ? "trade"
      : buy || sell || chart
        ? "asset-detail"
        : "unknown";

  return {
    pageKind,
    symbol,
    buy,
    sell,
    chart,
    search,
    confidence,
    paperOnly: true,
  };
};

export const isGenericPaperEligible = (
  detection: GenericBrokerDetection,
): boolean =>
  detection.paperOnly &&
  detection.pageKind === "trade" &&
  detection.confidence >= GENERIC_DETECTOR_CONFIDENCE_THRESHOLD &&
  Boolean(detection.buy && detection.sell);
