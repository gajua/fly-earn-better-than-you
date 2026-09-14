import type { AnonymousPaperObservation } from "@fly/core";
import {
  assertAnonymousObservationSafe,
  FORBIDDEN_CONTRIBUTION_KEYS,
} from "@fly/core";

const DB_NAME = "fly-earn-better-than-you";
const DB_VERSION = 4;
const QUEUE_STORE = "contribution-queue";
const META_KEY = "fly-contribution-meta";

type QueueRow = AnonymousPaperObservation & { readonly id: string };

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [
        "trades",
        "cycles",
        "learning-observations",
        "broker-detection-feedback",
        QUEUE_STORE,
      ]) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb-open"));
  });

const stripForbidden = (
  observation: AnonymousPaperObservation,
): AnonymousPaperObservation => {
  const clone = structuredClone(observation) as Record<string, unknown>;
  for (const key of Object.keys(clone)) {
    if (
      FORBIDDEN_CONTRIBUTION_KEYS.some((forbidden) =>
        key.toLowerCase().includes(forbidden.toLowerCase()),
      )
    ) {
      delete clone[key];
    }
  }
  return clone as unknown as AnonymousPaperObservation;
};

export const enqueueContribution = async (
  observation: AnonymousPaperObservation,
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  const safe = assertAnonymousObservationSafe(stripForbidden(observation));
  if (!safe.ok) return { ok: false, reason: safe.reason };
  const row: QueueRow = {
    ...safe.observation,
    id: crypto.randomUUID(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("queue-write"));
  });
  db.close();
  return { ok: true };
};

export const listContributionQueue = async (): Promise<QueueRow[]> => {
  const db = await openDb();
  const rows = await new Promise<QueueRow[]>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const request = tx.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve((request.result as QueueRow[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("queue-read"));
  });
  db.close();
  return rows;
};

export const clearContributionQueue = async (): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("queue-clear"));
  });
  db.close();
};

export const deleteContributionIds = async (
  ids: readonly string[],
): Promise<void> => {
  if (ids.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("queue-delete"));
  });
  db.close();
};

export const readContributionMeta = async (): Promise<{
  lastSyncAt: string | null;
}> => {
  const stored = await chrome.storage.local.get(META_KEY);
  const value = stored[META_KEY] as { lastSyncAt?: string } | undefined;
  return { lastSyncAt: value?.lastSyncAt ?? null };
};

export const writeContributionMeta = async (
  lastSyncAt: string,
): Promise<void> => {
  await chrome.storage.local.set({ [META_KEY]: { lastSyncAt } });
};

/** Pure helpers — unit-tested without IndexedDB / network. */
export const shouldAttemptContributionUpload = (input: {
  readonly contributeOptIn: boolean;
  readonly enabled: boolean;
  readonly supabaseUrl?: string;
  readonly publishableKey?: string;
}): boolean =>
  Boolean(
    input.contributeOptIn &&
    input.enabled &&
    input.supabaseUrl &&
    input.publishableKey,
  );

export const buildIngestPayload = (
  rows: readonly QueueRow[],
): AnonymousPaperObservation[] =>
  rows.map(({ id: _id, ...observation }) => {
    void _id;
    return stripForbidden(observation);
  });

/**
 * Batch upload via Edge Function when opt-in + env configured.
 * Failures never break Paper; queue rows stay until success.
 */
export const flushContributionQueue = async (input: {
  readonly enabled: boolean;
  readonly contributeOptIn?: boolean;
  readonly supabaseUrl?: string;
  readonly publishableKey?: string;
  readonly batchSize?: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<{ uploaded: number; reason?: string }> => {
  if (
    !shouldAttemptContributionUpload({
      contributeOptIn: input.contributeOptIn ?? true,
      enabled: input.enabled,
      supabaseUrl: input.supabaseUrl,
      publishableKey: input.publishableKey,
    })
  ) {
    return { uploaded: 0, reason: "skipped" };
  }
  const batchSize = Math.min(Math.max(input.batchSize ?? 25, 1), 50);
  const queue = await listContributionQueue();
  if (queue.length === 0) return { uploaded: 0 };
  const batch = queue.slice(0, batchSize);
  const body = buildIngestPayload(batch);
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(
      `${input.supabaseUrl!.replace(/\/$/, "")}/functions/v1/ingest-learning-observation`,
      {
        method: "POST",
        headers: {
          apikey: input.publishableKey!,
          Authorization: `Bearer ${input.publishableKey!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      },
    );
    if (!response.ok) {
      return { uploaded: 0, reason: `http-${response.status}` };
    }
    await deleteContributionIds(batch.map((row) => row.id));
    await writeContributionMeta(new Date().toISOString());
    return { uploaded: batch.length };
  } catch {
    return { uploaded: 0, reason: "network" };
  }
};
