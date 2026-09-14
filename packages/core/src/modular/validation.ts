import type { NeuralModuleDefinition } from "./types";

const ALL_GRAPH_NEURONS = new Set<number>();

/** Register allowed neuron universe for validation (from MaleCNS artifact). */
export const registerConnectomeNeuronIds = (ids: readonly number[]): void => {
  ALL_GRAPH_NEURONS.clear();
  for (const id of ids) ALL_GRAPH_NEURONS.add(id);
};

export const validateModuleDefinitions = (
  modules: readonly NeuralModuleDefinition[],
): { ok: true } | { ok: false; reason: string } => {
  if (modules.length === 0) return { ok: false, reason: "empty-modules" };
  const seen = new Set<number>();
  for (const mod of modules) {
    if (mod.assignment !== "experimental") {
      return { ok: false, reason: "assignment-must-be-experimental" };
    }
    const ids = [
      ...mod.inputNeuronIds,
      ...(mod.intermediateNeuronIds ?? []),
      ...mod.outputNeuronIds,
    ];
    if (ids.length === 0 && mod.id !== "decision") {
      return { ok: false, reason: `empty-population:${mod.id}` };
    }
    for (const id of ids) {
      if (ALL_GRAPH_NEURONS.size > 0 && !ALL_GRAPH_NEURONS.has(id)) {
        return { ok: false, reason: `unknown-neuron:${id}` };
      }
      if (seen.has(id)) {
        // Overlap across modules is allowed (shared real neurons).
        continue;
      }
      seen.add(id);
    }
  }
  return { ok: true };
};

/** No synthetic IDs — must be positive integers from connectome. */
export const assertRealNeuronIds = (ids: readonly number[]): boolean =>
  ids.every((id) => Number.isInteger(id) && id > 0);
