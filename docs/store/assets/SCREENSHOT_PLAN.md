# Screenshot plan — Chrome Web Store

Target size: **1280×800** (or 640×400). No account balances, emails, or PII.

| #   | Shot                       | How to capture                                                | Status                                        |
| --- | -------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| 1   | Upbit + Fly                | Logged-out Upbit public chart; Fly overlay visible            | Ready (`screenshot-upbit-fly-1280x800.png`)   |
| 2   | Binance + Fly              | Logged-out Binance Spot; Fly overlay visible                  | Ready (`screenshot-binance-fly-1280x800.png`) |
| 3   | Paper performance          | Popup Performance / history with synthetic Paper only         | Manual                                        |
| 4   | Global Learning onboarding | Fresh profile first-run; radios unselected; Continue disabled | Manual                                        |
| 5   | Language setting           | Popup language Auto / 한국어 / English                        | Manual                                        |

## Capture rules

- Use production ZIP / unpacked `apps/extension/dist` from `pnpm package:extension`
- Clean Chrome profile
- Logged-out broker pages only
- Crop browser chrome if it shows Google account avatar
- Do not invent fake community counters in UI
