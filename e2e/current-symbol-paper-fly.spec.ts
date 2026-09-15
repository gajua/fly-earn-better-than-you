import { expect, test } from "@playwright/test";
import {
  forceBrainOutput,
  launchExtensionContext,
  readE2EDiagnostics,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

test.describe("Current-symbol Paper Fly", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("auto Paper BUY/SELL with toasts, no broker clicks", async () => {
    test.setTimeout(240_000);
    const harness = await launchExtensionContext();
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        autonomousExploration: false,
        paperAutoTrade: true,
        tradeNotifications: true,
        flyOverlayEnabled: true,
        brainMode: "mock",
        tradingMode: "paper",
      });

      await harness.context.addInitScript(() => {
        const storageKey = "__flyQaClicks";
        document.addEventListener(
          "click",
          (event) => {
            const text =
              (event.target as HTMLElement | null)?.textContent ?? "";
            if (/Max Buy|Max Sell|^(Buy|Sell)$/i.test(text.trim())) {
              const raw = sessionStorage.getItem(storageKey);
              const prev = raw
                ? (JSON.parse(raw) as { buy: number; sell: number })
                : { buy: 0, sell: 0 };
              if (/buy|매수/i.test(text)) prev.buy += 1;
              if (/sell|매도/i.test(text)) prev.sell += 1;
              sessionStorage.setItem(storageKey, JSON.stringify(prev));
            }
          },
          true,
        );
      });

      const page = await harness.newPage();
      await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });

      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 90_000,
      });
      await expect(page.locator("[data-testid='fly-paper-card']")).toBeAttached(
        {
          timeout: 30_000,
        },
      );

      const diagBefore = await readE2EDiagnostics(page);
      expect(diagBefore?.brokerId).toBe("binance");
      expect(diagBefore?.exploration).toBeNull();

      await forceBrainOutput(page, {
        state: "approach_buy",
        buyDrive: 0.95,
        sellDrive: 0.05,
        curiosity: 0.2,
        danger: 0.05,
        activity: 0.7,
      });
      await page.waitForTimeout(4_000);
      await expect(page.locator("#fly-earn-paper-toast")).toBeVisible({
        timeout: 30_000,
      });

      await forceBrainOutput(page, {
        state: "approach_sell",
        buyDrive: 0.05,
        sellDrive: 0.95,
        curiosity: 0.2,
        danger: 0.05,
        activity: 0.7,
      });
      await page.waitForTimeout(4_000);
      const toastText = await page.locator("#fly-earn-paper-toast").innerText();
      expect(toastText.length).toBeGreaterThan(5);

      const clicks = await page.evaluate(() => {
        const raw = sessionStorage.getItem("__flyQaClicks");
        return raw ? (JSON.parse(raw) as { buy: number; sell: number }) : null;
      });
      expect(clicks?.buy ?? 0).toBe(0);
      expect(clicks?.sell ?? 0).toBe(0);
    } finally {
      await harness.close();
    }
  });
});
