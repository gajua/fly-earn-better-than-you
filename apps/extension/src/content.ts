import {
  createDemoBrokerAdapter,
  findBrokerByUrl,
  observationFromCandles,
  type BrokerAdapter,
} from "@fly/broker-adapters";
import { createMaleCNSBrain, createMockFlyBrain } from "@fly/brain-client";
import {
  aggregateTimeframeObservations,
  applyCalibration,
  demoInstrumentId,
  deriveSessionState,
  filterUsableTimeframeObservations,
  type BrainOutput,
  type TimeframeObservation,
} from "@fly/core";
import { mountShadowFly } from "@fly/fly-ui/shadow-fly";
import { bubbleMessageKey, resolveLocale, t } from "./i18n";
import { createOrderProposal, paperQuantityForPrice } from "./orders";
import type { ExtensionPreferences } from "./storage/preferences";

declare const __FLY_E2E__: boolean;

const SAMPLE_INTERVAL_MS = 2_000;
const MUTATION_DEBOUNCE_MS = 350;

type E2EHost = Window & {
  __flyE2EForce?: (output: BrainOutput) => void;
  __flyE2EGetDiagnostics?: () => unknown;
};

let e2eForcedOutput: BrainOutput | null = null;

const resolveAdapter = (): BrokerAdapter | null => {
  const matched = findBrokerByUrl(window.location.href);
  if (!matched) return null;
  const adapter = matched.createAdapter(document);
  return adapter.detect() ? adapter : null;
};

const adapter = resolveAdapter() ?? createDemoBrokerAdapter();

const buildTimeframeObservations = async (): Promise<
  TimeframeObservation[]
> => {
  const environment = adapter.readMarketEnvironment();
  if (!environment?.asset) return [];
  const provider = adapter.getMarketDataProvider();
  const instrumentId =
    environment.asset.instrumentId ??
    demoInstrumentId(environment.asset.symbol);
  const timeframes = adapter.getAvailableTimeframes();
  const observations: TimeframeObservation[] = [];
  const source =
    adapter.id === "demo"
      ? ("demo" as const)
      : adapter.id === "upbit"
        ? ("official-public" as const)
        : ("tradecanvas" as const);

  for (const timeframe of timeframes) {
    const candles = provider
      ? await provider.getCandles(instrumentId, timeframe)
      : null;
    if (!candles || candles.length === 0) {
      observations.push({
        symbol: environment.asset.symbol,
        instrumentId,
        timeframe,
        price: environment.asset.price,
        returnPercent: 0,
        momentum: 0,
        volatility: 0,
        volumeStrength: 0,
        timestamp: new Date().toISOString(),
        observedAt: new Date().toISOString(),
        source: "unavailable",
        candleCount: 0,
        available: false,
        dataProvider: {
          source: "unavailable",
          provider: adapter.id,
        },
      });
      continue;
    }
    observations.push(
      observationFromCandles({
        symbol: environment.asset.symbol,
        instrumentId,
        timeframe,
        candles,
        source,
        dataProvider: {
          source,
          upstream:
            source === "tradecanvas"
              ? "bonguynvan/tradecanvas"
              : source === "official-public"
                ? "upbit-api"
                : undefined,
          provider: adapter.id,
        },
      }),
    );
  }
  return observations;
};

/** Route MaleCNS HTTP through the service worker (broker pages block localhost CORS). */
const createBrainFetch = (): typeof fetch => {
  return async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const result = (await chrome.runtime.sendMessage({
      kind: "brain-fetch",
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    })) as {
      ok?: boolean;
      status?: number;
      body?: string;
      reason?: string;
    };
    if (!result || typeof result.body !== "string") {
      throw new Error(result?.reason ?? "brain-fetch-failed");
    }
    return new Response(result.body, {
      status: result.status ?? 0,
      headers: { "Content-Type": "application/json" },
    });
  };
};

const resolveBrain = async () => {
  const response = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as {
    preferences?: ExtensionPreferences;
  };
  const preferences = response.preferences;
  const mode = preferences?.brainMode ?? "mock";
  const baseUrl = preferences?.brainBaseUrl ?? "http://127.0.0.1:8000";
  const fetchImpl = createBrainFetch();
  const tradingMode = preferences?.tradingMode ?? "paper";
  const locale = resolveLocale(preferences?.locale ?? "auto");
  const thresholds = applyCalibration(
    preferences?.calibrationProfile ?? {
      buyThreshold: 0.82,
      sellThreshold: 0.82,
      cooldownMultiplier: 1,
      behaviorConfidence: 1,
      sensoryScale: 1,
      updatedAt: new Date(0).toISOString(),
      sampleCount: 0,
    },
    {
      enabled: preferences?.learningEnabled ?? false,
      minSamples: preferences?.learningMinSamples ?? 30,
    },
  );
  if (mode === "real-connectome") {
    return {
      brain: createMaleCNSBrain({ mode: "malecns", baseUrl, fetchImpl }),
      mode: "real-connectome" as const,
      tradingMode,
      locale,
      thresholds,
    };
  }
  if (mode === "shuffled-control") {
    return {
      brain: createMaleCNSBrain({
        mode: "shuffled-control",
        baseUrl,
        fetchImpl,
      }),
      mode: "shuffled-control" as const,
      tradingMode,
      locale,
      thresholds,
    };
  }
  return {
    brain: createMockFlyBrain(),
    mode: "mock" as const,
    tradingMode,
    locale,
    thresholds,
  };
};

const patchHistory = (onNavigate: () => void) => {
  const wrap = (method: "pushState" | "replaceState") => {
    const original = history[method].bind(history);
    history[method] = function patched(
      ...args: Parameters<History["pushState"]>
    ) {
      const result = original(...args);
      onNavigate();
      return result;
    };
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", onNavigate);
};

const start = async () => {
  if (!adapter.detect()) return;

  const { brain, mode, tradingMode, locale, thresholds } = await resolveBrain();
  let latestOutput: BrainOutput | null = null;
  let sessionMessage = "";
  let brainUnavailable = false;
  let dataProviderError = false;
  let latestObservations: TimeframeObservation[] = [];

  const guestMarketOk = (): boolean => {
    const page = adapter.detectPageContext();
    const asset = adapter.readCurrentAsset();
    return (
      (page.pageKind === "trade" || page.pageKind === "asset-detail") &&
      Boolean(asset?.symbol) &&
      page.confidence >= 0.8
    );
  };

  const publish = async () => {
    const loginState = adapter.detectLoginState();
    const page = adapter.detectPageContext();
    const session = deriveSessionState({
      hasBrokerTab: true,
      loginState,
      marketOpen: adapter.isMarketOpen(),
      brainOutput: latestOutput,
      brainUnavailable: brainUnavailable || dataProviderError,
      pageKindUnknown: page.pageKind === "unknown" || page.confidence < 0.8,
      guestMarketOk: guestMarketOk(),
    });
    const bubbleKey = bubbleMessageKey(
      session,
      latestOutput?.state,
      dataProviderError,
    );
    sessionMessage = bubbleKey ? t(bubbleKey, locale) : "";
    const resolved = adapter.resolveTargets();
    await chrome.runtime.sendMessage({
      kind: "runtime-status",
      session,
      hasBrokerTab: true,
      activeBrokerId: adapter.id,
      loginState,
      message: sessionMessage,
      diagnostics: {
        pageKind: page.pageKind,
        pageConfidence: page.confidence,
        modal: page.modal,
        symbol: page.symbol ?? null,
        targets: {
          buy: resolved.buy
            ? {
                status: "FOUND",
                confidence: resolved.buy.confidence,
                strategy: resolved.buy.strategy,
              }
            : { status: "MISSING" },
          sell: resolved.sell
            ? {
                status: "FOUND",
                confidence: resolved.sell.confidence,
                strategy: resolved.sell.strategy,
              }
            : { status: "MISSING" },
          chart: resolved.chart
            ? {
                status: "FOUND",
                confidence: resolved.chart.confidence,
                strategy: resolved.chart.strategy,
              }
            : { status: "MISSING" },
        },
        timeframes: latestObservations.map((observation) => ({
          timeframe: observation.timeframe,
          available: observation.available,
          source: observation.source,
          candleCount: observation.candleCount,
          dataProvider: observation.dataProvider ?? null,
        })),
      },
    });
    return session;
  };

  const handle = mountShadowFly(document, {
    adapter,
    brain: {
      async evaluate(environment) {
        const loginState = adapter.detectLoginState();
        const page = adapter.detectPageContext();
        const guestOk = guestMarketOk();

        if (__FLY_E2E__ && e2eForcedOutput) {
          brainUnavailable = false;
          const output = e2eForcedOutput;
          latestOutput = output;
          await publish();

          const canTradePage =
            page.pageKind === "trade" || page.pageKind === "asset-detail";
          if (
            tradingMode === "paper" &&
            canTradePage &&
            environment.asset &&
            (output.state === "approach_buy" ||
              output.state === "approach_sell") &&
            ((output.state === "approach_buy" &&
              output.buyDrive > thresholds.buyThreshold) ||
              (output.state === "approach_sell" &&
                output.sellDrive > thresholds.sellThreshold))
          ) {
            const side = output.state === "approach_buy" ? "buy" : "sell";
            const quantity = paperQuantityForPrice(environment.asset.price);
            if (quantity <= 0) {
              return output;
            }
            const proposal = createOrderProposal({
              broker: adapter.id,
              symbol: environment.asset.symbol,
              instrumentId:
                environment.asset.instrumentId ??
                demoInstrumentId(environment.asset.symbol),
              side,
              price: environment.asset.price,
              quantity,
              brainOutput: output,
              brainMode: mode,
            });
            await chrome.runtime.sendMessage({
              kind: "paper-trade",
              proposal,
            });
          }

          if (environment.asset?.instrumentId) {
            void chrome.runtime.sendMessage({
              kind: "mark-to-market",
              quotes: [
                {
                  instrumentId: environment.asset.instrumentId,
                  price: environment.asset.price,
                  observedAt: new Date().toISOString(),
                },
              ],
            });
          }

          return output;
        }

        if (loginState === "LOGGED_OUT" && !guestOk) {
          brainUnavailable = false;
          dataProviderError = false;
          latestOutput = {
            state: "login_hint",
            buyDrive: 0,
            sellDrive: 0,
            curiosity: 0.2,
            danger: 0,
            activity: 0.1,
          };
          await publish();
          return latestOutput;
        }

        if (page.pageKind === "unknown" || page.confidence < 0.8) {
          latestOutput = {
            state: "explore",
            buyDrive: 0,
            sellDrive: 0,
            curiosity: 0.3,
            danger: 0,
            activity: 0.2,
          };
          await publish();
          return latestOutput;
        }

        latestObservations = await buildTimeframeObservations();
        const usable = filterUsableTimeframeObservations(latestObservations);
        dataProviderError = usable.length === 0;
        if (dataProviderError && !(__FLY_E2E__ && e2eForcedOutput)) {
          latestOutput = {
            state: "sleep",
            buyDrive: 0,
            sellDrive: 0,
            curiosity: 0,
            danger: 0,
            activity: 0,
          };
          await publish();
          return latestOutput;
        }

        const aggregated = aggregateTimeframeObservations(usable, environment);

        try {
          const output =
            __FLY_E2E__ && e2eForcedOutput
              ? e2eForcedOutput
              : await brain.evaluate(aggregated);
          brainUnavailable = false;
          latestOutput = output;
          await publish();

          const canTradePage =
            page.pageKind === "trade" || page.pageKind === "asset-detail";
          if (
            tradingMode === "paper" &&
            canTradePage &&
            !brainUnavailable &&
            (!dataProviderError || (__FLY_E2E__ && e2eForcedOutput)) &&
            environment.asset &&
            (output.state === "approach_buy" ||
              output.state === "approach_sell") &&
            ((output.state === "approach_buy" &&
              output.buyDrive > thresholds.buyThreshold) ||
              (output.state === "approach_sell" &&
                output.sellDrive > thresholds.sellThreshold))
          ) {
            const side = output.state === "approach_buy" ? "buy" : "sell";
            const quantity = paperQuantityForPrice(environment.asset.price);
            if (quantity <= 0) {
              return output;
            }
            const proposal = createOrderProposal({
              broker: adapter.id,
              symbol: environment.asset.symbol,
              instrumentId:
                environment.asset.instrumentId ??
                demoInstrumentId(environment.asset.symbol),
              side,
              price: environment.asset.price,
              quantity,
              brainOutput: output,
              brainMode: mode,
            });
            const paperResult = chrome.runtime.sendMessage({
              kind: "paper-trade",
              proposal,
            });
            if (__FLY_E2E__) {
              await paperResult;
            }
          }

          if (environment.asset?.instrumentId) {
            void chrome.runtime.sendMessage({
              kind: "mark-to-market",
              quotes: [
                {
                  instrumentId: environment.asset.instrumentId,
                  price: environment.asset.price,
                  observedAt: new Date().toISOString(),
                },
              ],
            });
          }

          return output;
        } catch {
          brainUnavailable = mode !== "mock";
          latestOutput = {
            state: "sleep",
            buyDrive: 0,
            sellDrive: 0,
            curiosity: 0,
            danger: 0,
            activity: 0,
          };
          await publish();
          if (brainUnavailable) {
            return latestOutput;
          }
          throw new Error("brain-unavailable");
        }
      },
    },
    bubbleText: () => sessionMessage || null,
    forceState: () => {
      const loginState = adapter.detectLoginState();
      // Only hard overrides. Let MaleCNS/Mock brain drive explore/chart/buy/sell.
      if (loginState === "LOGGED_OUT" && !guestMarketOk()) return "login_hint";
      if (!adapter.isMarketOpen()) return "sleep";
      if (brainUnavailable || (dataProviderError && !e2eForcedOutput)) {
        return "sleep";
      }
      return null;
    },
  });

  const captureForBridge = () => {
    const environment = adapter.readMarketEnvironment();
    if (!environment) return;
    void chrome.runtime
      .sendMessage({
        kind: "market-environment",
        source: adapter.id,
        capturedAt: new Date().toISOString(),
        environment,
      })
      .catch(() => undefined);
  };

  captureForBridge();
  const intervalId = window.setInterval(captureForBridge, SAMPLE_INTERVAL_MS);
  let mutationTimer = 0;
  const observer = new MutationObserver(() => {
    window.clearTimeout(mutationTimer);
    mutationTimer = window.setTimeout(() => {
      void publish();
    }, MUTATION_DEBOUNCE_MS);
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
  });
  patchHistory(() => {
    void publish();
  });

  window.addEventListener(
    "pagehide",
    () => {
      window.clearInterval(intervalId);
      window.clearTimeout(mutationTimer);
      observer.disconnect();
      handle.destroy();
    },
    { once: true },
  );

  await publish();

  if (__FLY_E2E__) {
    const host = window as E2EHost;
    let brokerClickCount = 0;
    document.addEventListener(
      "click",
      (event) => {
        const text = (event.target as HTMLElement | null)?.textContent ?? "";
        if (/Max Buy|Max Sell|^(Buy|Sell)$|^(매수|매도)$/i.test(text.trim())) {
          brokerClickCount += 1;
        }
      },
      true,
    );

    const collectDiagnostics = () => {
      const resolved = adapter.resolveTargets();
      return {
        brokerId: adapter.id,
        brainMode: mode,
        tradingMode,
        brainUnavailable,
        dataProviderError,
        page: adapter.detectPageContext(),
        asset: adapter.readCurrentAsset(),
        targets: {
          buy: Boolean(resolved.buy),
          sell: Boolean(resolved.sell),
          chart: Boolean(resolved.chart),
          search: Boolean(resolved.search),
          buyText: resolved.buy?.element.textContent?.trim() ?? null,
          sellText: resolved.sell?.element.textContent?.trim() ?? null,
          chartStrategy: resolved.chart?.strategy ?? null,
          searchStrategy: resolved.search?.strategy ?? null,
        },
        observations: latestObservations.map((item) => ({
          timeframe: item.timeframe,
          available: item.available,
          candleCount: item.candleCount,
          source: item.source,
        })),
        output: latestOutput,
        brokerClickCount,
        fly: (() => {
          const root = document.getElementById("fly-earn-better-root");
          const shadow = root?.shadowRoot ?? null;
          const overlay = shadow?.querySelector(
            ".overlay",
          ) as HTMLElement | null;
          const fly = shadow?.querySelector(".fly");
          return {
            root: Boolean(root),
            shadow: Boolean(shadow),
            pointerEvents: overlay
              ? getComputedStyle(overlay).pointerEvents
              : null,
            visible: Boolean(fly),
            state: fly?.getAttribute("data-fly-state") ?? null,
          };
        })(),
      };
    };

    host.__flyE2EForce = (output) => {
      e2eForcedOutput = output;
    };
    host.__flyE2EGetDiagnostics = collectDiagnostics;

    // Page-world bridge for Playwright (content scripts are isolated).
    document.documentElement.addEventListener("fly-e2e-force", ((
      event: CustomEvent<BrainOutput>,
    ) => {
      e2eForcedOutput = event.detail;
    }) as EventListener);
    document.documentElement.addEventListener("fly-e2e-diag-request", () => {
      document.documentElement.setAttribute(
        "data-fly-e2e-diag",
        JSON.stringify(collectDiagnostics()),
      );
      document.documentElement.dispatchEvent(
        new CustomEvent("fly-e2e-diag-ready"),
      );
    });
  }
};

void start();
