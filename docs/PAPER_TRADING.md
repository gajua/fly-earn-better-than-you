# Paper Trading

Default trading mode is **paper**.

```text
OrderProposal
  -> ProposalGuard (cooldown / dedupe)
  -> RiskEngine
  -> verified PaperFill
  -> PositionCycle update
  -> TradeRecord (IndexedDB)
```

Proposals are not trades. Only verified fills mutate ledger/cycles.

Invalid sells (no position / oversell) reject without ledger mutation.

BUY→SELL round-trips are tracked as `PositionCycle` with weighted averages and
realized return %. Re-entry after close creates a new cycle.

Multi-timeframe inputs must be real candle-backed observations (or explicitly
`available: false`). Synthetic scaling is prohibited.
