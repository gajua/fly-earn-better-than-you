import { createDemoBrokerAdapter } from "@fly/broker-adapters";
import { observationFromCandles } from "@fly/broker-adapters";
import {
  createMaleCNSBrain,
  createMockFlyBrain,
} from "@fly/brain-client";
import {
  aggregateTimeframeObservations,
  demoInstrumentId,
  deriveSessionState,
  filterUsableTimeframeObservations,
  sessionToFlyState,
  type BrainOutput,
  type TimeframeObservation,
} from "@fly/core";
import { mountShadowFly } from "@fly/fly-ui/shadow-fly";
import { createOrderProposal } from "./orders";

const SAMPLE_INTERVAL_MS = 2_000;
const MUTATION_DEBOUNCE_MS = 350;

const adapter = createDemoBrokerAdapter();

const buildTimeframeObservations = async (): Promise<TimeframeObservation[]> => {
  const environment = adapter.readMarketEnvironment();
  if (!environment?.asset) return [];
  const provider = adapter.getMarketDataProvider();
  const instrumentId =
    environment.asset.instrumentId ?? demoInstrumentId(environment.asset.symbol);
  const timeframes = adapter.getAvailableTimeframes();
  const observations: TimeframeObservation[] = [];

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
        source: "demo",
        candleCount: 0,
        available: false,
      });
      continue;
    }
    observations.push(
      observationFromCandles({
        symbol: environment.asset.symbol,
        instrumentId,
        timeframe,
        candles,
        source: "demo",
      }),
    );
  }
  return observations;
};

const resolveBrain = async () => {
  const response = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as {
    preferences?: {
      brainMode?: string;
      brainBaseUrl?: string;
      tradingMode?: string;
    };
  };
  const preferences = response.preferences;
  const mode = preferences?.brainMode ?? "mock";
  const baseUrl = preferences?.brainBaseUrl ?? "http://127.0.0.1:8000";
  if (mode === "real-connectome") {
    return {
      brain: createMaleCNSBrain({ mode: "malecns", baseUrl }),
      mode: "real-connectome" as const,
      tradingMode: preferences?.tradingMode ?? "paper",
    };
  }
  if (mode === "shuffled-control") {
    return {
      brain: createMaleCNSBrain({ mode: "shuffled-control", baseUrl }),
      mode: "shuffled-control" as const,
      tradingMode: preferences?.tradingMode ?? "paper",
    };
  }
  return {
    brain: createMockFlyBrain(),
    mode: "mock" as const,
    tradingMode: preferences?.tradingMode ?? "paper",
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

  const { brain, mode, tradingMode } = await resolveBrain();
  let latestOutput: BrainOutput | null = null;
  let sessionMessage = "";
  let brainUnavailable = false;
  let latestObservations: TimeframeObservation[] = [];

  const publish = async () => {
    const loginState = adapter.detectLoginState();
    const page = adapter.detectPageContext();
    const session = deriveSessionState({
      hasBrokerTab: true,
      loginState,
      marketOpen: adapter.isMarketOpen(),
      brainOutput: latestOutput,
      brainUnavailable,
      pageKindUnknown: page.pageKind === "unknown" || page.confidence < 0.8,
    });
    sessionMessage =
      session === "BROKER_LOGGED_OUT"
        ? "로그인하면 포트폴리오도 볼 수 있어."
        : session === "BRAIN_UNAVAILABLE"
          ? "MaleCNS unavailable — proposals paused."
          : session === "BUY_INTEREST"
            ? "이 종목에 강하게 반응 중"
            : session === "SELL_INTEREST"
              ? "이 포지션에서 멀어지고 싶어 하는 중."
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
        if (loginState !== "LOGGED_IN") {
          brainUnavailable = false;
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
        const aggregated = aggregateTimeframeObservations(usable, environment);

        try {
          const output = await brain.evaluate(aggregated);
          brainUnavailable = false;
          latestOutput = output;
          await publish();

          const canTradePage =
            page.pageKind === "trade" || page.pageKind === "asset-detail";
          if (
            tradingMode === "paper" &&
            canTradePage &&
            !brainUnavailable &&
            environment.asset &&
            (output.state === "approach_buy" ||
              output.state === "approach_sell") &&
            Math.max(output.buyDrive, output.sellDrive) > 0.82
          ) {
            const side = output.state === "approach_buy" ? "buy" : "sell";
            const proposal = createOrderProposal({
              broker: adapter.id,
              symbol: environment.asset.symbol,
              instrumentId:
                environment.asset.instrumentId ??
                demoInstrumentId(environment.asset.symbol),
              side,
              price: environment.asset.price,
              quantity: 1,
              brainOutput: output,
              brainMode: mode,
            });
            void chrome.runtime.sendMessage({ kind: "paper-trade", proposal });
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
      if (loginState !== "LOGGED_IN") return "login_hint";
      if (!adapter.isMarketOpen()) return "sleep";
      if (brainUnavailable) return "sleep";
      if (!latestOutput) return null;
      return sessionToFlyState(
        deriveSessionState({
          hasBrokerTab: true,
          loginState,
          marketOpen: true,
          brainOutput: latestOutput,
          brainUnavailable,
        }),
      );
    },
  });

  const captureForBridge = () => {
    const environment = adapter.readMarketEnvironment();
    if (!environment) return;
    void chrome.runtime
      .sendMessage({
        kind: "market-environment",
        source: "demo",
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
};

void start();
