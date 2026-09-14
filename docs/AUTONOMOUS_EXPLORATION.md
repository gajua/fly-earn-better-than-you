# Autonomous Exploration v1

Fly can roam a supported trading screen, inspect several symbols and
timeframes, and only rarely approach Paper BUY/SELL.

This is **not** a claim that the fruit-fly brain predicts prices.

> Neural simulation constrained by the real MaleCNS connectome.

## REAL

- MaleCNS neuron / body IDs
- MaleCNS topology and relative synaptic weights
- generated MaleCNS graph artifacts
- public Binance candles (DOM or official no-auth endpoints)

## MODELED / EXPERIMENTAL

- OHLCV → `MarketFeatures` (MA, volume, volatility, RSI, trend)
- cross-timeframe `trendConflict` as a **reason to look longer**, not a trade signal
- agent-level `FlyMemory`, novelty, curiosity / interest scores
- exploration policy and epsilon-greedy symbol choice
- sensory mapping of novelty/conflict onto real MaleCNS **input** neurons
- behavior interpretation (`IGNORE` / `WATCH` / `EXPLORE` / `REVISIT` / approach)
- Binance UI explorer (symbol / timeframe / chart focus only)

## Loop

```text
WAKE → ORIENT → SCAN_MARKET → INSPECT_SYMBOL → CHANGE_TIMEFRAME
→ OBSERVE → COMPARE → CURIOUS? → REVISIT / FOCUS → DECIDE → REST
```

Not trading is a normal outcome. Paper proposals require multiple
timeframes or revisits **and** interest **and** neural drive gates.

## Browser control

Allowed: symbol navigation, timeframe navigation, chart focus, scroll.

Denied: BUY/SELL, order submit, quantity, leverage, withdraw, deposit, transfer.

If UI control fails, public market data analysis continues and the HUD
says the chart could not be controlled.

## User controls

Popup / HUD:

- Autonomous exploration on/off
- Slow / Normal / Fast
- Visible browser control on/off
- Activity HUD on/off
- Pause exploration (immediate stop of screen control)
