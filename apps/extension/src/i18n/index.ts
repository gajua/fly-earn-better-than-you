import { en, type MessageDictionary, type MessageKey } from "./en";
import { ko } from "./ko";

export type LocalePreference = "auto" | "ko" | "en";
export type ResolvedLocale = "ko" | "en";

export type { MessageDictionary, MessageKey };

const dictionaries: Record<ResolvedLocale, MessageDictionary> = { en, ko };

export const resolveLocale = (
  preference: LocalePreference,
  language = typeof navigator !== "undefined" ? navigator.language : "en",
): ResolvedLocale => {
  if (preference === "ko" || preference === "en") return preference;
  return language.toLowerCase().startsWith("ko") ? "ko" : "en";
};

export const t = (key: MessageKey, locale: ResolvedLocale): string =>
  dictionaries[locale][key] ?? dictionaries.en[key] ?? key;

export const bubbleMessageKey = (
  session: string,
  state: string | undefined,
  dataProviderError: boolean,
): MessageKey | null => {
  if (session === "BROKER_LOGGED_OUT") return "bubble.login";
  if (session === "BRAIN_UNAVAILABLE") {
    return dataProviderError
      ? "bubble.marketUnavailable"
      : "bubble.brainUnavailable";
  }
  switch (state) {
    case "approach_buy":
      return "bubble.approachBuy";
    case "approach_sell":
      return "bubble.approachSell";
    case "scan_assets":
      return "bubble.scanAssets";
    case "observe_chart":
    case "interested":
      return "bubble.observeChart";
    case "explore":
      return "bubble.explore";
    case "panic":
      return "bubble.panic";
    default:
      return null;
  }
};
