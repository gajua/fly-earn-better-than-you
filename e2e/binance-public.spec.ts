import { expect, test } from "@playwright/test";

test.describe("Binance public page live DOM", () => {
  test("detects trade page landmarks without login", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    for (const label of [
      /Reject Additional Cookies/i,
      /Accept Cookies & Continue/i,
      /Accept Cookies/i,
    ]) {
      const button = page.getByRole("button", { name: label });
      try {
        if (await button.first().isVisible({ timeout: 3_000 })) {
          await button.first().click({ timeout: 5_000, force: true });
          break;
        }
      } catch {
        // Cookie banner may be absent.
      }
    }

    await page.waitForTimeout(5_000);

    const probe = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent?.trim() ?? null;
      const leaf = (want: string) =>
        [...document.querySelectorAll("*")].some(
          (node) =>
            node.children.length === 0 &&
            (node.textContent ?? "").trim() === want,
        );
      const buy = leaf("Max Buy") || leaf("Buy");
      const sell = leaf("Max Sell") || leaf("Sell");
      const chart = Boolean(
        document.querySelector(".chart-widget-shell") ||
        document.querySelector("canvas"),
      );
      return {
        path: location.pathname,
        h1,
        buy,
        sell,
        chart,
      };
    });

    expect(probe.path).toContain("/trade/BTC_USDT");
    expect(probe.h1).toMatch(/BTC\s*\/\s*USDT/i);
    expect(probe.chart).toBe(true);
    expect(probe.buy).toBe(true);
    expect(probe.sell).toBe(true);
  });
});
