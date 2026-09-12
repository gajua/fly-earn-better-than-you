import type { InstrumentRef } from "@fly/core";
import { parseInstrumentId } from "@fly/core";
import type {
  InstrumentId,
  MarketDataFetchResult,
  MarketDataProvider,
} from "./types";

const resolveKey = (
  instrument: InstrumentRef | InstrumentId,
): string | null => {
  if (typeof instrument === "string") return instrument;
  return `${instrument.broker}:${instrument.marketType}:${instrument.symbol}:${instrument.quoteCurrency}`;
};

/**
 * Tries providers in order. Skips providers that share the same
 * endpointFamily as a previous DATA_PROVIDER_ERROR to avoid duplicate storms.
 */
export const createProviderChain = (
  id: string,
  providers: readonly MarketDataProvider[],
): MarketDataProvider => {
  const provenance = providers[0]?.provenance ?? {
    source: "unavailable" as const,
  };

  return {
    id,
    provenance,
    supports(instrument, timeframe) {
      return providers.some((provider) =>
        provider.supports(instrument, timeframe),
      );
    },
    async fetchCandles(instrument, timeframe, options) {
      const failedFamilies = new Set<string>();
      let last: MarketDataFetchResult = {
        ok: false,
        reason: "UNAVAILABLE",
      };

      for (const provider of providers) {
        if (!provider.supports(instrument, timeframe)) {
          last = { ok: false, reason: "UNSUPPORTED_TIMEFRAME" };
          continue;
        }
        const family = provider.provenance.endpointFamily;
        if (family && failedFamilies.has(family)) {
          continue;
        }
        const result = await provider.fetchCandles(
          instrument,
          timeframe,
          options,
        );
        if (result.ok) return result;
        last = result;
        if (result.reason === "DATA_PROVIDER_ERROR" && family) {
          failedFamilies.add(family);
        }
        if (
          result.reason === "UNSUPPORTED_TIMEFRAME" ||
          result.reason === "UNSUPPORTED_INSTRUMENT"
        ) {
          // Exact unsupported — do not try siblings that may silently remap.
          continue;
        }
      }

      return last;
    },
  };
};

export const asInstrumentRef = (
  instrument: InstrumentRef | InstrumentId,
): InstrumentRef | null => {
  if (typeof instrument !== "string") return instrument;
  return parseInstrumentId(instrument);
};

export const instrumentIdOf = (
  instrument: InstrumentRef | InstrumentId,
): InstrumentId | null => resolveKey(instrument);
