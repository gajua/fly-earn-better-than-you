/**
 * Record ~15s Binance Spot + Fly overlay for store / promo use.
 *
 * Usage:
 *   node scripts/record-binance-fly-video.mjs
 *
 * Output:
 *   docs/store/assets/binance-fly-demo-15s.webm
 */
import { chromium } from "@playwright/test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionDist = path.join(root, "apps/extension/dist");
const outDir = path.join(root, "docs/store/assets");
const videoStaging = path.join(root, "test-results", "binance-fly-video");
const outWebm = path.join(outDir, "binance-fly-demo-15s.webm");
const RECORD_MS = 15_000;
const BINANCE_URL = "https://www.binance.com/en/trade/BTC_USDT?type=spot";

mkdirSync(outDir, { recursive: true });
rmSync(videoStaging, { recursive: true, force: true });
mkdirSync(videoStaging, { recursive: true });

const build = spawnSync("node", ["scripts/build.mjs"], {
  cwd: path.join(root, "apps/extension"),
  env: {
    ...process.env,
    E2E_TEST_MODE: "0",
    FLY_GLOBAL_LEARNING_ENABLED: process.env.FLY_GLOBAL_LEARNING_ENABLED ?? "1",
  },
  encoding: "utf8",
});
if (build.status !== 0) {
  console.error(build.stdout, build.stderr);
  process.exit(build.status ?? 1);
}
if (!existsSync(path.join(extensionDist, "manifest.json"))) {
  console.error("extension dist missing");
  process.exit(1);
}

const userDataDir = path.join(videoStaging, "profile");
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 800 },
  recordVideo: {
    dir: path.join(videoStaging, "clips"),
    size: { width: 1280, height: 800 },
  },
  args: [
    `--disable-extensions-except=${extensionDist}`,
    `--load-extension=${extensionDist}`,
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

await serviceWorker.evaluate(async () => {
  await chrome.storage.local.set({
    "fly-preferences": {
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
      locale: "en",
      globalLearningConsent: "local_only",
      contributeAnonymousLearning: false,
      experimentalPersonalCalibration: false,
      learningMinSamples: 30,
      startingPaperCapital: 1_000_000,
    },
  });
});

const page = await context.newPage();
await page.goto(BINANCE_URL, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});

// Dismiss common consent / cookie walls without clicking trade controls.
for (const label of [
  "Accept All Cookies",
  "Accept all",
  "Accept",
  "I understand",
  "Got it",
  "Agree",
]) {
  try {
    const btn = page.getByRole("button", { name: new RegExp(label, "i") });
    if (await btn.first().isVisible({ timeout: 1_500 })) {
      await btn.first().click({ timeout: 2_000 });
      break;
    }
  } catch {
    // ignore
  }
}

await page.waitForFunction(
  () => Boolean(document.getElementById("fly-earn-better-root")),
  { timeout: 45_000 },
);

// Settle UI, then record ~15s of live Fly motion on public Spot page.
await page.waitForTimeout(2_000);

const started = Date.now();
while (Date.now() - started < RECORD_MS) {
  // Light viewport motion so the clip isn't a single static frame.
  await page.mouse.move(200 + ((Date.now() - started) % 700), 220);
  await page.waitForTimeout(500);
  await page.mouse.move(900 - ((Date.now() - started) % 500), 360);
  await page.waitForTimeout(500);
}

const hasFly = await page.evaluate(() => {
  const root = document.getElementById("fly-earn-better-root");
  const shadow = root?.shadowRoot;
  return {
    root: Boolean(root),
    shadow: Boolean(shadow),
    title: document.title,
    href: location.href,
  };
});
await page.screenshot({
  path: path.join(outDir, "binance-fly-demo-still.png"),
  fullPage: false,
});

await page.close();
await context.close();

const clipsDir = path.join(videoStaging, "clips");
const clips = existsSync(clipsDir)
  ? readdirSync(clipsDir).filter((name) => name.endsWith(".webm"))
  : [];
if (clips.length === 0) {
  console.error("No video clip produced");
  process.exit(1);
}
const newest = clips
  .map((name) => ({
    name,
    full: path.join(clipsDir, name),
    bytes: statSync(path.join(clipsDir, name)).size,
  }))
  .sort((a, b) => a.bytes - b.bytes)
  .at(-1);
cpSync(newest.full, outWebm);

console.log(
  JSON.stringify(
    {
      ok: true,
      hasFly,
      clip: newest.name,
      output: path.relative(root, outWebm),
      bytes: statSync(outWebm).size,
      still: "docs/store/assets/binance-fly-demo-still.png",
      recordMs: RECORD_MS,
    },
    null,
    2,
  ),
);
