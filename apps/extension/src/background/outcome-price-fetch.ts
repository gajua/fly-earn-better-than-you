import {
  OUTCOME_HORIZON_MS,
  computeFutureOutcome,
  parseInstrumentId,
  type PendingOutcomeRecord,
} from "@fly/core";

export interface ResolvedOutcomeMetrics {
  readonly futureReturn: number;
  readonly futureVolatility: number;
  readonly maxAdverseMove: number;
  readonly maxFavorableMove: number;
}

export const toBinanceRestSymbol = (
  broker: string,
  instrumentId: string,
): string | null => {
  if (broker !== "binance") return null;
  const parsed = parseInstrumentId(instrumentId);
  if (parsed?.broker === "binance") {
    const base = parsed.symbol.replace(parsed.quoteCurrency, "");
    const sym = base.length > 0 ? base : parsed.symbol;
    return `${sym}${parsed.quoteCurrency}`.replace(/_/g, "");
  }
  const compact = instrumentId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length >= 6 ? compact : null;
};

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

const klinesToBars = (rows: BinanceKlineRow[]) =>
  rows.map((row) => ({
    timestamp: new Date(row[0]).toISOString(),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));

export const fetchBinanceKlines = async (input: {
  readonly symbol: string;
  readonly interval: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<ReturnType<typeof klinesToBars>> => {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", input.symbol);
  url.searchParams.set("interval", input.interval);
  url.searchParams.set("startTime", String(Math.floor(input.startTime)));
  url.searchParams.set("endTime", String(Math.floor(input.endTime)));
  url.searchParams.set("limit", "1000");
  const response = await fetchImpl(url.toString(), {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) return [];
  const body = (await response.json()) as BinanceKlineRow[];
  return klinesToBars(body);
};

export const fetchBinanceSpotPrice = async (input: {
  readonly symbol: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<number | null> => {
  const fetchImpl = input.fetchImpl ?? fetch;
  const url = new URL("https://api.binance.com/api/v3/ticker/price");
  url.searchParams.set("symbol", input.symbol);
  const response = await fetchImpl(url.toString(), {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { price?: string };
  const price = Number(body.price);
  return Number.isFinite(price) && price > 0 ? price : null;
};

export const resolvePendingOutcomeMetrics = async (
  row: PendingOutcomeRecord,
  options?: { readonly fetchImpl?: typeof fetch },
): Promise<ResolvedOutcomeMetrics | null> => {
  if (row.anchorPrice <= 0) return null;
  const horizonMs = OUTCOME_HORIZON_MS[row.horizon];
  const anchorMs = row.dueAt - horizonMs;
  const endMs = row.dueAt;

  if (row.broker === "binance") {
    const symbol = toBinanceRestSymbol(row.broker, row.instrumentId);
    if (!symbol) return null;
    const candles = await fetchBinanceKlines({
      symbol,
      interval: "1m",
      startTime: anchorMs - 60_000,
      endTime: endMs + 60_000,
      fetchImpl: options?.fetchImpl,
    });
    const fromKlines = computeFutureOutcome({
      anchorPrice: row.anchorPrice,
      anchorMs,
      horizonMs,
      candles,
    });
    if (fromKlines) return fromKlines;

    if (row.horizon === "5m" && Date.now() < endMs) return null;
    const spot = await fetchBinanceSpotPrice({
      symbol,
      fetchImpl: options?.fetchImpl,
    });
    if (!spot) return null;
    const futureReturn = (spot - row.anchorPrice) / row.anchorPrice;
    return {
      futureReturn,
      futureVolatility: Math.abs(futureReturn),
      maxAdverseMove: Math.min(0, futureReturn),
      maxFavorableMove: Math.max(0, futureReturn),
    };
  }

  return null;
};

export const fetchBrokerSpotPrice = async (
  broker: string,
  instrumentId: string,
  fetchImpl?: typeof fetch,
): Promise<number | null> => {
  if (broker !== "binance") return null;
  const symbol = toBinanceRestSymbol(broker, instrumentId);
  if (!symbol) return null;
  return fetchBinanceSpotPrice({ symbol, fetchImpl });
};
