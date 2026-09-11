import { createDemoBrokerAdapter } from "@fly/broker-adapters";
import {
  createMaleCNSBrain,
  createMockFlyBrain,
} from "@fly/brain-client";
import {
  aggregateTimeframeObservations,
  deriveSessionState,
  sessionToFlyState,
  type BrainOutput,
  type TimeframeObservation,
} from "@fly/core";
import { mountShadowFly } from "@fly/fly-ui/shadow-fly";
import { createOrderProposal } from "./orders";

const SAMPLE_INTERVAL_MS = 2_000;

const adapter = createDemoBrokerAdapter();

const buildTimeframeObservations = (): TimeframeObservation[] => {
  const environment = adapter.readMarketEnvironment();
  if (!environment?.asset) return [];
  const timeframes = adapter.getAvailableTimeframes();
  const now = new Date().toISOString();
  return timeframes.map((timeframe, index) => {
    const scale = 1 - index * 0.08;
    return {
      symbol: environment.asset!.symbol,
      timeframe,
      price: environment.asset!.price,
      returnPercent: environment.asset!.changePercent * scale,
      momentum: environment.market.momentum * scale,
      volatility: environment.market.volatility,
      volumeStrength: environment.market.volumeStrength,
      timestamp: now,
    };
  });
};

const resolveBrain = async () => {
  const response = (await chrome.runtime.sendMessage({
    kind: "get-preferences",
  })) as { preferences?: {
    brainMode?: string;
    brainBaseUrl?: string;
    tradingMode?: string;
  } };
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

const start = async () => {
  if (!adapter.detect()) return;

  const { brain, mode, tradingMode } = await resolveBrain();
  let latestOutput: BrainOutput | null = null;
  let sessionMessage = "";

  const publish = async () => {
    const loginState = adapter.detectLoginState();
    const session = deriveSessionState({
      hasBrokerTab: true,
      loginState,
      marketOpen: adapter.isMarketOpen(),
      brainOutput: latestOutput,
    });
    sessionMessage =
      session === "BROKER_LOGGED_OUT"
        ? "로그인하면 포트폴리오도 볼 수 있어."
        : session === "BUY_INTEREST"
          ? "이 종목에 강하게 반응 중"
          : session === "SELL_INTEREST"
            ? "이 포지션에서 멀어지고 싶어 하는 중."
            : "";
    await chrome.runtime.sendMessage({
      kind: "runtime-status",
      session,
      hasBrokerTab: true,
      activeBrokerId: adapter.id,
      loginState,
      message: sessionMessage,
    });
    return session;
  };

  const handle = mountShadowFly(document, {
    adapter,
    brain: {
      async evaluate(environment) {
        const loginState = adapter.detectLoginState();
        if (loginState !== "LOGGED_IN") {
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

        const observations = buildTimeframeObservations();
        const aggregated = aggregateTimeframeObservations(
          observations,
          environment,
        );
        const output = await brain.evaluate(aggregated);
        latestOutput = output;
        await publish();

        if (
          tradingMode === "paper" &&
          environment.asset &&
          (output.state === "approach_buy" || output.state === "approach_sell") &&
          Math.max(output.buyDrive, output.sellDrive) > 0.82
        ) {
          const side = output.state === "approach_buy" ? "buy" : "sell";
          const proposal = createOrderProposal({
            broker: adapter.id,
            symbol: environment.asset.symbol,
            side,
            price: environment.asset.price,
            quantity: 1,
            brainOutput: output,
            brainMode: mode,
          });
          void chrome.runtime.sendMessage({ kind: "paper-trade", proposal });
        }

        return output;
      },
    },
    bubbleText: () => sessionMessage || null,
    forceState: () => {
      const loginState = adapter.detectLoginState();
      if (loginState !== "LOGGED_IN") return "login_hint";
      if (!adapter.isMarketOpen()) return "sleep";
      if (!latestOutput) return null;
      return sessionToFlyState(
        deriveSessionState({
          hasBrokerTab: true,
          loginState,
          marketOpen: true,
          brainOutput: latestOutput,
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
  const observer = new MutationObserver(() => {
    void publish();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
  });

  window.addEventListener(
    "pagehide",
    () => {
      window.clearInterval(intervalId);
      observer.disconnect();
      handle.destroy();
    },
    { once: true },
  );

  await publish();
};

void start();
