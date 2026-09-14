import {
  createBinanceUiExplorer,
  createBinanceUniverseProvider,
  type BrokerAdapter,
  type BrokerUIExplorer,
} from "@fly/broker-adapters";
import {
  computeMarketFeatures,
  formatLogLine,
  stepExploration,
  toInstrumentId,
  type BrainOutput,
  type ExplorationMotion,
  type ExplorationSpeed,
  type ExplorationState,
  type FlyIntent,
  type FlyMemory,
  type HudSnapshot,
  type MarketFeatures,
  type PolicyResult,
  type Timeframe,
} from "@fly/core";
import type { ResolvedLocale } from "../i18n";
import type { ExtensionPreferences } from "../storage/preferences";
import {
  readExplorationCursor,
  readExplorationMemory,
  writeExplorationCursor,
  writeExplorationMemory,
} from "./memory-store";

export interface ExplorationHint {
  readonly motion: ExplorationMotion;
  readonly thought: string;
  readonly hud: HudSnapshot | null;
}

export interface ExplorationHandle {
  stop(): void;
  pause(): void;
  latest(): PolicyResult | null;
  hint(): ExplorationHint | null;
}

const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const watchingReasons = (reasons: readonly string[]): string[] => {
  const labels: Record<string, string> = {
    novelty: "novelty",
    "trend-conflict": "MA / TF conflict",
    volume: "volume",
    volatility: "volatility",
    scan: "scan",
  };
  const unique = [...new Set(reasons)];
  return unique.map((reason) => labels[reason] ?? reason).slice(0, 4);
};

export const startExplorationRuntime = (input: {
  readonly adapter: BrokerAdapter;
  readonly getNeural: () => BrainOutput | null;
  readonly getPreferences: () => ExtensionPreferences;
  readonly locale: ResolvedLocale;
  readonly onHint: (hint: ExplorationHint | null) => void;
  readonly onWakeNotice: (message: string) => void;
  readonly setPaused: (paused: boolean) => Promise<void>;
}): ExplorationHandle => {
  const controller = new AbortController();
  let latest: PolicyResult | null = null;
  let hint: ExplorationHint | null = null;
  let pausedLocal = false;

  const explorer: BrokerUIExplorer | null =
    input.adapter.id === "binance" ? createBinanceUiExplorer(document) : null;
  const universe = createBinanceUniverseProvider({
    visibleSymbols: () => [],
  });

  const buildHud = (
    result: PolicyResult,
    prefs: ExtensionPreferences,
    uiNote?: string,
  ): HudSnapshot => ({
    compactTitle:
      prefs.explorationPaused || pausedLocal
        ? "🪰 Paused"
        : result.state === "WAKE"
          ? "🪰 Fly is awake"
          : "🪰 Exploring",
    symbol: result.symbol,
    timeframe: result.timeframe,
    intent: result.intent,
    watching: watchingReasons(result.reasons),
    curiosity: result.agent.curiosity,
    novelty: result.agent.novelty,
    volatility: result.agent.interest,
    trendConflict:
      result.memory.observations[result.symbol]?.[result.timeframe]?.features
        .trendConflict ?? 0,
    relativeVolume:
      result.memory.observations[result.symbol]?.[result.timeframe]?.features
        .relativeVolume ?? 0,
    approach: input.getNeural()?.buyDrive ?? 0,
    avoid: input.getNeural()?.sellDrive ?? 0,
    explore: input.getNeural()?.curiosity ?? result.agent.curiosity,
    nextHint: result.changeTimeframe
      ? `Inspect ${result.changeTimeframe}`
      : result.navigateSymbol
        ? `Look at ${result.navigateSymbol}`
        : result.state,
    thought: result.thought,
    log: result.memory.activityLog
      .slice(-8)
      .map((entry) =>
        formatLogLine(
          entry.timestamp,
          entry.symbol,
          entry.timeframe,
          entry.summary,
        ),
      ),
    uiControlNote: uiNote,
    paused: prefs.explorationPaused || pausedLocal,
    detailed: false,
  });

  const loadFeatures = async (
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketFeatures | null> => {
    const provider = input.adapter.getMarketDataProvider();
    const quote = symbol.endsWith("USDC") ? "USDC" : "USDT";
    const instrumentId = toInstrumentId({
      broker: input.adapter.id === "upbit" ? "upbit" : "binance",
      marketType: "spot",
      symbol,
      quoteCurrency: quote,
    });
    const candles = provider
      ? await provider.getCandles(instrumentId, timeframe)
      : null;
    if (!candles || candles.length === 0) return null;
    return computeMarketFeatures(candles);
  };

  const loop = async () => {
    let memory: FlyMemory = await readExplorationMemory();
    const cursor = await readExplorationCursor();
    const pageSymbol =
      (await explorer?.getCurrentSymbol()) ??
      input.adapter.readCurrentAsset()?.symbol ??
      "BTCUSDT";
    let state: ExplorationState = cursor?.state ?? "SLEEP";
    let symbol = pageSymbol;
    let timeframe: Timeframe = cursor?.timeframe ?? "1d";
    if (cursor && cursor.symbol !== pageSymbol) {
      state = "INSPECT_SYMBOL";
    }
    const prefs0 = input.getPreferences();
    if (prefs0.autonomousExploration && !cursor) {
      input.onWakeNotice(
        input.locale === "ko"
          ? "🪰 Fly가 깨어났어. 시장을 둘러보기 위해 화면을 잠깐 조종할게."
          : "🪰 Fly is awake. I’ll steer the screen briefly to look around the market.",
      );
    }

    while (!controller.signal.aborted) {
      const prefs = input.getPreferences();
      const speed: ExplorationSpeed = prefs.explorationSpeed;
      const paused =
        pausedLocal || prefs.explorationPaused || !prefs.autonomousExploration;
      if (!paused && explorer) {
        const domSymbol = await explorer.getCurrentSymbol();
        if (domSymbol) symbol = domSymbol;
        const domTimeframe = await explorer.getCurrentTimeframe();
        if (domTimeframe) timeframe = domTimeframe;
      }
      if (!prefs.flyActivityHud) {
        hint = null;
        input.onHint(null);
      }

      const candidates =
        input.adapter.id === "binance"
          ? await universe.getCandidates(symbol)
          : [{ symbol, source: "current" as const }];
      const features = await loadFeatures(symbol, timeframe);
      const featuresBySymbol: Record<
        string,
        Partial<Record<Timeframe, MarketFeatures>>
      > = {
        [symbol]: { [timeframe]: features ?? undefined },
      };
      const result = stepExploration({
        state,
        symbol,
        timeframe,
        memory,
        candidates,
        features,
        featuresBySymbol,
        neural: input.getNeural(),
        now: Date.now(),
        speed,
        paused,
        random: Math.random,
        locale: input.locale,
      });
      latest = result;
      memory = result.memory;
      state = result.state;
      symbol = result.symbol;
      timeframe = result.timeframe;
      await writeExplorationMemory(memory);
      await writeExplorationCursor({ state, symbol, timeframe });

      let uiNote: string | undefined;
      if (
        !paused &&
        prefs.visibleBrowserControl &&
        explorer &&
        result.navigateSymbol
      ) {
        const nav = await explorer.navigateToSymbol(result.navigateSymbol);
        if (!nav.ok) {
          uiNote =
            input.locale === "ko"
              ? "차트 UI를 조작하지 못했어 — 시세는 직접 관찰 중."
              : "Could not control chart UI — observing market data directly";
        } else if (nav.reason === "url-assign") {
          const hud = prefs.flyActivityHud
            ? buildHud(result, prefs, uiNote)
            : null;
          hint = { motion: result.motion, thought: result.thought, hud };
          input.onHint(hint);
          await sleep(Math.max(400, result.dwellMs), controller.signal);
          continue;
        } else {
          await explorer.focusChart();
        }
      }
      if (
        !paused &&
        prefs.visibleBrowserControl &&
        explorer &&
        result.changeTimeframe
      ) {
        const changed = await explorer.changeTimeframe(result.changeTimeframe);
        if (!changed.ok) {
          uiNote =
            uiNote ??
            (input.locale === "ko"
              ? "시간봉 UI를 바꾸지 못했어 — 시세는 직접 관찰 중."
              : "Could not control chart UI — observing market data directly");
        }
      }
      if (!prefs.visibleBrowserControl) {
        uiNote =
          input.locale === "ko"
            ? "화면 조작 없이 시세만 관찰 중."
            : "Observing market data without moving the chart UI.";
      }

      const hud = prefs.flyActivityHud ? buildHud(result, prefs, uiNote) : null;
      hint = {
        motion: result.motion,
        thought: result.thought,
        hud,
      };
      input.onHint(hint);
      await sleep(Math.max(400, result.dwellMs), controller.signal);
    }
  };

  void loop();

  return {
    stop() {
      controller.abort();
    },
    pause() {
      pausedLocal = !pausedLocal;
      void input.setPaused(pausedLocal);
    },
    latest: () => latest,
    hint: () => hint,
  };
};

export type { FlyIntent };
