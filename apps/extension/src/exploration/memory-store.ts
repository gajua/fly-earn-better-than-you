import {
  emptyFlyMemory,
  type ExplorationState,
  type FlyMemory,
  type Timeframe,
} from "@fly/core";

export const EXPLORATION_MEMORY_KEY = "fly-exploration-memory";
export const EXPLORATION_CURSOR_KEY = "fly-exploration-cursor";

export interface ExplorationCursor {
  readonly state: ExplorationState;
  readonly symbol: string;
  readonly timeframe: Timeframe;
}

export const readExplorationMemory = async (): Promise<FlyMemory> => {
  const stored = await chrome.storage.local.get(EXPLORATION_MEMORY_KEY);
  const value = stored[EXPLORATION_MEMORY_KEY];
  if (!value || typeof value !== "object") return emptyFlyMemory();
  return {
    ...emptyFlyMemory(),
    ...(value as Partial<FlyMemory>),
    visitedSymbols: (value as FlyMemory).visitedSymbols ?? {},
    observations: (value as FlyMemory).observations ?? {},
    interestingSymbols: (value as FlyMemory).interestingSymbols ?? [],
    previousIntents: (value as FlyMemory).previousIntents ?? [],
    openPaperPositions: (value as FlyMemory).openPaperPositions ?? [],
    activityLog: (value as FlyMemory).activityLog ?? [],
  };
};

export const writeExplorationMemory = async (
  memory: FlyMemory,
): Promise<void> => {
  await chrome.storage.local.set({ [EXPLORATION_MEMORY_KEY]: memory });
};

const isExplorationState = (value: unknown): value is ExplorationState =>
  typeof value === "string" &&
  [
    "SLEEP",
    "WAKE",
    "ORIENT",
    "SCAN_MARKET",
    "INSPECT_SYMBOL",
    "CHANGE_TIMEFRAME",
    "OBSERVE",
    "COMPARE",
    "CURIOUS",
    "REVISIT",
    "FOCUS",
    "DECIDE",
    "REST",
  ].includes(value);

export const readExplorationCursor =
  async (): Promise<ExplorationCursor | null> => {
    const stored = await chrome.storage.local.get(EXPLORATION_CURSOR_KEY);
    const value = stored[EXPLORATION_CURSOR_KEY] as
      Partial<ExplorationCursor> | undefined;
    if (!value || !isExplorationState(value.state)) return null;
    if (typeof value.symbol !== "string" || value.symbol.length < 3)
      return null;
    if (typeof value.timeframe !== "string") return null;
    return {
      state: value.state,
      symbol: value.symbol,
      timeframe: value.timeframe as Timeframe,
    };
  };

export const writeExplorationCursor = async (
  cursor: ExplorationCursor,
): Promise<void> => {
  await chrome.storage.local.set({ [EXPLORATION_CURSOR_KEY]: cursor });
};
