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
  GlobalLearningConsent,
  RuntimeStatus,
} from "./storage/preferences";
import { needsGlobalLearningOnboarding } from "./storage/preferences";

const mainApp = document.getElementById("main-app")!;
const onboarding = document.getElementById("onboarding")!;
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
const onboardingLocale = document.getElementById(
  "onboarding-locale",
) as HTMLSelectElement;
const consentContribute = document.getElementById(
  "consent-contribute",
) as HTMLInputElement;
const consentLocal = document.getElementById(
  "consent-local",
) as HTMLInputElement;
const onboardingContribute = document.getElementById(
  "onboarding-contribute",
) as HTMLInputElement;
const onboardingLocal = document.getElementById(
  "onboarding-local",
) as HTMLInputElement;
const onboardingContinue = document.getElementById(
  "onboarding-continue",
) as HTMLButtonElement;
const explorationOn = document.getElementById(
  "exploration-on",
) as HTMLInputElement;
const explorationSpeed = document.getElementById(
  "exploration-speed",
) as HTMLSelectElement;
const visibleControl = document.getElementById(
  "visible-control",
) as HTMLInputElement;
const activityHud = document.getElementById("activity-hud") as HTMLInputElement;
const paperAutoTrade = document.getElementById(
  "paper-auto-trade",
) as HTMLInputElement;
const tradeNotifications = document.getElementById(
  "trade-notifications",
) as HTMLInputElement;
const flyOverlay = document.getElementById("fly-overlay") as HTMLInputElement;
const presetVersion = document.getElementById("preset-version")!;
const presetSource = document.getElementById("preset-source")!;
const communityObservations = document.getElementById(
  "community-observations",
)!;
const lastCalibration = document.getElementById("last-calibration")!;
const buyThreshold = document.getElementById("buy-threshold")!;
const sellThreshold = document.getElementById("sell-threshold")!;
const queuedObservations = document.getElementById("queued-observations")!;
const lastSync = document.getElementById("last-sync")!;
const localObservations = document.getElementById("local-observations")!;
const localOutcomes = document.getElementById("local-outcomes")!;
const localModuleSamples = document.getElementById("local-module-samples")!;
const localClosedTrades = document.getElementById("local-closed-trades")!;
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

const selectedConsent = (
  contributeEl: HTMLInputElement,
  localEl: HTMLInputElement,
): GlobalLearningConsent | null => {
  if (contributeEl.checked) return "contribute";
  if (localEl.checked) return "local_only";
  return null;
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

const loadGlobalLearning = async (
  preferences: ExtensionPreferences,
): Promise<void> => {
  const learning = (await chrome.runtime.sendMessage({
    kind: "get-global-learning",
  })) as {
    presetVersion?: string;
    sampleCount?: number;
    source?: string;
    buyThreshold?: number;
    sellThreshold?: number;
    queuedObservations?: number;
    lastSyncAt?: string | null;
    communityObservationCount?: number | null;
    lastCalibrationAt?: string | null;
  };
  presetVersion.textContent = `v${learning.presetVersion ?? "1.0.0"}`;
  presetSource.textContent = learning.source ?? "bundled";
  buyThreshold.textContent = Number(learning.buyThreshold ?? 0.82).toFixed(2);
  sellThreshold.textContent = Number(learning.sellThreshold ?? 0.82).toFixed(2);
  queuedObservations.textContent = String(learning.queuedObservations ?? 0);
  lastSync.textContent = learning.lastSyncAt ?? "—";

  const count = learning.communityObservationCount;
  communityObservations.textContent =
    typeof count === "number" && Number.isFinite(count)
      ? count.toLocaleString(currentLocale)
      : t("popup.unavailableStat", currentLocale);
  lastCalibration.textContent = learning.lastCalibrationAt
    ? learning.lastCalibrationAt.slice(0, 10)
    : t("popup.unavailableStat", currentLocale);

  consentContribute.checked =
    preferences.globalLearningConsent === "contribute";
  consentLocal.checked = preferences.globalLearningConsent === "local_only";
};

const showOnboarding = (preferences: ExtensionPreferences) => {
  onboarding.hidden = false;
  mainApp.hidden = true;
  onboardingLocale.value = preferences.locale;
  onboardingContribute.checked = false;
  onboardingLocal.checked = false;
  onboardingContinue.disabled = true;
  applyStaticI18n(resolveLocale(preferences.locale));
};

const showMain = async (
  preferences: ExtensionPreferences,
  options?: { readonly flashMessage?: string },
) => {
  onboarding.hidden = true;
  mainApp.hidden = false;
  const locale = resolveLocale(preferences.locale);
  applyStaticI18n(locale);

  const statusResponse = (await chrome.runtime.sendMessage({
    kind: "get-status",
  })) as { status?: RuntimeStatus | null };
  if (options?.flashMessage) {
    statusTitle.textContent = "Fly";
    statusMessage.textContent = options.flashMessage;
  } else {
    renderStatus(statusResponse.status ?? null);
  }

  tradingMode.value = preferences.tradingMode;
  brainMode.value = preferences.brainMode;
  maxCapital.value = String(preferences.riskPolicy.maxTradingCapital);
  startingCapital.value = String(preferences.startingPaperCapital);
  localeSelect.value = preferences.locale;
  explorationOn.checked = preferences.autonomousExploration;
  explorationSpeed.value = preferences.explorationSpeed;
  visibleControl.checked = preferences.visibleBrowserControl;
  activityHud.checked = preferences.flyActivityHud;
  paperAutoTrade.checked = preferences.paperAutoTrade;
  tradeNotifications.checked = preferences.tradeNotifications;
  flyOverlay.checked = preferences.flyOverlayEnabled;

  await loadGlobalLearning(preferences);
  const localStats = (await chrome.runtime.sendMessage({
    kind: "get-local-learning-stats",
  })) as {
    ok?: boolean;
    stats?: {
      observations: number;
      resolvedOutcomes: number;
      chartSamples: number;
      volumeSamples: number;
      riskSamples: number;
      scannerSamples: number;
      closedTrades: number;
    };
  };
  if (localStats.stats) {
    localObservations.textContent = String(localStats.stats.observations);
    localOutcomes.textContent = String(localStats.stats.resolvedOutcomes);
    localModuleSamples.textContent = `${localStats.stats.chartSamples} / ${localStats.stats.volumeSamples} / ${localStats.stats.riskSamples} / ${localStats.stats.scannerSamples}`;
    localClosedTrades.textContent = String(localStats.stats.closedTrades);
  }
  await loadPerformance();

  // Keep explicit save/reset flashes visible after async refresh.
  if (options?.flashMessage) {
    statusMessage.textContent = options.flashMessage;
  }

  const diagnostics = statusResponse.status?.diagnostics;
  const diagnosticsEl = document.getElementById("diagnostics");
  if (diagnosticsEl && diagnostics) {
    diagnosticsEl.textContent = JSON.stringify(diagnostics, null, 2);
  }
};

const load = async () => {
  const prefsResponse = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as { preferences: ExtensionPreferences };
  const preferences = prefsResponse.preferences;
  if (needsGlobalLearningOnboarding(preferences)) {
    showOnboarding(preferences);
    return;
  }
  await showMain(preferences);
};

const savePreferencesPatch = async (
  patch: Partial<ExtensionPreferences>,
): Promise<ExtensionPreferences> => {
  const prefsResponse = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as { preferences: ExtensionPreferences };
  const next: ExtensionPreferences = {
    ...prefsResponse.preferences,
    ...patch,
  };
  const response = (await chrome.runtime.sendMessage({
    kind: "set-preferences",
    preferences: next,
  })) as { preferences: ExtensionPreferences };
  return response.preferences;
};

document.getElementById("save-prefs")!.addEventListener("click", () => {
  void (async () => {
    const consent = selectedConsent(consentContribute, consentLocal);
    if (!consent) {
      statusMessage.textContent = t("onboarding.choose", currentLocale);
      return;
    }
    const prefsResponse = (await chrome.runtime.sendMessage({
      kind: "get-preferences",
    })) as { preferences: ExtensionPreferences };
    const current = prefsResponse.preferences;
    const next = await savePreferencesPatch({
      tradingMode: tradingMode.value as ExtensionPreferences["tradingMode"],
      brainMode: brainMode.value as ExtensionPreferences["brainMode"],
      locale: localeSelect.value as LocalePreference,
      globalLearningConsent: consent,
      experimentalPersonalCalibration: false,
      startingPaperCapital:
        Number(startingCapital.value) || current.startingPaperCapital,
      autonomousExploration: explorationOn.checked,
      explorationSpeed:
        explorationSpeed.value as ExtensionPreferences["explorationSpeed"],
      visibleBrowserControl: visibleControl.checked,
      flyActivityHud: activityHud.checked,
      paperAutoTrade: paperAutoTrade.checked,
      tradeNotifications: tradeNotifications.checked,
      flyOverlayEnabled: flyOverlay.checked,
      riskPolicy: {
        ...current.riskPolicy,
        maxTradingCapital:
          Number(maxCapital.value) || current.riskPolicy.maxTradingCapital,
      },
    });
    const locale = resolveLocale(next.locale);
    await showMain(next, { flashMessage: t("status.saved", locale) });
  })();
});

const refreshOnboardingContinue = () => {
  onboardingContinue.disabled =
    selectedConsent(onboardingContribute, onboardingLocal) == null;
};

onboardingContribute.addEventListener("change", refreshOnboardingContinue);
onboardingLocal.addEventListener("change", refreshOnboardingContinue);

onboardingLocale.addEventListener("change", () => {
  applyStaticI18n(resolveLocale(onboardingLocale.value as LocalePreference));
});

onboardingContinue.addEventListener("click", () => {
  void (async () => {
    const consent = selectedConsent(onboardingContribute, onboardingLocal);
    if (!consent) return;
    const next = await savePreferencesPatch({
      globalLearningConsent: consent,
      locale: onboardingLocale.value as LocalePreference,
    });
    await showMain(next);
  })();
});

document.getElementById("sync-learning")!.addEventListener("click", () => {
  void (async () => {
    await chrome.runtime.sendMessage({ kind: "sync-global-learning" });
    const response = (await chrome.runtime.sendMessage({
      kind: "get-preferences",
    })) as { preferences: ExtensionPreferences };
    await loadGlobalLearning(response.preferences);
  })();
});

document.getElementById("clear-queue")!.addEventListener("click", () => {
  void (async () => {
    await chrome.runtime.sendMessage({ kind: "clear-contribution-queue" });
    const response = (await chrome.runtime.sendMessage({
      kind: "get-preferences",
    })) as { preferences: ExtensionPreferences };
    await loadGlobalLearning(response.preferences);
  })();
});

document.getElementById("rollback-preset")!.addEventListener("click", () => {
  void (async () => {
    await chrome.runtime.sendMessage({ kind: "rollback-global-preset" });
    const response = (await chrome.runtime.sendMessage({
      kind: "get-preferences",
    })) as { preferences: ExtensionPreferences };
    await loadGlobalLearning(response.preferences);
  })();
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

document.getElementById("pause-exploration")!.addEventListener("click", () => {
  void (async () => {
    const prefsResponse = (await chrome.runtime.sendMessage({
      kind: "get-preferences",
    })) as { preferences: ExtensionPreferences };
    const paused = !prefsResponse.preferences.explorationPaused;
    const next = await savePreferencesPatch({ explorationPaused: paused });
    await showMain(next);
  })();
});

void load();
