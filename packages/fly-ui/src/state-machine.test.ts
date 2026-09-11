import { describe, expect, it } from "vitest";
import type { BrainOutput } from "@fly/core";
import { canTransition, MINIMUM_STATE_DURATION_MS } from "./state-machine";

const output: BrainOutput = {
  state: "approach_buy",
  buyDrive: 0.8,
  sellDrive: 0.1,
  curiosity: 0.3,
  danger: 0.1,
  activity: 0.5,
};

describe("canTransition", () => {
  it("honors the minimum state duration", () => {
    expect(
      canTransition(
        "explore",
        "approach_buy",
        output,
        MINIMUM_STATE_DURATION_MS - 1,
      ),
    ).toBe(false);
  });

  it("allows a stronger drive after the minimum duration", () => {
    expect(
      canTransition(
        "explore",
        "approach_buy",
        output,
        MINIMUM_STATE_DURATION_MS,
      ),
    ).toBe(true);
  });

  it("allows an urgent panic transition immediately", () => {
    expect(
      canTransition(
        "observe_chart",
        "panic",
        { ...output, state: "panic", danger: 0.9 },
        50,
      ),
    ).toBe(true);
  });
});
