# Current-symbol Paper Fly (production UX)

Fly watches **only the symbol on the page you opened**. It does not navigate
Binance/Upbit to other markets or click timeframe controls.

## Behavior

- Multi-timeframe candles (1m–1d) are fetched in the background via public APIs.
- MaleCNS / modular pipeline and local learning are unchanged.
- Paper mode may **auto BUY/SELL** on the current symbol (no confirmation).
- Live-assist never auto-clicks broker order buttons.

## Overlay

- Corner fly with glasses + compact Paper card (symbol, state, virtual capital,
  cumulative return).
- Toasts on Paper fills; optional Chrome notifications (settings).

## Deprecated

Autonomous symbol exploration (`docs/AUTONOMOUS_EXPLORATION.md`) remains in
the repo for tests/dev only when `autonomousExploration: true`.
