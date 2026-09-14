import { expect, test } from "@playwright/test";
import {
  forceBrainOutput,
  launchExtensionContext,
  popupUrl,
  readE2EDiagnostics,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);
const UPBIT_URL = "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC";

test.describe("Upbit extension smoke", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("loads extension and mounts Fly on public Upbit", async () => {
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
      await page.goto(UPBIT_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 45_000,
      });

      let diagnostics = null as Awaited<ReturnType<typeof readE2EDiagnostics>>;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await page.waitForTimeout(2_000);
        diagnostics = await readE2EDiagnostics(page);
        if (
          diagnostics?.brokerId === "upbit" &&
          diagnostics.targets?.buy &&
          diagnostics.targets?.sell &&
          diagnostics.targets?.chart
        ) {
          break;
        }
      }

      expect(diagnostics?.brokerId).toBe("upbit");
      expect(diagnostics?.page?.pageKind).toBe("trade");
      expect(diagnostics?.targets?.buy).toBe(true);
      expect(diagnostics?.targets?.sell).toBe(true);
      expect(diagnostics?.targets?.chart).toBe(true);
      expect(diagnostics?.targets?.search).toBe(true);
      expect(diagnostics?.targets?.chartStrategy).toMatch(/iframe|highcharts/i);
      expect(diagnostics?.asset?.price ?? 0).toBeGreaterThan(0);
      expect(diagnostics?.fly?.root).toBe(true);
      expect(diagnostics?.fly?.pointerEvents).toBe("none");
    } finally {
      try {
        await harness.close();
      } catch {
        // ignore
      }
    }
  });

  test("UX: fly can explore chart, scan list, and approach buy/sell", async () => {
    test.setTimeout(240_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "mock",
        tradingMode: "paper",
      });
      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));

      const page = await harness.newPage();
      await page.goto(UPBIT_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 45_000,
      });

      const seen = new Set<string>();
      for (let i = 0; i < 12; i += 1) {
        await page.waitForTimeout(1_500);
        const diag = await readE2EDiagnostics(page);
        if (diag?.fly?.state) seen.add(diag.fly.state);
        if (diag?.output?.state) seen.add(`brain:${diag.output.state}`);
      }

      const forcedStates = [
        "observe_chart",
        "scan_assets",
        "approach_buy",
        "approach_sell",
        "explore",
      ] as const;
      for (const state of forcedStates) {
        await forceBrainOutput(page, {
          state,
          buyDrive: state === "approach_buy" ? 0.9 : 0.1,
          sellDrive: state === "approach_sell" ? 0.9 : 0.1,
          curiosity:
            state === "scan_assets" || state === "observe_chart" ? 0.8 : 0.3,
          danger: 0,
          activity: 0.5,
        });
        let matched = false;
        for (let attempt = 0; attempt < 20; attempt += 1) {
          await page.waitForTimeout(500);
          const diag = await readE2EDiagnostics(page);
          if (diag?.fly?.state === state) {
            matched = true;
            seen.add(state);
            break;
          }
        }
        expect(matched, `fly should reach ${state}`).toBe(true);
      }

      expect(seen.has("observe_chart")).toBe(true);
      expect(seen.has("scan_assets")).toBe(true);
      expect(seen.has("approach_buy")).toBe(true);
      expect(seen.has("approach_sell")).toBe(true);
      expect(seen.has("explore")).toBe(true);

      await forceBrainOutput(page, {
        state: "approach_buy",
        buyDrive: 0.95,
        sellDrive: 0.05,
        curiosity: 0.2,
        danger: 0,
        activity: 0.6,
      });
      await page.waitForTimeout(2_500);
      const bubbleInfo = await page
        .locator("#fly-earn-better-root")
        .evaluate((root) => {
          const bubble = root.shadowRoot?.querySelector(".bubble");
          return {
            text: bubble?.textContent?.trim() ?? "",
            hidden: bubble?.hasAttribute("hidden") ?? true,
          };
        });
      expect(bubbleInfo.hidden).toBe(false);
      expect(bubbleInfo.text.length).toBeGreaterThan(0);
    } finally {
      try {
        await harness.close();
      } catch {
        // ignore
      }
    }
  });
});
