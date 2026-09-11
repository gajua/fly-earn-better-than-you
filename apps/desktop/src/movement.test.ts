import { describe, expect, it } from "vitest";
import { clampPoint, nextDesktopMode, randomSafePoint } from "./movement";

describe("desktop movement", () => {
  const bounds = { width: 100, height: 80, inset: 10 };

  it("keeps points inside the visible screen", () => {
    expect(clampPoint({ x: -30, y: 200 }, bounds)).toEqual({
      x: 10,
      y: 70,
    });
    expect(randomSafePoint(bounds, () => 0)).toEqual({ x: 10, y: 10 });
  });

  it("transitions through market observation and leave mode", () => {
    expect(nextDesktopMode("IDLE_DESKTOP", true, true)).toBe(
      "MARKET_OBSERVING",
    );
    expect(nextDesktopMode("MARKET_OBSERVING", false, true)).toBe(
      "LEAVE_MARKET",
    );
    expect(nextDesktopMode("LEAVE_MARKET", false, false)).toBe("IDLE_DESKTOP");
  });
});
