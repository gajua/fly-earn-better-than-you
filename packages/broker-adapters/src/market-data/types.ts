import type {
  DataProviderProvenance,
  InstrumentRef,
  Timeframe,
} from "@fly/core";

export type InstrumentId = string;

export interface CandleBar {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly timestamp: string;
}

export interface CandleSeries {
  readonly instrumentId: InstrumentId;
  readonly timeframe: Timeframe;
  readonly candles: readonly CandleBar[];
  readonly provenance: DataProviderProvenance;
}

export interface PriceTick {
  readonly instrumentId: InstrumentId;
  readonly price: number;
  readonly observedAt: string;
}

export type MarketDataFetchResult =
  | { readonly ok: true; readonly series: CandleSeries }
  | {
      readonly ok: false;
      readonly reason:
        | "UNSUPPORTED_TIMEFRAME"
        | "UNSUPPORTED_INSTRUMENT"
        | "VALIDATION_FAILED"
        | "DATA_PROVIDER_ERROR"
        | "UNAVAILABLE";
      readonly message?: string;
    };

export interface MarketDataTransport {
  fetchText(url: string, init?: RequestInit): Promise<{
    readonly ok: boolean;
    readonly status: number;
    readonly body: string;
  }>;
}

export interface MarketDataProvider {
  readonly id: string;
  readonly provenance: DataProviderProvenance;
  supports(instrument: InstrumentRef | InstrumentId, timeframe: Timeframe): boolean;
  fetchCandles(
    instrument: InstrumentRef | InstrumentId,
    timeframe: Timeframe,
    options?: { readonly limit?: number },
  ): Promise<MarketDataFetchResult>;
  subscribePrice?(
    instrument: InstrumentRef | InstrumentId,
    callback: (price: PriceTick) => void,
  ): () => void;
}

/** Legacy adapter surface kept for demo/content compatibility. */
export interface BrokerMarketDataProvider {
  readonly id: string;
  getCandles(
    instrumentId: string,
    timeframe: Timeframe,
  ): Promise<CandleBar[] | null>;
}

export const defaultBrowserTransport = (): MarketDataTransport => ({
  async fetchText(url, init) {
    const response = await fetch(url, {
      ...init,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  },
});
