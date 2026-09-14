import { expect, test, type Page } from "@playwright/test";
import {
  launchExtensionContext,
  popupUrl,
  readE2EDiagnostics,
  setExtensionPreferences,
} from "./extension-harness";

const enabled = Boolean(process.env.RUN_EXTENSION_E2E);

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
      // banner may be absent
    }
  }
};

test.describe("Local learning Binance outcome", () => {
  test.skip(!enabled, "Set RUN_EXTENSION_E2E=1 with E2E_TEST_MODE=1 build");

  test("observation → module outputs → 5m outcome resolved (Binance prices)", async () => {
    test.setTimeout(300_000);
    const harness = await launchExtensionContext();
    try {
      await setExtensionPreferences(harness.serviceWorker, {
        localDataCollection: true,
        brainMode: "mock",
        autonomousExploration: false,
        contributeAnonymousLearning: false,
      });

      const extPage = await harness.newPage();
      await extPage.goto(popupUrl(harness.extensionId));

      const binance = await harness.newPage();
      await binance.goto(
        "https://www.binance.com/en/trade/BTC_USDT?type=spot",
        {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        },
      );
      await dismissCookies(binance);
      await expect(binance.locator("#fly-earn-better-root")).toBeAttached({
        timeout: 120_000,
      });

      let diagnostics: Awaited<ReturnType<typeof readE2EDiagnostics>> = null;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await binance.waitForTimeout(2_000);
        diagnostics = await readE2EDiagnostics(binance);
        if ((diagnostics?.localModularRecordCount ?? 0) >= 1) break;
      }
      expect(
        diagnostics?.localModularRecordCount ?? 0,
        JSON.stringify(diagnostics),
      ).toBeGreaterThanOrEqual(1);

      await binance.waitForTimeout(5_000);

      let observations = 0;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await binance.waitForTimeout(1_000);
        const stats = (await extPage.evaluate(async () =>
          chrome.runtime.sendMessage({ kind: "get-local-learning-stats" }),
        )) as { ok?: boolean; stats?: { observations: number } };
        observations = stats.stats?.observations ?? 0;
        if (observations >= 1) break;
      }
      expect(observations, JSON.stringify(diagnostics)).toBeGreaterThanOrEqual(
        1,
      );

      const proof = await extPage.evaluate(async () => {
        const horizon = "5m";
        const horizonMs = 5 * 60_000;
        const endMs = Date.now() - 90_000;
        const anchorMs = endMs - horizonMs;

        const klineUrl = new URL("https://api.binance.com/api/v3/klines");
        klineUrl.searchParams.set("symbol", "BTCUSDT");
        klineUrl.searchParams.set("interval", "1m");
        klineUrl.searchParams.set("startTime", String(anchorMs - 60_000));
        klineUrl.searchParams.set("endTime", String(endMs + 60_000));
        klineUrl.searchParams.set("limit", "20");
        const kResp = await fetch(klineUrl.toString());
        if (!kResp.ok) {
          return {
            ok: false as const,
            reason: "klines-fetch",
            status: kResp.status,
          };
        }
        const klines = (await kResp.json()) as [
          number,
          string,
          string,
          string,
          string,
        ][];
        if (klines.length < 2) {
          return {
            ok: false as const,
            reason: "klines-short",
            count: klines.length,
          };
        }
        const anchorPrice = Number(klines[0]![4]);
        const horizonClose = Number(klines[klines.length - 1]![4]);
        const expectedReturn =
          anchorPrice > 0 ? (horizonClose - anchorPrice) / anchorPrice : 0;

        const openDb = (): Promise<IDBDatabase> =>
          new Promise((resolve, reject) => {
            const req = indexedDB.open("fly-earn-better-than-you", 6);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error ?? new Error("idb"));
          });

        const db = await openDb();
        const dbVersion = db.version;
        const observations = await new Promise<
          { id: string; observedAt: string }[]
        >((resolve, reject) => {
          const tx = db.transaction("market-observations", "readonly");
          const request = tx.objectStore("market-observations").getAll();
          request.onsuccess = () =>
            resolve(
              (request.result as { id: string; observedAt: string }[]) ?? [],
            );
          request.onerror = () => reject(request.error);
        });
        const modules = await new Promise<{ observationId: string }[]>(
          (resolve, reject) => {
            const tx = db.transaction("module-outputs", "readonly");
            const request = tx.objectStore("module-outputs").getAll();
            request.onsuccess = () =>
              resolve((request.result as { observationId: string }[]) ?? []);
            request.onerror = () => reject(request.error);
          },
        );
        const latest = observations
          .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
          .at(-1);
        if (!latest) {
          db.close();
          return { ok: false as const, reason: "no-observation" };
        }
        const moduleRows = modules.filter(
          (row) => row.observationId === latest.id,
        );
        if (moduleRows.length < 5) {
          db.close();
          return {
            ok: false as const,
            reason: "module-outputs-missing",
            count: moduleRows.length,
          };
        }

        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("pending-outcomes", "readwrite");
          const store = tx.objectStore("pending-outcomes");
          store.put({
            id: `${latest.id}:${horizon}`,
            observationId: latest.id,
            horizon,
            dueAt: endMs,
            anchorPrice,
            instrumentId: "binance:spot:BTC:USDT",
            broker: "binance",
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();

        const resolvedMsg = (await chrome.runtime.sendMessage({
          kind: "resolve-learning-outcomes",
        })) as { ok?: boolean; resolved?: number };
        const statsMsg = (await chrome.runtime.sendMessage({
          kind: "get-local-learning-stats",
        })) as {
          ok?: boolean;
          stats?: { resolvedOutcomes: number; chartSamples: number };
        };

        const db2 = await openDb();
        const outcomes = await new Promise<
          {
            observationId: string;
            horizon: string;
            futureReturn: number;
          }[]
        >((resolve, reject) => {
          const tx = db2.transaction("future-outcomes", "readonly");
          const request = tx.objectStore("future-outcomes").getAll();
          request.onsuccess = () =>
            resolve(
              (request.result as {
                observationId: string;
                horizon: string;
                futureReturn: number;
              }[]) ?? [],
            );
          request.onerror = () => reject(request.error);
        });
        db2.close();

        const outcome = outcomes.find(
          (row) => row.observationId === latest.id && row.horizon === horizon,
        );

        return {
          ok: true as const,
          dbVersion,
          observationId: latest.id,
          moduleOutputCount: moduleRows.length,
          resolvedCount: resolvedMsg.resolved ?? 0,
          resolvedOutcomes: statsMsg.stats?.resolvedOutcomes ?? 0,
          chartSamples: statsMsg.stats?.chartSamples ?? 0,
          outcomeHorizon: outcome?.horizon ?? null,
          futureReturn: outcome?.futureReturn ?? null,
          expectedReturn,
          anchorPrice,
          horizonClose,
        };
      });

      expect(proof.ok, JSON.stringify(proof)).toBe(true);
      if (!proof.ok) return;
      expect(proof.moduleOutputCount).toBeGreaterThanOrEqual(5);
      expect(proof.resolvedCount).toBeGreaterThanOrEqual(1);
      expect(proof.outcomeHorizon).toBe("5m");
      expect(proof.futureReturn).not.toBeNull();
      expect(Math.abs(proof.futureReturn! - proof.expectedReturn)).toBeLessThan(
        0.02,
      );

      await extPage.reload();
      await expect(extPage.locator("#local-observations")).not.toHaveText("0", {
        timeout: 10_000,
      });
      await expect(extPage.locator("#local-outcomes")).not.toHaveText("0", {
        timeout: 10_000,
      });
    } finally {
      await harness.close();
    }
  });
});
