import type { BrokerAdapter } from "@fly/broker-adapters";
import type {
  BrainOutput,
  DOMRectLike,
  ExplorationMotion,
  FlyBrain,
  FlyState,
  HudSnapshot,
  MarketEnvironment,
} from "@fly/core";
import { canTransition, MINIMUM_STATE_DURATION_MS } from "./state-machine";
import type { PaperFlyCardSnapshot } from "./paper-overlay-types";

export interface ShadowFlyOptions {
  readonly adapter: BrokerAdapter;
  readonly brain: FlyBrain;
  readonly evaluationIntervalMs?: number;
  readonly bubbleText?: () => string | null;
  readonly onBrainOutput?: (output: BrainOutput) => void;
  readonly onBrainError?: (error: Error) => void;
  readonly forceState?: () => FlyState | null;
  readonly explorationHint?: () => {
    readonly motion: ExplorationMotion;
    readonly thought?: string | null;
    readonly hud?: HudSnapshot | null;
  } | null;
  readonly onPauseExploration?: () => void;
  /** Current-symbol Paper UX: corner fly + compact card (no exploration HUD). */
  readonly simplePaperMode?: boolean;
  readonly paperCard?: () => PaperFlyCardSnapshot | null;
  readonly paperCardLabels?: {
    readonly flyTitle: string;
    readonly virtualCapital: string;
    readonly cumulative: string;
    readonly start: string;
    readonly current: string;
    readonly position: string;
    readonly unrealized: string;
  };
}

export interface ShadowFlyHandle {
  readonly root: HTMLElement;
  destroy(): void;
}

const SPEED_BY_MOTION: Record<ExplorationMotion, number> = {
  wide: 78,
  "orbit-symbol": 70,
  "orbit-timeframe": 74,
  "orbit-chart": 62,
  curious: 128,
  focus: 44,
  rest: 0,
};

const SPEED_BY_STATE: Record<FlyState, number> = {
  sleep: 0,
  enter: 190,
  explore: 82,
  observe_chart: 68,
  inspect_portfolio: 62,
  scan_assets: 90,
  interested: 105,
  approach_buy: 112,
  approach_sell: 112,
  panic: 285,
  leave: 210,
  login_hint: 40,
};

const STYLES = `
:host { all: initial; }
.overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483646;
  overflow: hidden;
}
.fly {
  position: absolute;
  left: 0;
  top: 0;
  width: 34px;
  height: 28px;
  will-change: transform;
  transform: translate3d(-40px, 40%, 0);
}
.fly[data-sleeping="true"] .wing { animation: none; opacity: 0.35; }
.fly[data-sleeping="true"] { opacity: 0.85; }
.sprite { width: 34px; height: 28px; overflow: visible; }
.wing { fill: rgba(210, 230, 255, 0.55); transform-origin: center; }
.wing-left { animation: flap 0.14s ease-in-out infinite alternate; }
.wing-right { animation: flap 0.14s ease-in-out infinite alternate-reverse; }
.body { fill: #151923; }
.head { fill: #1b2230; }
.eye { fill: #f4d35e; }
.bubble {
  position: absolute;
  left: 0;
  top: 0;
  max-width: min(260px, 70vw);
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(12, 16, 24, 0.92);
  color: #eef2ff;
  font: 13px/1.4 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0;
  white-space: normal;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  transform: translate3d(0, 0, 0);
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  z-index: 2;
}
.hud {
  position: absolute;
  top: 12px;
  right: 12px;
  width: min(260px, 86vw);
  pointer-events: auto;
  padding: 10px 12px 8px;
  border-radius: 12px;
  background: rgba(10, 14, 22, 0.88);
  color: #e8eefc;
  font: 12px/1.4 ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
  z-index: 3;
}
.hud[hidden] { display: none; }
.hud-title { font-weight: 650; margin: 0 0 4px; }
.hud-meta { opacity: 0.9; margin: 0 0 6px; }
.hud-watch { margin: 0 0 6px; padding-left: 16px; }
.hud-row { display: flex; justify-content: space-between; gap: 8px; opacity: 0.92; }
.hud-log { margin: 8px 0 0; padding: 0; list-style: none; opacity: 0.78; font-size: 11px; }
.hud-actions { margin-top: 8px; display: flex; gap: 6px; }
.hud button {
  pointer-events: auto;
  border: 0;
  border-radius: 8px;
  padding: 5px 8px;
  background: #e8eefc;
  color: #121826;
  font: 11px/1.2 ui-sans-serif, system-ui, sans-serif;
  cursor: pointer;
}
.hud-note { margin: 6px 0 0; opacity: 0.75; font-size: 11px; }
.paper-card {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: min(240px, 88vw);
  pointer-events: none;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(10, 14, 22, 0.92);
  color: #e8eefc;
  font: 12px/1.45 ui-sans-serif, system-ui, sans-serif;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32);
  z-index: 4;
}
.paper-card[hidden] { display: none; }
.paper-card-title { font-weight: 650; margin: 0 0 2px; font-size: 13px; }
.paper-card-symbol { margin: 0 0 6px; opacity: 0.92; }
.paper-card-state { margin: 0 0 8px; color: #a8c4ff; font-size: 11px; }
.paper-card-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
.paper-card-emphasis {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.12);
  font-weight: 650;
  font-size: 13px;
}
.glasses { stroke: #7eb8ff; stroke-width: 1.2; fill: none; }
@keyframes flap {
  from { transform: scaleY(0.7) rotate(-8deg); }
  to { transform: scaleY(1.05) rotate(8deg); }
}
`;

const centerOf = (rect: DOMRectLike) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const targetRectForState = (
  state: FlyState,
  environment: MarketEnvironment | null,
): DOMRectLike | undefined => {
  if (!environment) return undefined;
  if (state === "approach_buy") return environment.ui.buy;
  if (state === "approach_sell") return environment.ui.sell;
  if (state === "inspect_portfolio") return environment.ui.portfolio;
  if (state === "login_hint")
    return environment.ui.login ?? environment.ui.chart;
  if (state === "scan_assets")
    return environment.ui.search ?? environment.ui.chart;
  if (state === "observe_chart" || state === "interested") {
    return environment.ui.chart;
  }
  if (state === "sleep") {
    return undefined;
  }
  return undefined;
};

/**
 * Mounts a non-interactive Fly inside an open Shadow DOM root.
 * Host page CSS and pointer events stay isolated.
 */
export const mountShadowFly = (
  hostDocument: Document,
  options: ShadowFlyOptions,
): ShadowFlyHandle => {
  const existing = hostDocument.getElementById("fly-earn-better-root");
  existing?.remove();

  const host = hostDocument.createElement("div");
  host.id = "fly-earn-better-root";
  host.setAttribute("aria-hidden", "true");
  hostDocument.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const style = hostDocument.createElement("style");
  style.textContent = STYLES;
  const overlay = hostDocument.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="fly" data-fly-state="enter" data-testid="fly">
      <svg class="sprite" viewBox="0 0 34 28" role="presentation">
        <ellipse class="wing wing-left" cx="10" cy="9" rx="8" ry="5"></ellipse>
        <ellipse class="wing wing-right" cx="24" cy="9" rx="8" ry="5"></ellipse>
        <ellipse class="body" cx="17" cy="16" rx="5" ry="8"></ellipse>
        <circle class="head" cx="17" cy="9" r="4"></circle>
        <circle class="eye" cx="15.5" cy="8.5" r="1"></circle>
        <circle class="eye" cx="18.5" cy="8.5" r="1"></circle>
        <rect class="glasses" x="12.5" y="7" width="5" height="3.2" rx="1"></rect>
        <rect class="glasses" x="16.5" y="7" width="5" height="3.2" rx="1"></rect>
        <line class="glasses" x1="17.5" y1="8.6" x2="16.5" y2="8.6"></line>
      </svg>
    </div>
    <div class="bubble" hidden data-testid="fly-bubble"></div>
    <aside class="paper-card" hidden data-testid="fly-paper-card">
      <p class="paper-card-title" data-paper-title></p>
      <p class="paper-card-symbol" data-paper-symbol></p>
      <p class="paper-card-state" data-paper-state></p>
      <div data-paper-body></div>
      <div class="paper-card-emphasis" data-paper-emphasis></div>
    </aside>
    <aside class="hud" hidden data-testid="fly-hud">
      <p class="hud-title" data-testid="fly-hud-title"></p>
      <p class="hud-meta" data-testid="fly-hud-meta"></p>
      <ul class="hud-watch" data-testid="fly-hud-watch"></ul>
      <div class="hud-detail" hidden></div>
      <p class="hud-note" data-testid="fly-hud-note"></p>
      <ul class="hud-log" data-testid="fly-hud-log"></ul>
      <div class="hud-actions">
        <button type="button" data-testid="fly-hud-pause">Pause exploration</button>
      </div>
    </aside>
  `;
  shadow.append(style, overlay);

  const fly = overlay.querySelector<HTMLElement>(".fly")!;
  const bubble = overlay.querySelector<HTMLElement>(".bubble")!;
  const hud = overlay.querySelector<HTMLElement>(".hud")!;
  const hudTitle = overlay.querySelector<HTMLElement>(
    "[data-testid='fly-hud-title']",
  )!;
  const hudMeta = overlay.querySelector<HTMLElement>(
    "[data-testid='fly-hud-meta']",
  )!;
  const hudWatch = overlay.querySelector<HTMLElement>(
    "[data-testid='fly-hud-watch']",
  )!;
  const hudDetail = overlay.querySelector<HTMLElement>(".hud-detail")!;
  const hudNote = overlay.querySelector<HTMLElement>(
    "[data-testid='fly-hud-note']",
  )!;
  const hudLog = overlay.querySelector<HTMLElement>(
    "[data-testid='fly-hud-log']",
  )!;
  const hudPause = overlay.querySelector<HTMLButtonElement>(
    "[data-testid='fly-hud-pause']",
  )!;
  hudPause.addEventListener("click", () => options.onPauseExploration?.());
  const paperCard = overlay.querySelector<HTMLElement>(
    "[data-testid='fly-paper-card']",
  )!;
  const paperTitle =
    paperCard.querySelector<HTMLElement>("[data-paper-title]")!;
  const paperSymbol = paperCard.querySelector<HTMLElement>(
    "[data-paper-symbol]",
  )!;
  const paperState =
    paperCard.querySelector<HTMLElement>("[data-paper-state]")!;
  const paperBody = paperCard.querySelector<HTMLElement>("[data-paper-body]")!;
  const paperEmphasis = paperCard.querySelector<HTMLElement>(
    "[data-paper-emphasis]",
  )!;

  let frameId = 0;
  let evaluationTimer = 0;
  let isDisposed = false;
  let isEvaluating = false;
  let state: FlyState = "enter";
  let stateStartedAt = performance.now();
  let environment: MarketEnvironment | null = null;
  let latestOutput: BrainOutput = {
    state: "explore",
    buyDrive: 0,
    sellDrive: 0,
    curiosity: 0.5,
    danger: 0,
    activity: 0.3,
  };
  const cornerAnchor = () => ({
    x: Math.max(12, view().innerWidth - 280),
    y: Math.max(12, view().innerHeight - 120),
  });
  let position = cornerAnchor();
  const velocity = { x: 0, y: 0 };
  let bubblePosition = {
    x: Math.min(hostDocument.defaultView!.innerWidth * 0.3, 320),
    y: hostDocument.defaultView!.innerHeight * 0.28,
  };
  let target = {
    x: Math.min(hostDocument.defaultView!.innerWidth * 0.3, 320),
    y: hostDocument.defaultView!.innerHeight * 0.35,
  };
  let targetUpdatedAt = 0;
  let previousFrameAt = performance.now();
  let lastBubbleText: string | null = null;
  const view = () => hostDocument.defaultView!;

  const bubbleAnchorForState = (
    currentState: FlyState,
  ): { x: number; y: number; mode: "target" | "fly" } => {
    const rect = targetRectForState(currentState, environment);
    if (rect && rect.width > 0 && rect.height > 0) {
      // Park above the BUY/SELL/chart landmark — readable, not spinning with the fly.
      return {
        x: rect.left + Math.min(Math.max(rect.width * 0.35, 8), 140),
        y: Math.max(16, rect.top - 56),
        mode: "target",
      };
    }
    return {
      x: position.x + 42,
      y: Math.max(16, position.y - 48),
      mode: "fly",
    };
  };

  const setRuntimeState = (next: FlyState, now: number) => {
    state = next;
    stateStartedAt = now;
    targetUpdatedAt = 0;
    fly.dataset.flyState = next;
    fly.dataset.sleeping =
      next === "sleep" || next === "login_hint" ? "true" : "false";
    if (next === "sleep") {
      position = {
        x: view().innerWidth - 56,
        y: view().innerHeight - 56,
      };
      velocity.x = 0;
      velocity.y = 0;
    }
  };

  const evaluate = async () => {
    if (isDisposed || isEvaluating) return;
    const forced = options.forceState?.();
    if (forced) {
      setRuntimeState(forced, performance.now());
      if (forced === "sleep" || forced === "login_hint") {
        environment = options.adapter.readMarketEnvironment();
        return;
      }
    }
    if (!options.adapter.detect()) {
      setRuntimeState("sleep", performance.now());
      return;
    }
    const nextEnvironment = options.adapter.readMarketEnvironment();
    if (!nextEnvironment) return;
    environment = nextEnvironment;
    isEvaluating = true;
    try {
      latestOutput = await options.brain.evaluate(nextEnvironment);
      options.onBrainOutput?.(latestOutput);
      const now = performance.now();
      // Hard overrides already applied above. Brain-driven states use hysteresis
      // unless the proposed state matches an urgent buy/sell/panic drive.
      const elapsed = now - stateStartedAt;
      const shouldApply =
        !forced &&
        (canTransition(state, latestOutput.state, latestOutput, elapsed) ||
          (elapsed >= MINIMUM_STATE_DURATION_MS &&
            (latestOutput.state === "approach_buy" ||
              latestOutput.state === "approach_sell") &&
            Math.max(latestOutput.buyDrive, latestOutput.sellDrive) >= 0.85));
      if (shouldApply) {
        setRuntimeState(latestOutput.state, now);
      }
    } catch (error) {
      options.onBrainError?.(
        error instanceof Error ? error : new Error("Unknown brain error"),
      );
    } finally {
      isEvaluating = false;
    }
  };

  const renderPaperCard = (
    snapshot: PaperFlyCardSnapshot | null | undefined,
  ) => {
    if (!options.simplePaperMode || !snapshot) {
      paperCard.hidden = true;
      return;
    }
    paperCard.hidden = false;
    const labels = options.paperCardLabels ?? {
      flyTitle: "Fly",
      virtualCapital: "Virtual capital",
      cumulative: "Cumulative",
      start: "Start",
      current: "Current",
      position: "Position",
      unrealized: "Unrealized",
    };
    paperTitle.textContent = `🪰 ${labels.flyTitle}`;
    paperSymbol.textContent = snapshot.symbol;
    paperState.textContent = snapshot.uxState;
    const unreal =
      snapshot.unrealizedPct != null
        ? `<div class="paper-card-row"><span>${labels.unrealized}</span><span>${snapshot.unrealizedPct >= 0 ? "+" : ""}${snapshot.unrealizedPct.toFixed(2)}%</span></div>`
        : "";
    paperBody.innerHTML = [
      `<div class="paper-card-row"><span>${labels.virtualCapital}</span><span>${snapshot.startingCapital.toLocaleString()} ${snapshot.currencyLabel}</span></div>`,
      `<div class="paper-card-row"><span>${labels.position}</span><span>${snapshot.positionLine}</span></div>`,
      unreal,
    ].join("");
    const cum = snapshot.cumulativeReturnPct;
    paperEmphasis.innerHTML = [
      `<div class="paper-card-row"><span>${labels.start}</span><span>${snapshot.startingCapital.toLocaleString()} ${snapshot.currencyLabel}</span></div>`,
      `<div class="paper-card-row"><span>${labels.current}</span><span>${snapshot.currentEquity.toLocaleString()} ${snapshot.currencyLabel}</span></div>`,
      `<div class="paper-card-row"><span>${labels.cumulative}</span><span>${cum >= 0 ? "+" : ""}${cum.toFixed(2)}%</span></div>`,
    ].join("");
  };

  const renderHud = (snapshot: HudSnapshot | null | undefined) => {
    if (options.simplePaperMode) {
      hud.hidden = true;
      return;
    }
    if (!snapshot) {
      hud.hidden = true;
      return;
    }
    hud.hidden = false;
    hudTitle.textContent = snapshot.compactTitle;
    hudMeta.textContent = `${snapshot.symbol}  ${snapshot.timeframe} · ${snapshot.intent}`;
    hudWatch.innerHTML = snapshot.watching
      .map((item) => `<li>${item}</li>`)
      .join("");
    hudNote.textContent = snapshot.uiControlNote ?? snapshot.thought;
    hudLog.innerHTML = snapshot.log
      .slice(-6)
      .map((line) => `<li>${line}</li>`)
      .join("");
    hudPause.textContent = snapshot.paused
      ? "Resume exploration"
      : "Pause exploration";
    if (snapshot.detailed) {
      hudDetail.hidden = false;
      hudDetail.innerHTML = [
        `<div class="hud-row"><span>Novelty</span><span>${Math.round(snapshot.novelty * 100)}</span></div>`,
        `<div class="hud-row"><span>Volatility</span><span>${Math.round(snapshot.volatility * 100)}</span></div>`,
        `<div class="hud-row"><span>Trend conflict</span><span>${Math.round(snapshot.trendConflict * 100)}</span></div>`,
        `<div class="hud-row"><span>Rel volume</span><span>${Math.round(snapshot.relativeVolume * 100)}</span></div>`,
        `<div class="hud-row"><span>Approach</span><span>${snapshot.approach.toFixed(2)}</span></div>`,
        `<div class="hud-row"><span>Avoid</span><span>${snapshot.avoid.toFixed(2)}</span></div>`,
        `<div class="hud-row"><span>Explore</span><span>${snapshot.explore.toFixed(2)}</span></div>`,
        `<div class="hud-row"><span>Next</span><span>${snapshot.nextHint}</span></div>`,
      ].join("");
    } else {
      hudDetail.hidden = true;
      hudDetail.replaceChildren();
    }
  };

  const orbitAround = (
    rect: DOMRectLike | undefined,
    now: number,
    radius: number,
    fallback: { x: number; y: number },
  ) => {
    if (!rect || rect.width <= 0 || rect.height <= 0) return fallback;
    const center = centerOf(rect);
    return {
      x: center.x + Math.cos(now * 0.0018) * radius,
      y: center.y + Math.sin(now * 0.0022) * (radius * 0.55),
    };
  };

  const updateTarget = (now: number) => {
    if (options.simplePaperMode) {
      const base = cornerAnchor();
      target = {
        x: base.x + Math.cos(now * 0.0018) * 8,
        y: base.y + Math.sin(now * 0.0022) * 6,
      };
      return;
    }
    const hint = options.explorationHint?.() ?? null;
    if (hint?.motion === "rest" || state === "sleep") {
      target = { x: view().innerWidth - 56, y: view().innerHeight - 56 };
      return;
    }
    if (hint) {
      const ui = environment?.ui;
      if (hint.motion === "orbit-symbol") {
        target = orbitAround(ui?.search ?? ui?.chart, now, 46, {
          x: view().innerWidth * 0.78,
          y: view().innerHeight * 0.28,
        });
        return;
      }
      if (hint.motion === "orbit-timeframe") {
        target = orbitAround(ui?.timeframe ?? ui?.chart, now, 36, {
          x: (ui?.chart?.left ?? 80) + 80,
          y: (ui?.chart?.top ?? 80) + 24,
        });
        return;
      }
      if (hint.motion === "orbit-chart" || hint.motion === "focus") {
        target = orbitAround(
          ui?.chart,
          now,
          hint.motion === "focus" ? 18 : 42,
          {
            x: view().innerWidth * 0.42,
            y: view().innerHeight * 0.38,
          },
        );
        return;
      }
      if (hint.motion === "curious") {
        target = orbitAround(ui?.chart, now, 70, {
          x: view().innerWidth * 0.45,
          y: view().innerHeight * 0.4,
        });
        return;
      }
      if (now - targetUpdatedAt > 1_400) {
        target = {
          x: 48 + Math.random() * Math.max(80, view().innerWidth - 96),
          y: 64 + Math.random() * Math.max(80, view().innerHeight - 120),
        };
        targetUpdatedAt = now;
      }
      return;
    }
    const rect = targetRectForState(state, environment);
    if (rect) {
      const center = centerOf(rect);
      target = {
        x: center.x + Math.cos(now * 0.0026) * 24,
        y: center.y + Math.sin(now * 0.003) * 24,
      };
      return;
    }
    if (now - targetUpdatedAt > 1_200) {
      target = {
        x: 36 + Math.random() * Math.max(80, view().innerWidth - 72),
        y: 36 + Math.random() * Math.max(80, view().innerHeight - 72),
      };
      targetUpdatedAt = now;
    }
  };

  const animate = (now: number) => {
    const deltaSeconds = Math.min(0.034, (now - previousFrameAt) / 1_000);
    previousFrameAt = now;
    updateTarget(now);
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const hint = options.explorationHint?.() ?? null;
    renderPaperCard(options.paperCard?.() ?? null);
    renderHud(hint?.hud ?? null);
    const speed = options.simplePaperMode
      ? 22
      : hint
        ? SPEED_BY_MOTION[hint.motion] * (0.9 + Math.random() * 0.2)
        : SPEED_BY_STATE[state] * (0.9 + Math.random() * 0.2);
    if (speed > 0) {
      const desiredX = (dx / distance) * speed;
      const desiredY = (dy / distance) * speed;
      velocity.x += (desiredX - velocity.x) * 0.085;
      velocity.y += (desiredY - velocity.y) * 0.085;
      position.x += velocity.x * deltaSeconds;
      position.y += velocity.y * deltaSeconds;
    }
    const rotation = Math.max(-24, Math.min(24, velocity.y * 0.12));
    const direction = velocity.x < 0 ? -1 : 1;
    fly.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) rotate(${rotation}deg) scaleX(${direction})`;

    const text = options.simplePaperMode
      ? null
      : (options.bubbleText?.() ?? null);
    if (text) {
      bubble.hidden = false;
      if (text !== lastBubbleText) {
        bubble.textContent = text;
        lastBubbleText = text;
        // Snap once when copy changes so the label appears near its anchor immediately.
        const snap = bubbleAnchorForState(state);
        bubblePosition = { x: snap.x, y: snap.y };
      }
      const anchor = bubbleAnchorForState(state);
      bubble.dataset.anchor = anchor.mode;
      // Soft follow so the label stays readable while the fly buzzes nearby.
      const follow = anchor.mode === "target" ? 0.14 : 0.05;
      bubblePosition.x += (anchor.x - bubblePosition.x) * follow;
      bubblePosition.y += (anchor.y - bubblePosition.y) * follow;
      const maxLeft = Math.max(12, view().innerWidth - 272);
      const maxTop = Math.max(12, view().innerHeight - 80);
      const clampedX = Math.min(maxLeft, Math.max(12, bubblePosition.x));
      const clampedY = Math.min(maxTop, Math.max(12, bubblePosition.y));
      bubble.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
    } else {
      bubble.hidden = true;
      lastBubbleText = null;
    }

    frameId = view().requestAnimationFrame(animate);
  };

  void evaluate();
  evaluationTimer = view().setInterval(
    () => void evaluate(),
    options.evaluationIntervalMs ?? 2_000,
  );
  frameId = view().requestAnimationFrame(animate);

  return {
    root: host,
    destroy() {
      isDisposed = true;
      view().clearInterval(evaluationTimer);
      view().cancelAnimationFrame(frameId);
      host.remove();
    },
  };
};
