import { expect, test } from "@playwright/test";
import {
  launchExtensionContext,
  popupUrl,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

test.describe("v1.1 popup persistence", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("language, learning, and performance settings persist", async () => {
    test.setTimeout(120_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "mock",
        tradingMode: "paper",
        locale: "en",
        learningEnabled: false,
      });

      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));
      await expect(popup.locator("#locale")).toBeVisible({ timeout: 15_000 });

      await popup.locator("#locale").selectOption("ko");
      await popup.locator("#learning-enabled").check();
      await popup.locator("#save-prefs").click();
      await expect(popup.locator("#status-message")).toContainText(
        /저장|saved/i,
      );

      await popup.reload();
      await expect(popup.locator("#locale")).toHaveValue("ko");
      await expect(popup.locator("#learning-enabled")).toBeChecked();
      await expect(popup.locator("body")).toContainText("학습");
      await expect(popup.locator("#performance")).toBeVisible();

      popup.once("dialog", (dialog) => void dialog.accept());
      await popup.locator("#reset-learning").click();
      await expect(popup.locator("#learning-samples")).toHaveText("0");
    } finally {
      try {
        await harness.close();
      } catch {
        // ignore
      }
    }
  });
});
