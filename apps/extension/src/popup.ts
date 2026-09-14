import type {
  BrainModePerformance,
  ExtendedPerformance,
  PerformanceRange,
} from "@fly/core";
import {
  resolveLocale,
  t,
  type LocalePreference,
  type MessageKey,
  type ResolvedLocale,
} from "./i18n";
import type {
  ExtensionPreferences,
  RuntimeStatus,
} from "./storage/preferences";

const statusTitle = document.getElementById("status-title")!;
const statusMessage = document.getElementById("status-message")!;
const flyEmoji = document.getElementById("fly-emoji")!;
const tradingMode = document.getElementById(
  "trading-mode",
) as HTMLSelectElement;
const brainMode = document.getElementById("brain-mode") as HTMLSelectElement;
const maxCapital = document.getElementById("max-capital") as HTMLInputElement;
const startingCapital = document.getElementById(
  "starting-capital",
) as HTMLInputElement;
const localeSelect = document.getElementById("locale") as HTMLSelectElement;
const contributeLearning = document.getElementById(
  "contribute-learning",
) as HTMLInputElement;
const presetVersion = document.getElementById("preset-version")!;
const presetSource = document.getElementById("preset-source")!;
const presetSamples = document.getElementById("preset-samples")!;
const buyThreshold = document.getElementById("buy-threshold")!;
const sellThreshold = document.getElementById("sell-threshold")!;
const queuedObservations = document.getElementById("queued-observations")!;
const lastSync = document.getElementById("last-sync")!;
const performance = document.getElementById("performance")!;
const brainPerformance = document.getElementById("brain-performance")!;

let currentLocale: ResolvedLocale = "en";
let selectedRange: PerformanceRange = "all";

const applyStaticI18n = (locale: ResolvedLocale) => {
  currentLocale = locale;
  document.documentElement.lang = locale;
  for (const node of Array.from(
    document.querySelectorAll<HTMLElement>("[data-i18n]"),
  )) {
    const key = node.dataset.i18n as MessageKey | undefined;
    if (!key) continue;
    node.textContent = t(key, locale);
  }
};

const renderStatus = (status: RuntimeStatus | null) => {
  if (!status) {
    statusTitle.textContent = "Fly";
    statusMessage.textContent = t("status.wake", currentLocale);
    flyEmoji.textContent = "🪰 zzz...";
    return;
  }
  statusTitle.textContent = status.session;
  statusMessage.textContent = status.message;
  flyEmoji.textContent = status.badge === "sleeping" ? "🪰 zzz..." : "🪰";
};

const formatPerf = (paper: ExtendedPerformance): string =>
  [
    `${t("perf.totalReturn", currentLocale)}: ${paper.totalReturnPercent.toFixed(2)}%`,
    `${t("perf.realizedPnl", currentLocale)}: ${paper.totalRealizedPnl.toFixed(2)}`,
    `${t("perf.trades", currentLocale)}: ${paper.totalTrades}`,
    `${t("perf.winRate", currentLocale)}: ${(paper.winRate * 100).toFixed(1)}% (${paper.winCount}W / ${paper.lossCount}L)`,
    `${t("perf.avgWin", currentLocale)}: ${paper.averageWinPercent.toFixed(2)}%`,
    `${t("perf.avgLoss", currentLocale)}: ${paper.averageLossPercent.toFixed(2)}%`,
    `${t("perf.profitFactor", currentLocale)}: ${
      paper.profitFactor == null ? "∞" : paper.profitFactor.toFixed(2)
    }`,
    `${t("perf.maxDrawdown", currentLocale)}: ${paper.maxDrawdownPercent.toFixed(2)}%`,
    `${t("perf.bestTrade", currentLocale)}: ${
      paper.bestTradePercent == null
        ? "—"
        : `${paper.bestTradePercent.toFixed(2)}%`
    }`,
    `${t("perf.worstTrade", currentLocale)}: ${
      paper.worstTradePercent == null
        ? "—"
        : `${paper.worstTradePercent.toFixed(2)}%`
    }`,
  ].join("\n");

const formatBrain = (rows: BrainModePerformance[]): string =>
  rows
    .map(
      (row) =>
        `${row.brainMode}\n  Return ${row.totalReturnPercent.toFixed(2)}%  Win ${(row.winRate * 100).toFixed(1)}%  Trades ${row.totalTrades}`,
    )
    .join("\n\n");

const loadPerformance = async () => {
  const perfResponse = (await chrome.runtime.sendMessage({
    kind: "get-performance",
    range: selectedRange,
  })) as {
    ok?: boolean;
    extended?: ExtendedPerformance;
    byBrainMode?: BrainModePerformance[];
    closedCycles?: {
      symbol: string;
      buyAveragePrice: number;
      sellAveragePrice: number;
      realizedReturnPercent: number;
      realizedPnl?: number;
      closedAt?: string;
    }[];
  };
  if (!perfResponse.ok || !perfResponse.extended) {
    performance.textContent = "—";
    return;
  }
  const cycleLines = (perfResponse.closedCycles ?? [])
    .slice(-8)
    .map(
      (cycle) =>
        `${cycle.symbol}  Buy ${cycle.buyAveragePrice.toFixed(2)}  Sell ${cycle.sellAveragePrice.toFixed(2)}  ${cycle.realizedReturnPercent.toFixed(2)}%  PnL ${cycle.realizedPnl?.toFixed(2) ?? "—"}  ${cycle.closedAt ?? ""}`,
    );
  performance.textContent = [formatPerf(perfResponse.extended), ...cycleLines]
    .filter(Boolean)
    .join("\n");
  brainPerformance.textContent = formatBrain(perfResponse.byBrainMode ?? []);
};

const loadGlobalLearning = async () => {
  const learning = (await chrome.runtime.sendMessage({
    kind: "get-global-learning",
  })) as {
    presetVersion?: string;
    sampleCount?: number;
    source?: string;
    buyThreshold?: number;
    sellThreshold?: number;
    contributeAnonymousLearning?: boolean;
    queuedObservations?: number;
    lastSyncAt?: string | null;
  };
  presetVersion.textContent = `v${learning.presetVersion ?? "1.0.0"}`;
  presetSource.textContent = learning.source ?? "bundled";
  presetSamples.textContent = String(learning.sampleCount ?? 0);
  buyThreshold.textContent = Number(learning.buyThreshold ?? 0.82).toFixed(2);
  sellThreshold.textContent = Number(learning.sellThreshold ?? 0.82).toFixed(2);
  contributeLearning.checked = Boolean(learning.contributeAnonymousLearning);
  queuedObservations.textContent = String(learning.queuedObservations ?? 0);
  lastSync.textContent = learning.lastSyncAt ?? "—";
};

const load = async () => {
  const prefsResponse = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as { preferences: ExtensionPreferences };
  const preferences = prefsResponse.preferences;
  const locale = resolveLocale(preferences.locale);
  applyStaticI18n(locale);

  const statusResponse = (await chrome.runtime.sendMessage({
    kind: "get-status",
  })) as { status?: RuntimeStatus | null };
  renderStatus(statusResponse.status ?? null);

  tradingMode.value = preferences.tradingMode;
  brainMode.value = preferences.brainMode;
  maxCapital.value = String(preferences.riskPolicy.maxTradingCapital);
  startingCapital.value = String(preferences.startingPaperCapital);
  localeSelect.value = preferences.locale;

  await loadGlobalLearning();
  await loadPerformance();

  const diagnostics = statusResponse.status?.diagnostics;
  const diagnosticsEl = document.getElementById("diagnostics");
  if (diagnosticsEl && diagnostics) {
    diagnosticsEl.textContent = JSON.stringify(diagnostics, null, 2);
  }
};

document.getElementById("save-prefs")!.addEventListener("click", () => {
  void (async () => {
    const prefsResponse = (await chrome.runtime.sendMessage({
      kind: "get-preferences",
    })) as { preferences: ExtensionPreferences };
    const current = prefsResponse.preferences;
    const next: ExtensionPreferences = {
      ...current,
      tradingMode: tradingMode.value as ExtensionPreferences["tradingMode"],
      brainMode: brainMode.value as ExtensionPreferences["brainMode"],
      locale: localeSelect.value as LocalePreference,
      contributeAnonymousLearning: contributeLearning.checked,
      experimentalPersonalCalibration: false,
      startingPaperCapital:
        Number(startingCapital.value) || current.startingPaperCapital,
      riskPolicy: {
        ...current.riskPolicy,
        maxTradingCapital:
          Number(maxCapital.value) || current.riskPolicy.maxTradingCapital,
      },
    };
    await chrome.runtime.sendMessage({
      kind: "set-preferences",
      preferences: next,
    });
    applyStaticI18n(resolveLocale(next.locale));
    await load();
    statusMessage.textContent = t("status.saved", currentLocale);
  })();
});

document.getElementById("sync-learning")!.addEventListener("click", () => {
  void chrome.runtime
    .sendMessage({ kind: "sync-global-learning" })
    .then(() => loadGlobalLearning());
});

document.getElementById("clear-queue")!.addEventListener("click", () => {
  void chrome.runtime
    .sendMessage({ kind: "clear-contribution-queue" })
    .then(() => loadGlobalLearning());
});

document.getElementById("rollback-preset")!.addEventListener("click", () => {
  void chrome.runtime
    .sendMessage({ kind: "rollback-global-preset" })
    .then(() => loadGlobalLearning());
});

document.getElementById("clear-history")!.addEventListener("click", () => {
  if (!window.confirm(t("confirm.clearPaper", currentLocale))) return;
  void chrome.runtime.sendMessage({ kind: "clear-history" }).then(async () => {
    statusMessage.textContent = t("status.historyCleared", currentLocale);
    await loadPerformance();
  });
});

document.getElementById("reset-all")!.addEventListener("click", () => {
  if (!window.confirm(t("confirm.resetAll", currentLocale))) return;
  void chrome.runtime
    .sendMessage({ kind: "reset-all-local" })
    .then(async () => {
      statusMessage.textContent = t("status.dataReset", currentLocale);
      await load();
    });
});

for (const button of Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-range]"),
)) {
  button.addEventListener("click", () => {
    selectedRange = (button.dataset.range ?? "all") as PerformanceRange;
    void loadPerformance();
  });
}

void load();
