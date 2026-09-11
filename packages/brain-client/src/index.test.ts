import { describe, expect, it, vi } from "vitest";
import type { MarketEnvironment } from "@fly/core";
import { createMaleCNSBrain, createMockFlyBrain } from "./index";

const environment = (
  overrides: Partial<MarketEnvironment["market"]>,
  pnlPercent = 0,
): MarketEnvironment => ({
  asset: { symbol: "AAPL", price: 232.14, changePercent: 0 },
  position: {
    quantity: 12,
    averagePrice: 210,
    pnlAmount: 0,
    pnlPercent,
  },
  market: {
    momentum: 0,
    volatility: 0.2,
    volumeStrength: 0.5,
    ...overrides,
  },
  ui: {
    chart: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
    },
  },
});

const brain = createMockFlyBrain({ random: () => 0.5, noiseAmount: 0 });

describe("MockFlyBrain", () => {
  it("approaches buy in a strong, low-risk uptrend", async () => {
    const output = await brain.evaluate(
      environment({ momentum: 0.95, volatility: 0.12, volumeStrength: 0.9 }),
    );

    expect(output.state).toBe("approach_buy");
    expect(output.buyDrive).toBeGreaterThan(output.sellDrive);
  });

  it("approaches sell in a downtrend", async () => {
    const output = await brain.evaluate(
      environment({ momentum: -0.9, volatility: 0.3 }, -5),
    );

    expect(output.state).toBe("approach_sell");
  });

  it("panics during dangerous volatility and clamps every drive", async () => {
    const output = await brain.evaluate(
      environment({ momentum: -0.75, volatility: 1 }, -20),
    );

    expect(output.state).toBe("panic");
    for (const value of [
      output.buyDrive,
      output.sellDrive,
      output.curiosity,
      output.danger,
      output.activity,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("MaleCNSBrain client", () => {
  it("returns a validated real-connectome response and diagnostics", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        brainOutput: {
          state: "observe_chart",
          buyDrive: 0.42,
          sellDrive: 0.31,
          curiosity: 0.77,
          danger: 0.12,
          activity: 0.58,
        },
        connectome: {
          dataset: "male-cns:v1.0",
          mode: "real-connectome",
          neuronCount: 128,
          edgeCount: 712,
          activeInputNeurons: [{ bodyId: 194965, activity: 0.8 }],
          topOutputNeurons: [{ bodyId: 123456, activity: 0.61 }],
          simulationMs: 3.2,
        },
      }),
    );
    const maleCNSBrain = createMaleCNSBrain({ fetchImpl });

    const output = await maleCNSBrain.evaluate(environment({ momentum: 0.8 }));

    expect(output.state).toBe("observe_chart");
    expect(maleCNSBrain.getDiagnostics()).toMatchObject({
      dataset: "male-cns:v1.0",
      isConnectomeLoaded: true,
      neuronCount: 128,
    });
  });

  it("fails explicitly without calling a mock fallback", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
    const maleCNSBrain = createMaleCNSBrain({ fetchImpl });

    await expect(
      maleCNSBrain.evaluate(environment({ momentum: 0.95 })),
    ).rejects.toThrow("HTTP 503");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(maleCNSBrain.getDiagnostics()).toMatchObject({
      mode: "real-connectome",
      isConnectomeLoaded: false,
    });
  });

  it("rejects a shuffled response masquerading as MaleCNS", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        brainOutput: {
          state: "explore",
          buyDrive: 0.2,
          sellDrive: 0.2,
          curiosity: 0.8,
          danger: 0.1,
          activity: 0.4,
        },
        connectome: {
          dataset: "male-cns:v1.0",
          mode: "shuffled-control",
          neuronCount: 2,
          edgeCount: 1,
          activeInputNeurons: [],
          topOutputNeurons: [],
          simulationMs: 1,
        },
      }),
    );
    const maleCNSBrain = createMaleCNSBrain({ fetchImpl });

    await expect(
      maleCNSBrain.evaluate(environment({ momentum: 0 })),
    ).rejects.toThrow("Brain mode mismatch");
  });
});
