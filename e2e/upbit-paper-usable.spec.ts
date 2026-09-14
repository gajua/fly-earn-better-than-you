import { expect, test } from "@playwright/test";
import {
  clearPaperState,
  forceBrainOutput,
  launchExtensionContext,
  popupUrl,
  readE2EDiagnostics,
  readPerformance,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);
const UPBIT_URL = "https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC";

test.describe("Upbit usable Paper path", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("extension Paper BUY/SELL on public Upbit with real-connectome", async () => {
    test.setTimeout(300_000);

    const health = await fetch("http://127.0.0.1:8000/health")
      .then((response) => response.json())
      .catch(() => null);
    expect(health?.status).toBe("ok");
    expect(health?.dataset).toBe("male-cns:v1.0");
    expect(health?.connectomeLoaded).toBe(true);

    const harness = await launchExtensionContext({ headless: false });
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        brainMode: "real-connectome",
        tradingMode: "paper",
      });

      const popup = await harness.newPage();
      await popup.goto(popupUrl(harness.extensionId));
      await clearPaperState(popup);

      const page = await harness.newPage();
      await page.goto(UPBIT_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(5_000);

      await expect(page.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 45_000,
      });

      let diagnostics = null as Awaited<ReturnType<typeof readE2EDiagnostics>>;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await page.waitForTimeout(2_000);
        diagnostics = await readE2EDiagnostics(page);
        const usable = diagnostics?.observations?.some(
          (item) => item.available && item.candleCount > 0,
        );
        if (
          diagnostics?.brokerId === "upbit" &&
          diagnostics.page?.pageKind === "trade" &&
          diagnostics.targets?.buy &&
          diagnostics.targets?.sell &&
          diagnostics.targets?.chart &&
          usable &&
          diagnostics.brainUnavailable === false &&
          diagnostics.fly?.shadow &&
          diagnostics.fly.pointerEvents === "none"
        ) {
          break;
        }
      }

      expect(diagnostics?.brokerId).toBe("upbit");
      expect(diagnostics?.brainMode).toBe("real-connectome");
      expect(diagnostics?.page?.pageKind).toBe("trade");
      expect(diagnostics?.page?.symbol ?? diagnostics?.asset?.symbol).toMatch(
        /KRW-BTC/i,
      );
      expect(diagnostics?.targets?.buy).toBe(true);
      expect(diagnostics?.targets?.sell).toBe(true);
      expect(diagnostics?.targets?.chart).toBe(true);
      expect(diagnostics?.fly?.root).toBe(true);
      expect(diagnostics?.fly?.shadow).toBe(true);
      expect(diagnostics?.fly?.pointerEvents).toBe("none");
      expect(diagnostics?.fly?.visible).toBe(true);
      expect(diagnostics?.brainUnavailable).toBe(false);
      expect(diagnostics?.dataProviderError).toBe(false);

      const usableObs = (diagnostics?.observations ?? []).filter(
        (item) => item.available && item.candleCount > 0,
      );
      expect(usableObs.length).toBeGreaterThan(0);
      expect(
        usableObs.every(
          (item) =>
            item.source === "official-public" ||
            item.source === "broker-public-api" ||
            item.source === "broker-dom" ||
            item.source === "tradecanvas" ||
            item.source === "demo",
        ),
      ).toBe(true);

      const clicksBefore = diagnostics?.brokerClickCount ?? 0;

      await forceBrainOutput(page, {
        state: "approach_buy",
        buyDrive: 0.95,
        sellDrive: 0.05,
        curiosity: 0.2,
        danger: 0,
        activity: 0.6,
      });

      let buyPerf = null as Awaited<ReturnType<typeof readPerformance>> | null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await page.waitForTimeout(1_500);
        buyPerf = await readPerformance(popup);
        const paper = buyPerf?.paper as { totalTrades?: number } | undefined;
        const exposure = buyPerf?.exposure as
          { positions?: unknown[]; cycles?: unknown[] } | undefined;
        if (
          (paper?.totalTrades ?? 0) >= 1 &&
          (exposure?.positions?.length ?? 0) >= 1
        ) {
          break;
        }
      }
      expect(
        (buyPerf?.paper as { totalTrades?: number })?.totalTrades,
      ).toBeGreaterThanOrEqual(1);
      expect(
        (
          (buyPerf?.exposure as { cycles?: { status?: string }[] })?.cycles ??
          []
        ).some((cycle) => cycle.status === "open"),
      ).toBe(true);

      let sellPerf = null as Awaited<ReturnType<typeof readPerformance>> | null;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (attempt % 5 === 0) {
          await forceBrainOutput(page, {
            state: "approach_sell",
            buyDrive: 0.05,
            sellDrive: 0.95,
            curiosity: 0.2,
            danger: 0,
            activity: 0.6,
          });
        }
        await page.waitForTimeout(1_500);
        sellPerf = await readPerformance(popup);
        const trades =
          (sellPerf?.paper as { totalTrades?: number } | undefined)
            ?.totalTrades ?? 0;
        const closed =
          (
            sellPerf?.exposure as { cycles?: { status?: string }[] } | undefined
          )?.cycles?.filter((cycle) => cycle.status === "closed").length ?? 0;
        if (trades >= 2 && closed >= 1) break;
      }

      const closedCycles =
        (
          sellPerf?.exposure as
            | {
                cycles?: Array<{
                  status?: string;
                  buyAveragePrice?: number;
                  sellAveragePrice?: number;
                  realizedPnl?: number;
                  realizedReturnPercent?: number;
                }>;
              }
            | undefined
        )?.cycles?.filter((cycle) => cycle.status === "closed") ?? [];
      expect(closedCycles.length).toBeGreaterThanOrEqual(1);
      const cycle = closedCycles[0]!;
      expect(cycle.buyAveragePrice).toBeGreaterThan(0);
      expect(cycle.sellAveragePrice).toBeGreaterThan(0);
      expect(typeof cycle.realizedPnl).toBe("number");
      expect(typeof cycle.realizedReturnPercent).toBe("number");

      const paper = sellPerf?.paper as {
        totalTrades?: number;
        realizedPnl?: number;
      };
      expect(paper?.totalTrades).toBeGreaterThanOrEqual(2);
      expect(paper?.realizedPnl).toBeCloseTo(cycle.realizedPnl ?? NaN, 5);

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(5_000);
      const afterReload = await readPerformance(popup);
      expect(
        (afterReload?.paper as { totalTrades?: number })?.totalTrades,
      ).toBeGreaterThanOrEqual(2);

      const finalDiag = await readE2EDiagnostics(page);
      expect(finalDiag?.brokerClickCount ?? 0).toBe(clicksBefore);
    } finally {
      try {
        await harness.close();
      } catch {
        // teardown races
      }
    }
  });
});
