import type { LearningObservation } from "@fly/core";
import type { BrokerDetectionFeedback } from "@fly/broker-adapters";

import {
  ensureFlyIdbStores,
  FLY_IDB_NAME,
  FLY_IDB_VERSION,
} from "./idb-schema";
const LEARNING_STORE = "learning-observations";
const FEEDBACK_STORE = "broker-detection-feedback";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(FLY_IDB_NAME, FLY_IDB_VERSION);
    request.onupgradeneeded = () => ensureFlyIdbStores(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("idb-open-failed"));
  });

export const appendLearningObservation = async (
  observation: LearningObservation,
): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LEARNING_STORE, "readwrite");
    tx.objectStore(LEARNING_STORE).put(observation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("learning-write-failed"));
  });
  db.close();
};

export const listLearningObservations = async (): Promise<
  LearningObservation[]
> => {
  const db = await openDb();
  const rows = await new Promise<LearningObservation[]>((resolve, reject) => {
    const tx = db.transaction(LEARNING_STORE, "readonly");
    const request = tx.objectStore(LEARNING_STORE).getAll();
    request.onsuccess = () =>
      resolve((request.result as LearningObservation[]) ?? []);
    request.onerror = () =>
      reject(request.error ?? new Error("learning-read-failed"));
  });
  db.close();
  return rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

export const clearLearningObservations = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LEARNING_STORE, "readwrite");
    tx.objectStore(LEARNING_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("learning-clear-failed"));
  });
  db.close();
};

export const appendDetectionFeedback = async (
  feedback: BrokerDetectionFeedback,
): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, "readwrite");
    tx.objectStore(FEEDBACK_STORE).put(feedback);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("feedback-write-failed"));
  });
  db.close();
};

export const clearDetectionFeedback = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, "readwrite");
    tx.objectStore(FEEDBACK_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("feedback-clear-failed"));
  });
  db.close();
};
