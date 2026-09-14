import type { ExplorationState } from "./types";

const EN: Record<
  ExplorationState | "conflict" | "volume" | "familiar",
  string
> = {
  SLEEP: "Resting for a moment.",
  WAKE: "Looking for something different…",
  ORIENT: "Getting my bearings on this chart.",
  SCAN_MARKET: "Looking for something different…",
  INSPECT_SYMBOL: "Checking this market more closely.",
  CHANGE_TIMEFRAME: "Trying another timeframe.",
  OBSERVE: "Watching how this is moving.",
  COMPARE: "Different timeframes disagree.",
  CURIOUS: "This changed since I last saw it.",
  REVISIT: "Checking this again.",
  FOCUS: "Staying with this a little longer.",
  DECIDE: "Nothing interesting enough to trade yet.",
  REST: "Resting for a moment.",
  conflict: "Different timeframes disagree.",
  volume: "Volume is unusual here.",
  familiar: "Too familiar. Moving on.",
};

const KO: Record<
  ExplorationState | "conflict" | "volume" | "familiar",
  string
> = {
  SLEEP: "잠깐 쉬는 중.",
  WAKE: "다른 움직임이 있는지 둘러볼게.",
  ORIENT: "이 차트에서 자리 잡는 중.",
  SCAN_MARKET: "다른 종목을 찾아볼게.",
  INSPECT_SYMBOL: "이 시장을 조금 더 볼게.",
  CHANGE_TIMEFRAME: "다른 시간봉을 볼게.",
  OBSERVE: "움직임이 어떤지 지켜보는 중.",
  COMPARE: "시간봉끼리 말이 안 맞아.",
  CURIOUS: "지난번 보고 분위기가 바뀌었어.",
  REVISIT: "다시 한번 확인해볼게.",
  FOCUS: "여기 조금 더 머무를게.",
  DECIDE: "아직은 거래할 만큼 흥미롭지 않아.",
  REST: "잠깐 쉬는 중.",
  conflict: "시간봉끼리 말이 안 맞아.",
  volume: "거래량이 평소와 달라.",
  familiar: "너무 익숙해. 다른 데로 갈게.",
};

export const thoughtFor = (
  state: ExplorationState,
  locale: "en" | "ko",
  reasons: readonly string[] = [],
): string => {
  const dict = locale === "ko" ? KO : EN;
  if (reasons.includes("trend-conflict")) return dict.conflict;
  if (reasons.includes("volume")) return dict.volume;
  if (reasons.includes("low-interest")) return dict.familiar;
  return dict[state];
};

export const formatLogLine = (
  timestamp: number,
  symbol: string,
  timeframe: string,
  summary: string,
): string => {
  const date = new Date(timestamp);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} ${symbol} ${timeframe} — ${summary}`;
};
