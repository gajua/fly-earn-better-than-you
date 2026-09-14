import type { Timeframe } from "@fly/core";
import { createTradeCanvasBinanceProvider } from "../../market-data/tradecanvas/adapter";
import { createAutoMarketDataTransport } from "../../market-data/auto-transport";
import type {
  BrokerMarketDataProvider,
  CandleBar,
  MarketDataTransport,
} from "../../market-data/types";
import { parseInstrumentId } from "@fly/core";

export const createBinanceMarketDataProvider = (options?: {
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}) =>
  createTradeCanvasBinanceProvider({
    ...options,
    transport: options?.transport ?? createAutoMarketDataTransport(),
  });

/**
 * Bridge MarketDataProvider → legacy BrokerMarketDataProvider used by content.
 * Returns null candles on UNAVAILABLE / errors (never mock).
 */
export const createBinanceMarketDataBridge = (options?: {
  readonly transport?: MarketDataTransport;
  readonly now?: () => number;
}): BrokerMarketDataProvider => {
  const provider = createBinanceMarketDataProvider(options);
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
