export interface RectSnapshot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface MarketEnvironment {
  readonly asset?: {
    readonly symbol: string;
    readonly name?: string;
    readonly price: number;
    readonly changePercent: number;
  };
  readonly position?: {
    readonly quantity: number;
    readonly averagePrice: number;
    readonly pnlAmount: number;
    readonly pnlPercent: number;
  };
  readonly market: {
    readonly momentum: number;
    readonly volatility: number;
    readonly volumeStrength: number;
  };
  readonly ui: {
    readonly chart?: RectSnapshot;
    readonly buy?: RectSnapshot;
    readonly sell?: RectSnapshot;
    readonly portfolio?: RectSnapshot;
  };
}

export interface SensorMessage {
  readonly kind: "market-environment";
  readonly source: "demo";
  readonly capturedAt: string;
  readonly environment: MarketEnvironment;
}

export interface PairingConfig {
  readonly port: number;
  readonly sessionToken: string;
  readonly bridgeOrigin: string;
  readonly extensionOrigin: string;
  readonly pairedAt: string;
}

const LOOPBACK_ORIGIN_PATTERN = /^http:\/\/127\.0\.0\.1:(\d{1,5})$/;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean => Object.keys(value).every((key) => keys.includes(key));

const isOptionalText = (value: unknown): value is string | undefined =>
  value === undefined || (typeof value === "string" && value.length <= 128);

const isRect = (value: unknown): value is RectSnapshot => {
  if (!isRecord(value)) return false;
  const keys = [
    "x",
    "y",
    "width",
    "height",
    "top",
    "right",
    "bottom",
    "left",
  ] as const;

  const width = value.width;
  const height = value.height;
  return (
    hasOnlyKeys(value, keys) &&
    keys.every((key) => isFiniteNumber(value[key])) &&
    isFiniteNumber(width) &&
    isFiniteNumber(height) &&
    width >= 0 &&
    height >= 0
  );
};

const isOptionalRect = (value: unknown): value is RectSnapshot | undefined =>
  value === undefined || isRect(value);

export const isMarketEnvironment = (
  value: unknown,
): value is MarketEnvironment => {
  if (!isRecord(value) || !isRecord(value.market) || !isRecord(value.ui)) {
    return false;
  }

  const { asset, position, market, ui } = value;
  const isAssetValid =
    asset === undefined ||
    (isRecord(asset) &&
      hasOnlyKeys(asset, ["symbol", "name", "price", "changePercent"]) &&
      typeof asset.symbol === "string" &&
      asset.symbol.length > 0 &&
      asset.symbol.length <= 32 &&
      isOptionalText(asset.name) &&
      isFiniteNumber(asset.price) &&
      isFiniteNumber(asset.changePercent));
  const isPositionValid =
    position === undefined ||
    (isRecord(position) &&
      hasOnlyKeys(position, [
        "quantity",
        "averagePrice",
        "pnlAmount",
        "pnlPercent",
      ]) &&
      isFiniteNumber(position.quantity) &&
      isFiniteNumber(position.averagePrice) &&
      isFiniteNumber(position.pnlAmount) &&
      isFiniteNumber(position.pnlPercent));

  return (
    hasOnlyKeys(value, ["asset", "position", "market", "ui"]) &&
    isAssetValid &&
    isPositionValid &&
    hasOnlyKeys(market, ["momentum", "volatility", "volumeStrength"]) &&
    isFiniteNumber(market.momentum) &&
    isFiniteNumber(market.volatility) &&
    isFiniteNumber(market.volumeStrength) &&
    hasOnlyKeys(ui, ["chart", "buy", "sell", "portfolio"]) &&
    isOptionalRect(ui.chart) &&
    isOptionalRect(ui.buy) &&
    isOptionalRect(ui.sell) &&
    isOptionalRect(ui.portfolio)
  );
};

export const isSensorMessage = (value: unknown): value is SensorMessage =>
  isRecord(value) &&
  hasOnlyKeys(value, ["kind", "source", "capturedAt", "environment"]) &&
  value.kind === "market-environment" &&
  value.source === "demo" &&
  typeof value.capturedAt === "string" &&
  Number.isFinite(Date.parse(value.capturedAt)) &&
  isMarketEnvironment(value.environment);

export const createPairingConfig = (
  port: number,
  sessionToken: string,
  extensionOrigin: string,
): PairingConfig | null => {
  if (
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    !SESSION_TOKEN_PATTERN.test(sessionToken) ||
    !/^chrome-extension:\/\/[a-z]{32}$/.test(extensionOrigin)
  ) {
    return null;
  }

  return {
    port,
    sessionToken,
    bridgeOrigin: `http://127.0.0.1:${port}`,
    extensionOrigin,
    pairedAt: new Date().toISOString(),
  };
};

export const isPairingConfig = (value: unknown): value is PairingConfig => {
  if (!isRecord(value)) return false;
  const originMatch =
    typeof value.bridgeOrigin === "string"
      ? LOOPBACK_ORIGIN_PATTERN.exec(value.bridgeOrigin)
      : null;

  return (
    hasOnlyKeys(value, [
      "port",
      "sessionToken",
      "bridgeOrigin",
      "extensionOrigin",
      "pairedAt",
    ]) &&
    Number.isInteger(value.port) &&
    typeof value.port === "number" &&
    value.port >= 1024 &&
    value.port <= 65535 &&
    SESSION_TOKEN_PATTERN.test(String(value.sessionToken)) &&
    /^chrome-extension:\/\/[a-z]{32}$/.test(String(value.extensionOrigin)) &&
    originMatch?.[1] === String(value.port) &&
    typeof value.pairedAt === "string" &&
    Number.isFinite(Date.parse(value.pairedAt))
  );
};
