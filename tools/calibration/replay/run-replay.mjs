#!/usr/bin/env node
/**
 * Historical OHLCV replay without future leakage (features use candles <= t only).
 */
import { computeMarketFeatures } from "../../packages/core/src/exploration/features.ts";
import { evaluateModularMock } from "../../packages/core/src/modular/mock-evaluate.ts";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {
    symbol: "BTCUSDT",
    timeframe: "1h",
    from: "",
    to: "",
  };
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const val = args[i + 1];
    if (key === "--symbol" && val) out.symbol = val;
    if (key === "--timeframe" && val) out.timeframe = val;
    if (key === "--from" && val) out.from = val;
    if (key === "--to" && val) out.to = val;
  }
  return out;
};

const fetchKlines = async (symbol, interval, startMs, endMs) => {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("startTime", String(startMs));
  url.searchParams.set("endTime", String(endMs));
  url.searchParams.set("limit", "1000");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`binance klines ${response.status}`);
  const rows = await response.json();
  return rows.map((row) => ({
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    timestamp: new Date(Number(row[0])).toISOString(),
  }));
};

const toEnvironment = (features, price) => ({
  asset: { symbol: "REPLAY", price, changePercent: features.returnN * 100 },
  market: {
    momentum: features.momentum,
    volatility: features.volatility,
    volumeStrength: features.relativeVolume,
    novelty: features.novelty ?? 0,
    trendConflict: features.trendConflict ?? 0,
  },
  ui: {},
});

const main = async () => {
  const args = parseArgs();
  const startMs = Date.parse(args.from);
  const endMs = Date.parse(args.to);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    console.error(
      "Usage: pnpm calibration:replay -- --symbol BTCUSDT --timeframe 1h --from ISO --to ISO",
    );
    process.exit(1);
  }
  const candles = await fetchKlines(
    args.symbol,
    args.timeframe,
    startMs,
    endMs,
  );
  const dataset = [];
  for (let i = 20; i < candles.length - 2; i += 1) {
    const window = candles.slice(0, i + 1);
    const features = computeMarketFeatures(window);
    if (!features) continue;
    const price = window[window.length - 1].close;
    const modular = evaluateModularMock(toEnvironment(features, price));
    const future = candles[i + 1];
    const futureReturn =
      future && price > 0 ? (future.close - price) / price : 0;
    dataset.push({
      observedAt: window[window.length - 1].timestamp,
      chartBullish: modular.chart.bullish,
      futureReturn,
    });
  }
  console.log(
    JSON.stringify(
      {
        symbol: args.symbol,
        timeframe: args.timeframe,
        samples: dataset.length,
        datasetVersion: `replay-${args.symbol}-${args.timeframe}`,
        leakageGuard: "features<=t,future=t+1",
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
