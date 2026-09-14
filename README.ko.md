# 🪰 초파리가 너보다 잘 번다.

### 차트를 초파리에게 보여줘 보세요.

### 당신이 고민하는 동안, 초파리는 이미 BUY와 SELL 사이를 날아다니고 있습니다.

[English](README.md) | **한국어**

**Fly Earn Better Than You**는 실제 초파리의 신경 연결 지도(MaleCNS connectome)를
시장 데이터와 연결해, 초파리가 거래소 화면을 관찰하고
BUY / SELL 행동을 표현하도록 만든 오픈소스 실험 프로젝트입니다.

```text
차트를 봅니다.
시장의 움직임을 신경 자극으로 바꿉니다.
초파리 뇌가 반응합니다.
그리고 초파리가 움직입니다.
```

```text
🧪 Paper-first
🔑 지원 공개 시세 관찰에 브로커 API 키 불필요
🧠 MaleCNS 기반 connectome simulation
🌍 Community Global Calibration
🇰🇷 한국어 / 🇺🇸 English
```

**Fly는 실제 돈 주문을 자동으로 제출하지 않습니다.**

---

## 그래서 뭘 하는데?

Upbit이나 Binance를 열어두세요.

🪰 Fly가 깨어납니다.

Fly는 거래소를 돌아다니며:

- 현재 종목을 확인하고
- 여러 시간대의 시장 데이터를 관찰하고
- 차트와 종목 목록을 살펴보고
- MaleCNS 신경망을 통해 시장 자극에 반응하고
- BUY 쪽에 끌리면 매수 버튼 근처로 날아가고
- SELL 쪽에 끌리면 매도 버튼 근처로 날아갑니다.

아무것도 흥미롭지 않다면?

그냥 다른 곳으로 날아갑니다.

```text
거래소 화면
    ↓
시장 데이터
    ↓
감각 자극 변환
    ↓
🧠 MaleCNS
    ↓
행동 결정
    ↓
🪰
매수 ← → 매도
```

---

## 왜 하필 초파리?

왜 안 되죠?

사람들은 매일 수십 개의 지표와 뉴스와 차트를 보면서
BUY와 SELL 사이에서 고민합니다.

이 프로젝트는 질문을 조금 다르게 던집니다.

> 실제 초파리의 신경 연결 구조에 시장을 보여주면
> 어떤 행동을 할까?

그리고 그 결과를 화면 위를 날아다니는
한 마리의 초파리로 보여줍니다.

### 과학적으로 정직한 설명

물론 초파리가 주식을 이해하는 것은 아닙니다.

이 프로젝트는 초파리가 시장을 예측할 수 있다고 주장하지 않습니다.

시장 데이터를 감각 자극으로 변환하고,
MaleCNS 기반 시뮬레이션을 통과시킨 뒤,
그 반응을 행동 신호로 해석해 Fly의 움직임으로 보여주는 실험입니다.

권장 표현:

> **Neural simulation constrained by real MaleCNS connectivity.**

**실험적 / exploratory** Chrome Extension 프로젝트입니다.
Paper 성과 ≠ 미래 투자 성과. 투자 자문이 아닙니다.

---

## 그래서, 진짜 나보다 잘 버나?

그걸 확인하는 게 이 프로젝트의 재미입니다.

Fly의 Paper 거래 결과를 직접 확인하세요.

- 누적 수익률
- 실현 손익
- 승률
- Profit Factor
- 최대 낙폭
- 최고 / 최악의 거래

자세한 내용: [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

---

## 🪰 초파리는 혼자 배우지 않습니다.

모든 Fly는 동일한 Global Calibration을 사용합니다.

사용자가 원한다면 익명화된 Paper 결과를 공유할 수 있습니다.

더 많은 사람이 Fly를 사용하고,
더 많은 Paper 결과가 쌓이면,
다음 공통 보정값을 평가할 수 있는 데이터도 많아집니다.

좋은 candidate가 검증되면 새로운 Global Calibration으로 공개됩니다.

그리고 모든 Fly가 동일한 개선된 보정값을 사용합니다.

```text
1 Fly
   +
100 Fly
   +
1,000 Fly
      ↓
Anonymous Paper observations
      ↓
Candidate calibration
      ↓
Validation
      ↓
New Global Calibration
      ↓
🪰🪰🪰 Everyone gets the same calibration
```

중요:

- MaleCNS 자체는 **재학습하지 않습니다**
- 자동 “self-learning AI”가 **아닙니다**
- 수익이 좋아진다고 **보장하지 않습니다**

버전은 서로 다른 개념입니다:

```text
Extension v1.1.0
Global Calibration v1.0.0
MaleCNS dataset v1.0
```

개인정보: 거래소 로그인, 계좌번호, 잔고/보유, 실거래, 쿠키/토큰, 원본 심볼,
이메일은 업로드하지 않습니다.

자세한 내용: [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md),
`apps/extension/.env.example`

---

## 초파리는 어디에서 날 수 있나요?

**사용 가능(usable)** = 페이지 감지, Fly 표시, 실제 시세, Paper 거래.
**시세만 인식** = public candle 코드만 있고 온페이지 Fly UI adapter 없음.

### 사용 가능 (USABLE BETA)

| 거래소       | 내용                                        | 예시 URL                                                 |
| ------------ | ------------------------------------------- | -------------------------------------------------------- |
| Local demo   | 로컬 플레이그라운드                         | `pnpm --filter @fly/demo dev`                            |
| Binance Spot | 차트, Max Buy/Sell, 공개 캔들, Fly, Paper   | `https://www.binance.com/en/trade/BTC_USDT?type=spot`    |
| Upbit        | 차트, 매수/매도, 공식 공개 캔들, Fly, Paper | `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` |

Binance Spot + Upbit는 **USABLE BETA**. Stable 아님. 로그인/포트폴리오는
**NOT VERIFIED**. 자동 live order submit는 **절대 없음**.

### 시세만 인식 (UI 미지원)

| 거래소   | 상태                                            |
| -------- | ----------------------------------------------- |
| Bybit    | Public candle provider only — no Fly UI adapter |
| Kraken   | Public candle provider only — no Fly UI adapter |
| Coinbase | Public candle provider only — no Fly UI adapter |

### 아직 없음

| 영역                   | 상태          |
| ---------------------- | ------------- |
| 주식 브로커            | Planned       |
| 자동 live order submit | Will not ship |

**Market Data Ready ≠ Full Broker Support.** 근거:
[`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md),
[`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

---

## 자율 탐색 (Binance Spot)

Binance에서 Fly는 BUY/SELL 버튼만 맴돌지 않고 시장을 둘러볼 수 있습니다.

- BTC / ETH / SOL 등 작은 USDT 후보군
- 관심 있으면 1d → 4h → 1h → 15m
- HUD에서 종목 / 시간봉 / curiosity / 관찰 이유
- **거래하지 않는 것이 정상** — 충분히 본 뒤에만 Paper proposal

화면 조종은 BUY/SELL·주문 제출을 클릭하지 않습니다. HUD/팝업에서 즉시 멈출 수 있습니다.

설명: [`docs/AUTONOMOUS_EXPLORATION.md`](docs/AUTONOMOUS_EXPLORATION.md).

---

## 내 거래소에 초파리 한 마리 풀어놓기

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

1. `chrome://extensions` 열기
2. Developer mode → Load unpacked → `apps/extension/dist`
3. 팝업 최초 실행: 언어 + Global Learning 선택
4. 지원 거래소 페이지 또는 `pnpm --filter @fly/demo dev`

동의 후 기본값: Paper + Mock brain. 익명 Paper 기여 여부와 관계없이 Fly 품질은
동일합니다.

### Binance

1. unpacked extension 로드
2. `https://www.binance.com/en/trade/BTC_USDT?type=spot` (로그아웃 OK)
3. 심볼·차트·Max Buy/Max Sell·공개 캔들 확인
4. Paper fill은 IndexedDB. Live order submit 자동화 없음

### Upbit

1. unpacked extension 로드 (`apps/extension/dist`)
2. Popup → Trading `Paper` → Brain `Mock` 또는 `MaleCNS real-connectome` → Save
3. `https://www.upbit.com/exchange?code=CRIX.UPBIT.KRW-BTC` (로그아웃 OK)
4. Fly overlay, 매수/매도, 공식 공개 캔들 확인
5. Paper fill은 IndexedDB. Live order submit 자동화 없음

MaleCNS: Binance와 동일 로컬 서비스 (`http://127.0.0.1:8000`). Brain 모드 변경
후 Upbit 탭을 새로고침하세요.

---

## 기술 세부사항

### 파이프라인

Broker observation → validated candles → MarketFeatureExtractor /
TemporalAggregator → Mock or MaleCNS → BehaviorDecoder →
**GlobalCalibrationPreset** → Fly overlay → ProposalGuard / RiskEngine → Paper
(기본) 또는 Live Assist.

### 언어

팝업 설정: Auto / 한국어 / English (`chrome.storage.local`).
말풍선·팝업 문자열 번역. 비즈니스 키는 영어 유지.

### 개인정보 / 안전

- Paper history와 설정은 IndexedDB에 로컬 저장
- 공유 학습 업로드는 사용자가 명시한 경우에만 (익명 Paper feature)
- 비밀번호 / OTP / 쿠키 / Authorization 수집 없음
- runtime hosted LLM 없음
- 자동 live order submit 없음

### API 키 / runtime LLM 비용

- 기본으로 브로커 API 키·시크릿·쿠키·OAuth 트레이딩 토큰 불필요
- 시세 우선순위: DOM → embedded public data → public no-auth endpoint →
  `UNAVAILABLE`
- 합성 캔들 / 가짜 timeframe / silent TF fallback 없음

### MaleCNS 서비스

```bash
cd services/brain
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Popup → Brain → MaleCNS real-connectome. 서비스/아티팩트 없으면 hard fail
(Mock fallback 없음).

### Paper / Live Assist / Risk / History

- Paper: 가상 fill, PositionCycle, 로컬 성과
- Live Assist: approach + proposal만; 주문은 사용자가 직접
- Risk: ProposalGuard + RiskEngine
- History: IndexedDB local-first. Supabase는 shared learning용 optional

### Generic broker detection

미지원 페이지용 DOM semantic foundation. 높은 confidence일 때만 **Paper only**.
기존 Binance/Upbit adapter는 유지.

[`docs/GENERIC_BROKER_DETECTOR.md`](docs/GENERIC_BROKER_DETECTOR.md)

### 브로커 추가

[`docs/ADDING_BROKER.md`](docs/ADDING_BROKER.md),
`packages/broker-adapters/template/`

### 명령어

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm test:python
pnpm test:rust
```

### 제한

- 자동 live order automation 없음
- 비밀번호 / OTP / 쿠키 / Authorization 수집 없음
- 합성 multi-timeframe 발명 없음
- 로그인 포트폴리오 정합은 종종 NOT VERIFIED
- 주식 브로커는 v1에 없음

### 라이선스 / attribution

MIT — `LICENSE`. 서드파티:
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md),
[`docs/THIRD_PARTY_ADAPTERS.md`](docs/THIRD_PARTY_ADAPTERS.md).

### 문서

- [`AGENTS.md`](AGENTS.md)
- [`docs/GLOBAL_LEARNING.md`](docs/GLOBAL_LEARNING.md)
- [`docs/EXTENSION_ARCHITECTURE.md`](docs/EXTENSION_ARCHITECTURE.md)
- [`docs/REAL_BROWSER_QA.md`](docs/REAL_BROWSER_QA.md)
- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
- [`docs/RELEASE_READINESS.md`](docs/RELEASE_READINESS.md)
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- [`docs/LOCAL_LEARNING.md`](docs/LOCAL_LEARNING.md)
