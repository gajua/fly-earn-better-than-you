import { toDOMRectLike, type MarketEnvironment } from "@fly/core";

export interface BrokerAdapter {
  readonly id: string;
  detect(): boolean;
  readEnvironment(): MarketEnvironment | null;
}

const readNumber = (value: string | undefined, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readRect = (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  return element ? toDOMRectLike(element.getBoundingClientRect()) : undefined;
};

/**
 * Reads only public, non-sensitive demo attributes and element geometry.
 * It never clicks, dispatches events, or inspects credentials.
 */
export const createDemoBrokerAdapter = (
  rootSelector = "[data-demo-broker]",
): BrokerAdapter => ({
  id: "demo",
  detect: () => document.querySelector(rootSelector) !== null,
  readEnvironment: () => {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) return null;

    const { dataset } = root;
    return {
      asset: {
        symbol: dataset.symbol ?? "UNKNOWN",
        name: dataset.assetName,
        price: readNumber(dataset.price),
        changePercent: readNumber(dataset.changePercent),
      },
      position: {
        quantity: readNumber(dataset.quantity),
        averagePrice: readNumber(dataset.averagePrice),
        pnlAmount: readNumber(dataset.pnlAmount),
        pnlPercent: readNumber(dataset.pnlPercent),
      },
      market: {
        momentum: readNumber(dataset.momentum),
        volatility: readNumber(dataset.volatility),
        volumeStrength: readNumber(dataset.volumeStrength, 0.5),
      },
      ui: {
        chart: readRect("[data-fly-target='chart']"),
        buy: readRect("[data-fly-target='buy']"),
        sell: readRect("[data-fly-target='sell']"),
        portfolio: readRect("[data-fly-target='portfolio']"),
      },
    };
  },
});
