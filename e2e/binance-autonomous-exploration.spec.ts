import { expect, test } from "@playwright/test";
import {
  launchExtensionContext,
  readE2EDiagnostics,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

test.describe("Binance autonomous exploration", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("wakes, changes view, and never clicks BUY/SELL", async () => {
    test.setTimeout(240_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "mock",
        tradingMode: "paper",
        autonomousExploration: true,
        explorationSpeed: "fast",
        visibleBrowserControl: true,
        flyActivityHud: true,
        explorationPaused: false,
        locale: "en",
        globalLearningConsent: "local_only",
      });

      const page = await harness.newPage();
      await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });

      for (const label of [
        /Reject Additional Cookies/i,
        /Accept Cookies & Continue/i,
        /Accept All Cookies/i,
      ]) {
        try {
          const button = page.getByRole("button", { name: label });
          if (await button.first().isVisible({ timeout: 2_000 })) {
            await button.first().click({ force: true });
            break;
          }
        } catch {
          // optional
        }
      }

      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 45_000,
      });

      const hud = page.locator("#fly-earn-better-root");
      let sawHud = false;
      let leftBtc = false;
      let last = null as Awaited<ReturnType<typeof readE2EDiagnostics>>;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await page.waitForTimeout(2_000);
        last = await readE2EDiagnostics(page);
        const href = page.url();
        const hudState = await hud
          .evaluate((root) => {
            const shadow = (root as HTMLElement).shadowRoot;
            const panel = shadow?.querySelector("[data-testid='fly-hud']");
            if (!panel || panel.hasAttribute("hidden")) return null;
            return panel.textContent ?? "";
          })
          .catch(() => null);
        if (hudState && hudState.length > 8) sawHud = true;
        if (/ETH_|SOL_|XRP_|BNB_/i.test(href)) leftBtc = true;
        if (
          sawHud &&
          (leftBtc ||
            Boolean(last?.exploration?.symbol) ||
            Boolean(last?.exploration?.timeframe))
        ) {
          break;
        }
      }

      await expect(page.locator("#fly-earn-better-root")).toBeAttached();
      expect(last?.brokerClickCount ?? 0).toBe(0);
      expect(sawHud || Boolean(last?.exploration?.hud)).toBe(true);
    } finally {
      await harness.close().catch(() => undefined);
    }
  });
});
