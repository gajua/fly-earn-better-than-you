# Trade Ledger

Trades are stored in extension IndexedDB (`fly-earn-better-than-you` /
`trades`).

Each `TradeRecord` stores mode (`paper` | `live-confirmed`), broker, symbol,
side, quantity, price, value, timestamps, optional proposal id, brain mode,
brain output snapshot, and optional neuron/timeframe diagnostics.

Paper and live-confirmed series are kept separate for performance dashboards.
Users can delete local Fly history from the popup Privacy section.
