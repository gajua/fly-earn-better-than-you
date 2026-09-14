import type { InstrumentRef } from "@fly/core";

/** Normalize Fly instrument symbols to exchange REST symbols. */
export const toBinanceSymbol = (instrument: InstrumentRef): string | null => {
  if (instrument.broker !== "binance") return null;
  const symbol = instrument.symbol.replace(/[_/-]/g, "").toUpperCase();
  return /^[A-Z0-9]{5,20}$/.test(symbol) ? symbol : null;
};

export const toBybitSymbol = (instrument: InstrumentRef): string | null => {
  if (instrument.broker !== "bybit") return null;
  const symbol = instrument.symbol.replace(/[_/-]/g, "").toUpperCase();
  return /^[A-Z0-9]{5,20}$/.test(symbol) ? symbol : null;
};

export const toCoinbaseProductId = (
  instrument: InstrumentRef,
): string | null => {
  if (instrument.broker !== "coinbase") return null;
  if (instrument.symbol.includes("-")) return instrument.symbol.toUpperCase();
  const base = instrument.symbol
    .replace(new RegExp(`${instrument.quoteCurrency}$`, "i"), "")
    .toUpperCase();
  if (!base) return null;
  return `${base}-${instrument.quoteCurrency.toUpperCase()}`;
};

export const toKrakenWsSymbol = (instrument: InstrumentRef): string | null => {
  if (instrument.broker !== "kraken") return null;
  if (instrument.symbol.includes("/")) return instrument.symbol.toUpperCase();
  const quote = instrument.quoteCurrency.toUpperCase();
  const base = instrument.symbol
    .replace(new RegExp(`${quote}$`, "i"), "")
    .toUpperCase();
  if (!base) return null;
  return `${base}/${quote}`;
};
