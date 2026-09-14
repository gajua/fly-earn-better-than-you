# Trade Ledger

Local source of truth:

- IndexedDB `trades` + `cycles`
- `chrome.storage.local` for preferences and lightweight open positions cache

`TradeRepository` abstracts storage. Default: `LocalIndexedDbTradeRepository`.
Supabase is **not** a hard dependency; cloud sync would require explicit user
opt-in + Auth/RLS and must never receive broker credentials.

User-facing closed history emphasizes:

- symbol
- buy average
- sell average
- realized return %

UNVERIFIED live fills are excluded from performance.
