import type {
  BrainOutput,
  FlyState,
  SessionLifecycleState,
} from "./types";

export const deriveSessionState = (input: {
  readonly hasBrokerTab: boolean;
  readonly loginState: "LOGGED_IN" | "LOGGED_OUT" | "UNKNOWN";
  readonly marketOpen: boolean;
  readonly brainOutput?: BrainOutput | null;
  readonly hasProposal?: boolean;
  readonly awaitingConfirm?: boolean;
}): SessionLifecycleState => {
  if (!input.hasBrokerTab) return "NO_BROKER";
  if (!input.marketOpen) return "MARKET_CLOSED";
  if (input.loginState !== "LOGGED_IN") return "BROKER_LOGGED_OUT";
  if (input.awaitingConfirm) return "USER_CONFIRM_REQUIRED";
  if (input.hasProposal) return "ORDER_PROPOSED";

  const state = input.brainOutput?.state;
  if (state === "approach_buy") return "BUY_INTEREST";
  if (state === "approach_sell") return "SELL_INTEREST";
  if (state === "scan_assets") return "SCANNING";
  if (state === "inspect_portfolio") return "POSITION_MONITORING";
  if (state === "observe_chart" || state === "interested" || state === "explore") {
    return "WATCHING";
  }
  return "BROKER_READY";
};

export const sessionToFlyState = (
  session: SessionLifecycleState,
): FlyState => {
  switch (session) {
    case "NO_BROKER":
    case "MARKET_CLOSED":
      return "sleep";
    case "BROKER_LOGGED_OUT":
      return "login_hint";
    case "BUY_INTEREST":
    case "ORDER_PROPOSED":
    case "USER_CONFIRM_REQUIRED":
      return "approach_buy";
    case "SELL_INTEREST":
      return "approach_sell";
    case "SCANNING":
      return "scan_assets";
    case "POSITION_MONITORING":
      return "inspect_portfolio";
    case "WATCHING":
      return "observe_chart";
    case "BROKER_READY":
    default:
      return "enter";
  }
};
