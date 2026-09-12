import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { createBinanceBrokerAdapter } from "./brokers/binance/ui-adapter";
import { createUpbitBrokerAdapter } from "./brokers/upbit/ui-adapter";

describe("Binance UI adapter fixtures", () => {
  it("detects trade page symbol and buy/sell tabs", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <h1>BTC/USDT</h1>
        <div class="chart-widget-shell" style="width:100px;height:100px"></div>
        <div role="tab" class="bn-tab bn-tab__buySell active">Buy</div>
        <div role="tab" class="bn-tab bn-tab__buySell">Sell</div>
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
    expect(targets.buy?.element.textContent?.trim()).toBe("Buy");
    expect(targets.sell?.element.textContent?.trim()).toBe("Sell");
    expect(targets.chart).not.toBeNull();
  });
});

describe("Upbit UI adapter fixtures", () => {
  it("detects exchange code and 매수/매도", () => {
    const dom = new JSDOM(
      `<!doctype html><html><body>
        <a class="tabB__button">매수</a>
        <a class="tabB__button">매도</a>
        <div class="highcharts-container" style="width:100px;height:100px"></div>
        <a>로그인</a>
      </body></html>`,
      { url: "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC" },
    );
    const adapter = createUpbitBrokerAdapter(dom.window.document, {
      marketData: null,
    });
    expect(adapter.detect()).toBe(true);
    expect(adapter.detectPageContext().symbol).toBe("KRW-BTC");
    expect(adapter.resolveTargets().buy?.element.textContent?.trim()).toBe("매수");
    expect(adapter.resolveTargets().sell?.element.textContent?.trim()).toBe("매도");
  });
});
