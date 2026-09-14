import type {
  FutureOutcomeRecord,
  MarketObservationRecord,
  ModuleId,
  ModuleOutputRecord,
  PendingOutcomeRecord,
} from "@fly/core";
import {
  ensureFlyIdbStores,
  FLY_IDB_NAME,
  FLY_IDB_VERSION,
} from "./idb-schema";

let idbChain: Promise<void> = Promise.resolve();

const withLearningDbLock = async <T>(run: () => Promise<T>): Promise<T> => {
  const task = idbChain.then(run, run);
  idbChain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
};
const OBS_STORE = "market-observations";
const MODULE_STORE = "module-outputs";
const OUTCOME_STORE = "future-outcomes";
const PENDING_STORE = "pending-outcomes";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(FLY_IDB_NAME, FLY_IDB_VERSION);
    request.onupgradeneeded = () => ensureFlyIdbStores(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb-open"));
  });

export const anonymizeSymbol = (symbol: string): string => {
  let hash = 0;
  for (let i = 0; i < symbol.length; i += 1) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return `sym_${hash.toString(16)}`;
};

export const appendMarketObservation = async (
  row: MarketObservationRecord,
): Promise<void> =>
  withLearningDbLock(async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OBS_STORE, "readwrite");
      tx.objectStore(OBS_STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("obs-write"));
    });
    db.close();
  });

export const appendModuleOutputs = async (
  rows: readonly ModuleOutputRecord[],
): Promise<void> => {
  if (rows.length === 0) return;
  await withLearningDbLock(async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MODULE_STORE, "readwrite");
      const store = tx.objectStore(MODULE_STORE);
      for (const row of rows) store.put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("module-write"));
    });
    db.close();
  });
};

export const appendFutureOutcome = async (
  row: FutureOutcomeRecord,
): Promise<void> =>
  withLearningDbLock(async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OUTCOME_STORE, "readwrite");
      tx.objectStore(OUTCOME_STORE).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("outcome-write"));
    });
    db.close();
  });

export const listPendingOutcomes = async (): Promise<PendingOutcomeRecord[]> =>
  withLearningDbLock(async () => {
    const db = await openDb();
    const rows = await new Promise<PendingOutcomeRecord[]>(
      (resolve, reject) => {
        const tx = db.transaction(PENDING_STORE, "readonly");
        const request = tx.objectStore(PENDING_STORE).getAll();
        request.onsuccess = () =>
          resolve((request.result as PendingOutcomeRecord[]) ?? []);
        request.onerror = () =>
          reject(request.error ?? new Error("pending-read"));
      },
    );
    db.close();
    return rows;
  });

export const upsertPendingOutcomes = async (
  rows: readonly PendingOutcomeRecord[],
): Promise<void> => {
  await withLearningDbLock(async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, "readwrite");
      const store = tx.objectStore(PENDING_STORE);
      for (const row of rows) store.put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("pending-write"));
    });
    db.close();
  });
};

export const deletePendingOutcomeIds = async (
  ids: readonly string[],
): Promise<void> => {
  if (ids.length === 0) return;
  await withLearningDbLock(async () => {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, "readwrite");
      const store = tx.objectStore(PENDING_STORE);
      for (const id of ids) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("pending-delete"));
    });
    db.close();
  });
};

export interface LocalLearningStats {
  readonly observations: number;
  readonly resolvedOutcomes: number;
  readonly chartSamples: number;
  readonly volumeSamples: number;
  readonly riskSamples: number;
  readonly scannerSamples: number;
  readonly closedTrades: number;
  readonly queuedContributions: number;
  readonly pendingOutcomes: number;
}

const countStore = async (storeName: string): Promise<number> => {
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).count();
    request.onsuccess = () => resolve(request.result ?? 0);
    request.onerror = () => reject(request.error ?? new Error("count"));
  });
  db.close();
  return count;
};

export const countModuleSamples = async (
  moduleType: ModuleId,
): Promise<number> => {
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(MODULE_STORE, "readonly");
    const request = tx.objectStore(MODULE_STORE).getAll();
    request.onsuccess = () => {
      const rows = (request.result as ModuleOutputRecord[]) ?? [];
      resolve(rows.filter((row) => row.moduleType === moduleType).length);
    };
    request.onerror = () => reject(request.error ?? new Error("module-read"));
  });
  db.close();
  return count;
};

export const getLocalLearningStats = async (input: {
  readonly closedTrades: number;
  readonly queuedContributions: number;
}): Promise<LocalLearningStats> => {
  const [observations, resolvedOutcomes, pendingOutcomes] = await Promise.all([
    countStore(OBS_STORE),
    countStore(OUTCOME_STORE),
    listPendingOutcomes().then((rows) => rows.length),
  ]);
  const [chartSamples, volumeSamples, riskSamples, scannerSamples] =
    await Promise.all([
      countModuleSamples("chart_observer"),
      countModuleSamples("volume_observer"),
      countModuleSamples("risk_observer"),
      countModuleSamples("market_scanner"),
    ]);
  return {
    observations,
    resolvedOutcomes,
    chartSamples,
    volumeSamples,
    riskSamples,
    scannerSamples,
    closedTrades: input.closedTrades,
    queuedContributions: input.queuedContributions,
    pendingOutcomes,
  };
};
