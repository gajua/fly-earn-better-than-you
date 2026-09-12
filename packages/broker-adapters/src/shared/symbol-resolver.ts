export interface SymbolParseResult {
  readonly raw: string;
  readonly normalized: string;
  readonly quoteCurrency?: string;
}

export type BrokerSymbolParser = (url: string) => SymbolParseResult | null;

/**
 * Each host supplies only its URL format. Verified against live sites (2026-09).
 */
export const parseBinanceTradeSymbol: BrokerSymbolParser = (url) => {
  try {
    const parsed = new URL(url);
    // Verified: https://www.binance.com/en/trade/BTC_USDT?type=spot
    const match = parsed.pathname.match(/\/trade\/([A-Za-z0-9]+_[A-Za-z0-9]+)/i);
    if (!match?.[1]) return null;
    const raw = match[1].toUpperCase();
    const [base, quote] = raw.split("_");
    if (!base || !quote) return null;
    return {
      raw,
      normalized: `${base}${quote}`,
      quoteCurrency: quote,
    };
  } catch {
    return null;
  }
};

export const parseBybitTradeSymbol: BrokerSymbolParser = (url) => {
  try {
    const parsed = new URL(url);
    // Common pattern: /trade/spot/BTC/USDT
    const match = parsed.pathname.match(
      /\/trade\/(?:spot\/)?([A-Za-z0-9]+)\/([A-Za-z0-9]+)/i,
    );
    if (!match?.[1] || !match[2]) return null;
    const base = match[1].toUpperCase();
    const quote = match[2].toUpperCase();
    return {
      raw: `${base}/${quote}`,
      normalized: `${base}${quote}`,
      quoteCurrency: quote,
    };
  } catch {
    return null;
  }
};

export const parseKrakenTradeSymbol: BrokerSymbolParser = (url) => {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/trade\/([A-Za-z0-9]+-[A-Za-z0-9]+)/i);
    if (!match?.[1]) return null;
    const [base, quote] = match[1].toUpperCase().split("-");
    if (!base || !quote) return null;
    return {
      raw: `${base}-${quote}`,
      normalized: `${base}/${quote}`,
      quoteCurrency: quote,
    };
  } catch {
    return null;
  }
};

export const parseCoinbaseTradeSymbol: BrokerSymbolParser = (url) => {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(
      /\/(?:advanced-trade\/)?spot\/([A-Za-z0-9]+-[A-Za-z0-9]+)/i,
    );
    if (!match?.[1]) return null;
    const raw = match[1].toUpperCase();
    const [, quote] = raw.split("-");
    return { raw, normalized: raw, quoteCurrency: quote };
  } catch {
    return null;
  }
};

export const parseUpbitExchangeSymbol: BrokerSymbolParser = (url) => {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get("code");
    // Verified: ?code=CRIX.UPBIT.KRW-BTC
    const match = code?.match(/CRIX\.UPBIT\.([A-Z0-9]+-[A-Z0-9]+)/i);
    if (!match?.[1]) return null;
    const market = match[1].toUpperCase();
    const [quote] = market.split("-");
    return {
      raw: market,
      normalized: market,
      quoteCurrency: quote,
    };
  } catch {
    return null;
  }
};

export const BrokerSymbolResolver = {
  binance: parseBinanceTradeSymbol,
  bybit: parseBybitTradeSymbol,
  kraken: parseKrakenTradeSymbol,
  coinbase: parseCoinbaseTradeSymbol,
  upbit: parseUpbitExchangeSymbol,
} as const;
