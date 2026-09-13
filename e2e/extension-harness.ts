import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const extensionDistPath = path.join(root, "apps/extension/dist");

export interface ExtensionHarness {
  readonly context: BrowserContext;
  readonly extensionId: string;
  readonly serviceWorker: Worker;
  newPage(): Promise<Page>;
  close(): Promise<void>;
}

/**
 * Loads apps/extension/dist as an unpacked Chrome extension.
 * Requires a Chromium build that supports --load-extension (prefer headed).
 */
export const launchExtensionContext = async (options?: {
  readonly headless?: boolean;
  readonly userDataDir?: string;
}): Promise<ExtensionHarness> => {
  const userDataDir =
    options?.userDataDir ??
    path.join(root, "test-results", `ext-profile-${Date.now()}`);
  const headless = options?.headless ?? false;

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      `--disable-extensions-except=${extensionDistPath}`,
      `--load-extension=${extensionDistPath}`,
      "--no-default-browser-check",
    ],
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker", {
      timeout: 30_000,
    });
  }

  const extensionId = new URL(serviceWorker.url()).host;
  return {
    context,
    extensionId,
    serviceWorker,
    newPage: () => context.newPage(),
    close: () => context.close(),
  };
};

export const popupUrl = (extensionId: string): string =>
  `chrome-extension://${extensionId}/popup.html`;
