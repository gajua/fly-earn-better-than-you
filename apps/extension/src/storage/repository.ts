import type { PositionCycle, TradeRecord } from "@fly/core";

/**
 * StorageRepository abstraction: local IndexedDB is source of truth.
 * A future SupabaseTradeRepository may implement the same interface after
 * explicit user opt-in + RLS. Extension must work offline without cloud.
 */
export interface TradeRepository {
  appendTrade(trade: TradeRecord): Promise<void>;
  listTrades(mode?: TradeRecord["mode"]): Promise<TradeRecord[]>;
  clearTrades(): Promise<void>;
  readCycles(): Promise<PositionCycle[]>;
  writeCycles(cycles: readonly PositionCycle[]): Promise<void>;
}
