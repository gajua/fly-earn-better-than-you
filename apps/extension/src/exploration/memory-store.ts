import { emptyFlyMemory, type FlyMemory } from "@fly/core";

export const EXPLORATION_MEMORY_KEY = "fly-exploration-memory";

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
