export interface ViewportRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** @deprecated Prefer ViewportRect when the coordinate system matters. */
export type DOMRectLike = ViewportRect;

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scaleFactor: number;
}

export interface MarketEnvironment {
  readonly asset?: {
    readonly symbol: string;
    readonly name?: string;
    readonly price: number;
    readonly changePercent: number;
    readonly instrumentId?: string;
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
    readonly chart?: DOMRectLike;
    readonly buy?: DOMRectLike;
    readonly sell?: DOMRectLike;
    readonly portfolio?: DOMRectLike;
    readonly search?: DOMRectLike;
    readonly login?: DOMRectLike;
  };
}

export type FlyState =
  | "sleep"
  | "enter"
  | "explore"
  | "observe_chart"
  | "inspect_portfolio"
  | "scan_assets"
  | "interested"
  | "approach_buy"
  | "approach_sell"
  | "panic"
  | "leave"
  | "login_hint";

export interface BrainOutput {
  readonly state: FlyState;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly curiosity: number;
  readonly danger: number;
  readonly activity: number;
}

export interface FlyBrain {
  evaluate(environment: MarketEnvironment): Promise<BrainOutput>;
}

export type BrainMode = "mock" | "real-connectome" | "shuffled-control";

export interface SensoryStimulus {
  readonly visualPositive: number;
  readonly visualNegative: number;
  readonly motionIntensity: number;
  readonly volatilityStimulus: number;
  readonly rewardLikeStimulus: number;
}

export interface ActiveNeuron {
  readonly bodyId: number;
  readonly activity: number;
}

export interface BrainDiagnostics {
  readonly mode: BrainMode;
  readonly dataset?: string;
  readonly isConnectomeLoaded: boolean;
  readonly neuronCount?: number;
  readonly edgeCount?: number;
  readonly activeInputNeurons: readonly ActiveNeuron[];
  readonly topOutputNeurons: readonly ActiveNeuron[];
  readonly simulationMs?: number;
  readonly lastOutput?: BrainOutput;
  readonly error?: string;
}

export interface InspectableFlyBrain extends FlyBrain {
  readonly mode: BrainMode;
  getDiagnostics(): BrainDiagnostics;
  subscribe(listener: () => void): () => void;
}

export type SessionLifecycleState =
  | "NO_BROKER"
  | "BROKER_LOGGED_OUT"
  | "BROKER_READY"
  | "SCANNING"
  | "WATCHING"
  | "BUY_INTEREST"
  | "SELL_INTEREST"
  | "ORDER_PROPOSED"
  | "USER_CONFIRM_REQUIRED"
  | "POSITION_MONITORING"
  | "MARKET_CLOSED"
  | "BRAIN_UNAVAILABLE";

export type LoginState = "LOGGED_IN" | "LOGGED_OUT" | "UNKNOWN";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type AdapterStatus = "SUPPORTED" | "PARTIAL" | "BROKEN" | "UNKNOWN";

export type TradingMode = "paper" | "live-assist";

export type MarketType = "spot" | "perpetual" | "equity" | "demo";

export type BrokerPageKind =
  | "home"
  | "markets"
  | "asset-detail"
  | "trade"
  | "portfolio"
  | "orders"
  | "login"
  | "unknown";

export type ModalKind =
  "order" | "order-confirmation" | "login" | "warning" | "other";

export type ObservationSource =
  | "tradecanvas"
  | "official-public"
  | "broker-public-api"
  | "broker-dom"
  | "demo"
  | "unavailable";

export type DataProviderHealth = "HEALTHY" | "DEGRADED" | "BROKEN" | "UNKNOWN";

export interface DataProviderProvenance {
  readonly source: ObservationSource;
  readonly upstream?: string;
  readonly provider?: string;
  readonly endpointFamily?: string;
}

export type LiveFillConfidence = "VERIFIED" | "USER_CONFIRMED" | "UNVERIFIED";

export interface InstrumentRef {
  readonly broker: string;
  readonly marketType: MarketType;
  readonly symbol: string;
  readonly quoteCurrency: string;
}

export interface AssetSnapshot {
  readonly symbol: string;
  readonly name?: string;
  readonly price: number;
  readonly changePercent: number;
  readonly instrumentId?: string;
}

export interface PortfolioSnapshot {
  readonly cash?: number;
  readonly positions: readonly {
    readonly symbol: string;
    readonly instrumentId?: string;
    readonly quantity: number;
    readonly averagePrice: number;
    readonly marketPrice: number;
    readonly pnlAmount: number;
    readonly pnlPercent: number;
  }[];
}

export interface AssetCandidate {
  readonly symbol: string;
  readonly instrumentId?: string;
  readonly name?: string;
  readonly source: "watchlist" | "portfolio" | "search" | "current";
}

export interface TimeframeObservation {
  readonly symbol: string;
  readonly instrumentId?: string;
  readonly timeframe: Timeframe;
  readonly price: number;
  readonly returnPercent: number;
  readonly momentum: number;
  readonly volatility: number;
  readonly volumeStrength: number;
  readonly timestamp: string;
  readonly observedAt: string;
  readonly source: ObservationSource;
  readonly candleCount: number;
  readonly available: boolean;
  /** Optional market-data provenance for Developer Panel. */
  readonly dataProvider?: DataProviderProvenance;
}

export interface CandidateEvaluation {
  readonly symbol: string;
  readonly instrumentId?: string;
  readonly evaluatedAt: string;
  readonly brainMode: BrainMode;
  readonly timeframes: readonly TimeframeObservation[];
  readonly output: BrainOutput;
  readonly connectome?: {
    readonly topOutputNeurons: readonly ActiveNeuron[];
  };
}

export interface RiskPolicy {
  /** Max Fly-controlled open long exposure (not cumulative historical buys). */
  readonly maxTradingCapital: number;
  readonly maxSingleOrderValue: number;
  readonly maxPositionValue: number;
  readonly maxDailyNewExposure: number;
  readonly feeRate?: number;
  readonly slippageBps?: number;
  readonly proposalCooldownMs?: number;
}

export interface ModalContext {
  readonly kind: ModalKind;
  readonly visible: boolean;
  readonly confidence: number;
}

export interface BrokerPageContext {
  readonly brokerId: string;
  readonly url: string;
  readonly pageKind: BrokerPageKind;
  readonly symbol?: string;
  readonly instrumentId?: string;
  readonly loginState: LoginState;
  readonly modal: ModalContext | null;
  readonly confidence: number;
  readonly detectedAt: string;
  readonly frame?: {
    readonly frameId: number;
    readonly origin: string;
    readonly unavailableReason?: "UNAVAILABLE_CROSS_ORIGIN_FRAME";
  };
}

export interface OrderProposal {
  readonly id: string;
  readonly broker: string;
  readonly symbol: string;
  readonly instrumentId: string;
  readonly side: "buy" | "sell";
  readonly quantity?: number;
  readonly estimatedPrice: number;
  readonly estimatedValue: number;
  readonly createdAt: string;
  readonly brainSnapshot: BrainOutput;
  readonly brainMode: BrainMode;
  readonly status?: "pending" | "accepted" | "rejected" | "invalidated";
  /**
   * Anonymous learning features only (no symbol). Sourced from MarketEnvironment.
   */
  readonly marketFeatures?: {
    readonly momentum: number;
    readonly volatility: number;
    readonly volumeStrength: number;
    readonly return: number;
  };
}

export interface TradeRecord {
  readonly id: string;
  readonly mode: "paper" | "live-confirmed";
  readonly broker: string;
  readonly symbol: string;
  readonly instrumentId: string;
  readonly side: "buy" | "sell";
  readonly quantity: number;
  readonly price: number;
  readonly value: number;
  readonly fee?: number;
  readonly timestamp: string;
  readonly sourceProposalId?: string;
  readonly brainMode: BrainMode;
  readonly brainOutput: BrainOutput;
  readonly topOutputNeurons?: readonly ActiveNeuron[];
  readonly timeframes?: readonly TimeframeObservation[];
  readonly liveConfidence?: LiveFillConfidence;
  readonly cycleId?: string;
}

export interface PaperPosition {
  readonly symbol: string;
  readonly instrumentId: string;
  readonly quantity: number;
  readonly averagePrice: number;
  readonly marketPrice: number;
  readonly priceUpdatedAt: string;
  readonly priceStale?: boolean;
}

export interface PositionCycle {
  readonly id: string;
  readonly instrumentId: string;
  readonly broker: string;
  readonly symbol: string;
  readonly status: "open" | "closed";
  readonly buyAveragePrice: number;
  readonly sellAveragePrice?: number;
  readonly quantityOpened: number;
  readonly quantityClosed: number;
  readonly openedAt: string;
  readonly closedAt?: string;
  readonly realizedPnl?: number;
  readonly realizedReturnPercent?: number;
  readonly fees?: number;
}

export interface PerformanceSnapshot {
  readonly totalTrades: number;
  readonly openPositions: number;
  readonly realizedPnl: number;
  readonly unrealizedPnl: number;
  readonly grossRealizedPnl: number;
  readonly netRealizedPnl: number;
  readonly totalReturnPercent: number;
  readonly winRate: number;
  readonly averageGain: number;
  readonly averageLoss: number;
  /** Realized-only drawdown unless equityHistory provided. */
  readonly maximumDrawdown: number;
  readonly maximumDrawdownBasis: "realized-only" | "mark-to-market";
  /** Null when no real benchmark series is available. */
  readonly benchmarkReturn: number | null;
  readonly unrealizedPnlStale: boolean;
}

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  maxTradingCapital: 1_000_000,
  maxSingleOrderValue: 300_000,
  maxPositionValue: 500_000,
  maxDailyNewExposure: 400_000,
  feeRate: 0,
  slippageBps: 0,
  proposalCooldownMs: 30_000,
};

export const MIN_CANDLES_BY_TIMEFRAME: Record<Timeframe, number> = {
  "1m": 20,
  "5m": 20,
  "15m": 20,
  "1h": 20,
  "4h": 15,
  "1d": 10,
};

export const STALE_MS_BY_TIMEFRAME: Record<Timeframe, number> = {
  "1m": 3 * 60_000,
  "5m": 12 * 60_000,
  "15m": 30 * 60_000,
  "1h": 2 * 60 * 60_000,
  "4h": 8 * 60 * 60_000,
  "1d": 36 * 60 * 60_000,
};
