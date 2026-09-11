import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { createDemoBrokerAdapter } from "./demo";
import { findBrokerByUrl } from "./registry";

const FIXTURE = `
<main data-demo-broker
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
  data-market-open="true">
  <button data-fly-target="buy">BUY</button>
  <button data-fly-target="sell">SELL</button>
  <div data-fly-target="chart"></div>
  <div data-fly-target="portfolio"></div>
  <button data-fly-target="login">Login</button>
</main>
`;

describe("demo broker adapter", () => {
  it("detects login, targets, and watchlist from explicit fixtures", () => {
    const dom = new JSDOM(FIXTURE, { url: "http://127.0.0.1:5173/" });
    const adapter = createDemoBrokerAdapter(
      "[data-demo-broker]",
      dom.window.document,
    );
    expect(adapter.detect()).toBe(true);
    expect(adapter.detectLoginState()).toBe("LOGGED_IN");
    expect(adapter.getTargets().buy?.textContent).toBe("BUY");
    expect(adapter.readWatchlist().map((item) => item.symbol)).toEqual([
      "AAPL",
      "NVDA",
      "MSFT",
    ]);
    const environment = adapter.readMarketEnvironment();
    expect(environment?.asset?.symbol).toBe("AAPL");
    expect(environment?.ui.buy).toBeDefined();
  });

  it("returns LOGGED_OUT without inventing selectors", () => {
    const dom = new JSDOM(
      `<main data-demo-broker data-login-state="LOGGED_OUT" data-symbol="AAPL"></main>`,
    );
    const adapter = createDemoBrokerAdapter(
      "[data-demo-broker]",
      dom.window.document,
    );
    expect(adapter.detectLoginState()).toBe("LOGGED_OUT");
    expect(adapter.getTargets().buy).toBeUndefined();
  });

  it("maps demo host to registry entry", () => {
    expect(findBrokerByUrl("http://127.0.0.1:5173/")?.id).toBe("demo");
    expect(findBrokerByUrl("https://unknown.example/") ).toBeUndefined();
  });
});
