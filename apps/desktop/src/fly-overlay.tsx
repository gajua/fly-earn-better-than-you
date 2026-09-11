import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import type {
  BrainDiagnostics,
  BrainOutput,
  DesktopMode,
  MarketObservation,
} from "./contracts";
import {
  FLY_RADIUS,
  OBSERVATION_STALE_MS,
  clampPoint,
  nextDesktopMode,
  randomSafePoint,
  targetForBrainOutput,
} from "./movement";

const SPEED: Record<DesktopMode, number> = {
  IDLE_DESKTOP: 76,
  MARKET_OBSERVING: 108,
  LEAVE_MARKET: 150,
};

/**
 * A visual-only desktop overlay. Native cursor-event passthrough keeps this
 * component from intercepting host application input.
 */
export function FlyOverlay() {
  const flyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fly = flyRef.current;
    if (!fly) return;

    let isDisposed = false;
    let frameId = 0;
    let mode: DesktopMode = "IDLE_DESKTOP";
    let observation: MarketObservation | null = null;
    let brainOutput: BrainOutput | null = null;
    let evaluationSequence = 0;
    let position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let target = position;
    let velocity = { x: 0, y: 0 };
    let targetUpdatedAt = 0;
    let previousFrameAt = performance.now();
    let modeChangedAt = previousFrameAt;

    const setMode = (nextMode: DesktopMode, now: number) => {
      if (nextMode === mode) return;
      mode = nextMode;
      modeChangedAt = now;
      targetUpdatedAt = 0;
      fly.dataset.desktopMode = mode;
    };

    const updateTarget = (now: number) => {
      const bounds = {
        width: window.innerWidth,
        height: window.innerHeight,
        inset: FLY_RADIUS,
      };
      const isFresh =
        observation !== null &&
        brainOutput !== null &&
        Date.now() - observation.observedAtMs <= OBSERVATION_STALE_MS;
      const marketTarget = brainOutput
        ? targetForBrainOutput(brainOutput, bounds)
        : null;
      const nextMode = nextDesktopMode(mode, isFresh, marketTarget !== null);
      setMode(nextMode, now);

      if (mode === "MARKET_OBSERVING" && marketTarget) {
        const orbit = 32;
        target = clampPoint(
          {
            x: marketTarget.x + Math.cos(now * 0.002) * orbit,
            y: marketTarget.y + Math.sin(now * 0.0024) * orbit,
          },
          bounds,
        );
        return;
      }

      if (mode === "LEAVE_MARKET" && now - modeChangedAt > 1_200) {
        observation = null;
        setMode("IDLE_DESKTOP", now);
      }

      if (now - targetUpdatedAt > 1_800) {
        target = randomSafePoint(bounds);
        targetUpdatedAt = now;
      }
    };

    const animate = (now: number) => {
      const deltaSeconds = Math.min((now - previousFrameAt) / 1_000, 0.034);
      previousFrameAt = now;
      updateTarget(now);

      const dx = target.x - position.x;
      const dy = target.y - position.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const speed =
        SPEED[mode] *
        (brainOutput?.danger && brainOutput.danger > 0.7 ? 1.8 : 1);
      const curve = Math.sin(now * 0.006) * 0.28;
      const desiredX = (dx / distance - (dy / distance) * curve) * speed;
      const desiredY = (dy / distance + (dx / distance) * curve) * speed;
      velocity = {
        x: velocity.x + (desiredX - velocity.x) * 0.075,
        y: velocity.y + (desiredY - velocity.y) * 0.075,
      };
      position = clampPoint(
        {
          x: position.x + velocity.x * deltaSeconds,
          y: position.y + velocity.y * deltaSeconds,
        },
        {
          width: window.innerWidth,
          height: window.innerHeight,
          inset: FLY_RADIUS,
        },
      );

      const direction = velocity.x < 0 ? -1 : 1;
      const rotation = Math.max(-22, Math.min(22, velocity.y * 0.12));
      fly.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) rotate(${rotation}deg) scaleX(${direction})`;
      frameId = requestAnimationFrame(animate);
    };

    const publishDiagnostics = (diagnostics: BrainDiagnostics) => {
      localStorage.setItem(
        "fly-brain-diagnostics",
        JSON.stringify(diagnostics),
      );
    };

    const evaluate = async (nextObservation: MarketObservation) => {
      const sequence = ++evaluationSequence;
      try {
        const response = await fetch("http://127.0.0.1:8000/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            environment: nextObservation.environment,
            mode: "real-connectome",
          }),
        });
        if (!response.ok)
          throw new Error(`Brain service HTTP ${response.status}`);
        const payload = (await response.json()) as {
          brainOutput: BrainOutput;
          connectome: Omit<
            BrainDiagnostics,
            "connectomeLoaded" | "flyState" | "error"
          >;
        };
        if (sequence !== evaluationSequence || isDisposed) return;
        brainOutput = payload.brainOutput;
        publishDiagnostics({
          ...payload.connectome,
          mode: "real-connectome",
          connectomeLoaded: true,
          flyState: payload.brainOutput.state,
        });
      } catch (error) {
        if (sequence !== evaluationSequence || isDisposed) return;
        brainOutput = null;
        publishDiagnostics({
          mode: "real-connectome",
          connectomeLoaded: false,
          activeInputNeurons: [],
          topOutputNeurons: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const initialize = async () => {
      const unlisten = await listen<MarketObservation>(
        "market-observation",
        ({ payload }) => {
          observation = payload;
          void evaluate(payload);
        },
      );
      if (isDisposed) {
        unlisten();
        return;
      }
      frameId = requestAnimationFrame(animate);
      return unlisten;
    };

    let unlisten: (() => void) | undefined;
    void initialize().then((disposeListener) => {
      unlisten = disposeListener;
    });

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      unlisten?.();
    };
  }, []);

  return (
    <main className="overlay" aria-hidden="true">
      <div ref={flyRef} className="fly" data-desktop-mode="IDLE_DESKTOP">
        <span className="wing wing-left" />
        <span className="wing wing-right" />
        <span className="body">
          <span className="eye eye-left" />
          <span className="eye eye-right" />
        </span>
      </div>
    </main>
  );
}
