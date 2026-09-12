import type {
  BrainMode,
  OrderProposal,
} from "./types";

export interface ProposalGuardState {
  readonly lastAcceptedAt: Record<string, number>;
  readonly pendingIds: ReadonlySet<string>;
}

export const proposalGuardKey = (input: {
  broker: string;
  instrumentId: string;
  side: "buy" | "sell";
  brainMode: BrainMode;
}): string =>
  `${input.broker}|${input.instrumentId}|${input.side}|${input.brainMode}`;

export const canAcceptProposal = (
  proposal: OrderProposal,
  state: ProposalGuardState,
  nowMs: number,
  cooldownMs: number,
): { ok: true } | { ok: false; reason: string } => {
  const key = proposalGuardKey(proposal);
  if (state.pendingIds.has(proposal.id)) {
    return { ok: false, reason: "duplicate-pending-proposal" };
  }
  const last = state.lastAcceptedAt[key];
  if (last != null && nowMs - last < cooldownMs) {
    return { ok: false, reason: "proposal-cooldown" };
  }
  return { ok: true };
};

export const markProposalAccepted = (
  state: ProposalGuardState,
  proposal: OrderProposal,
  nowMs: number,
): ProposalGuardState => {
  const key = proposalGuardKey(proposal);
  return {
    lastAcceptedAt: { ...state.lastAcceptedAt, [key]: nowMs },
    pendingIds: new Set(state.pendingIds),
  };
};

export const emptyProposalGuardState = (): ProposalGuardState => ({
  lastAcceptedAt: {},
  pendingIds: new Set(),
});
