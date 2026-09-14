export type DetectorTargetKind = "buy" | "sell" | "chart" | "search";

export type CandidateTarget = {
  readonly element: HTMLElement;
  readonly confidence: number;
  readonly strategy: string;
  readonly score: number;
  readonly reasons: readonly string[];
};

export type GenericBrokerDetection = {
  readonly pageKind: "trade" | "asset-detail" | "unknown";
  readonly symbol?: string;
  readonly chart?: CandidateTarget;
  readonly buy?: CandidateTarget;
  readonly sell?: CandidateTarget;
  readonly search?: CandidateTarget;
  readonly confidence: number;
  readonly paperOnly: true;
};

export type BrokerDetectionFeedback = {
  readonly id: string;
  readonly host: string;
  readonly target: DetectorTargetKind;
  readonly accepted: boolean;
  readonly confidence: number;
  readonly strategy: string;
  readonly features: {
    readonly role?: string | null;
    readonly ariaLabel?: string | null;
    readonly visibleText?: string;
    readonly width?: number;
    readonly height?: number;
  };
  readonly createdAt: string;
};

/** Generic detector is Paper-only; Live Assist must stay disabled. */
export const GENERIC_DETECTOR_CONFIDENCE_THRESHOLD = 0.9;
