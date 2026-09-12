import type { InstrumentRef, MarketType } from "./types";

export const toInstrumentId = (ref: InstrumentRef): string =>
  `${ref.broker}:${ref.marketType}:${ref.symbol}:${ref.quoteCurrency}`;

export const parseInstrumentId = (instrumentId: string): InstrumentRef | null => {
  const parts = instrumentId.split(":");
  if (parts.length !== 4) return null;
  const [broker, marketType, symbol, quoteCurrency] = parts;
  if (!broker || !marketType || !symbol || !quoteCurrency) return null;
  return {
    broker,
    marketType: marketType as MarketType,
    symbol,
    quoteCurrency,
  };
};

export const demoInstrumentId = (symbol: string): string =>
  toInstrumentId({
    broker: "demo",
    marketType: "demo",
    symbol,
    quoteCurrency: "USD",
  });
