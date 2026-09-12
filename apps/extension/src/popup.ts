import type { ExtensionPreferences, RuntimeStatus } from "./storage/preferences";

const statusTitle = document.getElementById("status-title")!;
const statusMessage = document.getElementById("status-message")!;
const flyEmoji = document.getElementById("fly-emoji")!;
const tradingMode = document.getElementById("trading-mode") as HTMLSelectElement;
const brainMode = document.getElementById("brain-mode") as HTMLSelectElement;
const maxCapital = document.getElementById("max-capital") as HTMLInputElement;
const performance = document.getElementById("performance")!;

const renderStatus = (status: RuntimeStatus | null) => {
  if (!status) {
    statusTitle.textContent = "Fly";
    statusMessage.textContent = "거래소 화면을 띄우면 깨워줘.";
    flyEmoji.textContent = "🪰 zzz...";
    return;
  }
  statusTitle.textContent = status.session;
  statusMessage.textContent = status.message;
  flyEmoji.textContent = status.badge === "sleeping" ? "🪰 zzz..." : "🪰";
};

const load = async () => {
  const statusResponse = (await chrome.runtime.sendMessage({
    kind: "get-status",
  })) as { status?: RuntimeStatus | null };
  renderStatus(statusResponse.status ?? null);

  const prefsResponse = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as { preferences: ExtensionPreferences };
  const preferences = prefsResponse.preferences;
  tradingMode.value = preferences.tradingMode;
  brainMode.value = preferences.brainMode;
  maxCapital.value = String(preferences.riskPolicy.maxTradingCapital);

  const perfResponse = (await chrome.runtime.sendMessage({
    kind: "get-performance",
  })) as {
    ok?: boolean;
    paper?: {
      totalTrades: number;
      openPositions: number;
      realizedPnl: number;
      unrealizedPnl: number;
      unrealizedPnlStale?: boolean;
      totalReturnPercent: number;
      winRate: number;
      maximumDrawdown: number;
      maximumDrawdownBasis?: string;
      benchmarkReturn?: number | null;
    };
    exposure?: { currentExposure: number };
  };
  if (perfResponse.ok && perfResponse.paper && perfResponse.exposure) {
    const paper = perfResponse.paper;
    const closed = (
      perfResponse as {
        closedCycles?: {
          symbol: string;
          buyAveragePrice: number;
          sellAveragePrice: number;
          realizedReturnPercent: number;
        }[];
      }
    ).closedCycles;
    performance.textContent = [
      `Trades: ${paper.totalTrades}`,
      `Open: ${paper.openPositions}`,
      `Realized: ${paper.realizedPnl.toFixed(2)}`,
      `Unrealized: ${paper.unrealizedPnl.toFixed(2)}${paper.unrealizedPnlStale ? " (STALE)" : ""}`,
      `Return: ${paper.totalReturnPercent.toFixed(2)}%`,
      `Win rate: ${(paper.winRate * 100).toFixed(1)}%`,
      `Max DD (${paper.maximumDrawdownBasis}): ${paper.maximumDrawdown.toFixed(2)}`,
      `Benchmark: ${paper.benchmarkReturn == null ? "unavailable" : paper.benchmarkReturn}`,
      `Exposure: ${perfResponse.exposure.currentExposure.toFixed(0)} / ${preferences.riskPolicy.maxTradingCapital}`,
      ...(closed ?? []).map(
        (cycle) =>
          `${cycle.symbol}  Buy ${cycle.buyAveragePrice.toFixed(2)}  Sell ${cycle.sellAveragePrice.toFixed(2)}  ${cycle.realizedReturnPercent.toFixed(2)}%`,
      ),
    ].join("\n");
  }

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
      riskPolicy: {
        ...current.riskPolicy,
        maxTradingCapital:
          Number(maxCapital.value) || current.riskPolicy.maxTradingCapital,
      },
    };
    await chrome.runtime.sendMessage({ kind: "set-preferences", preferences: next });
    await chrome.runtime.sendMessage({
      kind: "request-broker-permission",
      brokerId: "demo",
    });
    statusMessage.textContent = "Settings saved.";
  })();
});

document.getElementById("clear-history")!.addEventListener("click", () => {
  void chrome.runtime.sendMessage({ kind: "clear-history" }).then(() => {
    performance.textContent = "History cleared.";
  });
});

void load();
