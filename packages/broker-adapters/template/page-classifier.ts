import type { BrokerPageContext, LoginState } from "@fly/core";
import { detectModal } from "../src/modal";

/** TODO: map URL + landmarks to page kinds. Fail closed to unknown. */
export const classifyTodoBrokerPage = (
  documentRef: Document,
  url: string,
  loginState: LoginState,
): BrokerPageContext => ({
  brokerId: "TODO_BROKER_ID",
  url,
  pageKind: "unknown",
  loginState,
  modal: detectModal(documentRef),
  confidence: 0.2,
  detectedAt: new Date().toISOString(),
});
