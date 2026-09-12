import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createDemoBrokerAdapter } from "./demo";
import { findBrokerByUrl } from "./registry";
import { resolveLocator } from "./locator";

const candles = JSON.stringify(
  Array.from({ length: 25 }, (_, index) => ({
    open: 100 + index,
    high: 101 + index,
    low: 99 + index,
    close: 100.5 + index,
    volume: 1000 + index,
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
  })),
);

const FIXTURE = `
<main data-demo-broker
  data-page-kind="trade"
  data-symbol="AAPL"
  data-asset-name="Apple Inc."
  data-price="220"
  data-change-percent="1.2"
  data-quantity="10"
  data-average-price="200"
  data-pnl-amount="200"
  data-pnl-percent="10"
  data-momentum="0.6"
  data-volatility="0.2"
  data-volume-strength="0.7"
  data-login-state="LOGGED_IN"
  data-watchlist="AAPL,NVDA,MSFT"
  data-timeframes="1m,5m,1h,1d"
  data-market-open="true"
  data-tf-1m='${candles}'>
  <button data-fly-target="buy">BUY</button>
  <button data-fly-target="sell">SELL</button>
  <div data-fly-target="chart"></div>
  <div data-fly-target="portfolio"></div>
  <button data-fly-target="login">Login</button>
</main>
`;

describe("demo broker adapter hardening", () => {
  it("classifies trade page and resolves targets with confidence", () => {
    const dom = new JSDOM(FIXTURE, { url: "http://127.0.0.1:5173/" });
    const adapter = createDemoBrokerAdapter(
      "[data-demo-broker]",
      dom.window.document,
    );
    const page = adapter.detectPageContext();
    expect(page.pageKind).toBe("trade");
    expect(page.confidence).toBeGreaterThanOrEqual(0.8);
    const resolved = adapter.resolveTargets();
    expect(resolved.buy?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(resolved.buy?.strategy).toBe("data-fly-target");
  });

  it("reads real demo candles and marks missing timeframe unavailable path", async () => {
    const dom = new JSDOM(FIXTURE, { url: "http://127.0.0.1:5173/" });
    const adapter = createDemoBrokerAdapter(
      "[data-demo-broker]",
      dom.window.document,
    );
    const provider = adapter.getMarketDataProvider();
    expect(provider).not.toBeNull();
    const oneMinute = await provider!.getCandles("demo:demo:AAPL:USD", "1m");
    expect(oneMinute?.length).toBe(25);
    const fiveMinute = await provider!.getCandles("demo:demo:AAPL:USD", "5m");
    expect(fiveMinute).toBeNull();
  });

  it("rejects low-confidence locator strategies", () => {
    const dom = new JSDOM(`<button class="xqztlmna">Nope</button>`);
    const located = resolveLocator(dom.window.document, [
      {
        selector: ".xqztlmna",
        confidence: 0.99,
        strategy: "hashed-class",
      },
    ]);
    expect(located).toBeNull();
  });

  it("maps demo host to registry entry", () => {
    expect(findBrokerByUrl("http://127.0.0.1:5173/")?.id).toBe("demo");
    expect(findBrokerByUrl("https://unknown.example/")).toBeUndefined();
  });
});
