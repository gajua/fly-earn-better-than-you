import {
  BUNDLED_GLOBAL_PRESET,
  applyGlobalPreset,
  comparePresetVersions,
  validateGlobalPreset,
  verifyPresetChecksum,
  type GlobalCalibrationPreset,
  type GlobalPresetGates,
} from "@fly/core";

const ACTIVE_PRESET_KEY = "fly-active-global-preset";
const PRESET_META_KEY = "fly-global-preset-meta";

export type GlobalPresetRuntimeState = {
  readonly gates: GlobalPresetGates;
  readonly preset: GlobalCalibrationPreset;
  readonly source: "bundled" | "remote-cache";
};

/**
 * Load active GlobalCalibrationPreset.
 * Same Fly version + same preset ⇒ same gates for every user.
 * Remote failure always falls back to bundled.
 */
export const loadActiveGlobalPreset =
  async (): Promise<GlobalPresetRuntimeState> => {
    try {
      const stored = await chrome.storage.local.get(ACTIVE_PRESET_KEY);
      const candidate = stored[ACTIVE_PRESET_KEY];
      const validated = validateGlobalPreset(candidate);
      if (
        validated.ok &&
        (await verifyPresetChecksum(validated.preset)) &&
        comparePresetVersions(
          validated.preset.presetVersion,
          BUNDLED_GLOBAL_PRESET.presetVersion,
        ) >= 0
      ) {
        return {
          preset: validated.preset,
          gates: applyGlobalPreset(validated.preset),
          source: "remote-cache",
        };
      }
    } catch {
      // fall through to bundled
    }
    return {
      preset: BUNDLED_GLOBAL_PRESET,
      gates: applyGlobalPreset(BUNDLED_GLOBAL_PRESET),
      source: "bundled",
    };
  };

export const activateGlobalPreset = async (
  preset: GlobalCalibrationPreset,
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  const validated = validateGlobalPreset(preset);
  if (!validated.ok) return { ok: false, reason: validated.reason };
  if (!(await verifyPresetChecksum(validated.preset))) {
    return { ok: false, reason: "checksum-mismatch" };
  }
  if (validated.preset.metadata.status !== "published") {
    return { ok: false, reason: "not-published" };
  }
  await chrome.storage.local.set({
    [ACTIVE_PRESET_KEY]: validated.preset,
    [PRESET_META_KEY]: {
      activatedAt: new Date().toISOString(),
      presetVersion: validated.preset.presetVersion,
    },
  });
  return { ok: true };
};

export const rollbackToBundledPreset = async (): Promise<void> => {
  await chrome.storage.local.remove([ACTIVE_PRESET_KEY]);
};

/**
 * Optional remote refresh. Never throws; never blocks Fly.
 */
export const maybeRefreshRemotePreset = async (input: {
  readonly enabled: boolean;
  readonly supabaseUrl?: string;
  readonly publishableKey?: string;
}): Promise<"updated" | "unchanged" | "skipped" | "failed"> => {
  if (!input.enabled || !input.supabaseUrl || !input.publishableKey) {
    return "skipped";
  }
  try {
    const response = await fetch(
      `${input.supabaseUrl.replace(/\/$/, "")}/rest/v1/global_calibration_presets?status=eq.published&order=published_at.desc&limit=1`,
      {
        headers: {
          apikey: input.publishableKey,
          Authorization: `Bearer ${input.publishableKey}`,
          Accept: "application/json",
        },
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      },
    );
    if (!response.ok) return "failed";
    const rows = (await response.json()) as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) return "unchanged";
    const row = rows[0] as Record<string, unknown>;
    const mapped: GlobalCalibrationPreset = {
      schemaVersion: Number(row.schema_version),
      presetVersion: String(row.version),
      generatedAt: String(row.generated_at),
      sampleCount: Number(row.sample_count),
      buyThreshold: Number(row.buy_threshold),
      sellThreshold: Number(row.sell_threshold),
      confidenceThreshold: Number(row.confidence_threshold),
      proposalCooldownMs: Number(row.proposal_cooldown_ms),
      sensoryScale: {
        momentum: Number(row.momentum_scale),
        volatility: Number(row.volatility_scale),
        volumeStrength: Number(row.volume_scale),
        return: Number(row.return_scale),
      },
      checksumSha256: String(row.checksum_sha256),
      metadata: {
        brainMode: "real-connectome",
        minimumSamples: Number(row.minimum_samples ?? 500),
        trainingWindow: row.training_window
          ? String(row.training_window)
          : undefined,
        dataset: String(row.dataset ?? "male-cns:v1.0"),
        source: String(row.source ?? "aggregated-paper-observations"),
        status: "published",
      },
    };
    const current = await loadActiveGlobalPreset();
    if (
      comparePresetVersions(
        mapped.presetVersion,
        current.preset.presetVersion,
      ) <= 0
    ) {
      return "unchanged";
    }
    const activated = await activateGlobalPreset(mapped);
    return activated.ok ? "updated" : "failed";
  } catch {
    return "failed";
  }
};
