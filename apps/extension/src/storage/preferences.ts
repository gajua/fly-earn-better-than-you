import type {
  BrainMode,
  RiskPolicy,
  SessionLifecycleState,
  TradingMode,
} from "@fly/core";

export interface ExtensionPreferences {
  readonly tradingMode: TradingMode;
  readonly brainMode: BrainMode;
  readonly brainBaseUrl: string;
  readonly riskPolicy: RiskPolicy;
  readonly enabledBrokerIds: readonly string[];
  readonly maxHistoryDays: number;
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
  enabledBrokerIds: ["demo"],
  maxHistoryDays: 90,
};

export interface RuntimeStatus {
  readonly session: SessionLifecycleState;
  readonly hasBrokerTab: boolean;
  readonly activeBrokerId: string | null;
  readonly loginState: "LOGGED_IN" | "LOGGED_OUT" | "UNKNOWN";
  readonly badge: "sleeping" | "ready" | "watching" | "interest" | "confirm";
  readonly message: string;
  readonly updatedAt: string;
}

export const STATUS_KEY = "fly-runtime-status";
export const PREFS_KEY = "fly-preferences";
export const POSITIONS_KEY = "fly-paper-positions";
export const DAILY_EXPOSURE_KEY = "fly-daily-exposure";
