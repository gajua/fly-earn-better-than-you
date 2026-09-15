#!/usr/bin/env node
/** Simple offline calibration report placeholder for modular presets. */
import { readFileSync } from "node:fs";

const path =
  process.argv[2] ?? "tools/calibration/fixtures/synthetic-observations.json";
const rows = JSON.parse(readFileSync(path, "utf8"));
const count = Array.isArray(rows) ? rows.length : 0;
console.log(
  JSON.stringify(
    {
      moduleType: "chart_observer",
      sampleCount: count,
      metrics: {
        note: "Run replay CLI for live-derived samples; grid search lives in build-global-preset.ts",
      },
      candidatePreset: {
        chart: { momentum: 0.42, trendConflict: 0.31, maSlope: 0.18 },
        volume: { relativeVolume: 0.55, spike: 0.45 },
      },
    },
    null,
    2,
  ),
);
