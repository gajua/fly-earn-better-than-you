import { expect, test } from "@playwright/test";
import {
  launchExtensionContext,
  readE2EDiagnostics,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

test.describe("Upbit extension QA", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("public Upbit landmarks with extension loaded", async () => {
    test.setTimeout(180_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "mock",
        tradingMode: "paper",
      });
      const page = await harness.newPage();
      await page.goto(
        "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC",
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      await page.waitForTimeout(8_000);

      let diagnostics = null as Awaited<ReturnType<typeof readE2EDiagnostics>>;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await page.waitForTimeout(2_000);
        diagnostics = await readE2EDiagnostics(page);
        if (diagnostics?.brokerId === "upbit" && diagnostics.fly?.root) break;
      }

      // Honest: record whatever actually passed; do not force Paper PASS.
      expect(diagnostics?.brokerId).toBe("upbit");
      expect(diagnostics?.page?.pageKind).toBeTruthy();
      expect(diagnostics?.targets?.buy || diagnostics?.targets?.sell).toBe(
        true,
      );
    } finally {
      await harness.close();
    }
  });
});
