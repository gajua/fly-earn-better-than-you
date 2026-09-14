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
import {
  getExposureSummary,
  markToMarketPositions,
  maybeExecutePaperTrade,
} from "./background/paper-engine";
import {
  clearTrades,
  listTrades,
  writePaperPositions,
} from "./storage/trade-ledger";
import {
  computeExtendedPerformance,
  computePerformance,
  computePerformanceByBrainMode,
  summarizeClosedCycles,
} from "@fly/core";
import { BROKER_REGISTRY } from "@fly/broker-adapters";
import {
  clearDetectionFeedback,
  clearLearningObservations,
} from "./storage/learning-store";
import {
  clearContributionQueue,
  flushContributionQueue,
  listContributionQueue,
  readContributionMeta,
} from "./storage/contribution-queue";
import {
  loadActiveGlobalPreset,
  maybeRefreshRemotePreset,
  rollbackToBundledPreset,
} from "./global-preset-runtime";
import {
  DEFAULT_PREFERENCES,
  STATUS_KEY,
  normalizePreferences,
  type ExtensionPreferences,
} from "./storage/preferences";
import {
  readLocalLearningStats,
  recordModularObservation,
  resolveDueOutcomes,
} from "./background/local-learning";

const GLOBAL_LEARNING_ENABLED =
  typeof __FLY_GLOBAL_LEARNING_ENABLED__ !== "undefined"
    ? __FLY_GLOBAL_LEARNING_ENABLED__
    : false;
const SUPABASE_URL =
  typeof __FLY_SUPABASE_URL__ !== "undefined" ? __FLY_SUPABASE_URL__ : "";
const SUPABASE_PUBLISHABLE_KEY =
  typeof __FLY_SUPABASE_PUBLISHABLE_KEY__ !== "undefined"
    ? __FLY_SUPABASE_PUBLISHABLE_KEY__
    : "";

declare const __FLY_GLOBAL_LEARNING_ENABLED__: boolean;
declare const __FLY_SUPABASE_URL__: string;
declare const __FLY_SUPABASE_PUBLISHABLE_KEY__: string;

const CONFIG_KEY = "pairing";
const DEMO_ORIGINS = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]);
const BRIDGE_PATH = "/v1/environment";

const normalizeIncomingPreferences = (
  preferences: ExtensionPreferences,
): ExtensionPreferences => normalizePreferences(preferences);

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
  void chrome.alarms.create("resolve-learning-outcomes", {
    periodInMinutes: 5,
  });
  void restrictSessionStorage();
  void refreshBrokerPresence();
});
chrome.runtime.onStartup.addListener(() => {
  void restrictSessionStorage();
  void refreshBrokerPresence();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "resolve-learning-outcomes") return;
  void resolveDueOutcomes();
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
      const preferences = await writePreferences(
        normalizeIncomingPreferences(
          (message as { preferences: ExtensionPreferences }).preferences,
        ),
      );
      if (preferences.contributeAnonymousLearning) {
        void flushContributionQueue({
          enabled: GLOBAL_LEARNING_ENABLED,
          contributeOptIn: true,
          supabaseUrl: SUPABASE_URL,
          publishableKey: SUPABASE_PUBLISHABLE_KEY,
        });
      }
      sendResponse({ ok: true, preferences });
      return;
    }

    if (kind === "get-global-learning") {
      const preferences = await readPreferences();
      const active = await loadActiveGlobalPreset();
      const queue = await listContributionQueue();
      const meta = await readContributionMeta();
      let communityObservationCount: number | null = null;
      let lastCalibrationAt: string | null = active.preset.generatedAt ?? null;
      if (GLOBAL_LEARNING_ENABLED && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
        try {
          const response = await fetch(
            `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/global_learning_public_stats`,
            {
              method: "POST",
              headers: {
                apikey: SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: "{}",
              credentials: "omit",
              cache: "no-store",
              referrerPolicy: "no-referrer",
            },
          );
          if (response.ok) {
            const stats = (await response.json()) as {
              observationCount?: number;
              lastCalibrationAt?: string | null;
            };
            if (
              typeof stats.observationCount === "number" &&
              Number.isFinite(stats.observationCount)
            ) {
              communityObservationCount = stats.observationCount;
            }
            if (typeof stats.lastCalibrationAt === "string") {
              lastCalibrationAt = stats.lastCalibrationAt;
            }
          }
        } catch {
          // Stats are optional — never block Fly / Paper.
        }
      }
      sendResponse({
        ok: true,
        presetVersion: active.preset.presetVersion,
        sampleCount: active.preset.sampleCount,
        source: active.source,
        generatedAt: active.preset.generatedAt,
        dataset: active.preset.metadata.dataset,
        buyThreshold: active.gates.buyThreshold,
        sellThreshold: active.gates.sellThreshold,
        contributeAnonymousLearning: preferences.contributeAnonymousLearning,
        globalLearningConsent: preferences.globalLearningConsent,
        queuedObservations: queue.length,
        lastSyncAt: meta.lastSyncAt,
        communityObservationCount,
        lastCalibrationAt,
        remoteConfigured: Boolean(
          GLOBAL_LEARNING_ENABLED && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
        ),
      });
      return;
    }

    if (kind === "sync-global-learning") {
      const preferences = await readPreferences();
      const refresh = await maybeRefreshRemotePreset({
        enabled: GLOBAL_LEARNING_ENABLED,
        supabaseUrl: SUPABASE_URL,
        publishableKey: SUPABASE_PUBLISHABLE_KEY,
      });
      const upload = preferences.contributeAnonymousLearning
        ? await flushContributionQueue({
            enabled: GLOBAL_LEARNING_ENABLED,
            contributeOptIn: true,
            supabaseUrl: SUPABASE_URL,
            publishableKey: SUPABASE_PUBLISHABLE_KEY,
          })
        : { uploaded: 0, reason: "opted-out" };
      sendResponse({ ok: true, refresh, upload });
      return;
    }

    if (kind === "clear-contribution-queue") {
      await clearContributionQueue();
      sendResponse({ ok: true });
      return;
    }

    if (kind === "rollback-global-preset") {
      await rollbackToBundledPreset();
      sendResponse({ ok: true });
      return;
    }

    if (kind === "reset-learning") {
      await clearLearningObservations();
      await clearContributionQueue();
      sendResponse({ ok: true });
      return;
    }

    if (kind === "reset-all-local") {
      await clearTrades();
      await clearLearningObservations();
      await clearDetectionFeedback();
      await clearContributionQueue();
      await writePaperPositions([]);
      await chrome.storage.local.remove([
        "fly-daily-exposure",
        "fly-active-global-preset",
        "fly-global-preset-meta",
        "fly-contribution-meta",
      ]);
      await writePreferences(DEFAULT_PREFERENCES);
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

    if (kind === "get-local-learning-stats") {
      try {
        sendResponse({ ok: true, stats: await readLocalLearningStats() });
      } catch (error) {
        sendResponse({
          ok: false,
          reason: error instanceof Error ? error.message : "stats-failed",
        });
      }
      return;
    }

    if (kind === "record-modular-observation") {
      try {
        const preferences = await readPreferences();
        const payload = (
          message as {
            payload: Omit<
              Parameters<typeof recordModularObservation>[0],
              "preferences"
            >;
          }
        ).payload;
        sendResponse({
          ok: true,
          result: await recordModularObservation({
            ...payload,
            preferences,
          }),
        });
      } catch (error) {
        sendResponse({
          ok: false,
          reason: error instanceof Error ? error.message : "record-failed",
        });
      }
      return;
    }

    if (kind === "resolve-learning-outcomes") {
      const resolved = await resolveDueOutcomes();
      sendResponse({ ok: true, resolved });
      return;
    }

    if (kind === "paper-trade") {
      const preferences = await readPreferences();
      const proposal = (
        message as { proposal: Parameters<typeof maybeExecutePaperTrade>[1] }
      ).proposal;
      sendResponse(await maybeExecutePaperTrade(preferences, proposal));
      return;
    }

    if (kind === "mark-to-market") {
      const quotes = (
        message as {
          quotes: { instrumentId: string; price: number; observedAt: string }[];
        }
      ).quotes;
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
      const range =
        (message as { range?: "all" | "7d" | "30d" }).range ?? "all";
      const paperTrades = await listTrades("paper");
      const liveTrades = await listTrades("live-confirmed");
      const exposure = await getExposureSummary(preferences);
      const starting = preferences.startingPaperCapital;
      sendResponse({
        ok: true,
        paper: computePerformance(
          paperTrades,
          exposure.positions,
          starting,
          exposure.cycles,
        ),
        extended: computeExtendedPerformance(exposure.cycles, starting, range),
        byBrainMode: computePerformanceByBrainMode(
          exposure.cycles,
          paperTrades,
          starting,
          range,
        ),
        live: computePerformance(liveTrades, [], starting, []),
        closedCycles: summarizeClosedCycles(exposure.cycles),
        exposure,
      });
      return;
    }

    if (kind === "proxy-fetch") {
      const url = (message as { url?: string }).url;
      if (!url || typeof url !== "string") {
        sendResponse({ ok: false, status: 0, body: "", reason: "missing-url" });
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        sendResponse({ ok: false, status: 0, body: "", reason: "bad-url" });
        return;
      }
      const allowedHosts = new Set([
        "api.binance.com",
        "api.bybit.com",
        "api.exchange.coinbase.com",
        "api.kraken.com",
        "api.upbit.com",
      ]);
      if (!allowedHosts.has(parsed.hostname)) {
        sendResponse({ ok: false, status: 0, body: "", reason: "host-denied" });
        return;
      }
      try {
        const response = await fetch(url, {
          method: "GET",
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
        });
        sendResponse({
          ok: response.ok,
          status: response.status,
          body: await response.text(),
        });
      } catch {
        sendResponse({ ok: false, status: 0, body: "", reason: "network" });
      }
      return;
    }

    // Local MaleCNS only — content scripts cannot CORS-fetch localhost from broker origins.
    if (kind === "brain-fetch") {
      const url = (message as { url?: string }).url;
      const method = (message as { method?: string }).method ?? "GET";
      const body = (message as { body?: string }).body;
      if (!url || typeof url !== "string") {
        sendResponse({ ok: false, status: 0, body: "", reason: "missing-url" });
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        sendResponse({ ok: false, status: 0, body: "", reason: "bad-url" });
        return;
      }
      const isLocal =
        (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
        parsed.port === "8000";
      if (!isLocal || parsed.protocol !== "http:") {
        sendResponse({ ok: false, status: 0, body: "", reason: "host-denied" });
        return;
      }
      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "GET" || method === "HEAD" ? undefined : body,
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
        });
        sendResponse({
          ok: response.ok,
          status: response.status,
          body: await response.text(),
        });
      } catch {
        sendResponse({ ok: false, status: 0, body: "", reason: "network" });
      }
      return;
    }

    if (kind === "clear-history") {
      await clearTrades();
      await chrome.storage.local.remove([
        "fly-paper-positions",
        "fly-daily-exposure",
      ]);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, reason: "unknown-kind" });
  })();
  return true;
});

void refreshBrokerPresence();
