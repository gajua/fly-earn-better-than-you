# Fly Earn Better Than You

[English](README.md) | **한국어**

```text
초파리 커넥톰이 거래 화면을 보면 어떻게 될까?
```

**Fly Earn Better Than You**는 시장 관찰을 MaleCNS 기반 신경 시뮬레이션에
넣고, 작은 초파리가 BUY/SELL 인터페이스를 탐색하게 하는 오픈소스 실험이다.

- 지원 공개 시세 관찰에 브로커 API 키 불필요
- 자동 실주문 없음
- Paper-first
- Open source

**실험적 / exploratory** 프로젝트다. MaleCNS connectome 사용 ≠ 초파리가
주식을 이해함. Paper 성과 ≠ 미래 투자 성과. 투자 자문이 아니다.

> **Neural simulation constrained by real MaleCNS connectivity.**

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

## Community Global Learning

모든 사용자는 동일하게 공개된 calibration preset을 사용한다.

최초 실행 시 Global Learning 참여 여부를 **직접 선택**한다
(미리 선택된 항목 없음). 기여 여부와 관계없이 Fly / MaleCNS / Paper 품질은
동일하다.

익명 Paper 결과가 많아질수록 다음 공통 보정 버전을 평가할 근거가 늘어난다.
MaleCNS 자체는 재학습하지 않는다. 새 preset은 검증 후 수동 배포한다.

개인정보: 거래소 로그인, 계좌번호, 잔고/보유, 실거래, 쿠키/토큰, 원본 심볼,
이메일은 업로드하지 않는다.

버전은 서로 다른 개념이다:

```text
Extension v1.1.0
Global Calibration v1.0.0
MaleCNS dataset v1.0
```

자세한 내용: [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md),
`apps/extension/.env.example`

## 언어

Auto / 한국어 / English. 말풍선·팝업 문자열 번역. 비즈니스 키는 영어 유지.

## 성과

실험용 Paper 대시보드: 수익률, 실현손익, 승률, Profit Factor, Max Drawdown,
뇌 모드별 집계.

과거 Paper 성과가 미래 수익을 보장하지 않습니다.

## 설치

```bash
git clone https://github.com/gajua/fly-earn-better-than-you.git
cd fly-earn-better-than-you
pnpm install

# MaleCNS real-connectome 사용 시에만 (optional)
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
cd ../..

pnpm --filter @fly/extension build
```

`chrome://extensions` → Load unpacked → `apps/extension/dist`

팝업 최초 실행: 언어 + Global Learning 선택 후 진행.

기본: Paper + Mock brain.

## 안전

- 자동 live order submit 없음
- API 키 / 쿠키 / Authorization 수집 없음
- runtime hosted LLM 없음
- 공유 학습은 사용자가 명시적으로 선택한 경우에만 익명 Paper 관찰 전송

## 문서

- [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md)
- [`docs/LOCAL_LEARNING.md`](docs/LOCAL_LEARNING.md)
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- [`docs/GENERIC_BROKER_DETECTOR.md`](docs/GENERIC_BROKER_DETECTOR.md)
- [`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md)
- [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md)
