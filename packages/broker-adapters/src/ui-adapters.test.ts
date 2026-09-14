import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createBinanceBrokerAdapter } from "./brokers/binance/ui-adapter";
import {
  createUpbitBrokerAdapter,
  readPriceFromTitle,
} from "./brokers/upbit/ui-adapter";

describe("Binance UI adapter fixtures", () => {
  it("detects trade page symbol and Max Buy/Max Sell panels", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <h1>BTC/USDT</h1>
        <div class="chart-widget-shell" style="width:100px;height:100px"></div>
        <span>Max Buy</span>
        <span>Max Sell</span>
        <a id="toLoginPage">Log In</a>
      </body></html>`,
      { url: "https://www.binance.com/en/trade/BTC_USDT?type=spot" },
    );
    const adapter = createBinanceBrokerAdapter(dom.window.document, {
      marketData: null,
    });
    expect(adapter.detect()).toBe(true);
    const page = adapter.detectPageContext();
    expect(page.pageKind).toBe("trade");
    expect(page.symbol).toBe("BTCUSDT");
    const targets = adapter.resolveTargets();
    expect(targets.buy?.element.textContent?.trim()).toBe("Max Buy");
    expect(targets.sell?.element.textContent?.trim()).toBe("Max Sell");
    expect(targets.chart).not.toBeNull();
  });
});

describe("Upbit UI adapter fixtures", () => {
  it("detects exchange code and 매수/매도", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <a class="tabB__button">매수</a>
        <a class="tabB__button">매도</a>
        <iframe style="width:600px;height:320px" title="chart"></iframe>
        <div class="highcharts-container" style="width:140px;height:50px"></div>
        <div style="width:360px;height:500px">
          <input placeholder="코인명/심볼검색" />
        </div>
        <a>로그인</a>
      </body></html>`,
      { url: "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC" },
    );
    // JSDOM layout is zero unless we stub rects.
    const doc = dom.window.document;
    for (const el of Array.from(
      doc.querySelectorAll("iframe, .highcharts-container, div, input"),
    )) {
      Object.defineProperty(el, "getBoundingClientRect", {
        value: () => {
          if (el.tagName === "IFRAME") {
            return {
              x: 0,
              y: 0,
              left: 0,
              top: 100,
              width: 600,
              height: 320,
              right: 600,
              bottom: 420,
              toJSON() {},
            };
          }
          if (el.classList?.contains("highcharts-container")) {
            return {
              x: 0,
              y: 0,
              left: 0,
              top: 0,
              width: 140,
              height: 50,
              right: 140,
              bottom: 50,
              toJSON() {},
            };
          }
          if (el.tagName === "INPUT") {
            return {
              x: 0,
              y: 0,
              left: 1000,
              top: 80,
              width: 300,
              height: 32,
              right: 1300,
              bottom: 112,
              toJSON() {},
            };
          }
          if (el.tagName === "DIV" && el.querySelector("input")) {
            return {
              x: 0,
              y: 0,
              left: 1000,
              top: 80,
              width: 360,
              height: 500,
              right: 1360,
              bottom: 580,
              toJSON() {},
            };
          }
          return {
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            right: 0,
            bottom: 0,
            toJSON() {},
          };
        },
      });
    }
    Object.defineProperty(dom.window, "innerWidth", { value: 1400 });
    Object.defineProperty(dom.window, "innerHeight", { value: 900 });

    const adapter = createUpbitBrokerAdapter(doc, {
      marketData: null,
    });
    expect(adapter.detect()).toBe(true);
    expect(adapter.detectPageContext().symbol).toBe("KRW-BTC");
    expect(adapter.resolveTargets().buy?.element.textContent?.trim()).toBe(
      "매수",
    );
    expect(adapter.resolveTargets().sell?.element.textContent?.trim()).toBe(
      "매도",
    );
    expect(adapter.resolveTargets().chart?.strategy).toBe("upbit-iframe-chart");
    expect(adapter.resolveTargets().search).not.toBeNull();
  });

  it("parses Upbit title price near BTC/KRW", () => {
    const dom = new JSDOM(
      `<!doctype html><html><head><title>▲ 104,623,000 BTC/KRW +0.10% | 비트코인 | 업비트(Upbit)</title></head><body></body></html>`,
    );
    expect(readPriceFromTitle(dom.window.document)).toBe(104623000);
  });
});
