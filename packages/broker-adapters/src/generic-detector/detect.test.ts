import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { detectGenericBrokerPage, isGenericPaperEligible } from "./index";

describe("GenericBrokerDetector", () => {
  it("detects Binance-like Max Buy / Max Sell landmarks", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <h1>BTC/USDT</h1>
        <iframe style="width:600px;height:320px"></iframe>
        <span>Max Buy</span>
        <span>Max Sell</span>
      </body></html>`,
      { url: "https://www.binance.com/en/trade/BTC_USDT" },
    );
    const doc = dom.window.document;
    for (const el of Array.from(doc.querySelectorAll("iframe, span"))) {
      Object.defineProperty(el, "getBoundingClientRect", {
        value: () =>
          el.tagName === "IFRAME"
            ? {
                x: 0,
                y: 0,
                left: 0,
                top: 80,
                width: 600,
                height: 320,
                right: 600,
                bottom: 400,
                toJSON() {},
              }
            : {
                x: 0,
                y: 0,
                left: 40,
                top: 420,
                width: 120,
                height: 40,
                right: 160,
                bottom: 460,
                toJSON() {},
              },
      });
    }
    Object.defineProperty(dom.window, "innerWidth", { value: 1280 });
    Object.defineProperty(dom.window, "innerHeight", { value: 800 });
    const detection = detectGenericBrokerPage(doc);
    expect(detection.buy).toBeTruthy();
    expect(detection.sell).toBeTruthy();
    expect(detection.paperOnly).toBe(true);
  });

  it("detects Upbit-like 매수 / 매도", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <a class="tabB__button">매수</a>
        <a class="tabB__button">매도</a>
        <input placeholder="코인명/심볼검색" />
      </body></html>`,
      { url: "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC" },
    );
    const doc = dom.window.document;
    for (const el of Array.from(doc.querySelectorAll("a, input"))) {
      Object.defineProperty(el, "getBoundingClientRect", {
        value: () => ({
          x: 0,
          y: 0,
          left: 100,
          top: 100,
          width: 120,
          height: 40,
          right: 220,
          bottom: 140,
          toJSON() {},
        }),
      });
    }
    const detection = detectGenericBrokerPage(doc);
    expect(detection.buy?.element.textContent).toContain("매수");
    expect(detection.sell?.element.textContent).toContain("매도");
    expect(detection.search).toBeTruthy();
    expect(detection.symbol).toMatch(/KRW-BTC/i);
  });

  it("marks unknown pages as unsupported", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body><p>hello</p></body></html>`,
    );
    const detection = detectGenericBrokerPage(dom.window.document);
    expect(detection.pageKind).toBe("unknown");
    expect(isGenericPaperEligible(detection)).toBe(false);
  });
});
