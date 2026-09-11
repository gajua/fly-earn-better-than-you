# Broker Adapter

`BrokerAdapter` is the only layer allowed to understand broker markup.

```ts
interface BrokerAdapter {
  id: string;
  detect(): boolean;
  readEnvironment(): MarketEnvironment | null;
}
```

Adapters return snapshots, not live DOM objects. Rectangles are copied into the
serializable `DOMRectLike` type. Missing UI areas are valid and movement must
fall back safely.

## Security contract

An adapter may read visible asset, price, chart, position, P&L, and target
geometry. It must never read passwords, OTP values, session tokens, cookies,
account passwords, or hidden authentication state. It must never invoke
`click()`, dispatch an order event, submit a form, or call an order API.

`DemoBrokerAdapter` reads only explicit `data-*` values and four
`data-fly-target` rectangles. Future Binance, Toss, Korea Investment, Kiwoom,
and Generic adapters must remain separate modules and satisfy the same
read-only contract.
