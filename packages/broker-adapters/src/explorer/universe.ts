import { DEFAULT_SYMBOL_SEEDS, MAX_CANDIDATES } from "@fly/core";
import type { SymbolUniverseProvider } from "./types";

const toUsdt = (symbol: string): string =>
  symbol.replace("/", "").replace("_", "").toUpperCase();

export const createBinanceUniverseProvider = (options?: {
  readonly fetchImpl?: typeof fetch;
  readonly visibleSymbols?: () => string[];
}): SymbolUniverseProvider => ({
  async getCandidates(currentSymbol) {
    const seen = new Set<string>();
    const out: Array<{
      symbol: string;
      source: "current" | "seed" | "public-liquidity" | "visible";
      quoteVolume?: number;
    }> = [];
    const push = (
      symbol: string,
      source: (typeof out)[number]["source"],
      quoteVolume?: number,
    ) => {
      const normalized = toUsdt(symbol);
      if (!normalized.endsWith("USDT") || seen.has(normalized)) return;
      if (
        source === "public-liquidity" &&
        !(DEFAULT_SYMBOL_SEEDS as readonly string[]).includes(normalized)
      ) {
        return;
      }
      seen.add(normalized);
      out.push({ symbol: normalized, source, quoteVolume });
    };

    if (currentSymbol) push(currentSymbol, "current");
    for (const symbol of options?.visibleSymbols?.() ?? []) {
      push(symbol, "visible");
    }
    for (const symbol of DEFAULT_SYMBOL_SEEDS) {
      push(symbol, "seed");
    }

    try {
      const fetchImpl = options?.fetchImpl ?? fetch;
      const response = await fetchImpl(
        "https://api.binance.com/api/v3/ticker/24hr",
        { credentials: "omit" },
      );
      if (response.ok) {
        const rows = (await response.json()) as Array<{
          symbol?: string;
          quoteVolume?: string;
        }>;
        const liquid = rows
          .filter((row) => (row.symbol ?? "").endsWith("USDT"))
          .map((row) => ({
            symbol: row.symbol!,
            quoteVolume: Number(row.quoteVolume ?? 0),
          }))
          .filter((row) => Number.isFinite(row.quoteVolume))
          .sort((a, b) => b.quoteVolume - a.quoteVolume)
          .slice(0, 6);
        for (const row of liquid) {
          push(row.symbol, "public-liquidity", row.quoteVolume);
        }
      }
    } catch {
      // Fail closed to seeds + current. Analysis continues without liquidity API.
    }

    return out.slice(0, MAX_CANDIDATES);
  },
});
