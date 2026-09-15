import {
  createDemoBrokerAdapter,
  findBrokerByUrl,
  observationFromCandles,
  type BrokerAdapter,
} from "@fly/broker-adapters";
import {
  createMaleCNSBrain,
  createMockFlyBrain,
  evaluateModularMaleCNS,
} from "@fly/brain-client";
import {
  aggregateTimeframeObservations,
  brainOutputFromModular,
  demoInstrumentId,
  deriveSessionState,
  evaluateModularMock,
  featuresToMarketSlice,
  filterUsableTimeframeObservations,
  shouldEvaluateBrain,
  type BrainGatingState,
  type BrainOutput,
  type ModularEvaluateResult,
  type TimeframeObservation,
} from "@fly/core";
import { mountShadowFly } from "@fly/fly-ui/shadow-fly";
import { loadActiveGlobalPreset } from "./global-preset-runtime";
import { startExplorationRuntime } from "./exploration/runtime";
import type { ExplorationHint } from "./exploration/runtime";
import { bubbleMessageKey, resolveLocale, t } from "./i18n";
import {
  createOrderProposal,
  marketFeaturesFromEnvironment,
  paperQuantityForPrice,
} from "./orders";
import type { ExtensionPreferences } from "./storage/preferences";
import { buildPaperCardSnapshot } from "./content/paper-snapshot";
import { notifyPaperFill } from "./content/paper-trade-notify";
import type { PaperFlyUxState } from "@fly/fly-ui/paper-overlay-types";

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
  const { gates: thresholds } = await loadActiveGlobalPreset();
  if (mode === "real-connectome") {
    return {
      brain: createMaleCNSBrain({ mode: "malecns", baseUrl, fetchImpl }),
      mode: "real-connectome" as const,
      tradingMode,
      locale,
      thresholds,
      brainBaseUrl: baseUrl,
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
      brainBaseUrl: baseUrl,
    };
  }
  return {
    brain: createMockFlyBrain(),
    mode: "mock" as const,
    tradingMode,
    locale,
    thresholds,
    brainBaseUrl: baseUrl,
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

  const { brain, mode, tradingMode, locale, thresholds, brainBaseUrl } =
    await resolveBrain();
  const { preset } = await loadActiveGlobalPreset();
  const presetVersion = preset.presetVersion;
  const prefsResponse = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as { preferences?: ExtensionPreferences };
  let livePreferences = prefsResponse.preferences;
  let latestOutput: BrainOutput | null = null;
  let sessionMessage = "";
  let brainUnavailable = false;
  let dataProviderError = false;
  let latestObservations: TimeframeObservation[] = [];
  let explorationHint: ExplorationHint | null = null;
  let exploration = null as ReturnType<typeof startExplorationRuntime> | null;
  let brainGating: BrainGatingState = {
    lastEvalAt: 0,
    lastPrice: null,
    lastSymbol: null,
    lastTimeframe: null,
  };
  let localModularRecordCount = 0;
  const paperOverlay = {
    starting: livePreferences?.startingPaperCapital ?? 1_000_000,
    equity: livePreferences?.startingPaperCapital ?? 1_000_000,
    returnPct: 0,
    hasPosition: false,
    unrealizedPct: null as number | null,
    avgEntry: null as number | null,
  };

  const uxStateLabel = (state: PaperFlyUxState): string =>
    t(`fly.ux.${state}` as "fly.ux.OBSERVING", locale);

  const refreshPaperOverlay = async (
    instrumentId?: string,
    markPrice?: number,
  ): Promise<void> => {
    const res = (await chrome.runtime.sendMessage({
      kind: "get-performance",
      range: "all",
    })) as {
      ok?: boolean;
      paper?: {
        totalReturnPercent?: number;
        unrealizedPnl?: number;
        netRealizedPnl?: number;
      };
      extended?: { startingPaperCapital?: number; totalReturnPercent?: number };
      exposure?: {
        positions?: {
          instrumentId: string;
          quantity: number;
          averagePrice: number;
          marketPrice: number;
        }[];
      };
    };
    if (!res?.ok) return;
    const starting =
      res.extended?.startingPaperCapital ??
      livePreferences?.startingPaperCapital ??
      paperOverlay.starting;
    paperOverlay.starting = starting;
    const ret =
      res.paper?.totalReturnPercent ?? res.extended?.totalReturnPercent ?? 0;
    paperOverlay.returnPct = ret;
    paperOverlay.equity = starting * (1 + ret / 100);
    const pos = res.exposure?.positions?.find(
      (row) =>
        instrumentId && row.instrumentId === instrumentId && row.quantity > 0,
    );
    paperOverlay.hasPosition = Boolean(pos);
    paperOverlay.avgEntry = pos?.averagePrice ?? null;
    if (pos && markPrice && pos.averagePrice > 0) {
      paperOverlay.unrealizedPct =
        ((markPrice - pos.averagePrice) / pos.averagePrice) * 100;
    } else if (pos && pos.marketPrice > 0 && pos.averagePrice > 0) {
      paperOverlay.unrealizedPct =
        ((pos.marketPrice - pos.averagePrice) / pos.averagePrice) * 100;
    } else {
      paperOverlay.unrealizedPct = null;
    }
  };

  void refreshPaperOverlay();
  const paperOverlayTimer = window.setInterval(
    () => void refreshPaperOverlay(),
    4_000,
  );

  const recordLocalModular = (
    environment: NonNullable<
      ReturnType<BrokerAdapter["readMarketEnvironment"]>
    >,
    modular: ModularEvaluateResult,
    timeframe: string,
  ): void => {
    if (livePreferences?.localDataCollection === false) return;
    localModularRecordCount += 1;
    void chrome.runtime
      .sendMessage({
        kind: "record-modular-observation",
        payload: {
          broker: adapter.id,
          symbol: environment.asset?.symbol ?? "UNKNOWN",
          instrumentId:
            environment.asset?.instrumentId ??
            `${adapter.id}:spot:${environment.asset?.symbol ?? "UNKNOWN"}:USDT`,
          timeframe,
          price: environment.asset?.price ?? 0,
          momentum: environment.market.momentum,
          volatility: environment.market.volatility,
          relativeVolume: environment.market.volumeStrength,
          trendConflict: environment.market.trendConflict ?? 0,
          novelty: environment.market.novelty ?? 0,
          presetVersion,
          modular,
        },
      })
      .catch(() => undefined);
  };

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
    sessionMessage =
      livePreferences?.autonomousExploration === true
        ? explorationHint?.thought || (bubbleKey ? t(bubbleKey, locale) : "")
        : bubbleKey
          ? t(bubbleKey, locale)
          : "";
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

  const handle =
    livePreferences?.flyOverlayEnabled === false
      ? { destroy() {} }
      : mountShadowFly(document, {
          adapter,
          simplePaperMode: livePreferences?.autonomousExploration !== true,
          paperCardLabels: {
            flyTitle: "Fly",
            virtualCapital: t("overlay.virtualCapital", locale),
            cumulative: t("overlay.cumulative", locale),
            start: t("overlay.start", locale),
            current: t("overlay.current", locale),
            position: t("overlay.position", locale),
            unrealized: t("overlay.unrealized", locale),
          },
          paperCard: () => {
            const asset = adapter.readCurrentAsset();
            if (!asset?.symbol) return null;
            const sleeping =
              brainUnavailable || (dataProviderError && !e2eForcedOutput);
            return buildPaperCardSnapshot({
              symbol: asset.symbol,
              output: latestOutput,
              startingCapital: paperOverlay.starting,
              currentEquity: paperOverlay.equity,
              cumulativeReturnPct: paperOverlay.returnPct,
              hasPosition: paperOverlay.hasPosition,
              unrealizedPct: paperOverlay.unrealizedPct,
              avgEntry: paperOverlay.avgEntry,
              sleeping,
              uxStateLabels: {
                OBSERVING: uxStateLabel("OBSERVING"),
                WATCHING: uxStateLabel("WATCHING"),
                BUYING: uxStateLabel("BUYING"),
                HOLDING: uxStateLabel("HOLDING"),
                SELLING: uxStateLabel("SELLING"),
                RESTING: uxStateLabel("RESTING"),
              },
              positionNoneLabel: t("overlay.positionNone", locale),
              positionHoldingLabel: t("overlay.positionHolding", locale),
            });
          },
          explorationHint: () =>
            livePreferences?.autonomousExploration === true
              ? explorationHint
              : null,
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
                  const quantity = paperQuantityForPrice(
                    environment.asset.price,
                  );
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
                    marketFeatures: marketFeaturesFromEnvironment(environment),
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
              const usable =
                filterUsableTimeframeObservations(latestObservations);
              dataProviderError = usable.length === 0;
              if (dataProviderError && !(__FLY_E2E__ && e2eForcedOutput)) {
                if (
                  __FLY_E2E__ &&
                  livePreferences?.localDataCollection !== false &&
                  mode === "mock" &&
                  environment.asset &&
                  environment.asset.price > 0
                ) {
                  const modular = evaluateModularMock(environment);
                  recordLocalModular(environment, modular, "1h");
                }
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

              const aggregated = aggregateTimeframeObservations(
                usable,
                environment,
              );
              const slice = exploration?.latest();
              const primaryTimeframe =
                usable.find((row) => row.available)?.timeframe ?? "1h";
              const observed =
                slice?.memory.observations[slice.symbol]?.[slice.timeframe]
                  ?.features;
              const marketExtras = observed
                ? featuresToMarketSlice(observed)
                : null;
              const environmentForBrain =
                livePreferences?.autonomousExploration === true && marketExtras
                  ? {
                      ...aggregated,
                      market: {
                        ...aggregated.market,
                        novelty: marketExtras.novelty,
                        trendConflict: marketExtras.trendConflict,
                      },
                    }
                  : aggregated;

              const gating = shouldEvaluateBrain(brainGating, {
                now: Date.now(),
                symbol: environment.asset?.symbol ?? null,
                timeframe:
                  livePreferences?.autonomousExploration === true
                    ? (slice?.timeframe ?? null)
                    : primaryTimeframe,
                price: environment.asset?.price ?? null,
                novelty:
                  marketExtras?.novelty ?? aggregated.market.novelty ?? 0,
                trendConflict:
                  marketExtras?.trendConflict ??
                  aggregated.market.trendConflict ??
                  0,
                relativeVolume: environmentForBrain.market.volumeStrength,
                symbolChanged:
                  brainGating.lastSymbol !==
                  (environment.asset?.symbol ?? null),
                timeframeChanged:
                  livePreferences?.autonomousExploration === true &&
                  brainGating.lastTimeframe !== (slice?.timeframe ?? null),
                revisit:
                  livePreferences?.autonomousExploration === true &&
                  slice?.intent === "REVISIT",
              });
              brainGating = gating.next;
              if (
                !gating.evaluate &&
                latestOutput &&
                !(__FLY_E2E__ && e2eForcedOutput)
              ) {
                return latestOutput;
              }

              try {
                let output: BrainOutput;
                const collectLocal =
                  livePreferences?.localDataCollection !== false;
                const timeframe =
                  livePreferences?.autonomousExploration === true
                    ? (slice?.timeframe ?? "1h")
                    : primaryTimeframe;
                if (__FLY_E2E__ && e2eForcedOutput) {
                  output = e2eForcedOutput;
                } else if (
                  collectLocal &&
                  (mode === "real-connectome" || mode === "shuffled-control")
                ) {
                  const modularResponse = await evaluateModularMaleCNS({
                    environment: environmentForBrain,
                    baseUrl: brainBaseUrl,
                    mode:
                      mode === "shuffled-control"
                        ? "shuffled-control"
                        : "malecns",
                    fetchImpl: createBrainFetch(),
                  });
                  output = modularResponse.brainOutput;
                  recordLocalModular(
                    environmentForBrain,
                    modularResponse,
                    timeframe,
                  );
                } else if (collectLocal && mode === "mock") {
                  const modular = evaluateModularMock(environmentForBrain);
                  output = brainOutputFromModular(modular);
                  recordLocalModular(environmentForBrain, modular, timeframe);
                } else {
                  output = await brain.evaluate(environmentForBrain);
                }
                brainUnavailable = false;
                latestOutput = output;
                await publish();

                const explorationAllowsPaper =
                  livePreferences?.autonomousExploration === true
                    ? Boolean(exploration?.latest()?.allowPaperProposal) ||
                      Boolean(__FLY_E2E__ && e2eForcedOutput)
                    : livePreferences?.paperAutoTrade !== false;
                const canTradePage =
                  page.pageKind === "trade" || page.pageKind === "asset-detail";
                if (
                  tradingMode === "paper" &&
                  canTradePage &&
                  explorationAllowsPaper &&
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
                  if (side === "sell" && !paperOverlay.hasPosition) {
                    return output;
                  }
                  if (side === "buy" && paperOverlay.hasPosition) {
                    return output;
                  }
                  const quantity = paperQuantityForPrice(
                    environment.asset.price,
                  );
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
                    marketFeatures: marketFeaturesFromEnvironment(environment),
                  });
                  const paperResult = (await chrome.runtime.sendMessage({
                    kind: "paper-trade",
                    proposal,
                  })) as
                    | { ok: true; trade?: { side: string; value?: number } }
                    | { ok: false; reason?: string };
                  if (
                    paperResult.ok &&
                    livePreferences?.tradeNotifications !== false
                  ) {
                    await refreshPaperOverlay(
                      proposal.instrumentId,
                      environment.asset.price,
                    );
                    notifyPaperFill({
                      side,
                      symbol: environment.asset.symbol,
                      value: proposal.estimatedPrice * quantity,
                      price: environment.asset.price,
                      tradeReturnPct:
                        side === "sell" ? paperOverlay.returnPct : undefined,
                      pnl:
                        side === "sell" && paperResult.trade
                          ? undefined
                          : undefined,
                      cumulativeReturnPct: paperOverlay.returnPct,
                      locale,
                      useToast: true,
                      useChromeNotification: true,
                    });
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
          bubbleText: () =>
            livePreferences?.autonomousExploration === true
              ? sessionMessage || null
              : null,
          onPauseExploration: () => exploration?.pause(),
          forceState: () => {
            const loginState = adapter.detectLoginState();
            // Only hard overrides. Let MaleCNS/Mock brain drive explore/chart/buy/sell.
            if (loginState === "LOGGED_OUT" && !guestMarketOk())
              return "login_hint";
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
      window.clearInterval(paperOverlayTimer);
      window.clearTimeout(mutationTimer);
      observer.disconnect();
      exploration?.stop();
      handle.destroy();
    },
    { once: true },
  );

  await publish();

  if (livePreferences?.autonomousExploration === true) {
    exploration = startExplorationRuntime({
      adapter,
      getNeural: () => latestOutput,
      getPreferences: () =>
        livePreferences ??
        ({
          autonomousExploration: true,
          explorationSpeed: "normal",
          visibleBrowserControl: true,
          flyActivityHud: true,
          explorationPaused: false,
        } as ExtensionPreferences),
      locale,
      onHint: (next) => {
        explorationHint = next;
      },
      onWakeNotice: (message) => {
        sessionMessage = message;
      },
      setPaused: async (paused) => {
        const current = (await chrome.runtime.sendMessage({
          kind: "get-preferences",
        })) as { preferences?: ExtensionPreferences };
        if (!current.preferences) return;
        livePreferences = {
          ...current.preferences,
          explorationPaused: paused,
        };
        await chrome.runtime.sendMessage({
          kind: "set-preferences",
          preferences: livePreferences,
        });
      },
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes["fly-preferences"]) return;
    void chrome.runtime.sendMessage({ kind: "get-preferences" }).then((raw) => {
      const response = raw as { preferences?: ExtensionPreferences };
      if (response.preferences) livePreferences = response.preferences;
    });
  });

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
        exploration: exploration?.latest()
          ? {
              state: exploration.latest()?.state,
              symbol: exploration.latest()?.symbol,
              timeframe: exploration.latest()?.timeframe,
              intent: exploration.latest()?.intent,
              thought: exploration.hint()?.thought ?? null,
              hud: Boolean(exploration.hint()?.hud),
            }
          : null,
        brokerClickCount,
        localModularRecordCount,
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
