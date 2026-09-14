# Chrome Web Store listing — Fly Earn Better Than You

Reference for the Developer Dashboard **Store listing** tab.

Official limits (Chrome docs):

- Summary / short description: **≤ 132 characters**
- Manifest `description`: **≤ 132 characters**
- Store icon: **128×128** PNG (artwork often 96×96 with padding)
- Screenshots: **1280×800** or **640×400**, ≥1 and up to 5
- Small promo tile: **440×280** (required)
- Marquee promo: **1400×560** (optional)

## Name

Fly Earn Better Than You

## Short description / summary (132 chars max)

```text
A fruit-fly connectome watches crypto markets and reacts on your trading screen.
```

Character count: 79

Korean summary option:

```text
초파리 connectome이 암호화폐 차트를 보고 BUY/SELL 근처로 날아다니는 실험용 Chrome 확장입니다.
```

## Detailed description (English)

```text
Fly Earn Better Than You is an open-source Chrome Extension experiment.

It maps real market observations into a MaleCNS fruit-fly connectome simulation and draws a tiny, non-interactive fly on supported trading screens.

What you get
• Binance Spot and Upbit support (USABLE BETA)
• Paper-first trading simulation (default)
• BUY / SELL visual behavior from MaleCNS-based drives
• Local Paper performance history
• Optional anonymous community Paper contribution for shared Global Calibration
• Korean / English UI

What this is NOT
• Not an automated investment advisor
• Not a claim that fruit flies predict markets
• Not a guarantee of returns or “beats the market” performance
• Does not automatically submit real-money orders
• Does not require broker API keys for supported public observation

How it works (high level)
Trading screen → market observations → sensory encoding → MaleCNS → Fly behavior near BUY/SELL → Paper simulation

Community Global Learning
Everyone uses the same published Global Calibration preset. You can keep Paper data local, or opt in to share anonymous Paper results that help evaluate future shared calibrations. MaleCNS connectivity itself is not retrained.

Privacy
Passwords, cookies, session tokens, account balances, live-order history, and contribution raw symbols are not collected for Global Learning. See the Privacy Policy linked from this listing.

Open source
https://github.com/gajua/fly-earn-better-than-you
```

## Detailed description (Korean)

```text
Fly Earn Better Than You는 오픈소스 Chrome 확장 실험입니다.

실제 시장 관찰을 MaleCNS 초파리 connectome 시뮬레이션에 연결하고, 지원 거래소 화면에 비대화형 초파리를 그립니다.

제공 기능
• Binance Spot / Upbit 지원 (USABLE BETA)
• Paper-first 시뮬레이션 (기본)
• MaleCNS 기반 BUY/SELL 시각 행동
• 로컬 Paper 성과 기록
• 선택적 익명 Paper 기여 → 공통 Global Calibration
• 한국어 / English

아닌 것
• 자동 투자 자문 아님
• 초파리가 시장을 예측한다는 주장 아님
• 수익 보장 / “시장을 이긴다” 표현 없음
• 실주문 자동 제출 없음
• 지원 공개 시세 경로에 브로커 API 키 불필요

개인정보 및 Privacy Policy는 스토어 리스팅 링크를 참고하세요.

오픈소스: https://github.com/gajua/fly-earn-better-than-you
```

## Category

Suggested: Productivity or Fun (pick one in dashboard; Fun is reasonable for experimental UI)

## Language

English (primary) + Korean listing localization if available

## Privacy Policy URL

**Required** for this extension (handles local user data + optional Global
Learning). Dashboard blocks incomplete privacy fields.

After GitHub Pages is enabled for `/docs`:

`https://gajua.github.io/fly-earn-better-than-you/privacy/`

Until then, temporary public URL:

`https://github.com/gajua/fly-earn-better-than-you/blob/main/PRIVACY.md`

Prefer the Pages HTML URL for Store submission.

## Homepage URL

`https://github.com/gajua/fly-earn-better-than-you`

## Support URL

`https://github.com/gajua/fly-earn-better-than-you/issues`

## Assets in this repo

| Asset               | Path                                                    |
| ------------------- | ------------------------------------------------------- |
| Extension icons     | `apps/extension/public/icons/`                          |
| Store icon 128      | `docs/store/assets/icon-128.png`                        |
| Small promo 440×280 | `docs/store/assets/small-promo-440x280.png`             |
| Screenshot Binance  | `docs/store/assets/screenshot-binance-fly-1280x800.png` |
| Screenshot Upbit    | `docs/store/assets/screenshot-upbit-fly-1280x800.png`   |

Still capture manually (logged-out, no account PII):

3. Paper performance popup
4. Global Learning onboarding
5. ko/en language setting
