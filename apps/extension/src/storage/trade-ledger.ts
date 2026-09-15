import type { PaperPosition, PositionCycle, TradeRecord } from "@fly/core";
import type { TradeRepository } from "./repository";

import {
  ensureFlyIdbStores,
  FLY_IDB_NAME,
  FLY_IDB_VERSION,
} from "./idb-schema";
const TRADE_STORE = "trades";
const CYCLE_STORE = "cycles";
const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(FLY_IDB_NAME, FLY_IDB_VERSION);
    request.onupgradeneeded = () => ensureFlyIdbStores(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("idb-open-failed"));
  });

export const appendTrade = async (trade: TradeRecord): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, "readwrite");
    tx.objectStore(TRADE_STORE).put(trade);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb-write-failed"));
  });
  db.close();
};

export const listTrades = async (
  mode?: TradeRecord["mode"],
): Promise<TradeRecord[]> => {
  const db = await openDb();
  const trades = await new Promise<TradeRecord[]>((resolve, reject) => {
    const tx = db.transaction(TRADE_STORE, "readonly");
    const request = tx.objectStore(TRADE_STORE).getAll();
    request.onsuccess = () => {
      const rows = (request.result as TradeRecord[]) ?? [];
      resolve(
        mode
          ? rows.filter(
              (row) => row.mode === mode && row.liveConfidence !== "UNVERIFIED",
            )
          : rows.filter((row) => row.liveConfidence !== "UNVERIFIED"),
      );
    };
    request.onerror = () =>
      reject(request.error ?? new Error("idb-read-failed"));
  });
  db.close();
  return trades.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

export const readPaperCycles = async (): Promise<PositionCycle[]> => {
  const db = await openDb();
  const cycles = await new Promise<PositionCycle[]>((resolve, reject) => {
    const tx = db.transaction(CYCLE_STORE, "readonly");
    const request = tx.objectStore(CYCLE_STORE).getAll();
    request.onsuccess = () =>
      resolve((request.result as PositionCycle[]) ?? []);
    request.onerror = () =>
      reject(request.error ?? new Error("idb-cycle-read"));
  });
  db.close();
  return cycles;
};

export const writePaperCycles = async (
  cycles: readonly PositionCycle[],
): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CYCLE_STORE, "readwrite");
    const store = tx.objectStore(CYCLE_STORE);
    store.clear();
    for (const cycle of cycles) store.put(cycle);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb-cycle-write"));
  });
  db.close();
};

export const clearTrades = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([TRADE_STORE, CYCLE_STORE], "readwrite");
    tx.objectStore(TRADE_STORE).clear();
    tx.objectStore(CYCLE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb-clear-failed"));
  });
  db.close();
};

export const readPaperPositions = async (): Promise<PaperPosition[]> => {
  const stored = await chrome.storage.local.get("fly-paper-positions");
  const value = stored["fly-paper-positions"];
  return Array.isArray(value) ? (value as PaperPosition[]) : [];
};

export const writePaperPositions = async (
  positions: readonly PaperPosition[],
): Promise<void> => {
  await chrome.storage.local.set({ "fly-paper-positions": positions });
};

/** Local-first repository. Cloud/Supabase is optional and not wired by default. */
export const createLocalIndexedDbTradeRepository = (): TradeRepository => ({
  appendTrade,
  listTrades,
  clearTrades,
  readCycles: readPaperCycles,
  writeCycles: writePaperCycles,
});
