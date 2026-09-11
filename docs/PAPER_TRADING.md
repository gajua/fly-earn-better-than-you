# Paper Trading

Default trading mode is **paper**.

Pipeline:

```text
candidate observation -> MaleCNS/Mock evaluate -> OrderProposal
  -> RiskEngine -> virtual fill -> PaperPosition + TradeRecord
```

Paper mode may auto-fill after a strong approach/avoidance response.

LIVE-ASSIST mode creates proposals for user review only and never auto-submits
real broker orders.

Candidate ranking / paper fills are an **experimental product layer**, not a
claim that MaleCNS predicts profitable trades.
