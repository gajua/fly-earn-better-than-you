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
  // Extensions require headed Chromium/Chrome; ignore headless requests.
  void options?.headless;

  const channel = process.env.PLAYWRIGHT_CHROME_CHANNEL;
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ...(channel ? { channel } : {}),
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extensionDistPath}`,
      `--load-extension=${extensionDistPath}`,
      "--disable-features=DisableLoadExtensionCommandLineSwitch",
      "--no-default-browser-check",
      "--disable-blink-features=AutomationControlled",
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

export const setExtensionPreferences = async (
  serviceWorker: Worker,
  overrides: Record<string, unknown> = {},
): Promise<void> => {
  await serviceWorker.evaluate(async (prefs) => {
    const defaults = {
      tradingMode: "paper",
      brainMode: "real-connectome",
      brainBaseUrl: "http://127.0.0.1:8000",
      riskPolicy: {
        maxTradingCapital: 1_000_000,
        maxSingleOrderValue: 300_000,
        maxPositionValue: 500_000,
        maxDailyNewExposure: 400_000,
        feeRate: 0,
        slippageBps: 0,
        proposalCooldownMs: 0,
      },
      enabledBrokerIds: ["demo", "binance", "upbit"],
      maxHistoryDays: 90,
      locale: "auto",
      learningEnabled: false,
      learningMinSamples: 30,
      startingPaperCapital: 1_000_000,
    };
    await chrome.storage.local.set({
      "fly-preferences": { ...defaults, ...prefs },
    });
  }, overrides);
};

export const clearPaperState = async (extensionPage: Page): Promise<void> => {
  await extensionPage.evaluate(async () => {
    await chrome.runtime.sendMessage({ kind: "clear-history" });
  });
};

export const readPerformance = async (
  extensionPage: Page,
): Promise<Record<string, unknown>> => {
  return extensionPage.evaluate(async () => {
    return chrome.runtime.sendMessage({ kind: "get-performance" });
  }) as Promise<Record<string, unknown>>;
};

export type E2EDiagnostics = {
  brokerId?: string;
  brainMode?: string;
  brainUnavailable?: boolean;
  dataProviderError?: boolean;
  page?: { pageKind?: string; symbol?: string | null; confidence?: number };
  asset?: { symbol?: string; price?: number } | null;
  targets?: {
    buy?: boolean;
    sell?: boolean;
    chart?: boolean;
    search?: boolean;
    buyText?: string | null;
    sellText?: string | null;
    chartStrategy?: string | null;
    searchStrategy?: string | null;
  };
  observations?: Array<{
    timeframe: string;
    available: boolean;
    candleCount: number;
    source: string;
  }>;
  output?: { state?: string } | null;
  brokerClickCount?: number;
  fly?: {
    root?: boolean;
    shadow?: boolean;
    pointerEvents?: string | null;
    visible?: boolean;
    state?: string | null;
  };
};

export const readE2EDiagnostics = async (
  page: Page,
): Promise<E2EDiagnostics | null> => {
  return page.evaluate(async () => {
    const root = document.documentElement;
    const ready = new Promise<void>((resolve) => {
      const onReady = () => {
        root.removeEventListener("fly-e2e-diag-ready", onReady);
        resolve();
      };
      root.addEventListener("fly-e2e-diag-ready", onReady);
      window.setTimeout(() => {
        root.removeEventListener("fly-e2e-diag-ready", onReady);
        resolve();
      }, 2_000);
    });
    root.dispatchEvent(new CustomEvent("fly-e2e-diag-request"));
    await ready;
    const raw = root.getAttribute("data-fly-e2e-diag");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as E2EDiagnostics;
    } catch {
      return null;
    }
  });
};

export const forceBrainOutput = async (
  page: Page,
  output: {
    state: string;
    buyDrive: number;
    sellDrive: number;
    curiosity: number;
    danger: number;
    activity: number;
  },
): Promise<void> => {
  await page.evaluate((forced) => {
    document.documentElement.dispatchEvent(
      new CustomEvent("fly-e2e-force", { detail: forced }),
    );
  }, output);
};
