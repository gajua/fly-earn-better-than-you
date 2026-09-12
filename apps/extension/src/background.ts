import {
  isPairingConfig,
  isSensorMessage,
  type PairingConfig,
} from "./validation";
import {
  publishStatus,
  readPreferences,
  scanBrokerTabs,
  writePreferences,
} from "./background/broker-tabs";
import { getExposureSummary, markToMarketPositions, maybeExecutePaperTrade } from "./background/paper-engine";
import { clearTrades, listTrades } from "./storage/trade-ledger";
import { STATUS_KEY, type ExtensionPreferences } from "./storage/preferences";
import { computePerformance, summarizeClosedCycles } from "@fly/core";
import { BROKER_REGISTRY } from "@fly/broker-adapters";

const CONFIG_KEY = "pairing";
const DEMO_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]);
const BRIDGE_PATH = "/v1/environment";

const restrictSessionStorage = (): Promise<void> =>
  chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });

const readPairing = async (): Promise<PairingConfig | null> => {
  const stored = await chrome.storage.session.get(CONFIG_KEY);
  return isPairingConfig(stored[CONFIG_KEY]) ? stored[CONFIG_KEY] : null;
};

const isDemoSender = (senderUrl: string | undefined): boolean => {
  if (!senderUrl) return false;
  try {
    return DEMO_ORIGINS.has(new URL(senderUrl).origin);
  } catch {
    return false;
  }
};

const forwardSnapshot = async (
  message: unknown,
  senderUrl: string | undefined,
): Promise<{ ok: boolean; reason?: string }> => {
  if (!isDemoSender(senderUrl) || !isSensorMessage(message)) {
    return { ok: false, reason: "invalid-sensor-message" };
  }

  const pairing = await readPairing();
  const currentExtensionOrigin = chrome.runtime.getURL("").replace(/\/$/, "");
  if (!pairing || pairing.extensionOrigin !== currentExtensionOrigin) {
    return { ok: false, reason: "not-paired" };
  }

  try {
    const response = await fetch(`${pairing.bridgeOrigin}${BRIDGE_PATH}`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        Authorization: `Bearer ${pairing.sessionToken}`,
        "Content-Type": "application/json",
        "X-Fly-Extension-Origin": pairing.extensionOrigin,
      },
      body: JSON.stringify(message),
    });
    return response.ok
      ? { ok: true }
      : { ok: false, reason: `bridge-http-${response.status}` };
  } catch {
    return { ok: false, reason: "bridge-unreachable" };
  }
};

const refreshBrokerPresence = async () => {
  const scan = await scanBrokerTabs();
  if (!scan.hasBrokerTab) {
    await publishStatus({
      session: "NO_BROKER",
      hasBrokerTab: false,
      activeBrokerId: null,
      loginState: "UNKNOWN",
    });
  }
};

void restrictSessionStorage();
chrome.runtime.onInstalled.addListener(() => {
  void restrictSessionStorage();
  void refreshBrokerPresence();
});
chrome.runtime.onStartup.addListener(() => {
  void restrictSessionStorage();
  void refreshBrokerPresence();
});

chrome.tabs.onUpdated.addListener(() => void refreshBrokerPresence());
chrome.tabs.onRemoved.addListener(() => void refreshBrokerPresence());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    if (!message || typeof message !== "object") {
      sendResponse({ ok: false, reason: "invalid-message" });
      return;
    }

    const kind = (message as { kind?: string }).kind;

    if (kind === "market-environment") {
      sendResponse(await forwardSnapshot(message, sender.url));
      return;
    }

    if (kind === "runtime-status") {
      const payload = message as {
        session: Parameters<typeof publishStatus>[0]["session"];
        hasBrokerTab: boolean;
        activeBrokerId: string | null;
        loginState: "LOGGED_IN" | "LOGGED_OUT" | "UNKNOWN";
        message?: string;
      };
      sendResponse({ ok: true, status: await publishStatus(payload) });
      return;
    }

    if (kind === "get-status") {
      const stored = await chrome.storage.session.get(STATUS_KEY);
      sendResponse({ ok: true, status: stored[STATUS_KEY] ?? null });
      return;
    }

    if (kind === "get-preferences") {
      sendResponse({ ok: true, preferences: await readPreferences() });
      return;
    }

    if (kind === "set-preferences") {
      const preferences = (message as { preferences: ExtensionPreferences })
        .preferences;
      await writePreferences(preferences);
      sendResponse({ ok: true });
      return;
    }

    if (kind === "request-broker-permission") {
      const brokerId = (message as { brokerId: string }).brokerId;
      const broker = BROKER_REGISTRY.find((entry) => entry.id === brokerId);
      if (!broker) {
        sendResponse({ ok: false, reason: "unknown-broker" });
        return;
      }
      const granted = await chrome.permissions.request({
        origins: [...broker.optionalHostPermissions],
      });
      sendResponse({ ok: granted });
      return;
    }

    if (kind === "paper-trade") {
      const preferences = await readPreferences();
      const proposal = (message as { proposal: Parameters<typeof maybeExecutePaperTrade>[1] })
        .proposal;
      sendResponse(await maybeExecutePaperTrade(preferences, proposal));
      return;
    }

    if (kind === "mark-to-market") {
      const quotes = (message as {
        quotes: { instrumentId: string; price: number; observedAt: string }[];
      }).quotes;
      const map = new Map(
        quotes.map((quote) => [
          quote.instrumentId,
          { price: quote.price, observedAt: quote.observedAt },
        ]),
      );
      sendResponse({ ok: true, positions: await markToMarketPositions(map) });
      return;
    }

    if (kind === "get-performance") {
      const preferences = await readPreferences();
      const paperTrades = await listTrades("paper");
      const liveTrades = await listTrades("live-confirmed");
      const exposure = await getExposureSummary(preferences);
      sendResponse({
        ok: true,
        paper: computePerformance(
          paperTrades,
          exposure.positions,
          preferences.riskPolicy.maxTradingCapital,
          exposure.cycles,
        ),
        live: computePerformance(
          liveTrades,
          [],
          preferences.riskPolicy.maxTradingCapital,
          [],
        ),
        closedCycles: summarizeClosedCycles(exposure.cycles),
        exposure,
      });
      return;
    }

    if (kind === "clear-history") {
      await clearTrades();
      await chrome.storage.local.remove(["fly-paper-positions", "fly-daily-exposure"]);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, reason: "unknown-kind" });
  })();
  return true;
});

void refreshBrokerPresence();
