import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { classifyClickCandidate, guardedClick } from "./click-guard";

const setup = () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  return dom.window.document;
};

const el = (
  documentRef: Document,
  tag: string,
  text: string,
  extra?: string,
): HTMLElement => {
  const node = documentRef.createElement(tag);
  node.textContent = text;
  if (extra) node.className = extra;
  documentRef.body.appendChild(node);
  return node;
};

describe("explorer click guard", () => {
  it("allows timeframe labels and blocks BUY/SELL/order controls", () => {
    const documentRef = setup();
    expect(
      classifyClickCandidate(el(documentRef, "button", "1D")).allowed,
    ).toBe(true);
    expect(classifyClickCandidate(el(documentRef, "button", "4H")).kind).toBe(
      "timeframe",
    );
    expect(
      classifyClickCandidate(el(documentRef, "button", "15m")).timeframe,
    ).toBe("15m");
    expect(
      classifyClickCandidate(el(documentRef, "button", "Buy")).allowed,
    ).toBe(false);
    expect(
      classifyClickCandidate(el(documentRef, "button", "Max Sell")).allowed,
    ).toBe(false);
    expect(
      classifyClickCandidate(el(documentRef, "button", "매수")).allowed,
    ).toBe(false);
    expect(
      classifyClickCandidate(el(documentRef, "button", "Withdraw")).allowed,
    ).toBe(false);
    expect(
      classifyClickCandidate(el(documentRef, "div", "ETH/USDT")).kind,
    ).toBe("symbol");
  });

  it("does not click forbidden nodes", () => {
    const documentRef = setup();
    const buy = el(documentRef, "button", "Buy BTC");
    let clicked = false;
    buy.addEventListener("click", () => {
      clicked = true;
    });
    expect(guardedClick(buy)).toBe(false);
    expect(clicked).toBe(false);
  });

  it("blocks market-order labels inside an order form", () => {
    const documentRef = setup();
    const form = documentRef.createElement("form");
    form.append("Max Buy ");
    const maybe = documentRef.createElement("button");
    maybe.textContent = "Market";
    form.appendChild(maybe);
    documentRef.body.appendChild(form);
    expect(classifyClickCandidate(maybe).allowed).toBe(false);
  });
});
