import { expect, test } from "@playwright/test";
import { launchExtensionContext, popupUrl } from "./extension-harness";

/**
 * Extension load harness. Set RUN_EXTENSION_E2E=1 to enable (headed Chromium).
 * Production builds without E2E_TEST_MODE do not expose __flyE2EForce.
 */
test.describe("extension harness", () => {
  test.skip(
    !process.env.RUN_EXTENSION_E2E,
    "Set RUN_EXTENSION_E2E=1 after E2E_TEST_MODE=1 extension build",
  );

  test("loads unpacked extension and opens popup", async () => {
    test.setTimeout(120_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      expect(harness.extensionId).toMatch(/^[a-p]{32}$/);
      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));
      await expect(popup.locator("body")).toBeVisible();
    } finally {
      await harness.close();
    }
  });

  test("Binance public page mounts Fly shadow root", async () => {
    test.setTimeout(180_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      const page = await harness.newPage();
      await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(8_000);

      const fly = page.locator("#fly-earn-better-root");
      await expect(fly).toBeAttached({ timeout: 30_000 });
      const pe = await fly.evaluate((node) => {
        const shadow = node.shadowRoot;
        const overlay = shadow?.querySelector(".overlay") as HTMLElement | null;
        return {
          hasShadow: Boolean(shadow),
          pointerEvents: overlay
            ? getComputedStyle(overlay).pointerEvents
            : null,
          flyState: shadow
            ?.querySelector(".fly")
            ?.getAttribute("data-fly-state"),
        };
      });
      expect(pe.hasShadow).toBe(true);
      expect(pe.pointerEvents).toBe("none");
    } finally {
      await harness.close();
    }
  });
});
