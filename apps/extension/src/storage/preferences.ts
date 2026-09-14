import type {
  BrainMode,
  CalibrationProfile,
  RiskPolicy,
  SessionLifecycleState,
  TradingMode,
} from "@fly/core";
import { DEFAULT_CALIBRATION_PROFILE } from "@fly/core";
import type { LocalePreference } from "../i18n";

export interface ExtensionPreferences {
  readonly tradingMode: TradingMode;
  readonly brainMode: BrainMode;
  readonly brainBaseUrl: string;
  readonly riskPolicy: RiskPolicy;
  readonly enabledBrokerIds: readonly string[];
  readonly maxHistoryDays: number;
  readonly locale: LocalePreference;
  /** Opt-in anonymous Paper contribution to shared global learning. Default OFF. */
  readonly contributeAnonymousLearning: boolean;
  /**
   * Developer-only experimental personal calibration.
   * Product default is GlobalCalibrationPreset (same for all users).
   */
  readonly experimentalPersonalCalibration: boolean;
  readonly learningMinSamples: number;
  readonly startingPaperCapital: number;
  /** Retained for experimental personal path only — not product default. */
  readonly calibrationProfile: CalibrationProfile;
  /** @deprecated use contributeAnonymousLearning */
  readonly learningEnabled?: boolean;
}

export const DEFAULT_PREFERENCES: ExtensionPreferences = {
  tradingMode: "paper",
  brainMode: "mock",
  brainBaseUrl: "http://127.0.0.1:8000",
  riskPolicy: {
    maxTradingCapital: 1_000_000,
    maxSingleOrderValue: 300_000,
    maxPositionValue: 500_000,
    maxDailyNewExposure: 400_000,
  },
  enabledBrokerIds: ["demo", "binance", "upbit"],
  maxHistoryDays: 90,
  locale: "auto",
  contributeAnonymousLearning: false,
  experimentalPersonalCalibration: false,
  learningMinSamples: 30,
  startingPaperCapital: 1_000_000,
  calibrationProfile: DEFAULT_CALIBRATION_PROFILE,
};

export interface RuntimeStatus {
  readonly session: SessionLifecycleState;
  readonly hasBrokerTab: boolean;
  readonly activeBrokerId: string | null;
  readonly loginState: "LOGGED_IN" | "LOGGED_OUT" | "UNKNOWN";
  readonly badge: "sleeping" | "ready" | "watching" | "interest" | "confirm";
  readonly message: string;
  readonly updatedAt: string;
  readonly diagnostics?: {
    readonly pageKind?: string;
    readonly pageConfidence?: number;
    readonly modal?: unknown;
    readonly symbol?: string | null;
    readonly targets?: Record<string, unknown>;
    readonly timeframes?: readonly {
      readonly timeframe: string;
      readonly available: boolean;
      readonly source: string;
      readonly candleCount: number;
    }[];
  };
}

export const STATUS_KEY = "fly-runtime-status";
export const PREFS_KEY = "fly-preferences";
export const POSITIONS_KEY = "fly-paper-positions";
export const DAILY_EXPOSURE_KEY = "fly-daily-exposure";

export const normalizePreferences = (
  value: Partial<ExtensionPreferences> | null | undefined,
): ExtensionPreferences => {
  const contributeAnonymousLearning =
    value?.contributeAnonymousLearning ??
    value?.learningEnabled ??
    DEFAULT_PREFERENCES.contributeAnonymousLearning;
  return {
    ...DEFAULT_PREFERENCES,
    ...value,
    contributeAnonymousLearning,
    experimentalPersonalCalibration: false,
    riskPolicy: {
      ...DEFAULT_PREFERENCES.riskPolicy,
      ...(value?.riskPolicy ?? {}),
    },
    calibrationProfile: {
      ...DEFAULT_CALIBRATION_PROFILE,
      ...(value?.calibrationProfile ?? {}),
    },
    enabledBrokerIds:
      value?.enabledBrokerIds ?? DEFAULT_PREFERENCES.enabledBrokerIds,
  };
};
