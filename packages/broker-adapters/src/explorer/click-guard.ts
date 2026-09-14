import type { Timeframe } from "@fly/core";

export const FORBIDDEN_AUTOMATION_TOKENS = [
  "buy",
  "sell",
  "매수",
  "매도",
  "order",
  "주문",
  "confirm",
  "확인",
  "submit",
  "withdraw",
  "deposit",
  "transfer",
  "출금",
  "입금",
  "전송",
  "leverage",
  "market",
  "max buy",
  "max sell",
] as const;

const TIMEFRAME_LABELS: Record<string, Timeframe> = {
  "15m": "15m",
  "15M": "15m",
  "1h": "1h",
  "1H": "1h",
  "4h": "4h",
  "4H": "4h",
  "1d": "1d",
  "1D": "1d",
};

export type ClickKind =
  "timeframe" | "symbol" | "chart-focus" | "scroll" | "forbidden" | "unknown";

export interface ClickClassification {
  readonly kind: ClickKind;
  readonly allowed: boolean;
  readonly timeframe?: Timeframe;
  readonly reason: string;
}

const normalize = (value: string): string =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

const inOrderContext = (element: Element): boolean => {
  const root = element.closest(
    "form, [class*='order' i], [class*='buySell' i], [class*='trade-form' i]",
  );
  if (!root) return false;
  const text = normalize(root.textContent ?? "");
  return /max buy|max sell|buy btc|sell btc|매수|매도|order/.test(text);
};

export const classifyClickCandidate = (
  element: Element,
): ClickClassification => {
  const text = (element.textContent ?? "").trim();
  const aria = (
    element.getAttribute("aria-label") ??
    element.getAttribute("title") ??
    ""
  ).trim();
  const combined = `${text} ${aria}`.trim();
  const normalized = normalize(combined);

  if (inOrderContext(element) && TIMEFRAME_LABELS[text] === undefined) {
    return {
      kind: "forbidden",
      allowed: false,
      reason: "order-context",
    };
  }

  if (TIMEFRAME_LABELS[text]) {
    return {
      kind: "timeframe",
      allowed: true,
      timeframe: TIMEFRAME_LABELS[text],
      reason: "timeframe-label",
    };
  }

  if (/^[A-Z0-9]{2,10}\s*\/\s*[A-Z]{3,5}$/i.test(text)) {
    return { kind: "symbol", allowed: true, reason: "pair-label" };
  }

  for (const token of FORBIDDEN_AUTOMATION_TOKENS) {
    if (normalized === token || normalized.includes(token)) {
      // Timeframe "1D" must not collide with deposit; already handled above.
      if (token === "confirm" && TIMEFRAME_LABELS[text]) continue;
      return {
        kind: "forbidden",
        allowed: false,
        reason: `token:${token}`,
      };
    }
  }

  if (element.getAttribute("data-fly-explore") === "chart") {
    return { kind: "chart-focus", allowed: true, reason: "chart-focus" };
  }

  return { kind: "unknown", allowed: false, reason: "fail-closed" };
};

export const guardedClick = (element: Element): boolean => {
  const classification = classifyClickCandidate(element);
  if (!classification.allowed) return false;
  if (!(element instanceof HTMLElement)) return false;
  element.click();
  return true;
};
