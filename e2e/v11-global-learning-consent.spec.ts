import { expect, test } from "@playwright/test";
import {
  launchExtensionContext,
  popupUrl,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

test.describe("global learning consent", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("TEST A: first install shows onboarding; continue disabled until choice", async () => {
    test.setTimeout(120_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      await harness.serviceWorker.evaluate(async () => {
        await chrome.storage.local.remove("fly-preferences");
      });
      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));
      await expect(popup.locator("#onboarding")).toBeVisible({
        timeout: 15_000,
      });
      await expect(popup.locator("#main-app")).toBeHidden();
      await expect(popup.locator("#onboarding-continue")).toBeDisabled();
      await expect(popup.locator("#onboarding-contribute")).not.toBeChecked();
      await expect(popup.locator("#onboarding-local")).not.toBeChecked();

      await popup.locator("#onboarding-local").check();
      await expect(popup.locator("#onboarding-continue")).toBeEnabled();
      await popup.locator("#onboarding-continue").click();
      await expect(popup.locator("#main-app")).toBeVisible();
      await expect(popup.locator("#consent-local")).toBeChecked();
    } finally {
      await harness.close();
    }
  });

  test("TEST C: switching contribute → local_only keeps same UI quality", async () => {
    test.setTimeout(120_000);
    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        globalLearningConsent: "contribute",
        locale: "en",
        brainMode: "mock",
      });
      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));
      await expect(popup.locator("#consent-contribute")).toBeChecked({
        timeout: 15_000,
      });
      await popup.locator("#consent-local").check();
      await popup.locator("#save-prefs").click();
      await popup.reload();
      await expect(popup.locator("#consent-local")).toBeChecked();
      await expect(popup.locator("#preset-version")).toBeVisible();
      await expect(popup.locator("#performance")).toBeVisible();
    } finally {
      await harness.close();
    }
  });
});
