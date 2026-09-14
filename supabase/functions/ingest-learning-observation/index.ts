import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_TOP_KEYS = new Set([
  "schemaVersion",
  "brainMode",
  "presetVersion",
  "brokerCategory",
  "marketFeatures",
  "brain",
  "action",
  "outcome",
  "createdAt",
  "installId",
]);

const FORBIDDEN_SUBSTRINGS = [
  "password",
  "otp",
  "cookie",
  "session",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "email",
  "account",
  "balance",
  "holdings",
  "symbol",
  "portfolio",
  "order",
];

const BROKER_CATEGORIES = new Set(["crypto", "kr-stock", "us-stock", "other"]);
const ACTIONS = new Set(["paper_buy", "paper_sell"]);
const MAX_BATCH = 50;
const MAX_BODY_BYTES = 64_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      Connection: "keep-alive",
    },
  });

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isUnit = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= 0 && value <= 1;

const containsForbiddenKey = (value: unknown, path = ""): string | null => {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = containsForbiddenKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_SUBSTRINGS.some((token) => lower.includes(token))) {
      return path ? `${path}.${key}` : key;
    }
    const hit = containsForbiddenKey(child, path ? `${path}.${key}` : key);
    if (hit) return hit;
  }
  return null;
};

type Observation = {
  schemaVersion: number;
  brainMode: "real-connectome";
  presetVersion: string;
  brokerCategory: string;
  marketFeatures: {
    momentum: number;
    volatility: number;
    volumeStrength: number;
    return: number;
  };
  brain: {
    buyDrive: number;
    sellDrive: number;
    curiosity: number;
    danger: number;
    activity: number;
  };
  action: "paper_buy" | "paper_sell";
  outcome: {
    returnPct: number;
    holdingDurationBucket: string;
  };
  createdAt: string;
  installId?: string;
};

const validateObservation = (
  raw: unknown,
): { ok: true; value: Observation } | { ok: false; reason: string } => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "not-object" };
  }
  const row = raw as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    if (!ALLOWED_TOP_KEYS.has(key)) {
      return { ok: false, reason: `unexpected-field:${key}` };
    }
  }
  const forbidden = containsForbiddenKey(row);
  if (forbidden) return { ok: false, reason: `forbidden-key:${forbidden}` };

  if (row.schemaVersion !== 1) return { ok: false, reason: "schemaVersion" };
  if (row.brainMode !== "real-connectome") {
    return { ok: false, reason: "brainMode" };
  }
  if (typeof row.presetVersion !== "string" || !row.presetVersion) {
    return { ok: false, reason: "presetVersion" };
  }
  if (
    typeof row.brokerCategory !== "string" ||
    !BROKER_CATEGORIES.has(row.brokerCategory)
  ) {
    return { ok: false, reason: "brokerCategory" };
  }
  if (typeof row.action !== "string" || !ACTIONS.has(row.action)) {
    return { ok: false, reason: "action" };
  }
  // Reject live / real-money wording if sneaked into action via casing tricks.
  if (!String(row.action).startsWith("paper_")) {
    return { ok: false, reason: "live-trade-rejected" };
  }

  const features = row.marketFeatures as Record<string, unknown> | undefined;
  const brain = row.brain as Record<string, unknown> | undefined;
  const outcome = row.outcome as Record<string, unknown> | undefined;
  if (!features || !brain || !outcome) {
    return { ok: false, reason: "missing-nested" };
  }
  for (const key of [
    "momentum",
    "volatility",
    "volumeStrength",
    "return",
  ] as const) {
    if (!isFiniteNumber(features[key])) {
      return { ok: false, reason: `marketFeatures.${key}` };
    }
  }
  for (const key of [
    "buyDrive",
    "sellDrive",
    "curiosity",
    "danger",
    "activity",
  ] as const) {
    if (!isUnit(brain[key])) return { ok: false, reason: `brain.${key}` };
  }
  if (!isFiniteNumber(outcome.returnPct) || Math.abs(outcome.returnPct) > 500) {
    return { ok: false, reason: "outcome.returnPct" };
  }
  if (
    typeof outcome.holdingDurationBucket !== "string" ||
    !outcome.holdingDurationBucket
  ) {
    return { ok: false, reason: "outcome.holdingDurationBucket" };
  }
  if (typeof row.createdAt !== "string" || !row.createdAt) {
    return { ok: false, reason: "createdAt" };
  }
  if (row.installId != null && typeof row.installId !== "string") {
    return { ok: false, reason: "installId" };
  }

  return {
    ok: true,
    value: {
      schemaVersion: 1,
      brainMode: "real-connectome",
      presetVersion: row.presetVersion,
      brokerCategory: row.brokerCategory,
      marketFeatures: {
        momentum: features.momentum as number,
        volatility: features.volatility as number,
        volumeStrength: features.volumeStrength as number,
        return: features.return as number,
      },
      brain: {
        buyDrive: brain.buyDrive as number,
        sellDrive: brain.sellDrive as number,
        curiosity: brain.curiosity as number,
        danger: brain.danger as number,
        activity: brain.activity as number,
      },
      action: row.action as Observation["action"],
      outcome: {
        returnPct: outcome.returnPct as number,
        holdingDurationBucket: outcome.holdingDurationBucket as string,
      },
      createdAt: row.createdAt,
      installId: typeof row.installId === "string" ? row.installId : undefined,
    },
  };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { ok: false, reason: "method" });
  }

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return json(401, { ok: false, reason: "unauthorized" });
  }

  const rawText = await req.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return json(413, { ok: false, reason: "payload-too-large" });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return json(400, { ok: false, reason: "invalid-json" });
  }

  const batch = Array.isArray(parsed) ? parsed : [parsed];
  if (batch.length === 0 || batch.length > MAX_BATCH) {
    return json(400, { ok: false, reason: "batch-size" });
  }

  const validated: Observation[] = [];
  for (const item of batch) {
    const result = validateObservation(item);
    if (!result.ok) {
      return json(400, { ok: false, reason: result.reason });
    }
    validated.push(result.value);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    (() => {
      try {
        const secrets = JSON.parse(
          Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}",
        );
        return typeof secrets.default === "string" ? secrets.default : "";
      } catch {
        return "";
      }
    })();

  if (!supabaseUrl || !serviceKey) {
    return json(500, { ok: false, reason: "server-misconfigured" });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = validated.map((observation) => ({
    schema_version: observation.schemaVersion,
    preset_version: observation.presetVersion,
    broker_category: observation.brokerCategory,
    momentum: observation.marketFeatures.momentum,
    volatility: observation.marketFeatures.volatility,
    volume_strength: observation.marketFeatures.volumeStrength,
    market_return: observation.marketFeatures.return,
    buy_drive: observation.brain.buyDrive,
    sell_drive: observation.brain.sellDrive,
    curiosity: observation.brain.curiosity,
    danger: observation.brain.danger,
    activity: observation.brain.activity,
    action: observation.action,
    outcome_return_pct: observation.outcome.returnPct,
    holding_duration_bucket: observation.outcome.holdingDurationBucket,
    created_at: observation.createdAt,
    install_id: observation.installId ?? null,
  }));

  const { error } = await admin.from("learning_observations").insert(rows);
  if (error) {
    return json(502, {
      ok: false,
      reason: "insert-failed",
      detail: error.message,
    });
  }

  return json(200, { ok: true, inserted: rows.length });
});
