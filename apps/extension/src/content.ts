(() => {
  const ROOT_SELECTOR = "[data-demo-broker]";
  const SAMPLE_INTERVAL_MS = 2_000;

  const readFiniteNumber = (
    value: string | undefined,
    fallback = 0,
  ): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const readVisibleRect = (
    root: HTMLElement,
    target: "chart" | "buy" | "sell" | "portfolio",
  ) => {
    const element = root.querySelector<HTMLElement>(
      `[data-fly-target="${target}"]`,
    );
    if (!element) return undefined;

    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const isVisible =
      style.display !== "none" &&
      style.visibility === "visible" &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight;

    if (!isVisible) return undefined;

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  };

  const readEnvironment = () => {
    const root = document.querySelector<HTMLElement>(ROOT_SELECTOR);
    if (!root) return null;

    const { dataset } = root;
    const symbol = (dataset.symbol ?? "UNKNOWN").slice(0, 32);
    const assetName = dataset.assetName?.slice(0, 128);

    return {
      asset: {
        symbol: symbol || "UNKNOWN",
        ...(assetName ? { name: assetName } : {}),
        price: readFiniteNumber(dataset.price),
        changePercent: readFiniteNumber(dataset.changePercent),
      },
      position: {
        quantity: readFiniteNumber(dataset.quantity),
        averagePrice: readFiniteNumber(dataset.averagePrice),
        pnlAmount: readFiniteNumber(dataset.pnlAmount),
        pnlPercent: readFiniteNumber(dataset.pnlPercent),
      },
      market: {
        momentum: readFiniteNumber(dataset.momentum),
        volatility: readFiniteNumber(dataset.volatility),
        volumeStrength: readFiniteNumber(dataset.volumeStrength, 0.5),
      },
      ui: {
        chart: readVisibleRect(root, "chart"),
        buy: readVisibleRect(root, "buy"),
        sell: readVisibleRect(root, "sell"),
        portfolio: readVisibleRect(root, "portfolio"),
      },
    };
  };

  const capture = () => {
    const environment = readEnvironment();
    if (!environment) return;

    void chrome.runtime
      .sendMessage({
        kind: "market-environment",
        source: "demo",
        capturedAt: new Date().toISOString(),
        environment,
      })
      .catch(() => {
        // Extension reloads invalidate the content-script context.
      });
  };

  capture();
  const intervalId = window.setInterval(capture, SAMPLE_INTERVAL_MS);
  window.addEventListener("pagehide", () => window.clearInterval(intervalId), {
    once: true,
  });
})();
