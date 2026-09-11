import { findBrokerByUrl, listSupportedBrokers } from "@fly/broker-adapters";
import type { RuntimeStatus } from "../storage/preferences";
import { PREFS_KEY, STATUS_KEY, DEFAULT_PREFERENCES } from "../storage/preferences";
import type { ExtensionPreferences } from "../storage/preferences";

const badgeFor = (
  session: RuntimeStatus["session"],
): RuntimeStatus["badge"] => {
  if (session === "NO_BROKER" || session === "MARKET_CLOSED") return "sleeping";
  if (session === "BROKER_LOGGED_OUT") return "sleeping";
  if (session === "USER_CONFIRM_REQUIRED" || session === "ORDER_PROPOSED") {
    return "confirm";
  }
  if (session === "BUY_INTEREST" || session === "SELL_INTEREST") return "interest";
  if (session === "WATCHING" || session === "SCANNING") return "watching";
  return "ready";
};

const messageFor = (session: RuntimeStatus["session"]): string => {
  switch (session) {
    case "NO_BROKER":
      return "거래소 화면을 띄우면 깨워줘.";
    case "BROKER_LOGGED_OUT":
      return "로그인하면 시작할게.";
    case "MARKET_CLOSED":
      return "시장이 닫혀 있어서 쉬는 중.";
    case "BUY_INTEREST":
      return "이 종목에 강하게 반응 중";
    case "SELL_INTEREST":
      return "이 포지션에서 멀어지고 싶어 하는 중.";
    case "USER_CONFIRM_REQUIRED":
      return "주문을 검토해 줘. 자동 실행하지 않아.";
    case "SCANNING":
      return "후보 종목을 살펴보는 중.";
    default:
      return "시장을 관찰하는 중.";
  }
};

export const readPreferences = async (): Promise<ExtensionPreferences> => {
  const stored = await chrome.storage.local.get(PREFS_KEY);
  const value = stored[PREFS_KEY];
  return value && typeof value === "object"
    ? { ...DEFAULT_PREFERENCES, ...(value as ExtensionPreferences) }
    : DEFAULT_PREFERENCES;
};

export const writePreferences = async (
  preferences: ExtensionPreferences,
): Promise<void> => {
  await chrome.storage.local.set({ [PREFS_KEY]: preferences });
};

export const publishStatus = async (
  partial: Omit<RuntimeStatus, "badge" | "message" | "updatedAt"> &
    Partial<Pick<RuntimeStatus, "message">>,
): Promise<RuntimeStatus> => {
  const status: RuntimeStatus = {
    ...partial,
    badge: badgeFor(partial.session),
    message: partial.message ?? messageFor(partial.session),
    updatedAt: new Date().toISOString(),
  };
  await chrome.storage.session.set({ [STATUS_KEY]: status });

  const text =
    status.badge === "sleeping"
      ? "zzz"
      : status.badge === "interest"
        ? "!"
        : status.badge === "confirm"
          ? "?"
          : "on";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: status.badge === "sleeping" ? "#64748b" : "#0f766e",
  });
  return status;
};

export const scanBrokerTabs = async (): Promise<{
  hasBrokerTab: boolean;
  activeBrokerId: string | null;
  tabIds: number[];
}> => {
  const preferences = await readPreferences();
  const enabled = new Set(preferences.enabledBrokerIds);
  const tabs = await chrome.tabs.query({});
  const matched = tabs.filter((tab) => {
    if (!tab.url || tab.id == null) return false;
    const broker = findBrokerByUrl(tab.url);
    return Boolean(broker && enabled.has(broker.id));
  });

  return {
    hasBrokerTab: matched.length > 0,
    activeBrokerId: matched[0]
      ? (findBrokerByUrl(matched[0].url ?? "")?.id ?? null)
      : null,
    tabIds: matched
      .map((tab) => tab.id)
      .filter((id): id is number => typeof id === "number"),
  };
};

export const allOptionalHostPermissions = (): string[] =>
  listSupportedBrokers().flatMap((broker) => [...broker.optionalHostPermissions]);
