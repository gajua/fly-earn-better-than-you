# Fly Earn Better Than You

[English](README.md) | **한국어**

> 진짜 초파리 커넥톰이 거래소 차트 위를 걸어 다닌다.
> 알파를 원했는데 곤충학이 도착했다.

**Fly Earn Better Than You**는 지원 거래소 페이지를 관찰하고, **실제** 시장
데이터를 MaleCNS v1.0 초파리 커넥톰으로 제약된 신경 시뮬레이션에 넣고, BUY/SELL
근처에서 반응하는 초파리를 그리는 오픈소스 Chrome 실험이다.

이건 투자 자문이 아니며, 초파리가 시장을 예측한다는 주장도 아니다.

## 지금 사용 / 인식 가능한 거래소

### 사용 가능 (USABLE BETA)

| 거래소       | 내용                                        | 예시 URL                                                 |
| ------------ | ------------------------------------------- | -------------------------------------------------------- |
| Local demo   | 로컬 플레이그라운드                         | `pnpm --filter @fly/demo dev`                            |
| Binance Spot | 차트, Max Buy/Sell, 공개 캔들, Fly, Paper   | `https://www.binance.com/en/trade/BTC_USDT?type=spot`    |
| Upbit        | 차트, 매수/매도, 공식 공개 캔들, Fly, Paper | `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` |

### 시세만 인식 (UI 미지원)

Bybit / Kraken / Coinbase — public candle provider only.

### 아직 없음

주식 브로커, 자동 실주문 제출.

## Global Learning

같은 Fly 버전과 Global Calibration 버전을 사용하는 사용자는 동일한
calibration 품질로 시작합니다. MaleCNS connectome 자체는 재학습하지 않습니다.

- 번들 verified preset으로 오프라인에서도 동작
- 원격 published preset은 optional
  ([`sfimnzdjndmipmtlnniq`](https://supabase.com/dashboard/project/sfimnzdjndmipmtlnniq),
  스키마 + SHA-256 검증)
- 익명 Paper 학습 기여는 **opt-in** (기본 OFF), Edge Function
  `ingest-learning-observation` 경유
- 계좌 인증정보 / 심볼 / 실거래 데이터 업로드 없음
- Supabase 없는 fork도 기본 기능 정상
- Paper/history 원본은 IndexedDB

자세한 내용: [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md),
`apps/extension/.env.example`

## 언어

Auto / 한국어 / English. 말풍선·팝업 문자열 번역. 비즈니스 키는 영어 유지.

## 성과

실험용 Paper 대시보드: 수익률, 실현손익, 승률, Profit Factor, Max Drawdown,
뇌 모드별 집계.

과거 Paper 성과가 미래 수익을 보장하지 않습니다.

## Generic broker detection

미지원 페이지용 DOM semantic foundation. 높은 confidence일 때만 **Paper only**.
기존 Binance/Upbit adapter는 유지.

## 설치

```bash
git clone https://github.com/gajua/fly-earn-better-than-you.git
cd fly-earn-better-than-you
git checkout main
pnpm install
pnpm --filter @fly/extension build
```

`chrome://extensions` → Load unpacked → `apps/extension/dist`

기본: Paper + Mock brain.

## 안전

- 자동 live order submit 없음
- API 키 / 쿠키 / Authorization 수집 없음
- runtime hosted LLM 없음
- 공유 학습은 사용자가 켠 경우에만 익명 Paper 관찰 전송

## 문서

- [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md)
- [`docs/LOCAL_LEARNING.md`](docs/LOCAL_LEARNING.md)
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- [`docs/GENERIC_BROKER_DETECTOR.md`](docs/GENERIC_BROKER_DETECTOR.md)
- [`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md)
