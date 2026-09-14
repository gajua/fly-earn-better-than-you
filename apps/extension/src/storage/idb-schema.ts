export const FLY_IDB_NAME = "fly-earn-better-than-you";
export const FLY_IDB_VERSION = 6;

const ALL_STORES = [
  "trades",
  "cycles",
  "learning-observations",
  "broker-detection-feedback",
  "contribution-queue",
  "market-observations",
  "module-outputs",
  "future-outcomes",
  "pending-outcomes",
  "learning-upload-summaries",
] as const;

export const ensureFlyIdbStores = (db: IDBDatabase): void => {
  for (const name of ALL_STORES) {
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name, { keyPath: "id" });
    }
  }
};
