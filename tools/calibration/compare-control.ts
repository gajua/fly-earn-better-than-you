/**
 * Compare candidate vs current vs control baselines on a synthetic/offline set.
 * Control rows (mock / shuffled) are scored separately and never mixed into training.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BUNDLED_GLOBAL_PRESET,
  buildGlobalPresetCandidate,
  observationToSample,
  scoreCalibration,
  type AnonymousPaperObservation,
  type CalibrationSample,
} from "../../packages/core/src/calibration/index.ts";

const path = resolve(
  process.argv[2] ?? "tools/calibration/fixtures/synthetic-observations.json",
);
const rows = JSON.parse(
  readFileSync(path, "utf8"),
) as AnonymousPaperObservation[];

const realSamples = rows
  .map((row) => observationToSample(row))
  .filter((row): row is CalibrationSample => row != null);

const controlLike = rows.filter(
  (row) => row.brainMode !== "real-connectome",
) as AnonymousPaperObservation[];

const candidate = await buildGlobalPresetCandidate({
  samples: realSamples,
  presetVersion: "compare-candidate",
  generatedAt: "2026-09-14T00:00:00.000Z",
  minimumSamples: Math.min(500, realSamples.length),
  currentBuyThreshold: BUNDLED_GLOBAL_PRESET.buyThreshold,
  currentSellThreshold: BUNDLED_GLOBAL_PRESET.sellThreshold,
});

const summarizeControl = (label: string, list: AnonymousPaperObservation[]) => {
  const returns = list.map((row) => row.outcome.returnPct);
  const totalReturnPct = returns.reduce((sum, value) => sum + value, 0);
  const winRate =
    returns.length === 0
      ? 0
      : returns.filter((value) => value >= 0).length / returns.length;
  return {
    label,
    count: list.length,
    score: scoreCalibration({
      totalReturnPct,
      maxDrawdownPct: 20,
      tradeCount: returns.length,
      winRate,
      profitFactor: 1,
    }),
  };
};

console.log(
  JSON.stringify(
    {
      current: {
        version: BUNDLED_GLOBAL_PRESET.presetVersion,
        buyThreshold: BUNDLED_GLOBAL_PRESET.buyThreshold,
        sellThreshold: BUNDLED_GLOBAL_PRESET.sellThreshold,
      },
      candidate: {
        gate: candidate.gate,
        rejectReasons: candidate.rejectReasons,
        buyThreshold: candidate.preset.buyThreshold,
        sellThreshold: candidate.preset.sellThreshold,
        validation: candidate.validation,
        holdout: candidate.holdout,
      },
      controls: [
        summarizeControl(
          "mock",
          controlLike.filter(
            (row) => (row as { brainMode?: string }).brainMode === "mock",
          ),
        ),
        summarizeControl(
          "shuffled-control",
          controlLike.filter(
            (row) =>
              (row as { brainMode?: string }).brainMode === "shuffled-control",
          ),
        ),
      ],
      note: "Auto production publish is forbidden. Human release approval required.",
    },
    null,
    2,
  ),
);
