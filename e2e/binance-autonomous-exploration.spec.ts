import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  launchExtensionContext,
  readE2EDiagnostics,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

type SpotView = {
  readonly href: string;
  readonly urlSymbol: string | null;
  readonly activeTimeframe: "15m" | "1h" | "4h" | "1d" | null;
};

type ClickCounts = {
  buy: number;
  sell: number;
  order: number;
};

const dismissCookies = async (page: Page): Promise<void> => {
  for (const label of [
    /Reject Additional Cookies/i,
    /Accept Cookies & Continue/i,
    /Accept All Cookies/i,
    /Accept Cookies/i,
  ]) {
    try {
      const button = page.getByRole("button", { name: label });
      if (await button.first().isVisible({ timeout: 250 })) {
        await button.first().click({ force: true });
        return;
      }
    } catch {
      // banner may be absent or delayed
    }
  }
};

const installClickCounter = async (context: BrowserContext): Promise<void> => {
  await context.addInitScript(() => {
    const storageKey = "__flyQaClicks";
    const root = window as Window & { __flyQaClicks?: ClickCounts };
    const empty = (): ClickCounts => ({ buy: 0, sell: 0, order: 0 });
    const readStored = (): ClickCounts => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return empty();
        const parsed = JSON.parse(raw) as Partial<ClickCounts>;
        return {
          buy: Number(parsed.buy) || 0,
          sell: Number(parsed.sell) || 0,
          order: Number(parsed.order) || 0,
        };
      } catch {
        return empty();
      }
    };
    const persist = (counts: ClickCounts): void => {
      root.__flyQaClicks = counts;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(counts));
      } catch {
        // private mode
      }
    };
    persist(readStored());
    const sampleTimeframe = (): void => {
      const labels: Record<string, string> = {
        "15m": "15m",
        "1h": "1h",
        "1H": "1h",
        "4h": "4h",
        "4H": "4h",
        "1d": "1d",
        "1D": "1d",
      };
      const chart = document.querySelector(".chart-widget-shell");
      let scope: Element | null = chart;
      let active: string | null = null;
      for (let depth = 0; depth < 8 && scope && !active; depth += 1) {
        let inspected = 0;
        for (const el of scope.querySelectorAll("div")) {
          inspected += 1;
          if (inspected > 250) break;
          const count = el.childElementCount;
          if (count < 4 || count > 20) continue;
          const children = Array.from(el.children).filter(
            (node): node is HTMLElement => node instanceof HTMLElement,
          );
          const texts = children.map(
            (child) => child.textContent?.trim() ?? "",
          );
          if (
            !texts.includes("15m") ||
            !(texts.includes("4H") || texts.includes("4h")) ||
            !(texts.includes("1D") || texts.includes("1d")) ||
            !(texts.includes("1h") || texts.includes("1H"))
          ) {
            continue;
          }
          const selected = children.find((child) => {
            const className = `${child.className} ${
              child.querySelector("[class*='PrimaryText']")?.className ?? ""
            }`;
            return (
              String(className).includes("text-PrimaryText") &&
              !String(className).includes("text-TertiaryText") &&
              Boolean(labels[child.textContent?.trim() ?? ""])
            );
          });
          const text = selected?.textContent?.trim() ?? "";
          active = labels[text] ?? null;
          break;
        }
        scope = scope.parentElement;
      }
      try {
        sessionStorage.setItem("__flyQaTf", active ?? "");
      } catch {
        // private mode
      }
    };
    sampleTimeframe();
    window.setInterval(sampleTimeframe, 500);
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target as Element | null;
        const text = (target?.textContent ?? "").trim();
        if (/^(15m|1h|1H|4h|4H|1d|1D)$/.test(text)) return;
        const aria = (
          target?.getAttribute("aria-label") ??
          target?.getAttribute("title") ??
          ""
        ).toLowerCase();
        const normalized = `${text} ${aria}`.toLowerCase();
        const counts = root.__flyQaClicks ?? empty();
        if (/\bmax buy\b|(^|\s)buy(\s|$)|매수/.test(normalized)) {
          counts.buy += 1;
        }
        if (/\bmax sell\b|(^|\s)sell(\s|$)|매도/.test(normalized)) {
          counts.sell += 1;
        }
        if (
          /\border\b|\bsubmit\b|\bconfirm\b|주문|확인/.test(normalized) &&
          !/cookie/i.test(normalized)
        ) {
          counts.order += 1;
        }
        persist(counts);
      },
      true,
    );
  });
};

const symbolFromHref = (href: string): string | null => {
  const match = href.match(/\/trade\/([A-Za-z0-9]+)_([A-Za-z0-9]+)/i);
  return match ? `${match[1]}${match[2]}`.toUpperCase() : null;
};

let tfReadInFlight = false;

const readSpotView = async (page: Page): Promise<SpotView> => {
  const href = page.url();
  let activeTimeframe: SpotView["activeTimeframe"] = null;
  if (!page.isClosed() && !tfReadInFlight) {
    tfReadInFlight = true;
    const raw = await Promise.race([
      page
        .evaluate(() => {
          try {
            return sessionStorage.getItem("__flyQaTf");
          } catch {
            return null;
          }
        })
        .catch(() => null)
        .finally(() => {
          tfReadInFlight = false;
        }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 400);
      }),
    ]);
    if (raw === "15m" || raw === "1h" || raw === "4h" || raw === "1d") {
      activeTimeframe = raw;
    }
  }
  return {
    href,
    urlSymbol: symbolFromHref(href),
    activeTimeframe,
  };
};

const readClicks = async (page: Page): Promise<ClickCounts> => {
  const empty = { buy: 0, sell: 0, order: 0 };
  if (page.isClosed()) return empty;
  const counts = await Promise.race([
    page
      .evaluate(() => {
        const fallback = { buy: 0, sell: 0, order: 0 };
        const live = (window as Window & { __flyQaClicks?: ClickCounts })
          .__flyQaClicks;
        if (live) return live;
        try {
          const raw = sessionStorage.getItem("__flyQaClicks");
          return raw ? (JSON.parse(raw) as ClickCounts) : fallback;
        } catch {
          return fallback;
        }
      })
      .catch(() => empty),
    new Promise<ClickCounts>((resolve) => {
      setTimeout(() => resolve(empty), 800);
    }),
  ]);
  return counts;
};

test.describe("Binance autonomous exploration", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with a packed extension dist");

  test("strict: URL symbols and DOM timeframes, never BUY/SELL", async () => {
    test.setTimeout(540_000);
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

      await installClickCounter(harness.context);
      const page = await harness.newPage();
      await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      expect(symbolFromHref(page.url()), "BTCUSDT confirmed").toBe("BTCUSDT");
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await dismissCookies(page);
        await page.waitForTimeout(500);
      }
      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 45_000,
      });
      const first = await readSpotView(page);
      const urlSymbols = new Set<string>(["BTCUSDT"]);
      if (first.urlSymbol) urlSymbols.add(first.urlSymbol);
      const timeframes = new Set<string>();
      page.on("framenavigated", (frame) => {
        if (frame !== page.mainFrame()) return;
        const symbol = symbolFromHref(frame.url());
        if (symbol) urlSymbols.add(symbol);
      });
      let previousSymbol: string | null = first.urlSymbol;
      let previousTimeframe: string | null = first.activeTimeframe;
      let successfulTimeframeChanges = 0;
      const deadline = Date.now() + 240_000;

      while (Date.now() < deadline) {
        if (
          await page
            .getByText(/Reject Additional Cookies/i)
            .first()
            .isVisible({ timeout: 200 })
            .catch(() => false)
        ) {
          await dismissCookies(page);
        }
        const view = await readSpotView(page).catch(() => null);
        if (view?.urlSymbol) urlSymbols.add(view.urlSymbol);
        if (view?.activeTimeframe) {
          timeframes.add(view.activeTimeframe);
          if (
            previousSymbol &&
            view.urlSymbol === previousSymbol &&
            previousTimeframe &&
            view.activeTimeframe !== previousTimeframe
          ) {
            successfulTimeframeChanges += 1;
          }
          previousTimeframe = view.activeTimeframe;
        }
        if (view?.urlSymbol) previousSymbol = view.urlSymbol;
        if (
          urlSymbols.has("BTCUSDT") &&
          urlSymbols.has("ETHUSDT") &&
          urlSymbols.has("SOLUSDT") &&
          timeframes.has("1d") &&
          timeframes.has("4h") &&
          timeframes.has("1h") &&
          successfulTimeframeChanges >= 3
        ) {
          break;
        }
        await page.waitForTimeout(1_000);
      }

      const clicks = await readClicks(page);

      expect(urlSymbols.has("BTCUSDT"), "BTCUSDT confirmed").toBe(true);
      expect(
        urlSymbols.has("ETHUSDT"),
        `ETHUSDT confirmed; visited=${[...urlSymbols].join(",")}`,
      ).toBe(true);
      expect(
        urlSymbols.has("SOLUSDT"),
        `SOLUSDT confirmed; visited=${[...urlSymbols].join(",")}`,
      ).toBe(true);
      expect(timeframes.has("1d"), "1d confirmed").toBe(true);
      expect(timeframes.has("4h"), "4h confirmed").toBe(true);
      expect(timeframes.has("1h"), "1h confirmed").toBe(true);
      expect(
        urlSymbols.size,
        `visited symbols via page.url(): ${[...urlSymbols].join(",")}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        successfulTimeframeChanges,
        `same-symbol active interval DOM changes; seen=${[...timeframes].join(",")}`,
      ).toBeGreaterThanOrEqual(3);
      expect(clicks.buy, "BUY clicks").toBe(0);
      expect(clicks.sell, "SELL clicks").toBe(0);
      expect(clicks.order, "order submit clicks").toBe(0);
    } finally {
      await harness.close().catch(() => undefined);
    }
  });

  test("MaleCNS real-connectome smoke on Binance public Spot", async () => {
    test.setTimeout(180_000);
    const health = await fetch("http://127.0.0.1:8000/health")
      .then((response) => response.json())
      .catch(() => null);
    test.skip(
      health?.status !== "ok" || health?.connectomeLoaded !== true,
      "MaleCNS localhost:8000 unavailable",
    );

    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "real-connectome",
        tradingMode: "paper",
        autonomousExploration: true,
        explorationSpeed: "fast",
        visibleBrowserControl: true,
        flyActivityHud: true,
        explorationPaused: false,
        locale: "en",
        globalLearningConsent: "local_only",
      });
      await installClickCounter(harness.context);
      const page = await harness.newPage();
      await page.goto("https://www.binance.com/en/trade/BTC_USDT?type=spot", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await dismissCookies(page);
      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 45_000,
      });
      await page.waitForTimeout(12_000);
      const view = await readSpotView(page);
      expect(view.urlSymbol, "BTCUSDT confirmed").toBe("BTCUSDT");
      expect(view.href).toContain("/trade/BTC_USDT");
      const diag = await readE2EDiagnostics(page);
      expect(diag?.brainMode, "MaleCNS mode").toBe("real-connectome");
      expect(diag?.brainUnavailable, "MaleCNS hard-fail closed").toBeFalsy();
      const clicks = await readClicks(page);
      expect(clicks.buy, "BUY clicks").toBe(0);
      expect(clicks.sell, "SELL clicks").toBe(0);
      expect(clicks.order, "order submit clicks").toBe(0);
    } finally {
      await harness.close().catch(() => undefined);
    }
  });
});
