# Broker Adapter

`BrokerAdapter` is the only layer allowed to understand broker markup.

```ts
interface BrokerAdapter {
  id: string;
  detect(): boolean;
  detectLoginState(): LoginState;
  readCurrentAsset(): AssetSnapshot | null;
  readPortfolio(): PortfolioSnapshot | null;
  readWatchlist(): AssetCandidate[];
  readMarketEnvironment(): MarketEnvironment | null;
  getTargets(): BrokerTargets;
  getAvailableTimeframes(): Timeframe[];
  isMarketOpen(): boolean;
}
```

Broker definitions live in `BrokerRegistry` with `domains`,
`optionalHostPermissions`, and `AdapterStatus`.

## Current adapters

| id | status | notes |
| --- | --- | --- |
| `demo` | SUPPORTED | Local Fly demo `data-*` fixture; first vertical slice |
| production brokers | NOT IMPLEMENTED | Shape only |

## Security contract

An adapter may read visible asset, price, chart, position, P&L, and target
geometry. It must never read passwords, OTP values, session tokens, cookies,
account passwords, or hidden authentication state. It must never invoke
`click()`, dispatch an order event, submit a form, or call an order API.

Unknown selectors must yield `null` / empty / `BROKEN` — never invent trading
behavior from guesses.
