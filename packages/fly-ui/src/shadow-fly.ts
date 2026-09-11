import type { BrokerAdapter } from "@fly/broker-adapters";
import type {
  BrainOutput,
  DOMRectLike,
  FlyBrain,
  FlyState,
  MarketEnvironment,
} from "@fly/core";
import { canTransition } from "./state-machine";

export interface ShadowFlyOptions {
  readonly adapter: BrokerAdapter;
  readonly brain: FlyBrain;
  readonly evaluationIntervalMs?: number;
  readonly bubbleText?: () => string | null;
  readonly onBrainOutput?: (output: BrainOutput) => void;
  readonly onBrainError?: (error: Error) => void;
  readonly forceState?: () => FlyState | null;
}

export interface ShadowFlyHandle {
  readonly root: HTMLElement;
  destroy(): void;
}

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
  max-width: 220px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(12, 16, 24, 0.88);
  color: #eef2ff;
  font: 12px/1.35 ui-sans-serif, system-ui, sans-serif;
  transform: translate(-40%, -120%);
  pointer-events: none;
}
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
  if (state === "login_hint") return environment.ui.login ?? environment.ui.chart;
  if (state === "scan_assets") return environment.ui.search ?? environment.ui.chart;
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
      </svg>
      <div class="bubble" hidden></div>
    </div>
  `;
  shadow.append(style, overlay);

  const fly = overlay.querySelector<HTMLElement>(".fly")!;
  const bubble = overlay.querySelector<HTMLElement>(".bubble")!;

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
  let position = { x: -30, y: hostDocument.defaultView!.innerHeight * 0.34 };
  const velocity = { x: 0, y: 0 };
  let target = {
    x: Math.min(hostDocument.defaultView!.innerWidth * 0.3, 320),
    y: hostDocument.defaultView!.innerHeight * 0.35,
  };
  let targetUpdatedAt = 0;
  let previousFrameAt = performance.now();
  const view = () => hostDocument.defaultView!;

  const setRuntimeState = (next: FlyState, now: number) => {
    state = next;
    stateStartedAt = now;
    targetUpdatedAt = 0;
    fly.dataset.flyState = next;
    fly.dataset.sleeping = next === "sleep" || next === "login_hint" ? "true" : "false";
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
      if (
        !forced &&
        canTransition(state, latestOutput.state, latestOutput, now - stateStartedAt)
      ) {
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

  const updateTarget = (now: number) => {
    if (state === "sleep") {
      target = { x: view().innerWidth - 56, y: view().innerHeight - 56 };
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
    const speed = SPEED_BY_STATE[state] * (0.9 + Math.random() * 0.2);
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

    const text = options.bubbleText?.() ?? null;
    if (text) {
      bubble.hidden = false;
      bubble.textContent = text;
      bubble.style.left = `${position.x}px`;
      bubble.style.top = `${position.y}px`;
    } else {
      bubble.hidden = true;
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
