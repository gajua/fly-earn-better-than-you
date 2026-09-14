export const BUY_VOCABULARY = [
  "buy",
  "max buy",
  "long",
  "매수",
  "사가기",
] as const;

export const SELL_VOCABULARY = [
  "sell",
  "max sell",
  "short",
  "매도",
  "팔기",
] as const;

export const SEARCH_VOCABULARY = [
  "search",
  "symbol",
  "코인명",
  "심볼검색",
  "검색",
] as const;

export const matchesVocabulary = (
  text: string,
  vocabulary: readonly string[],
): boolean => {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return vocabulary.some(
    (term) =>
      normalized === term.toLowerCase() ||
      normalized.includes(term.toLowerCase()),
  );
};
