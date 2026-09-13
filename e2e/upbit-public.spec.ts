import { expect, test } from "@playwright/test";

test.describe("Upbit public page live DOM", () => {
  test("detects exchange landmarks without login", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(5_000);

    const probe = await page.evaluate(() => {
      const buy = [...document.querySelectorAll("a")].some(
        (node) => node.textContent?.trim() === "매수",
      );
      const sell = [...document.querySelectorAll("a")].some(
        (node) => node.textContent?.trim() === "매도",
      );
      const chart = Boolean(document.querySelector(".highcharts-container"));
      const code = new URLSearchParams(location.search).get("code");
      return { buy, sell, chart, code, title: document.title };
    });

    expect(probe.code).toBe("CRIX.UPBIT.KRW-BTC");
    expect(probe.buy).toBe(true);
    expect(probe.sell).toBe(true);
    expect(probe.chart).toBe(true);
  });
});
