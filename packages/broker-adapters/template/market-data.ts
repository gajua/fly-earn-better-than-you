import type { Timeframe } from "@fly/core";
import type {
  BrokerMarketDataProvider,
  CandleBar,
} from "../src/market-data/types";

/**
 * TODO: wire a public no-auth provider or return null candles.
 * Never invent synthetic series.
 */
export const createTodoMarketDataBridge = (): BrokerMarketDataProvider => ({
  id: "todo-market-data",
  async getCandles(
    _instrumentId: string,
    _timeframe: Timeframe,
  ): Promise<CandleBar[] | null> {
    return null;
  },
});
