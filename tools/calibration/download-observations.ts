/**
 * Download observations for offline calibration.
 * Requires service_role or a privileged export — never ship that key in the extension.
 *
 *   FLY_SUPABASE_URL=... FLY_SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types tools/calibration/download-observations.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.FLY_SUPABASE_URL;
const key = process.env.FLY_SUPABASE_SERVICE_ROLE_KEY;
const out = resolve(
  process.argv[2] ?? "tools/calibration/out/observations.json",
);

if (!url || !key) {
  console.error(
    "Set FLY_SUPABASE_URL and FLY_SUPABASE_SERVICE_ROLE_KEY (admin/CI only).",
  );
  process.exit(1);
}

const response = await fetch(
  `${url.replace(/\/$/, "")}/rest/v1/learning_observations?select=*&order=created_at.asc&limit=100000`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  },
);

if (!response.ok) {
  console.error("download failed", response.status, await response.text());
  process.exit(1);
}

const rows = (await response.json()) as Record<string, unknown>[];
const mapped = rows.map((row) => ({
  schemaVersion: Number(row.schema_version),
  brainMode: "real-connectome" as const,
  presetVersion: String(row.preset_version),
  brokerCategory: String(row.broker_category),
  marketFeatures: {
    momentum: Number(row.momentum),
    volatility: Number(row.volatility),
    volumeStrength: Number(row.volume_strength),
    return: Number(row.market_return),
  },
  brain: {
    buyDrive: Number(row.buy_drive),
    sellDrive: Number(row.sell_drive),
    curiosity: Number(row.curiosity),
    danger: Number(row.danger),
    activity: Number(row.activity),
  },
  action: String(row.action),
  outcome: {
    returnPct: Number(row.outcome_return_pct),
    holdingDurationBucket: String(row.holding_duration_bucket),
  },
  createdAt: String(row.created_at),
}));

writeFileSync(out, JSON.stringify(mapped, null, 2));
console.log(JSON.stringify({ downloaded: mapped.length, out }, null, 2));
