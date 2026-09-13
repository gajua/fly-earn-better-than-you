# AGENTS.md — Fly development policy

Single source of truth for humans and AI agents working in this repository.

## Product rules

- Paper Trading is the **default** mode.
- Live Assist only helps the user place orders themselves.
- Never implement automatic live order submit (`click`, form submit, trading
  keyboard automation against real broker UIs).
- Never require broker API keys / secrets / OAuth trading tokens by default.

## Market data rules

Priority order:

1. DOM (observed, not invented)
2. Embedded public data
3. Existing open-source / official **no-auth** public endpoint
4. `UNAVAILABLE`

Forbidden:

- synthetic candles
- fake / scaled timeframes
- random prices
- silent timeframe fallback (unsupported TF → `UNAVAILABLE`)

## Broker support rules

**Market Data Ready ≠ Full Broker Support.**

Claim Full / Usable support only after real-browser verification of at least:

- page detection
- symbol detection
- BUY/SELL targets
- real market data
- Fly overlay
- Paper flow

Update `docs/IMPLEMENTATION_STATUS.md` for every production broker change.
Every broker adapter needs fixtures + tests.

## MaleCNS rules

- Prefer: “Neural simulation constrained by real MaleCNS connectivity.”
- Do **not** claim the fly predicts markets.
- `real-connectome` must never silently fall back to Mock.
- Missing/corrupt MaleCNS artifacts → hard fail.
- Keep REAL (body IDs, topology, raw weights) separate from MODELED (LIF,
  sensory mapping, behavior decoding).
- Label `shuffled-control` explicitly; never call it MaleCNS.

## Privacy rules

Never read, store, or transmit:

- passwords, OTPs
- cookies, session tokens
- Authorization headers
- broker secrets / API credentials

## Failure rules

When ambiguous: `UNKNOWN` / `UNAVAILABLE` / `BROKEN`. Do not guess. Fail closed.

## Architecture invariants

1. Simulation/observation over live order automation.
2. Broker parsing stays out of Fly Brain logic.
3. `MockFlyBrain` and MaleCNS implement the same `FlyBrain` interface.
4. Overlay is non-interactive (`pointer-events: none` + desktop native ignore).
5. `MarketEnvironment` stays serializable and broker-neutral.
6. Browser viewport ≠ desktop screen coordinates.
7. Validate lint, typecheck, tests, and build before calling work complete.
