import { expect, test } from "@playwright/test";
import {
  launchExtensionContext,
  popupUrl,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

test.describe("extension smoke on Binance", () => {
  test.skip(!enabled, "RUN_EXTENSION_E2E=1 required");

  test("loads extension id, popup, and content script on Binance", async () => {
    test.setTimeout(180_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      expect(harness.extensionId).toMatch(/^[a-p]{32}$/);
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "mock",
        tradingMode: "paper",
      });

      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));
      await expect(popup.locator("body")).toBeVisible();

      const page = await harness.newPage();
      await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForTimeout(10_000);

      const info = await page.evaluate(() => ({
        href: location.href,
        title: document.title,
        hasRoot: Boolean(document.getElementById("fly-earn-better-root")),
        readyState: document.readyState,
        bodyTextLen: document.body?.innerText?.length ?? 0,
      }));

      // Fail closed with diagnostics rather than inventing Fly mount PASS.
      expect(info.href).toContain("/trade/BTC_USDT");
      expect(info.bodyTextLen).toBeGreaterThan(100);
      expect(info.hasRoot).toBe(true);
    } finally {
      try {
        await harness.close();
      } catch {
        // Ignore teardown ENOENT from Playwright artifact races.
      }
    }
  });
});
