import { useCallback, useMemo, useState } from "react";
import { createMaleCNSBrain, createMockFlyBrain } from "@fly/brain-client";
import { createDemoBrokerAdapter } from "@fly/broker-adapters";
import type { BrainOutput, FlyBrain, InspectableFlyBrain } from "@fly/core";
import { FlyOverlay } from "@fly/fly-ui";

type ScenarioName =
  "Bullish" | "Bearish" | "Volatile" | "Calm" | "Big Profit" | "Big Loss";

interface MarketScenario {
  readonly momentum: number;
  readonly volatility: number;
  readonly volumeStrength: number;
  readonly changePercent: number;
  readonly pnlPercent: number;
  readonly chartPath: string;
}

const scenarios: Record<ScenarioName, MarketScenario> = {
  Bullish: {
    momentum: 0.95,
    volatility: 0.14,
    volumeStrength: 0.92,
    changePercent: 4.84,
    pnlPercent: 10.54,
    chartPath:
      "M0 166 C65 154 82 130 145 137 S245 96 305 110 S415 61 490 70 S590 27 700 18",
  },
  Bearish: {
    momentum: -0.92,
    volatility: 0.3,
    volumeStrength: 0.78,
    changePercent: -4.21,
    pnlPercent: -6.75,
    chartPath:
      "M0 30 C70 42 95 67 160 58 S250 101 320 89 S430 142 500 126 S600 169 700 181",
  },
  Volatile: {
    momentum: -0.2,
    volatility: 0.98,
    volumeStrength: 1,
    changePercent: -1.32,
    pnlPercent: -2.9,
    chartPath:
      "M0 110 L60 38 L115 172 L175 51 L235 151 L300 23 L365 176 L430 57 L500 143 L570 35 L630 165 L700 88",
  },
  Calm: {
    momentum: 0.02,
    volatility: 0.1,
    volumeStrength: 0.3,
    changePercent: 0.12,
    pnlPercent: 1.2,
    chartPath: "M0 105 C90 101 120 110 205 104 S320 98 410 105 S555 101 700 99",
  },
  "Big Profit": {
    momentum: 0.18,
    volatility: 0.22,
    volumeStrength: 0.62,
    changePercent: 1.64,
    pnlPercent: 24.8,
    chartPath: "M0 172 C110 155 120 132 205 138 S330 95 410 101 S535 52 700 31",
  },
  "Big Loss": {
    momentum: -0.68,
    volatility: 0.82,
    volumeStrength: 0.91,
    changePercent: -8.72,
    pnlPercent: -26.4,
    chartPath:
      "M0 31 C78 45 104 70 165 63 S270 111 330 102 S460 150 520 143 S610 181 700 188",
  },
};

const adapter = createDemoBrokerAdapter();
const quantity = 12;
const averagePrice = 210.04;

type BrainChoice = "mock" | "malecns" | "shuffled-control";

const readConfiguredBrainMode = (): BrainChoice => {
  const mode = import.meta.env.VITE_FLY_BRAIN_MODE;
  if (mode === "malecns" || mode === "shuffled-control") return mode;
  return "mock";
};

const configuredBrainMode = readConfiguredBrainMode();

const isInspectableBrain = (brain: FlyBrain): brain is InspectableFlyBrain =>
  "getDiagnostics" in brain;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function App() {
  const [scenarioName, setScenarioName] = useState<ScenarioName>("Calm");
  const [manualClicks, setManualClicks] = useState({ buy: 0, sell: 0 });
  const [brainMode, setBrainMode] = useState<BrainChoice>(configuredBrainMode);
  const [lastBrainOutput, setLastBrainOutput] = useState<BrainOutput | null>(
    null,
  );
  const [brainError, setBrainError] = useState<string | null>(null);
  const [loginState, setLoginState] = useState<"LOGGED_IN" | "LOGGED_OUT">(
    "LOGGED_IN",
  );
  const brain = useMemo<FlyBrain>(
    () =>
      brainMode === "mock"
        ? createMockFlyBrain()
        : createMaleCNSBrain({
            mode: brainMode,
            baseUrl:
              import.meta.env.VITE_FLY_BRAIN_URL ?? "http://127.0.0.1:8000",
          }),
    [brainMode],
  );
  const diagnostics = isInspectableBrain(brain)
    ? brain.getDiagnostics()
    : undefined;
  const handleBrainOutput = useCallback((output: BrainOutput) => {
    setLastBrainOutput(output);
    setBrainError(null);
  }, []);
  const handleBrainError = useCallback((error: Error) => {
    setBrainError(error.message);
  }, []);
  const selectBrainMode = (mode: BrainChoice) => {
    setBrainMode(mode);
    setLastBrainOutput(null);
    setBrainError(null);
  };
  const scenario = scenarios[scenarioName];
  const price = averagePrice * (1 + scenario.pnlPercent / 100);
  const marketValue = quantity * price;
  const pnlAmount = quantity * (price - averagePrice);
  const isPositive = scenario.changePercent >= 0;

  return (
    <main
      className="app-shell"
      data-demo-broker
      data-symbol="AAPL"
      data-asset-name="Apple Inc."
      data-price={price}
      data-change-percent={scenario.changePercent}
      data-quantity={quantity}
      data-average-price={averagePrice}
      data-pnl-amount={pnlAmount}
      data-pnl-percent={scenario.pnlPercent}
      data-momentum={scenario.momentum}
      data-volatility={scenario.volatility}
      data-volume-strength={scenario.volumeStrength}
      data-active-scenario={scenarioName}
      data-login-state={loginState}
      data-watchlist="AAPL,NVDA,MSFT"
      data-timeframes="1m,5m,15m,1h,1d"
      data-market-open="true"
      data-page-kind="trade"
      data-tf-1m={JSON.stringify(
        Array.from({ length: 30 }, (_, index) => ({
          open: price * (1 - 0.01 + index * 0.0005),
          high: price * (1 - 0.005 + index * 0.0005),
          low: price * (1 - 0.015 + index * 0.0005),
          close: price * (1 - 0.008 + index * 0.0005),
          volume: 1_000 + index * 10,
          timestamp: new Date(Date.now() - (29 - index) * 60_000).toISOString(),
        })),
      )}
    >
      <header className="topbar">
        <a className="brand" href="/" aria-label="Fly Trade home">
          <span className="brand-mark">F</span>
          <span>FLY TRADE</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a className="active" href="#trade">
            Trade
          </a>
          <a href="#portfolio">Portfolio</a>
          <a href="#markets">Markets</a>
        </nav>
        <div className="market-status">
          <span className="status-dot" />
          Market open
          <button
            type="button"
            data-fly-target="login"
            className="login-toggle"
            onClick={() =>
              setLoginState((current) =>
                current === "LOGGED_IN" ? "LOGGED_OUT" : "LOGGED_IN",
              )
            }
          >
            {loginState === "LOGGED_IN" ? "Log out (demo)" : "Log in (demo)"}
          </button>
        </div>
      </header>

      <div className="workspace" id="trade">
        <section className="market-panel">
          <div className="asset-header">
            <div>
              <div className="symbol-line">
                <h1>AAPL</h1>
                <span>NASDAQ</span>
              </div>
              <p>Apple Inc.</p>
            </div>
            <div className="price-block">
              <strong>{formatMoney(price)}</strong>
              <span className={isPositive ? "positive" : "negative"}>
                {isPositive ? "+" : ""}
                {scenario.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="timeframes" aria-label="Chart time range">
            {["1D", "1W", "1M", "3M", "1Y"].map((range) => (
              <button className={range === "1D" ? "selected" : ""} key={range}>
                {range}
              </button>
            ))}
          </div>

          <div className="chart" data-fly-target="chart">
            <div className="chart-y-axis" aria-hidden="true">
              <span>245</span>
              <span>235</span>
              <span>225</span>
              <span>215</span>
            </div>
            <svg
              viewBox="0 0 700 210"
              preserveAspectRatio="none"
              aria-label={`${scenarioName} AAPL price chart`}
            >
              <defs>
                <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? "#5fe0a4" : "#ff6875"}
                    stopOpacity=".22"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? "#5fe0a4" : "#ff6875"}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <g className="grid-lines">
                <line x1="0" y1="35" x2="700" y2="35" />
                <line x1="0" y1="90" x2="700" y2="90" />
                <line x1="0" y1="145" x2="700" y2="145" />
                <line x1="0" y1="200" x2="700" y2="200" />
              </g>
              <path
                className={
                  isPositive
                    ? "chart-line positive-stroke"
                    : "chart-line negative-stroke"
                }
                d={scenario.chartPath}
              />
              <path
                d={`${scenario.chartPath} L700 210 L0 210 Z`}
                fill="url(#area-fill)"
              />
            </svg>
            <div className="chart-x-axis" aria-hidden="true">
              <span>10 AM</span>
              <span>12 PM</span>
              <span>2 PM</span>
              <span>4 PM</span>
            </div>
          </div>
        </section>

        <aside className="order-panel" aria-label="Order ticket">
          <div className="order-heading">
            <h2>Market order</h2>
            <span>USD</span>
          </div>
          <label>
            Shares
            <span className="input-like">
              1 <small>share</small>
            </span>
          </label>
          <label>
            Estimated price
            <span className="input-like">{formatMoney(price)}</span>
          </label>
          <div className="available">
            <span>Buying power</span>
            <strong>$12,480.00</strong>
          </div>
          <div className="order-actions">
            <button
              className="order-button buy"
              data-fly-target="buy"
              onClick={() =>
                setManualClicks((value) => ({ ...value, buy: value.buy + 1 }))
              }
            >
              BUY
            </button>
            <button
              className="order-button sell"
              data-fly-target="sell"
              onClick={() =>
                setManualClicks((value) => ({ ...value, sell: value.sell + 1 }))
              }
            >
              SELL
            </button>
          </div>
          <p className="manual-clicks" data-testid="order-click-count">
            Manual clicks · BUY {manualClicks.buy} / SELL {manualClicks.sell}
          </p>
          <p className="safety-note">
            Fly observes only. It can never place an order.
          </p>
        </aside>

        <section
          className="portfolio-card"
          id="portfolio"
          data-fly-target="portfolio"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR POSITION</span>
              <h2>Portfolio</h2>
            </div>
            <strong>{formatMoney(marketValue)}</strong>
          </div>
          <div className="position-grid">
            <div>
              <span>Quantity</span>
              <strong>{quantity} shares</strong>
            </div>
            <div>
              <span>Average cost</span>
              <strong>{formatMoney(averagePrice)}</strong>
            </div>
            <div>
              <span>Market value</span>
              <strong>{formatMoney(marketValue)}</strong>
            </div>
            <div>
              <span>Total return</span>
              <strong className={pnlAmount >= 0 ? "positive" : "negative"}>
                {pnlAmount >= 0 ? "+" : ""}
                {formatMoney(pnlAmount)} ({scenario.pnlPercent.toFixed(2)}%)
              </strong>
            </div>
          </div>
        </section>

        <aside className="scenario-panel" aria-label="Market scenario controls">
          <div>
            <span className="eyebrow">FLY LAB</span>
            <h2>Market simulator</h2>
            <p>Change the signal and observe the fly.</p>
          </div>
          <div className="scenario-buttons">
            {(Object.keys(scenarios) as ScenarioName[]).map((name) => (
              <button
                key={name}
                className={name === scenarioName ? "active" : ""}
                onClick={() => setScenarioName(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="signal-readout">
            <span>
              Momentum <b>{scenario.momentum.toFixed(2)}</b>
            </span>
            <span>
              Volatility <b>{scenario.volatility.toFixed(2)}</b>
            </span>
            <span>
              Volume <b>{scenario.volumeStrength.toFixed(2)}</b>
            </span>
          </div>
          <div className="brain-mode-picker" aria-label="Brain mode">
            {(
              [
                ["mock", "Mock"],
                ["malecns", "MaleCNS"],
                ["shuffled-control", "Shuffled control"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                className={mode === brainMode ? "active" : ""}
                onClick={() => selectBrainMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className={`brain-diagnostics ${brainError ? "has-error" : ""}`}
            data-testid="brain-diagnostics"
          >
            <span className="eyebrow">BRAIN</span>
            <strong>
              {brainMode === "mock"
                ? "Mock heuristic"
                : brainMode === "malecns"
                  ? "MaleCNS v1.0"
                  : "Shuffled control"}
            </strong>
            <dl>
              <div>
                <dt>Connectome</dt>
                <dd>
                  {brainMode === "mock"
                    ? "not used"
                    : diagnostics?.isConnectomeLoaded
                      ? "loaded"
                      : "waiting"}
                </dd>
              </div>
              <div>
                <dt>Neurons / edges</dt>
                <dd>
                  {diagnostics?.neuronCount?.toLocaleString() ?? "—"} /{" "}
                  {diagnostics?.edgeCount?.toLocaleString() ?? "—"}
                </dd>
              </div>
              <div>
                <dt>Simulation</dt>
                <dd>
                  {diagnostics?.simulationMs
                    ? `${diagnostics.simulationMs.toFixed(2)} ms`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Fly state</dt>
                <dd>{lastBrainOutput?.state ?? "—"}</dd>
              </div>
            </dl>
            {diagnostics?.activeInputNeurons[0] && (
              <p>
                Input bodyId {diagnostics.activeInputNeurons[0].bodyId} ·{" "}
                {diagnostics.activeInputNeurons[0].activity.toFixed(3)}
              </p>
            )}
            {diagnostics?.topOutputNeurons[0] && (
              <p>
                Output bodyId {diagnostics.topOutputNeurons[0].bodyId} ·{" "}
                {diagnostics.topOutputNeurons[0].activity.toFixed(3)}
              </p>
            )}
            {brainError && <p className="brain-error">{brainError}</p>}
          </div>
          <span className="heuristic-badge">
            {brainMode === "mock"
              ? "MOCK · NOT BIOLOGICAL"
              : brainMode === "malecns"
                ? "REAL WIRING · MODELED DYNAMICS"
                : "CONTROL · NOT MALECNS"}
          </span>
        </aside>
      </div>

      <FlyOverlay
        adapter={adapter}
        brain={brain}
        onBrainOutput={handleBrainOutput}
        onBrainError={handleBrainError}
      />
    </main>
  );
}
