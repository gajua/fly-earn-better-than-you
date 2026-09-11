import { describe, expect, it } from "vitest";

import {
  createPairingConfig,
  isPairingConfig,
  isSensorMessage,
} from "./validation.js";

const extensionOrigin = `chrome-extension://${"a".repeat(32)}`;
const sessionToken = "A".repeat(43);

const sensorMessage = {
  kind: "market-environment",
  source: "demo",
  capturedAt: "2026-09-11T00:00:00.000Z",
  environment: {
    asset: {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 225.1,
      changePercent: 1.2,
    },
    position: {
      quantity: 12,
      averagePrice: 210.04,
      pnlAmount: 180.72,
      pnlPercent: 7.17,
    },
    market: {
      momentum: 0.6,
      volatility: 0.2,
      volumeStrength: 0.5,
    },
    ui: {
      chart: {
        x: 10,
        y: 20,
        width: 300,
        height: 200,
        top: 20,
        right: 310,
        bottom: 220,
        left: 10,
      },
    },
  },
} as const;

describe("pairing validation", () => {
  it("constructs only an exact IPv4 loopback origin", () => {
    expect(
      createPairingConfig(43123, sessionToken, extensionOrigin),
    ).toMatchObject({
      port: 43123,
      bridgeOrigin: "http://127.0.0.1:43123",
      sessionToken,
      extensionOrigin,
    });
  });

  it("rejects unsafe ports, short tokens, and non-extension origins", () => {
    expect(createPairingConfig(80, sessionToken, extensionOrigin)).toBeNull();
    expect(createPairingConfig(43123, "short", extensionOrigin)).toBeNull();
    expect(
      createPairingConfig(43123, sessionToken, "https://example.com"),
    ).toBeNull();
  });

  it("rejects forged non-loopback stored configuration", () => {
    const pairing = createPairingConfig(43123, sessionToken, extensionOrigin);
    expect(pairing).not.toBeNull();
    expect(
      isPairingConfig({
        ...pairing,
        bridgeOrigin: "http://localhost:43123",
      }),
    ).toBe(false);
  });
});

describe("sensor payload validation", () => {
  it("accepts a broker-neutral demo snapshot", () => {
    expect(isSensorMessage(sensorMessage)).toBe(true);
  });

  it("rejects non-finite data and unexpected fields", () => {
    expect(
      isSensorMessage({
        ...sensorMessage,
        environment: {
          ...sensorMessage.environment,
          market: {
            ...sensorMessage.environment.market,
            momentum: Number.NaN,
          },
        },
      }),
    ).toBe(false);
    expect(isSensorMessage({ ...sensorMessage, cookie: "forbidden" })).toBe(
      false,
    );
  });
});
