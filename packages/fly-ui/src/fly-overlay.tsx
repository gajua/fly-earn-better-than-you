import { useEffect, useRef, useState } from "react";
import type { BrokerAdapter } from "@fly/broker-adapters";
import type {
  BrainOutput,
  DOMRectLike,
  FlyBrain,
  FlyState,
  MarketEnvironment,
} from "@fly/core";
import { canTransition } from "./state-machine";
import "./styles.css";

interface FlyOverlayProps {
  readonly adapter: BrokerAdapter;
  readonly brain: FlyBrain;
  readonly evaluationIntervalMs?: number;
  readonly onBrainOutput?: (output: BrainOutput) => void;
  readonly onBrainError?: (error: Error) => void;
}

interface Point {
  x: number;
  y: number;
}

const SPEED_BY_STATE: Record<FlyState, number> = {
  sleep: 0,
  enter: 190,
  explore: 82,
  observe_chart: 68,
  inspect_portfolio: 62,
  interested: 105,
  approach_buy: 112,
  approach_sell: 112,
  panic: 285,
  leave: 210,
};

const centerOf = (rect: DOMRectLike): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const randomViewportPoint = (): Point => ({
  x: 36 + Math.random() * Math.max(80, window.innerWidth - 72),
  y: 36 + Math.random() * Math.max(80, window.innerHeight - 72),
});

const nearestExitPoint = ({ x, y }: Point): Point => {
  const exits = [
    { distance: x, point: { x: -45, y } },
    {
      distance: window.innerWidth - x,
      point: { x: window.innerWidth + 45, y },
    },
    { distance: y, point: { x, y: -45 } },
    {
      distance: window.innerHeight - y,
      point: { x, y: window.innerHeight + 45 },
    },
  ];
  return exits.reduce((nearest, candidate) =>
    candidate.distance < nearest.distance ? candidate : nearest,
  ).point;
};

const targetRectForState = (
  state: FlyState,
  environment: MarketEnvironment | null,
): DOMRectLike | undefined => {
  if (!environment) return undefined;
  if (state === "approach_buy") return environment.ui.buy;
  if (state === "approach_sell") return environment.ui.sell;
  if (state === "inspect_portfolio") return environment.ui.portfolio;
  if (state === "observe_chart" || state === "interested") {
    return environment.ui.chart;
  }
  return undefined;
};

const emptyOutput: BrainOutput = {
  state: "explore",
  buyDrive: 0,
  sellDrive: 0,
  curiosity: 0.5,
  danger: 0,
  activity: 0.3,
};

/**
 * Non-interactive viewport overlay driven by a broker adapter and FlyBrain.
 */
export function FlyOverlay({
  adapter,
  brain,
  evaluationIntervalMs = 2_000,
  onBrainOutput,
  onBrainError,
}: FlyOverlayProps) {
  const flyRef = useRef<HTMLDivElement>(null);
  const [visibleState, setVisibleState] = useState<FlyState>("enter");

  useEffect(() => {
    const fly = flyRef.current;
    if (!fly) return;

    let frameId = 0;
    let evaluationTimer = 0;
    let isDisposed = false;
    let isEvaluating = false;
    let state: FlyState = "enter";
    let stateStartedAt = performance.now();
    let calmStartedAt = performance.now();
    let environment: MarketEnvironment | null = null;
    let latestOutput = emptyOutput;
    let position: Point = { x: -30, y: window.innerHeight * 0.34 };
    const velocity: Point = { x: 0, y: 0 };
    let target: Point = {
      x: Math.min(window.innerWidth * 0.3, 320),
      y: window.innerHeight * 0.35,
    };
    let targetUpdatedAt = 0;
    let previousFrameAt = performance.now();
    let sleepUntil = 0;

    const setRuntimeState = (nextState: FlyState, now: number) => {
      state = nextState;
      stateStartedAt = now;
      targetUpdatedAt = 0;
      fly.dataset.flyState = nextState;
      setVisibleState(nextState);

      if (nextState === "leave") target = nearestExitPoint(position);
      if (nextState === "sleep") {
        sleepUntil = now + 2_800;
        fly.style.opacity = "0";
      } else {
        fly.style.opacity = "1";
      }
    };

    const evaluate = async () => {
      if (isDisposed || isEvaluating || !adapter.detect()) return;
      const nextEnvironment = adapter.readEnvironment();
      if (!nextEnvironment) return;
      environment = nextEnvironment;
      isEvaluating = true;

      try {
        latestOutput = await brain.evaluate(nextEnvironment);
        onBrainOutput?.(latestOutput);
        if (isDisposed || ["sleep", "enter", "leave"].includes(state)) return;

        const now = performance.now();
        const isCalm =
          latestOutput.activity < 0.4 &&
          latestOutput.danger < 0.35 &&
          Math.max(latestOutput.buyDrive, latestOutput.sellDrive) < 0.48;

        if (!isCalm) calmStartedAt = now;
        if (isCalm && now - calmStartedAt > 16_000) {
          calmStartedAt = now;
          setRuntimeState("leave", now);
          return;
        }

        if (
          canTransition(
            state,
            latestOutput.state,
            latestOutput,
            now - stateStartedAt,
          )
        ) {
          setRuntimeState(latestOutput.state, now);
        }
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("Unknown brain error");
        onBrainError?.(normalizedError);
        console.error("[FlyOverlay] Brain evaluation failed", error);
      } finally {
        isEvaluating = false;
      }
    };

    const updateTarget = (now: number) => {
      const rect = targetRectForState(state, environment);
      if (rect) {
        const center = centerOf(rect);
        const orbitRadius =
          state === "inspect_portfolio" ? Math.min(70, rect.width * 0.2) : 24;
        const orbitSpeed = state === "interested" ? 0.004 : 0.0026;
        target = {
          x: center.x + Math.cos(now * orbitSpeed) * orbitRadius,
          y: center.y + Math.sin(now * orbitSpeed * 1.17) * orbitRadius,
        };
        return;
      }

      const interval = state === "panic" ? 170 : 1_250;
      if (now - targetUpdatedAt > interval) {
        target = randomViewportPoint();
        targetUpdatedAt = now;
      }
    };

    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.034, (now - previousFrameAt) / 1_000);
      previousFrameAt = now;

      if (state === "sleep") {
        if (now >= sleepUntil) {
          position = {
            x: -35,
            y: 70 + Math.random() * Math.max(80, window.innerHeight - 140),
          };
          target = randomViewportPoint();
          setRuntimeState("enter", now);
        }
      } else {
        if (state !== "leave") updateTarget(now);

        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const speed = SPEED_BY_STATE[state] * (0.9 + Math.random() * 0.2);
        const curve = Math.sin(now * (state === "panic" ? 0.021 : 0.006)) * 0.3;
        const desiredX = (dx / distance - (dy / distance) * curve) * speed;
        const desiredY = (dy / distance + (dx / distance) * curve) * speed;
        const responsiveness = state === "panic" ? 0.24 : 0.085;
        velocity.x += (desiredX - velocity.x) * responsiveness;
        velocity.y += (desiredY - velocity.y) * responsiveness;
        const jitter = state === "panic" ? 12 : 3.2;
        position.x +=
          velocity.x * deltaSeconds + (Math.random() - 0.5) * jitter;
        position.y +=
          velocity.y * deltaSeconds + (Math.random() - 0.5) * jitter;

        if (state !== "leave") {
          position.x = Math.min(
            window.innerWidth + 20,
            Math.max(-20, position.x),
          );
          position.y = Math.min(
            window.innerHeight + 20,
            Math.max(-20, position.y),
          );
        }

        if (state === "enter" && distance < 36 && now - stateStartedAt > 800) {
          setRuntimeState("explore", now);
          void evaluate();
        }
        if (
          state === "leave" &&
          (position.x < -30 ||
            position.x > window.innerWidth + 30 ||
            position.y < -30 ||
            position.y > window.innerHeight + 30)
        ) {
          setRuntimeState("sleep", now);
        }
      }

      const rotation = Math.max(-24, Math.min(24, velocity.y * 0.12));
      const direction = velocity.x < 0 ? -1 : 1;
      fly.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) rotate(${rotation}deg) scaleX(${direction})`;
      fly.dataset.flyX = position.x.toFixed(1);
      fly.dataset.flyY = position.y.toFixed(1);
      frameId = requestAnimationFrame(animate);
    };

    void evaluate();
    evaluationTimer = window.setInterval(
      () => void evaluate(),
      evaluationIntervalMs,
    );
    frameId = requestAnimationFrame(animate);

    return () => {
      isDisposed = true;
      window.clearInterval(evaluationTimer);
      cancelAnimationFrame(frameId);
    };
  }, [adapter, brain, evaluationIntervalMs, onBrainError, onBrainOutput]);

  return (
    <div
      ref={flyRef}
      className="fly-overlay"
      data-testid="fly"
      data-fly-state={visibleState}
      aria-hidden="true"
    >
      <svg className="fly-sprite" viewBox="0 0 34 28" role="presentation">
        <ellipse
          className="fly-wing fly-wing-left"
          cx="10"
          cy="9"
          rx="8"
          ry="5"
        />
        <ellipse
          className="fly-wing fly-wing-right"
          cx="24"
          cy="9"
          rx="8"
          ry="5"
        />
        <ellipse className="fly-body" cx="17" cy="16" rx="5" ry="8" />
        <circle className="fly-head" cx="17" cy="9" r="4" />
        <circle className="fly-eye" cx="15.5" cy="8.5" r="1" />
        <circle className="fly-eye" cx="18.5" cy="8.5" r="1" />
      </svg>
    </div>
  );
}
