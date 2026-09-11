import type { PaperPosition, TradeRecord } from "@fly/core";

const DB_NAME = "fly-earn-better-than-you";
const DB_VERSION = 1;
const STORE = "trades";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb-open-failed"));
  });

export const appendTrade = async (trade: TradeRecord): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(trade);
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
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => {
      const rows = (request.result as TradeRecord[]) ?? [];
      resolve(mode ? rows.filter((row) => row.mode === mode) : rows);
    };
    request.onerror = () => reject(request.error ?? new Error("idb-read-failed"));
  });
  db.close();
  return trades.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

export const clearTrades = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
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
