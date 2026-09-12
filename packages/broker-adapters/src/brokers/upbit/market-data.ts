import type { Timeframe } from "@fly/core";
import { parseInstrumentId } from "@fly/core";
import { createAutoMarketDataTransport } from "../../market-data/auto-transport";
import { createUpbitOfficialPublicProvider } from "../../market-data/upbit/official-public";
import type {
  BrokerMarketDataProvider,
  CandleBar,
  MarketDataTransport,
} from "../../market-data/types";

export const createUpbitMarketDataProvider = (options?: {
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}) =>
  createUpbitOfficialPublicProvider({
    ...options,
    transport: options?.transport ?? createAutoMarketDataTransport(),
  });

export const createUpbitMarketDataBridge = (options?: {
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): BrokerMarketDataProvider => {
  const provider = createUpbitMarketDataProvider(options);
  return {
    id: provider.id,
    async getCandles(
      instrumentId: string,
      timeframe: Timeframe,
    ): Promise<CandleBar[] | null> {
      const ref = parseInstrumentId(instrumentId);
      if (!ref) return null;
      const result = await provider.fetchCandles(ref, timeframe);
      if (!result.ok) return null;
      return [...result.series.candles];
    },
  };
};
