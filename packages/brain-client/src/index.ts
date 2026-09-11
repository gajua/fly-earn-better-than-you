import {
  clamp01,
  type BrainDiagnostics,
  type BrainOutput,
  type FlyBrain,
  type FlyState,
  type InspectableFlyBrain,
  type MarketEnvironment,
} from "@fly/core";
import { z } from "zod";

export interface MockFlyBrainOptions {
  readonly random?: () => number;
  readonly noiseAmount?: number;
}

/**
 * Temporary heuristic brain for product prototyping.
 *
 * This is not a biological simulation and does not use MaleCNS data. Its
 * contract is intentionally shared with a future MaleCNSBrain implementation.
 */
export const createMockFlyBrain = ({
  random = Math.random,
  noiseAmount = 0.035,
}: MockFlyBrainOptions = {}): FlyBrain => {
  const noise = () => (random() - 0.5) * 2 * noiseAmount;

  return {
    async evaluate(environment): Promise<BrainOutput> {
      const { momentum, volatility, volumeStrength } = environment.market;
      const pnlPercent = environment.position?.pnlPercent ?? 0;
      const normalizedGain = clamp01(pnlPercent / 20);
      const normalizedLoss = clamp01(-pnlPercent / 20);

      const danger = clamp01(
        volatility * 0.72 +
          Math.max(0, -momentum) * 0.25 +
          normalizedLoss * 0.3 +
          noise(),
      );
      const buyDrive = clamp01(
        Math.max(0, momentum) * 0.78 +
          normalizedGain * 0.12 +
          volumeStrength * 0.14 -
          danger * 0.22 +
          noise(),
      );
      const sellDrive = clamp01(
        Math.max(0, -momentum) * 0.72 +
          normalizedLoss * 0.34 +
          volatility * 0.16 +
          noise(),
      );
      const signalStrength = Math.max(buyDrive, sellDrive, danger);
      const curiosity = clamp01(0.86 - signalStrength * 0.65 + noise());
      const activity = clamp01(
        0.25 + volatility * 0.55 + Math.abs(momentum) * 0.35 + noise(),
      );

      const state = chooseState({
        environment,
        buyDrive,
        sellDrive,
        curiosity,
        danger,
      });

      return { state, buyDrive, sellDrive, curiosity, danger, activity };
    },
  };
};

export interface MaleCNSBrainOptions {
  readonly baseUrl?: string;
  readonly mode?: "malecns" | "shuffled-control";
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

const flyStateSchema = z.enum([
  "sleep",
  "enter",
  "explore",
  "observe_chart",
  "inspect_portfolio",
  "interested",
  "approach_buy",
  "approach_sell",
  "panic",
  "leave",
]);
const driveSchema = z.number().min(0).max(1);
const brainOutputSchema = z.object({
  state: flyStateSchema,
  buyDrive: driveSchema,
  sellDrive: driveSchema,
  curiosity: driveSchema,
  danger: driveSchema,
  activity: driveSchema,
});
const neuronActivitySchema = z.object({
  bodyId: z.number().int().positive(),
  activity: z.number().nonnegative(),
});
const evaluateResponseSchema = z.object({
  brainOutput: brainOutputSchema,
  connectome: z.object({
    dataset: z.literal("male-cns:v1.0"),
    mode: z.enum(["real-connectome", "shuffled-control"]),
    neuronCount: z.number().int().positive(),
    edgeCount: z.number().int().positive(),
    activeInputNeurons: z.array(neuronActivitySchema),
    topOutputNeurons: z.array(neuronActivitySchema),
    simulationMs: z.number().nonnegative(),
  }),
});

/**
 * HTTP client for the local connectome service.
 *
 * It never falls back to MockFlyBrain. A missing service, invalid artifact, or
 * malformed response is surfaced to the caller and diagnostics subscribers.
 */
export const createMaleCNSBrain = ({
  baseUrl = "http://127.0.0.1:8000",
  mode = "malecns",
  timeoutMs = 8_000,
  fetchImpl = fetch,
}: MaleCNSBrainOptions = {}): InspectableFlyBrain => {
  const canonicalMode =
    mode === "malecns" ? "real-connectome" : "shuffled-control";
  const listeners = new Set<() => void>();
  let diagnostics: BrainDiagnostics = {
    mode: canonicalMode,
    isConnectomeLoaded: false,
    activeInputNeurons: [],
    topOutputNeurons: [],
  };

  const updateDiagnostics = (next: BrainDiagnostics) => {
    diagnostics = next;
    listeners.forEach((listener) => listener());
  };

  return {
    mode: canonicalMode,
    getDiagnostics: () => diagnostics,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async evaluate(environment): Promise<BrainOutput> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ environment, mode: canonicalMode }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`MaleCNS service returned HTTP ${response.status}`);
        }

        const payload = evaluateResponseSchema.parse(await response.json());
        if (payload.connectome.mode !== canonicalMode) {
          throw new Error(
            `Brain mode mismatch: expected ${canonicalMode}, received ${payload.connectome.mode}`,
          );
        }

        updateDiagnostics({
          mode: canonicalMode,
          dataset: payload.connectome.dataset,
          isConnectomeLoaded: true,
          neuronCount: payload.connectome.neuronCount,
          edgeCount: payload.connectome.edgeCount,
          activeInputNeurons: payload.connectome.activeInputNeurons,
          topOutputNeurons: payload.connectome.topOutputNeurons,
          simulationMs: payload.connectome.simulationMs,
          lastOutput: payload.brainOutput,
        });
        return payload.brainOutput;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown MaleCNS client error";
        updateDiagnostics({
          ...diagnostics,
          isConnectomeLoaded: false,
          error: message,
        });
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
};

interface StateInputs {
  readonly environment: MarketEnvironment;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly curiosity: number;
  readonly danger: number;
}

const chooseState = ({
  environment,
  buyDrive,
  sellDrive,
  curiosity,
  danger,
}: StateInputs): FlyState => {
  if (danger >= 0.68) return "panic";
  if (sellDrive >= 0.6 && sellDrive > buyDrive + 0.08) return "approach_sell";
  if (buyDrive >= 0.6 && buyDrive > sellDrive + 0.08) return "approach_buy";
  if (environment.position && Math.abs(environment.position.pnlPercent) >= 8) {
    return "inspect_portfolio";
  }
  if (Math.max(buyDrive, sellDrive) >= 0.48) return "interested";
  if (curiosity >= 0.55 && environment.ui.chart) return "observe_chart";
  return "explore";
};
