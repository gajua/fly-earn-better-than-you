import {
  FORBIDDEN_CONTRIBUTION_KEYS,
  GLOBAL_PRESET_SCHEMA_VERSION,
  type AnonymousPaperObservation,
  type GlobalCalibrationPreset,
  type GlobalPresetGates,
} from "./global-types";

const isFiniteUnit = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 2;

const isDrive = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 1;

/**
 * Canonical JSON for checksums — stable key order, no checksum field.
 */
export const canonicalPresetPayload = (
  preset: Omit<GlobalCalibrationPreset, "checksumSha256"> & {
    readonly checksumSha256?: string;
  },
): string => {
  const { checksumSha256: _ignored, ...rest } = preset;
  void _ignored;
  return JSON.stringify(rest, Object.keys(rest).sort());
};

export const sha256Hex = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const attachChecksum = async (
  preset: Omit<GlobalCalibrationPreset, "checksumSha256">,
): Promise<GlobalCalibrationPreset> => {
  const checksumSha256 = await sha256Hex(canonicalPresetPayload(preset));
  return { ...preset, checksumSha256 };
};

export const validateGlobalPreset = (
  value: unknown,
):
  | { readonly ok: true; readonly preset: GlobalCalibrationPreset }
  | { readonly ok: false; readonly reason: string } => {
  if (!value || typeof value !== "object") {
    return { ok: false, reason: "not-object" };
  }
  const preset = value as GlobalCalibrationPreset;
  if (preset.schemaVersion !== GLOBAL_PRESET_SCHEMA_VERSION) {
    return { ok: false, reason: "schema-mismatch" };
  }
  if (typeof preset.presetVersion !== "string" || !preset.presetVersion) {
    return { ok: false, reason: "missing-version" };
  }
  if (
    !isDrive(preset.buyThreshold) ||
    !isDrive(preset.sellThreshold) ||
    !isDrive(preset.confidenceThreshold)
  ) {
    return { ok: false, reason: "invalid-thresholds" };
  }
  if (
    !Number.isFinite(preset.proposalCooldownMs) ||
    preset.proposalCooldownMs < 0
  ) {
    return { ok: false, reason: "invalid-cooldown" };
  }
  if (
    !preset.sensoryScale ||
    !isFiniteUnit(preset.sensoryScale.momentum) ||
    !isFiniteUnit(preset.sensoryScale.volatility) ||
    !isFiniteUnit(preset.sensoryScale.volumeStrength) ||
    !isFiniteUnit(preset.sensoryScale.return)
  ) {
    return { ok: false, reason: "invalid-sensory-scale" };
  }
  if (preset.metadata?.brainMode !== "real-connectome") {
    return { ok: false, reason: "brain-mode-must-be-real-connectome" };
  }
  if (
    typeof preset.checksumSha256 !== "string" ||
    !/^[a-f0-9]{64}$/i.test(preset.checksumSha256)
  ) {
    return { ok: false, reason: "missing-checksum" };
  }
  return { ok: true, preset };
};

export const verifyPresetChecksum = async (
  preset: GlobalCalibrationPreset,
): Promise<boolean> => {
  const expected = await sha256Hex(canonicalPresetPayload(preset));
  return expected.toLowerCase() === preset.checksumSha256.toLowerCase();
};

export const applyGlobalPreset = (
  preset: GlobalCalibrationPreset,
): GlobalPresetGates => ({
  buyThreshold: preset.buyThreshold,
  sellThreshold: preset.sellThreshold,
  confidenceThreshold: preset.confidenceThreshold,
  proposalCooldownMs: preset.proposalCooldownMs,
  presetVersion: preset.presetVersion,
});

export const comparePresetVersions = (a: string, b: string): number => {
  const parse = (value: string) =>
    value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const holdingDurationBucket = (
  openedAt: string,
  closedAt: string,
): string => {
  const ms = Date.parse(closedAt) - Date.parse(openedAt);
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const minutes = ms / 60_000;
  if (minutes < 5) return "lt_5m";
  if (minutes < 60) return "5m_1h";
  if (minutes < 24 * 60) return "1h_1d";
  if (minutes < 7 * 24 * 60) return "1d_7d";
  return "gte_7d";
};

export const brokerCategoryFromBrokerId = (
  brokerId: string,
): AnonymousPaperObservation["brokerCategory"] => {
  if (brokerId === "binance" || brokerId === "upbit" || brokerId === "bybit") {
    return "crypto";
  }
  return "other";
};

export const assertAnonymousObservationSafe = (
  payload: unknown,
):
  | { readonly ok: true; readonly observation: AnonymousPaperObservation }
  | { readonly ok: false; readonly reason: string } => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "not-object" };
  }
  const raw = payload as Record<string, unknown>;
  for (const key of Object.keys(raw)) {
    if (
      FORBIDDEN_CONTRIBUTION_KEYS.some((forbidden) =>
        key.toLowerCase().includes(forbidden.toLowerCase()),
      )
    ) {
      return { ok: false, reason: `forbidden-key:${key}` };
    }
  }
  const observation = payload as AnonymousPaperObservation;
  if (observation.schemaVersion !== 1) {
    return { ok: false, reason: "schema-mismatch" };
  }
  if (observation.brainMode !== "real-connectome") {
    return { ok: false, reason: "brain-mode" };
  }
  if (
    observation.action !== "paper_buy" &&
    observation.action !== "paper_sell"
  ) {
    return { ok: false, reason: "action" };
  }
  const features = observation.marketFeatures;
  const brain = observation.brain;
  if (
    !features ||
    !brain ||
    !isDrive(brain.buyDrive) ||
    !isDrive(brain.sellDrive) ||
    !Number.isFinite(observation.outcome?.returnPct) ||
    Math.abs(observation.outcome.returnPct) > 500
  ) {
    return { ok: false, reason: "numeric-range" };
  }
  return { ok: true, observation };
};
