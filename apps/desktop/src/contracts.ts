export type DesktopMode = "IDLE_DESKTOP" | "MARKET_OBSERVING" | "LEAVE_MARKET";

/** Physical desktop coordinates reported by the native monitor API. */
export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** CSS-pixel coordinates local to the transparent overlay webview. */
export interface ViewportRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export interface ScreenBounds extends ScreenRect {
  readonly scaleFactor: number;
}

export interface MarketObservation {
  readonly observedAtMs: number;
  readonly environment: MarketEnvironment;
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
    readonly chart?: ViewportRect;
    readonly buy?: ViewportRect;
    readonly sell?: ViewportRect;
    readonly portfolio?: ViewportRect;
  };
}

export interface BrainOutput {
  readonly state: string;
  readonly buyDrive: number;
  readonly sellDrive: number;
  readonly curiosity: number;
  readonly danger: number;
  readonly activity: number;
}

export interface BrainDiagnostics {
  readonly mode: "real-connectome";
  readonly dataset?: string;
  readonly connectomeLoaded: boolean;
  readonly neuronCount?: number;
  readonly edgeCount?: number;
  readonly activeInputNeurons: readonly {
    readonly bodyId: number;
    readonly activity: number;
  }[];
  readonly topOutputNeurons: readonly {
    readonly bodyId: number;
    readonly activity: number;
  }[];
  readonly simulationMs?: number;
  readonly flyState?: string;
  readonly error?: string;
}

export interface BridgeStatus {
  readonly isRunning: boolean;
  readonly port: number;
  readonly pairedOrigin: string | null;
}

export interface PairingDetails extends BridgeStatus {
  readonly token: string;
}
